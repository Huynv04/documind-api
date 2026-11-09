import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MetricsService {
  constructor(private prisma: PrismaService) {}

  /** System metrics overview */
  async getOverview() {
    const [totalUsers, totalDocs, indexedDocs, totalSessions, totalMessages, tokenStats] =
      await Promise.all([
        this.prisma.user.count(),
        this.prisma.document.count(),
        this.prisma.document.count({ where: { status: 'INDEXED' } }),
        this.prisma.chatSession.count(),
        this.prisma.chatMessage.count(),
        this.prisma.chatMessage.aggregate({
          _sum: { tokensUsed: true },
          _avg: { latencyMs: true },
        }),
      ]);

    // Rough estimated OpenAI cost (assuming $0.15 per 1M tokens for gpt-4o-mini)
    const totalTokens = tokenStats._sum.tokensUsed || 0;
    const estimatedCostUsd = (totalTokens / 1_000_000) * 0.15;

    return {
      users: { total: totalUsers },
      documents: { total: totalDocs, indexed: indexedDocs },
      chat: {
        totalSessions,
        totalMessages,
        avgLatencyMs: Math.round(tokenStats._avg.latencyMs || 0),
      },
      tokens: {
        totalUsed: totalTokens,
        estimatedCostUsd: Number(estimatedCostUsd.toFixed(4)),
      },
    };
  }

  /** Audit logs with pagination */
  async getAuditLogs(page = 1, limit = 50) {
    const skip = (page - 1) * limit;
    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { id: true, name: true, email: true, role: true } } },
      }),
      this.prisma.auditLog.count(),
    ]);

    return {
      logs,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }
}
