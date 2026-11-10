import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { QueryRewriterService } from '../rag/query-rewriter.service';
import { RetrievalService } from '../rag/retrieval.service';
import { LlmClientService } from '../rag/llm-client.service';
import { QueryDto } from './dto/query.dto';
import { FeedbackDto } from './dto/feedback.dto';
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
   * 4. Delete a session
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
   * 5. Process query through RAG pipeline (Non-streaming)
   */
  async processQuery(
    dto: QueryDto,
    user: { id: string; role: UserRole; departmentId?: string },
  ) {
    const startTime = Date.now();
    const session = await this.getOrCreateSession(user.id, dto.sessionId);

    // Fetch recent 6 messages for context
    const recentMessages = await this.prisma.chatMessage.findMany({
      where: { sessionId: session.id },
      orderBy: { createdAt: 'desc' },
      take: 6,
    });

    const history = recentMessages.reverse().map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }));

    // Step A: Query Rewriting
    const rewrittenQuery = await this.rewriter.rewrite(dto.question, history);

    // Save user message
    await this.prisma.chatMessage.create({
      data: {
        sessionId: session.id,
        role: 'user',
        content: dto.question,
      },
    });

    // Auto-update session title if it's the first turn
    if (recentMessages.length === 0) {
      const title = dto.question.slice(0, 40) + (dto.question.length > 40 ? '...' : '');
      await this.prisma.chatSession.update({
        where: { id: session.id },
        data: { title },
      });
    }

    // Step B: Hybrid Retrieval (Vector + FTS + RRF + RBAC Filter)
    const chunks = await this.retrieval.retrieve(
      rewrittenQuery,
      user.role,
      user.departmentId || null,
      5,
    );

    // Fetch document metadata to attach readable names
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

    // Step C: LLM Grounded Answer Generation
    const llmAnswer = await this.llmClient.generateAnswer(rewrittenQuery, enrichedChunks);
    const latencyMs = Date.now() - startTime;

    // Save assistant message
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

    // Touch session updatedAt
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
   * 6. Record feedback (Like/Dislike)
   */
  async recordFeedback(userId: string, messageId: string, dto: FeedbackDto) {
    const message = await this.prisma.chatMessage.findUnique({
      where: { id: messageId },
    });

    if (!message) {
      throw new NotFoundException('Không tìm thấy tin nhắn cần đánh giá');
    }

    const feedback = await this.prisma.chatFeedback.upsert({
      where: {
        id: `fb_${userId}_${messageId}`, // or fallback
      },
      update: {
        isPositive: dto.isPositive,
        comment: dto.comment,
      },
      create: {
        id: `fb_${userId}_${messageId}`,
        messageId,
        userId,
        isPositive: dto.isPositive,
        comment: dto.comment,
      },
    });

    return { success: true, message: 'Đã lưu đánh giá phản hồi', feedback };
  }
}

