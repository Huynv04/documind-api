import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FeedbackDto } from './dto/feedback.dto';

@Injectable()
export class FeedbackService {
  private readonly logger = new Logger(FeedbackService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Lưu trữ đánh giá Like/Dislike của nhân viên đối với câu trả lời.
   */
  async recordFeedback(
    userId: string,
    messageId: string,
    dto: FeedbackDto,
    ipAddress?: string,
    userAgent?: string,
  ) {
    // 1. Kiểm tra tin nhắn tồn tại
    const message = await this.prisma.chatMessage.findUnique({
      where: { id: messageId },
      include: { session: true },
    });

    if (!message) {
      throw new NotFoundException('Không tìm thấy tin nhắn cần đánh giá');
    }

    // 2. Tìm feedback cũ hoặc tạo mới (1 user chỉ đánh giá 1 lần cho 1 message)
    const existing = await this.prisma.chatFeedback.findFirst({
      where: {
        messageId,
        userId,
      },
    });

    let feedback;
    if (existing) {
      feedback = await this.prisma.chatFeedback.update({
        where: { id: existing.id },
        data: {
          isPositive: dto.isPositive,
          comment: dto.comment,
        },
      });
      this.logger.log(
        `User ${userId} updated feedback on message ${messageId}: ${dto.isPositive ? 'LIKE' : 'DISLIKE'}`,
      );
    } else {
      feedback = await this.prisma.chatFeedback.create({
        data: {
          messageId,
          userId,
          isPositive: dto.isPositive,
          comment: dto.comment,
        },
      });
      this.logger.log(
        `User ${userId} created feedback on message ${messageId}: ${dto.isPositive ? 'LIKE' : 'DISLIKE'}`,
      );
    }

    // 3. Ghi nhận nhật ký kiểm toán (AuditLog)
    await this.prisma.auditLog.create({
      data: {
        userId,
        action: dto.isPositive ? 'FEEDBACK_LIKE' : 'FEEDBACK_DISLIKE',
        resourceType: 'CHAT_MESSAGE',
        resourceId: messageId,
        ipAddress,
        userAgent,
        metadata: {
          isPositive: dto.isPositive,
          comment: dto.comment,
          sessionId: message.sessionId,
        },
      },
    });

    return {
      success: true,
      message: dto.isPositive
        ? 'Cảm ơn bạn đã đánh giá hữu ích!'
        : 'Cảm ơn phản hồi đóng góp của bạn để cải thiện chất lượng tri thức!',
      feedback,
    };
  }

  /**
   * Thống kê tỷ lệ hài lòng (Satisfaction metrics) dành cho Knowledge Manager
   */
  async getFeedbackStats() {
    const [totalLikes, totalDislikes, totalAnswers] = await Promise.all([
      this.prisma.chatFeedback.count({ where: { isPositive: true } }),
      this.prisma.chatFeedback.count({ where: { isPositive: false } }),
      this.prisma.chatMessage.count({ where: { role: 'assistant' } }),
    ]);

    const totalFeedbacks = totalLikes + totalDislikes;
    const satisfactionRate =
      totalFeedbacks > 0 ? Math.round((totalLikes / totalFeedbacks) * 100) : 100;

    return {
      totalAnswers,
      totalFeedbacks,
      totalLikes,
      totalDislikes,
      satisfactionRate: `${satisfactionRate}%`,
    };
  }

  /**
   * Lấy danh sách câu trả lời bị Dislike để Quản lý Tri thức rà soát cập nhật tài liệu
   */
  async getDislikedMessages(page = 1, limit = 10) {
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.prisma.chatFeedback.findMany({
        where: { isPositive: false },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          message: {
            select: {
              id: true,
              content: true,
              rewrittenQuery: true,
              confidence: true,
              citations: true,
              createdAt: true,
            },
          },
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              department: { select: { name: true } },
            },
          },
        },
      }),
      this.prisma.chatFeedback.count({ where: { isPositive: false } }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}

