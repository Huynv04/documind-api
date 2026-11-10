import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogQueryDto } from './dto/audit-log-query.dto';
import { DocumentStatus, SensitivityLevel, UserRole } from '@prisma/client';

export interface TokenCostEstimate {
  chatTokens: number;
  embeddingTokens: number;
  grandTotalTokens: number;
  chatCostUsd: number;
  embeddingCostUsd: number;
  totalCostUsd: number;
  totalCostVnd: number;
  currencyExchangeRate: number; // e.g., 25400 VND/USD
}

@Injectable()
export class MetricsService {
  private readonly logger = new Logger(MetricsService.name);
  private readonly USD_TO_VND = 25400;

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Tổng hợp toàn diện chỉ số hệ thống (System Metrics Overview)
   * Bao gồm: Người dùng, Tài liệu, Chat RAG, Token tiêu thụ và Chi phí AI ước tính
   */
  async getOverview() {
    const [
      // 1. User stats
      totalUsers,
      activeUsers,
      usersByRole,

      // 2. Document stats
      totalDocs,
      docsByStatus,
      docAggregations,
      totalChunks,
      chunkAggregations,

      // 3. Chat & Message stats
      totalSessions,
      totalMessages,
      chatAggregations,
      userMessagesCount,
      assistantMessagesCount,

      // 4. Feedback stats
      feedbackStats,
    ] = await Promise.all([
      // Users
      this.prisma.user.count(),
      this.prisma.user.count({ where: { isActive: true } }),
      this.prisma.user.groupBy({
        by: ['role'],
        _count: { id: true },
      }),

      // Documents
      this.prisma.document.count(),
      this.prisma.document.groupBy({
        by: ['status'],
        _count: { id: true },
      }),
      this.prisma.document.aggregate({
        _sum: { sizeBytes: true },
      }),
      this.prisma.documentChunk.count(),
      this.prisma.documentChunk.aggregate({
        _sum: { tokenCount: true },
      }),

      // Chat
      this.prisma.chatSession.count(),
      this.prisma.chatMessage.count(),
      this.prisma.chatMessage.aggregate({
        _sum: { tokensUsed: true },
        _avg: { latencyMs: true },
      }),
      this.prisma.chatMessage.count({ where: { role: 'user' } }),
      this.prisma.chatMessage.count({ where: { role: 'assistant' } }),

      // Feedbacks
      Promise.all([
        this.prisma.chatFeedback.count(),
        this.prisma.chatFeedback.count({ where: { isPositive: true } }),
        this.prisma.chatFeedback.count({ where: { isPositive: false } }),
      ]),
    ]);

    // Parse Role breakdown
    const roleCounts: Record<string, number> = {
      [UserRole.EMPLOYEE]: 0,
      [UserRole.KNOWLEDGE_MANAGER]: 0,
      [UserRole.ADMIN]: 0,
    };
    usersByRole.forEach((g) => {
      roleCounts[g.role] = g._count.id;
    });

    // Parse Document status breakdown
    const statusCounts: Record<string, number> = {
      [DocumentStatus.UPLOADING]: 0,
      [DocumentStatus.PROCESSING]: 0,
      [DocumentStatus.INDEXED]: 0,
      [DocumentStatus.FAILED]: 0,
      [DocumentStatus.ARCHIVED]: 0,
      [DocumentStatus.DELETED]: 0,
    };
    docsByStatus.forEach((s) => {
      statusCounts[s.status] = s._count.id;
    });

    // Format Storage Size
    const totalStorageBytes = docAggregations._sum.sizeBytes || 0;
    const totalStorageFormatted = this.formatBytes(totalStorageBytes);

    // Token Usage & Cost Calculations
    // 1. Chat tokens from assistant messages (gpt-4o-mini blend ~$0.25 per 1M tokens)
    const chatTokens = chatAggregations._sum.tokensUsed || 0;
    // 2. Embedding tokens from indexed chunks (text-embedding-3-small $0.02 per 1M tokens)
    const embeddingTokens = chunkAggregations._sum.tokenCount || 0;
    const grandTotalTokens = chatTokens + embeddingTokens;

    const chatCostUsd = (chatTokens / 1_000_000) * 0.25;
    const embeddingCostUsd = (embeddingTokens / 1_000_000) * 0.02;
    const totalCostUsd = chatCostUsd + embeddingCostUsd;
    const totalCostVnd = Math.round(totalCostUsd * this.USD_TO_VND);

    // Feedback Calculations
    const [totalFeedbacks, totalLikes, totalDislikes] = feedbackStats;
    const satisfactionRate =
      totalFeedbacks > 0
        ? `${Math.round((totalLikes / totalFeedbacks) * 100)}%`
        : '100%';

    return {
      users: {
        total: totalUsers,
        active: activeUsers,
        inactive: totalUsers - activeUsers,
        breakdownByRole: roleCounts,
      },
      documents: {
        total: totalDocs,
        indexed: statusCounts[DocumentStatus.INDEXED] || 0,
        processing: statusCounts[DocumentStatus.PROCESSING] || 0,
        failed: statusCounts[DocumentStatus.FAILED] || 0,
        archived: statusCounts[DocumentStatus.ARCHIVED] || 0,
        breakdownByStatus: statusCounts,
        storage: {
          bytes: totalStorageBytes,
          formatted: totalStorageFormatted,
        },
        chunks: {
          total: totalChunks,
        },
      },
      chat: {
        totalSessions,
        totalMessages,
        userMessages: userMessagesCount,
        assistantMessages: assistantMessagesCount,
        avgLatencyMs: Math.round(chatAggregations._avg.latencyMs || 0),
        feedback: {
          total: totalFeedbacks,
          likes: totalLikes,
          dislikes: totalDislikes,
          satisfactionRate,
        },
      },
      tokens: {
        chatTokens,
        embeddingTokens,
        grandTotalTokens,
        costEstimate: {
          chatModel: 'gpt-4o-mini',
          embeddingModel: 'text-embedding-3-small',
          chatCostUsd: Number(chatCostUsd.toFixed(4)),
          embeddingCostUsd: Number(embeddingCostUsd.toFixed(4)),
          totalCostUsd: Number(totalCostUsd.toFixed(4)),
          totalCostVnd,
          formattedUsd: `$${totalCostUsd.toFixed(4)}`,
          formattedVnd: `${totalCostVnd.toLocaleString('vi-VN')} ₫`,
          currencyExchangeRate: this.USD_TO_VND,
        },
      },
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Truy xuất danh sách Audit Logs có phân trang và bộ lọc nâng cao
   */
  async getAuditLogs(query: AuditLogQueryDto) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    const where: any = {};

    if (query.action) {
      where.action = { contains: query.action.trim(), mode: 'insensitive' };
    }

    if (query.resourceType) {
      where.resourceType = query.resourceType.trim();
    }

    if (query.userId) {
      where.userId = query.userId.trim();
    }

    if (query.startDate || query.endDate) {
      where.createdAt = {};
      if (query.startDate) {
        where.createdAt.gte = new Date(query.startDate);
      }
      if (query.endDate) {
        where.createdAt.lte = new Date(query.endDate);
      }
    }

    if (query.search) {
      const searchTerm = query.search.trim();
      where.OR = [
        { action: { contains: searchTerm, mode: 'insensitive' } },
        { resourceType: { contains: searchTerm, mode: 'insensitive' } },
        { ipAddress: { contains: searchTerm, mode: 'insensitive' } },
      ];
    }

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              department: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      items: logs,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Helper ghi nhận nhật ký kiểm toán (Audit Log)
   */
  async recordLog(data: {
    userId?: string;
    action: string;
    resourceType?: string;
    resourceId?: string;
    ipAddress?: string;
    userAgent?: string;
    metadata?: any;
  }) {
    try {
      return await this.prisma.auditLog.create({
        data: {
          userId: data.userId || null,
          action: data.action,
          resourceType: data.resourceType || null,
          resourceId: data.resourceId || null,
          ipAddress: data.ipAddress || null,
          userAgent: data.userAgent || null,
          metadata: data.metadata || null,
        },
      });
    } catch (err: any) {
      this.logger.warn(`Failed to record audit log: ${err?.message}`);
      return null;
    }
  }

  /**
   * Chuyển đổi bytes thành định dạng đọc được (KB, MB, GB)
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  }
}
