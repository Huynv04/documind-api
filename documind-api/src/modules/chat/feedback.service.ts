import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FeedbackDto } from './dto/feedback.dto';

@Injectable()
export class FeedbackService {
  constructor(private prisma: PrismaService) {}

  async submitFeedback(messageId: string, userId: string, dto: FeedbackDto) {
    return this.prisma.chatFeedback.create({
      data: {
        messageId,
        userId,
        isPositive: dto.isPositive,
        comment: dto.comment,
      },
    });
  }

  /** Feedback summary for Knowledge Manager dashboard */
  async getFeedbackSummary() {
    const [total, negative] = await Promise.all([
      this.prisma.chatFeedback.count(),
      this.prisma.chatFeedback.count({ where: { isPositive: false } }),
    ]);
    return { total, negative, positiveRate: total ? ((total - negative) / total) * 100 : 0 };
  }

  /** Most disliked messages (for Knowledge Manager to review) */
  async getMostDisliked(limit = 20) {
    return this.prisma.chatMessage.findMany({
      where: { feedbacks: { some: { isPositive: false } } },
      include: {
        feedbacks: { where: { isPositive: false }, select: { comment: true, createdAt: true } },
      },
      orderBy: { feedbacks: { _count: 'desc' } },
      take: limit,
    });
  }
}

