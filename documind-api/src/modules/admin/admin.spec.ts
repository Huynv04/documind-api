import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { MetricsService } from './metrics.service';
import { AdminController } from './admin.controller';
import { DocumentStatus, UserRole } from '@prisma/client';

describe('Admin Module (Module 6)', () => {
  let metricsService: MetricsService;
  let adminController: AdminController;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      user: {
        count: jest.fn<any>().mockImplementation((args?: any) => {
          if (args?.where?.isActive === true) return Promise.resolve(45);
          return Promise.resolve(50);
        }),
        groupBy: jest.fn<any>().mockResolvedValue([
          { role: UserRole.EMPLOYEE, _count: { id: 35 } },
          { role: UserRole.KNOWLEDGE_MANAGER, _count: { id: 10 } },
          { role: UserRole.ADMIN, _count: { id: 5 } },
        ]),
      },
      document: {
        count: jest.fn<any>().mockResolvedValue(120),
        groupBy: jest.fn<any>().mockResolvedValue([
          { status: DocumentStatus.INDEXED, _count: { id: 100 } },
          { status: DocumentStatus.PROCESSING, _count: { id: 10 } },
          { status: DocumentStatus.FAILED, _count: { id: 5 } },
          { status: DocumentStatus.ARCHIVED, _count: { id: 5 } },
        ]),
        aggregate: jest.fn<any>().mockResolvedValue({
          _sum: { sizeBytes: 104857600 }, // 100 MB
        }),
      },
      documentChunk: {
        count: jest.fn<any>().mockResolvedValue(1250),
        aggregate: jest.fn<any>().mockResolvedValue({
          _sum: { tokenCount: 850000 },
        }),
      },
      chatSession: {
        count: jest.fn<any>().mockResolvedValue(320),
      },
      chatMessage: {
        count: jest.fn<any>().mockImplementation((args?: any) => {
          if (args?.where?.role === 'user') return Promise.resolve(600);
          if (args?.where?.role === 'assistant') return Promise.resolve(600);
          return Promise.resolve(1200);
        }),
        aggregate: jest.fn<any>().mockResolvedValue({
          _sum: { tokensUsed: 420000 },
          _avg: { latencyMs: 650 },
        }),
      },
      chatFeedback: {
        count: jest.fn<any>().mockImplementation((args?: any) => {
          if (args?.where?.isPositive === true) return Promise.resolve(85);
          if (args?.where?.isPositive === false) return Promise.resolve(15);
          return Promise.resolve(100);
        }),
      },
      auditLog: {
        findMany: jest.fn<any>().mockResolvedValue([
          {
            id: 'log-1',
            userId: 'user-1',
            action: 'QUERY',
            resourceType: 'CHAT_MESSAGE',
            resourceId: 'msg-1',
            ipAddress: '127.0.0.1',
            userAgent: 'Mozilla/5.0',
            metadata: { question: 'Chính sách làm việc từ xa?' },
            createdAt: new Date('2026-11-10T10:00:00Z'),
            user: {
              id: 'user-1',
              name: 'Nguyễn Văn A',
              email: 'a.nv@company.vn',
              role: UserRole.EMPLOYEE,
              department: { id: 'dept-1', name: 'Kỹ thuật' },
            },
          },
        ]),
        count: jest.fn<any>().mockResolvedValue(1),
        create: jest.fn<any>().mockImplementation((args: any) => ({
          id: 'log-new',
          ...args.data,
          createdAt: new Date(),
        })),
      },
    };

    metricsService = new MetricsService(mockPrisma);
    adminController = new AdminController(metricsService);
  });

  describe('MetricsService.getOverview()', () => {
    it('should aggregate system metrics and calculate accurate token usage and costs', async () => {
      const overview = await metricsService.getOverview();

      // 1. Verify User metrics
      expect(overview.users.total).toBe(50);
      expect(overview.users.active).toBe(45);
      expect(overview.users.inactive).toBe(5);
      expect(overview.users.breakdownByRole[UserRole.EMPLOYEE]).toBe(35);
      expect(overview.users.breakdownByRole[UserRole.KNOWLEDGE_MANAGER]).toBe(10);
      expect(overview.users.breakdownByRole[UserRole.ADMIN]).toBe(5);

      // 2. Verify Document metrics
      expect(overview.documents.total).toBe(120);
      expect(overview.documents.indexed).toBe(100);
      expect(overview.documents.processing).toBe(10);
      expect(overview.documents.failed).toBe(5);
      expect(overview.documents.archived).toBe(5);
      expect(overview.documents.storage.bytes).toBe(104857600);
      expect(overview.documents.storage.formatted).toBe('100 MB');
      expect(overview.documents.chunks.total).toBe(1250);

      // 3. Verify Chat metrics
      expect(overview.chat.totalSessions).toBe(320);
      expect(overview.chat.totalMessages).toBe(1200);
      expect(overview.chat.userMessages).toBe(600);
      expect(overview.chat.assistantMessages).toBe(600);
      expect(overview.chat.avgLatencyMs).toBe(650);
      expect(overview.chat.feedback.total).toBe(100);
      expect(overview.chat.feedback.likes).toBe(85);
      expect(overview.chat.feedback.dislikes).toBe(15);
      expect(overview.chat.feedback.satisfactionRate).toBe('85%');

      // 4. Verify Token Usage and Cost Estimates
      expect(overview.tokens.chatTokens).toBe(420000);
      expect(overview.tokens.embeddingTokens).toBe(850000);
      expect(overview.tokens.grandTotalTokens).toBe(1270000);

      // chatCostUsd = (420000 / 1000000) * 0.25 = 0.105
      // embeddingCostUsd = (850000 / 1000000) * 0.02 = 0.017
      // totalCostUsd = 0.105 + 0.017 = 0.122
      expect(overview.tokens.costEstimate.chatCostUsd).toBe(0.105);
      expect(overview.tokens.costEstimate.embeddingCostUsd).toBe(0.017);
      expect(overview.tokens.costEstimate.totalCostUsd).toBe(0.122);
      expect(overview.tokens.costEstimate.totalCostVnd).toBe(Math.round(0.122 * 25400));
      expect(overview.tokens.costEstimate.formattedUsd).toBe('$0.1220');
    });
  });

  describe('MetricsService.getAuditLogs()', () => {
    it('should return paginated audit logs with metadata', async () => {
      const result = await metricsService.getAuditLogs({ page: 1, limit: 20 });

      expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 0,
          take: 20,
          orderBy: { createdAt: 'desc' },
        }),
      );
      expect(result.items).toHaveLength(1);
      expect(result.items[0].action).toBe('QUERY');
      expect(result.items[0].user?.name).toBe('Nguyễn Văn A');
      expect(result.meta).toEqual({
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      });
    });

    it('should apply filters for action, resourceType, userId, and date range', async () => {
      await metricsService.getAuditLogs({
        action: 'DELETE',
        resourceType: 'DOCUMENT',
        userId: 'user-admin',
        startDate: '2026-11-01T00:00:00Z',
        endDate: '2026-11-10T23:59:59Z',
      });

      expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            action: { contains: 'DELETE', mode: 'insensitive' },
            resourceType: 'DOCUMENT',
            userId: 'user-admin',
            createdAt: {
              gte: new Date('2026-11-01T00:00:00Z'),
              lte: new Date('2026-11-10T23:59:59Z'),
            },
          }),
        }),
      );
    });
  });

  describe('MetricsService.recordLog()', () => {
    it('should write an audit log entry to the database', async () => {
      const result = await metricsService.recordLog({
        userId: 'user-1',
        action: 'UPLOAD_DOCUMENT',
        resourceType: 'DOCUMENT',
        resourceId: 'doc-123',
        ipAddress: '192.168.1.10',
        userAgent: 'Chrome',
        metadata: { fileName: 'SOP_2026.pdf' },
      });

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user-1',
          action: 'UPLOAD_DOCUMENT',
          resourceType: 'DOCUMENT',
          resourceId: 'doc-123',
          ipAddress: '192.168.1.10',
        }),
      });
      expect(result?.id).toBe('log-new');
    });
  });

  describe('AdminController', () => {
    it('should route getOverview to metricsService', async () => {
      const spy = jest.spyOn(metricsService, 'getOverview').mockResolvedValue({} as any);
      await adminController.getOverview();
      expect(spy).toHaveBeenCalled();
    });

    it('should route getMetrics to metricsService', async () => {
      const spy = jest.spyOn(metricsService, 'getOverview').mockResolvedValue({} as any);
      await adminController.getMetrics();
      expect(spy).toHaveBeenCalled();
    });

    it('should route getAuditLogs to metricsService with query params', async () => {
      const spy = jest.spyOn(metricsService, 'getAuditLogs').mockResolvedValue({} as any);
      const query = { page: 2, limit: 10, action: 'QUERY' };
      await adminController.getAuditLogs(query);
      expect(spy).toHaveBeenCalledWith(query);
    });
  });
});

