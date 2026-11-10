import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  Res,
  Ip,
  Headers,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { Response } from 'express';
import { ChatService } from './chat.service';
import { FeedbackService } from './feedback.service';
import { QueryDto } from './dto/query.dto';
import { FeedbackDto } from './dto/feedback.dto';

@ApiTags('Chat')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('chat')
export class ChatController {
  constructor(
    private readonly chatService: ChatService,
    private readonly feedbackService: FeedbackService,
  ) {}

  @Post('query')
  @ApiOperation({
    summary: 'Endpoint đồng bộ: Hỏi đáp tri thức RAG (Hybrid Search + Query Rewriting + Grounded LLM)',
    description: 'Trả về câu trả lời dạng JSON đầy đủ kèm nguồn trích dẫn, điểm tương đồng và độ tin cậy.',
  })
  @ApiResponse({ status: 200, description: 'Trả lời thành công với JSON có cấu trúc' })
  async query(
    @Body() dto: QueryDto,
    @Req() req: any,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string,
  ) {
    return this.chatService.processQuery(dto, req.user, ip, userAgent);
  }

  @Post('query/stream')
  @ApiOperation({
    summary: 'Endpoint streaming: Trả về Server-Sent Events (SSE) theo thời gian thực',
    description: 'Đẩy từng token qua SSE (data: {"type":"token","content":"..."}) và trả về sources ở cuối luồng.',
  })
  async streamPost(
    @Body() dto: QueryDto,
    @Req() req: any,
    @Res() res: Response,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string,
  ) {
    return this.chatService.streamQuery(dto, req.user, res, ip, userAgent);
  }

  @Get('query/stream')
  @ApiOperation({
    summary: 'Endpoint streaming (GET): Hỗ trợ EventSource chuẩn trình duyệt',
  })
  async streamGet(
    @Query() dto: QueryDto,
    @Req() req: any,
    @Res() res: Response,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string,
  ) {
    return this.chatService.streamQuery(dto, req.user, res, ip, userAgent);
  }

  @Get('sessions')
  @ApiOperation({ summary: 'Lấy danh sách các phiên trò chuyện của người dùng' })
  async getSessions(@Req() req: any) {
    return this.chatService.getSessions(req.user.id);
  }

  @Post('sessions')
  @ApiOperation({ summary: 'Tạo mới một phiên trò chuyện' })
  async createSession(@Body('title') title: string, @Req() req: any) {
    return this.chatService.getOrCreateSession(req.user.id);
  }

  @Get('sessions/:id/messages')
  @ApiOperation({ summary: 'Lấy toàn bộ tin nhắn trong một phiên' })
  async getSessionMessages(@Param('id') sessionId: string, @Req() req: any) {
    return this.chatService.getSessionMessages(req.user.id, sessionId);
  }

  @Patch('sessions/:id')
  @ApiOperation({ summary: 'Đổi tên chủ đề phiên trò chuyện' })
  async updateSessionTitle(
    @Param('id') sessionId: string,
    @Body('title') title: string,
    @Req() req: any,
  ) {
    return this.chatService.updateSessionTitle(req.user.id, sessionId, title);
  }

  @Delete('sessions/:id')
  @ApiOperation({ summary: 'Xóa một phiên trò chuyện' })
  async deleteSession(@Param('id') sessionId: string, @Req() req: any) {
    return this.chatService.deleteSession(req.user.id, sessionId);
  }

  @Post(':id/feedback')
  @ApiOperation({ summary: 'Feedback API: Lưu trữ Like / Dislike của nhân viên' })
  async feedback(
    @Param('id') messageId: string,
    @Body() dto: FeedbackDto,
    @Req() req: any,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string,
  ) {
    return this.feedbackService.recordFeedback(req.user.id, messageId, dto, ip, userAgent);
  }

  @Get('feedback/stats')
  @ApiOperation({ summary: 'Thống kê tỷ lệ hài lòng câu trả lời (Dành cho Quản trị viên tri thức)' })
  async getFeedbackStats() {
    return this.feedbackService.getFeedbackStats();
  }

  @Get('feedback/disliked')
  @ApiOperation({ summary: 'Danh sách các câu trả lời bị Dislike cần cập nhật tài liệu' })
  async getDislikedMessages(
    @Query('page') page = '1',
    @Query('limit') limit = '10',
  ) {
    return this.feedbackService.getDislikedMessages(parseInt(page, 10), parseInt(limit, 10));
  }
}
