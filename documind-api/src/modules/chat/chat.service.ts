import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { QueryRewriterService } from '../rag/query-rewriter.service';
import { RetrievalService } from '../rag/retrieval.service';
import { LlmClientService } from '../rag/llm-client.service';
import { UserRole } from '../../common/guards/roles.guard';
import { QueryDto } from './dto/query.dto';

@Injectable()
export class ChatService {
  constructor(
    private prisma: PrismaService,
    private queryRewriter: QueryRewriterService,
    private retrieval: RetrievalService,
    private llm: LlmClientService,
  ) {}

  /** Create a new chat session */
  async createSession(userId: string, title?: string) {
    return this.prisma.chatSession.create({ data: { userId, title } });
  }

  /** Get user's chat sessions */
  async getSessions(userId: string) {
    return this.prisma.chatSession.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      include: { _count: { select: { messages: true } } },
    });
  }

  /** Get messages in a session */
  async getMessages(sessionId: string, userId: string) {
    return this.prisma.chatMessage.findMany({
      where: { session: { id: sessionId, userId } },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * Process a query synchronously (non-streaming).
   * Full RAG pipeline: Rewrite → Retrieve → LLM → Save
   */
  async query(
    dto: QueryDto,
    userId: string,
    userRole: UserRole,
    departmentId: string | null,
  ) {
    const start = Date.now();

    // 1. Ensure session exists
    const session = dto.sessionId
      ? await this.prisma.chatSession.findFirst({ where: { id: dto.sessionId, userId } })
      : await this.createSession(userId, dto.question.slice(0, 50));

    // 2. Load chat history for query rewriting
    const history = await this.getRecentHistory(session.id);

    // 3. Rewrite query to incorporate multi-turn context
    const rewrittenQuery = await this.queryRewriter.rewrite(dto.question, history);

    // 4. Save user message
    await this.prisma.chatMessage.create({
      data: { sessionId: session.id, role: 'user', content: dto.question },
    });

    // 5. Hybrid retrieval with RBAC filter
    const chunks = await this.retrieval.retrieve(rewrittenQuery, userRole, departmentId);

    // 6. Generate grounded answer
    const answer = await this.llm.generateAnswer(rewrittenQuery, chunks);
    const latencyMs = Date.now() - start;

    // 7. Save assistant message with citations
    const saved = await this.prisma.chatMessage.create({
      data: {
        sessionId: session.id,
        role: 'assistant',
        content: answer.answer,
        citations: answer.sources as any,
        confidence: answer.confidence,
        tokensUsed: answer.tokensUsed,
        latencyMs,
        rewrittenQuery,
      },
    });

    return {
      messageId: saved.id,
      sessionId: session.id,
      question: dto.question,
      rewrittenQuery,
      answer: answer.answer,
      confidence: answer.confidence,
      sources: answer.sources,
      tokensUsed: answer.tokensUsed,
      latencyMs,
    };
  }

  /**
   * Streaming version of query (SSE).
   * Returns an AsyncGenerator that yields SSE-compatible strings.
   */
  async *queryStream(
    dto: QueryDto,
    userId: string,
    userRole: UserRole,
    departmentId: string | null,
  ): AsyncGenerator<string> {
    const session = dto.sessionId
      ? await this.prisma.chatSession.findFirst({ where: { id: dto.sessionId, userId } })
      : await this.createSession(userId, dto.question.slice(0, 50));

    const history = await this.getRecentHistory(session.id);
    const rewrittenQuery = await this.queryRewriter.rewrite(dto.question, history);

    await this.prisma.chatMessage.create({
      data: { sessionId: session.id, role: 'user', content: dto.question },
    });

    const chunks = await this.retrieval.retrieve(rewrittenQuery, userRole, departmentId);

    // Send metadata first
    yield `data: ${JSON.stringify({ type: 'meta', sessionId: session.id, rewrittenQuery })}\n\n`;

    let fullAnswer = '';
    let sources: any[] = [];

    for await (const event of this.llm.generateAnswerStream(rewrittenQuery, chunks)) {
      if (event.type === 'token') {
        fullAnswer += event.content;
        yield `data: ${JSON.stringify({ type: 'token', content: event.content })}\n\n`;
      } else if (event.type === 'done') {
        const donePayload = JSON.parse(event.content);
        sources = donePayload.sources || [];

        // Save to DB
        await this.prisma.chatMessage.create({
          data: {
            sessionId: session.id,
            role: 'assistant',
            content: fullAnswer,
            citations: sources as any,
            rewrittenQuery,
          },
        });

        yield `data: ${JSON.stringify({ type: 'done', sources })}\n\n`;
      }
    }
  }

  private async getRecentHistory(sessionId: string) {
    const messages = await this.prisma.chatMessage.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'desc' },
      take: 6, // Last 3 turns
    });
    return messages.reverse().map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }));
  }
}

