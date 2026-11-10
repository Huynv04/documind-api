import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { QueryRewriterService } from '../rag/query-rewriter.service';
import { RetrievalService } from '../rag/retrieval.service';
import { LlmClientService, SourceCitation } from '../rag/llm-client.service';
import { QueryDto } from './dto/query.dto';
import { UserRole } from '@prisma/client';

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    private prisma: PrismaService,
    private rewriter: QueryRewriterService,
    private retrieval: RetrievalService,
    private llmClient: LlmClientService,
  ) {}

  /**
   * 1. Get or create a chat session for the user
   */
  async getOrCreateSession(userId: string, sessionId?: string) {
    if (sessionId) {
      const existing = await this.prisma.chatSession.findUnique({
        where: { id: sessionId },
      });
      if (existing) {
        if (existing.userId !== userId) {
          throw new ForbiddenException('Bạn không có quyền truy cập phiên trò chuyện này');
        }
        return existing;
      }
    }

    return this.prisma.chatSession.create({
      data: {
        userId,
        title: 'Cuộc trò chuyện mới',
      },
    });
  }

  /**
   * 2. List all sessions of a user
   */
  async getSessions(userId: string) {
    return this.prisma.chatSession.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      include: {
        _count: { select: { messages: true } },
      },
    });
  }

  /**
   * 3. Get all messages of a session
   */
  async getSessionMessages(userId: string, sessionId: string) {
    const session = await this.prisma.chatSession.findUnique({
      where: { id: sessionId },
    });

    if (!session || session.userId !== userId) {
      throw new NotFoundException('Không tìm thấy phiên trò chuyện');
    }

    return this.prisma.chatMessage.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'asc' },
      include: {
        feedbacks: {
          where: { userId },
          take: 1,
        },
      },
    });
  }

  /**
   * 4. Update session title
   */
  async updateSessionTitle(userId: string, sessionId: string, title: string) {
    const session = await this.prisma.chatSession.findUnique({
      where: { id: sessionId },
    });

    if (!session || session.userId !== userId) {
      throw new NotFoundException('Không tìm thấy phiên trò chuyện');
    }

    return this.prisma.chatSession.update({
      where: { id: sessionId },
      data: { title: title.trim() },
    });
  }

  /**
   * 5. Delete a session
   */
  async deleteSession(userId: string, sessionId: string) {
    const session = await this.prisma.chatSession.findUnique({
      where: { id: sessionId },
    });

    if (!session || session.userId !== userId) {
      throw new NotFoundException('Không tìm thấy phiên trò chuyện');
    }

    await this.prisma.chatSession.delete({
      where: { id: sessionId },
    });

    return { success: true, message: 'Đã xóa phiên trò chuyện' };
  }

  /**
   * 6. Endpoint đồng bộ: POST /api/v1/chat/query
   * Thực hiện: Query Rewriting -> Hybrid Retrieval (pgvector + FTS + RBAC) -> Grounded LLM -> Structured JSON
   */
  async processQuery(
    dto: QueryDto,
    user: { id: string; role: UserRole; departmentId?: string },
    ipAddress?: string,
    userAgent?: string,
  ) {
    const startTime = Date.now();
    const session = await this.getOrCreateSession(user.id, dto.sessionId);

    // Lấy 6 tin nhắn gần nhất để làm ngữ cảnh hội thoại đa lượt
    const recentMessages = await this.prisma.chatMessage.findMany({
      where: { sessionId: session.id },
      orderBy: { createdAt: 'desc' },
      take: 6,
    });

    const history = recentMessages.reverse().map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }));

    // Bước 1: Query Rewriting
    const rewrittenQuery = await this.rewriter.rewrite(dto.question, history);

    // Lưu tin nhắn người dùng
    await this.prisma.chatMessage.create({
      data: {
        sessionId: session.id,
        role: 'user',
        content: dto.question,
      },
    });

    // Tự động cập nhật tiêu đề phiên chat từ câu hỏi đầu tiên
    if (recentMessages.length === 0) {
      const title = dto.question.slice(0, 40) + (dto.question.length > 40 ? '...' : '');
      await this.prisma.chatSession.update({
        where: { id: session.id },
        data: { title },
      });
    }

    // Bước 2: Hybrid Retrieval (Vector Search + Full-Text Search + RRF + Metadata Pre-filtering)
    const chunks = await this.retrieval.retrieve(
      rewrittenQuery,
      user.role,
      user.departmentId || null,
      5,
    );

    // Gắn metadata tài liệu (tên file, định dạng)
    const docIds = Array.from(new Set(chunks.map((c) => c.documentId)));
    const docs = await this.prisma.document.findMany({
      where: { id: { in: docIds } },
      select: { id: true, originalName: true, mimeType: true },
    });
    const docMap = new Map(docs.map((d) => [d.id, d]));

    const enrichedChunks = chunks.map((c) => ({
      ...c,
      documentName: docMap.get(c.documentId)?.originalName,
      mimeType: docMap.get(c.documentId)?.mimeType,
    }));

    // Bước 3: Grounded Answer Generation
    const llmAnswer = await this.llmClient.generateAnswer(rewrittenQuery, enrichedChunks);
    const latencyMs = Date.now() - startTime;

    // Lưu câu trả lời của trợ lý
    const assistantMessage = await this.prisma.chatMessage.create({
      data: {
        sessionId: session.id,
        role: 'assistant',
        content: llmAnswer.answer,
        citations: llmAnswer.sources as any,
        confidence: llmAnswer.confidence,
        tokensUsed: llmAnswer.tokensUsed,
        latencyMs,
        rewrittenQuery,
      },
    });

    // Ghi nhật ký kiểm toán (AuditLog)
    await this.prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'QUERY',
        resourceType: 'CHAT',
        resourceId: assistantMessage.id,
        ipAddress,
        userAgent,
        metadata: {
          question: dto.question,
          rewrittenQuery,
          confidence: llmAnswer.confidence,
          sourcesCount: llmAnswer.sources.length,
          tokensUsed: llmAnswer.tokensUsed,
          latencyMs,
          sessionId: session.id,
        },
      },
    });

    // Cập nhật updatedAt của phiên
    await this.prisma.chatSession.update({
      where: { id: session.id },
      data: { updatedAt: new Date() },
    });

    return {
      answer: llmAnswer.answer,
      confidence: llmAnswer.confidence,
      sources: enrichedChunks.map((c) => ({
        documentId: c.documentId,
        chunkId: c.chunkId,
        pageNumber: c.pageNumber,
        excerpt: c.content.slice(0, 300),
        score: c.score,
        documentName: c.documentName,
      })),
      tokensUsed: llmAnswer.tokensUsed,
      latencyMs,
      rewrittenQuery,
      sessionId: session.id,
      messageId: assistantMessage.id,
    };
  }

  /**
   * 7. Endpoint Streaming: POST /api/v1/chat/query/stream
   * Stream token qua Server-Sent Events (SSE) theo thời gian thực.
   */
  async streamQuery(
    dto: QueryDto,
    user: { id: string; role: UserRole; departmentId?: string },
    res: Response,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const startTime = Date.now();

    // 1. Cấu hình Headers cho Server-Sent Events
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    if (typeof (res as any).flushHeaders === 'function') {
      (res as any).flushHeaders();
    }

    const session = await this.getOrCreateSession(user.id, dto.sessionId);

    // Lấy lịch sử hội thoại gần nhất
    const recentMessages = await this.prisma.chatMessage.findMany({
      where: { sessionId: session.id },
      orderBy: { createdAt: 'desc' },
      take: 6,
    });

    const history = recentMessages.reverse().map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }));

    // Query Rewriting
    const rewrittenQuery = await this.rewriter.rewrite(dto.question, history);

    // Lưu tin nhắn người dùng
    await this.prisma.chatMessage.create({
      data: {
        sessionId: session.id,
        role: 'user',
        content: dto.question,
      },
    });

    // Gửi event meta ban đầu
    res.write(
      `data: ${JSON.stringify({
        type: 'meta',
        sessionId: session.id,
        rewrittenQuery,
      })}\n\n`,
    );

    // Auto title nếu là tin nhắn đầu
    if (recentMessages.length === 0) {
      const title = dto.question.slice(0, 40) + (dto.question.length > 40 ? '...' : '');
      await this.prisma.chatSession.update({
        where: { id: session.id },
        data: { title },
      });
    }

    // Hybrid Retrieval với RBAC Pre-filter
    const chunks = await this.retrieval.retrieve(
      rewrittenQuery,
      user.role,
      user.departmentId || null,
      5,
    );

    // Gắn metadata tên file tài liệu
    const docIds = Array.from(new Set(chunks.map((c) => c.documentId)));
    const docs = await this.prisma.document.findMany({
      where: { id: { in: docIds } },
      select: { id: true, originalName: true, mimeType: true },
    });
    const docMap = new Map(docs.map((d) => [d.id, d]));

    const enrichedChunks = chunks.map((c) => ({
      ...c,
      documentName: docMap.get(c.documentId)?.originalName,
      mimeType: docMap.get(c.documentId)?.mimeType,
    }));

    let accumulatedContent = '';
    let finalSources: SourceCitation[] = [];
    let finalConfidence: 'high' | 'medium' | 'low' = 'high';

    try {
      // 2. Stream từng token từ LLM
      for await (const event of this.llmClient.generateAnswerStream(rewrittenQuery, enrichedChunks)) {
        if (event.type === 'token') {
          accumulatedContent += event.content;
          res.write(`data: ${JSON.stringify({ type: 'token', content: event.content })}\n\n`);
        } else if (event.type === 'sources') {
          finalSources = event.data.sources.map((s) => ({
            ...s,
            documentName: docMap.get(s.documentId)?.originalName,
          }));
          finalConfidence = event.data.confidence;
          res.write(
            `data: ${JSON.stringify({
              type: 'sources',
              data: {
                sources: finalSources,
                confidence: finalConfidence,
              },
            })}\n\n`,
          );
        } else if (event.type === 'error') {
          res.write(`data: ${JSON.stringify({ type: 'error', message: event.message })}\n\n`);
        }
      }

      const latencyMs = Date.now() - startTime;

      // 3. Lưu tin nhắn trợ lý hoàn chỉnh vào database
      const assistantMessage = await this.prisma.chatMessage.create({
        data: {
          sessionId: session.id,
          role: 'assistant',
          content: accumulatedContent || 'Tôi không tìm thấy thông tin này trong tài liệu nội bộ.',
          citations: finalSources as any,
          confidence: finalConfidence,
          latencyMs,
          rewrittenQuery,
        },
      });

      // 4. Ghi AuditLog
      await this.prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'QUERY_STREAM',
          resourceType: 'CHAT',
          resourceId: assistantMessage.id,
          ipAddress,
          userAgent,
          metadata: {
            question: dto.question,
            rewrittenQuery,
            latencyMs,
            sessionId: session.id,
          },
        },
      });

      // Gửi event done kết thúc luồng
      res.write(
        `data: ${JSON.stringify({
          type: 'done',
          messageId: assistantMessage.id,
          sessionId: session.id,
          latencyMs,
        })}\n\n`,
      );
      res.write('data: [DONE]\n\n');
    } catch (err: any) {
      this.logger.error(`Stream query error: ${err.message}`, err.stack);
      res.write(`data: ${JSON.stringify({ type: 'error', message: err.message })}\n\n`);
    } finally {
      res.end();
    }
  }
}
