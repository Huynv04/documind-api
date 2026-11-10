import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { ChatService } from './chat.service';
import { FeedbackService } from './feedback.service';
import { UserRole } from '@prisma/client';

describe('Chat Module (Module 5)', () => {
  let chatService: ChatService;
  let feedbackService: FeedbackService;
  let mockPrisma: any;
  let mockRewriter: any;
  let mockRetrieval: any;
  let mockLlmClient: any;

  beforeEach(() => {
    mockPrisma = {
      chatSession: {
        findUnique: jest.fn<any>().mockResolvedValue({ id: 'sess-1', userId: 'user-1', title: 'Phiên 1' }),
        create: jest.fn<any>().mockResolvedValue({ id: 'sess-new', userId: 'user-1', title: 'Cuộc trò chuyện mới' }),
        update: jest.fn<any>().mockResolvedValue({ id: 'sess-1', title: 'Updated' }),
        findMany: jest.fn<any>().mockResolvedValue([{ id: 'sess-1', title: 'Phiên 1' }]),
      },
      chatMessage: {
        findMany: jest.fn<any>().mockResolvedValue([]),
        count: jest.fn<any>().mockResolvedValue(20),
        create: jest.fn<any>().mockImplementation((args: any) => ({
          id: 'msg-' + Date.now(),
          ...args.data,
        })),
        findUnique: jest.fn<any>().mockResolvedValue({
          id: 'msg-1',
          sessionId: 'sess-1',
          role: 'assistant',
          content: 'Nội dung câu trả lời',
        }),
      },
      document: {
        findMany: jest.fn<any>().mockResolvedValue([
          { id: 'doc-1', originalName: 'Quy_che_2026.pdf', mimeType: 'application/pdf' },
        ]),
      },
      auditLog: {
        create: jest.fn<any>().mockResolvedValue({ id: 'audit-1' }),
      },
      chatFeedback: {
        findFirst: jest.fn<any>().mockResolvedValue(null),
        create: jest.fn<any>().mockImplementation((args: any) => ({
          id: 'fb-1',
          ...args.data,
        })),
        count: jest.fn<any>().mockResolvedValue(10),
      },
    };

    mockRewriter = {
      rewrite: jest.fn<any>().mockResolvedValue('Quy định nghỉ phép năm của nhân viên thử việc?'),
    };

    mockRetrieval = {
      retrieve: jest.fn<any>().mockResolvedValue([
        {
          chunkId: 'chunk-1',
          documentId: 'doc-1',
          content: 'Quy định nghỉ phép áp dụng cho nhân viên chính thức...',
          pageNumber: 5,
          score: 0.95,
        },
      ]),
    };

    mockLlmClient = {
      generateAnswer: jest.fn<any>().mockResolvedValue({
        answer: 'Theo quy định tại trang 5 của Quy chế, nhân viên thử việc không có ngày phép năm.',
        confidence: 'high',
        sources: [
          {
            documentId: 'doc-1',
            chunkId: 'chunk-1',
            pageNumber: 5,
            excerpt: 'Quy định nghỉ phép áp dụng cho nhân viên chính thức...',
          },
        ],
        tokensUsed: 120,
      }),
    };

    chatService = new ChatService(
      mockPrisma,
      mockRewriter,
      mockRetrieval,
      mockLlmClient,
    );

    feedbackService = new FeedbackService(mockPrisma);
  });

  describe('POST /api/v1/chat/query (Synchronous JSON Endpoint)', () => {
    it('should process query and return structured JSON with answer and citations', async () => {
      const result = await chatService.processQuery(
        { question: 'Thử việc được bao nhiêu ngày phép?', sessionId: 'sess-1' },
        { id: 'user-1', role: UserRole.EMPLOYEE, departmentId: 'dept-hr' },
      );

      expect(result).toBeDefined();
      expect(result.answer).toContain('nhân viên thử việc không có ngày phép năm');
      expect(result.confidence).toBe('high');
      expect(result.sources.length).toBe(1);
      expect(result.sources[0].documentName).toBe('Quy_che_2026.pdf');
      expect(result.rewrittenQuery).toBe('Quy định nghỉ phép năm của nhân viên thử việc?');
      expect(result.tokensUsed).toBe(120);

      // Verify audit log created
      expect(mockPrisma.auditLog.create).toHaveBeenCalled();
    });
  });

  describe('Feedback API (Like / Dislike)', () => {
    it('should record user feedback and save audit log', async () => {
      const result = await feedbackService.recordFeedback(
        'user-1',
        'msg-1',
        { isPositive: true, comment: 'Rất chính xác!' },
        '127.0.0.1',
        'Mozilla/5.0',
      );

      expect(result.success).toBe(true);
      expect(mockPrisma.chatFeedback.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user-1',
          messageId: 'msg-1',
          isPositive: true,
          comment: 'Rất chính xác!',
        }),
      });
      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'FEEDBACK_LIKE',
          resourceType: 'CHAT_MESSAGE',
        }),
      });
    });

    it('should calculate satisfaction metrics', async () => {
      const stats = await feedbackService.getFeedbackStats();
      expect(stats.satisfactionRate).toBeDefined();
      expect(stats.totalFeedbacks).toBeGreaterThanOrEqual(0);
    });
  });
});
