import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { ChatService } from './chat.service';
import { QueryDto } from './dto/query.dto';
import { FeedbackDto } from './dto/feedback.dto';

@ApiTags('Chat')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post('query')
  @ApiOperation({ summary: 'Hỏi đáp tri thức RAG (Hybrid Search + Query Rewriting + Grounded LLM)' })
  async query(@Body() dto: QueryDto, @Req() req: any) {
    return this.chatService.processQuery(dto, req.user);
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

  @Delete('sessions/:id')
  @ApiOperation({ summary: 'Xóa một phiên trò chuyện' })
  async deleteSession(@Param('id') sessionId: string, @Req() req: any) {
    return this.chatService.deleteSession(req.user.id, sessionId);
  }

  @Post(':id/feedback')
  @ApiOperation({ summary: 'Gửi đánh giá Like / Dislike cho câu trả lời' })
  async feedback(
    @Param('id') messageId: string,
    @Body() dto: FeedbackDto,
    @Req() req: any,
  ) {
    return this.chatService.recordFeedback(req.user.id, messageId, dto);
  }
}

