import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Res,
  UseGuards,
  HttpCode,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Response } from 'express';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ChatService } from './chat.service';
import { FeedbackService } from './feedback.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { QueryDto } from './dto/query.dto';
import { FeedbackDto } from './dto/feedback.dto';

@ApiTags('Chat')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('chat')
export class ChatController {
  constructor(
    private chatService: ChatService,
    private feedbackService: FeedbackService,
  ) {}

  @Post('sessions')
  @ApiOperation({ summary: 'Create a new chat session' })
  createSession(@CurrentUser() user: any) {
    return this.chatService.createSession(user.id);
  }

  @Get('sessions')
  @ApiOperation({ summary: 'Get all chat sessions for current user' })
  getSessions(@CurrentUser() user: any) {
    return this.chatService.getSessions(user.id);
  }

  @Get('sessions/:sessionId/messages')
  @ApiOperation({ summary: 'Get all messages in a session' })
  getMessages(@Param('sessionId') sessionId: string, @CurrentUser() user: any) {
    return this.chatService.getMessages(sessionId, user.id);
  }

  @Post('query')
  @HttpCode(200)
  @ApiOperation({ summary: 'Ask a question (synchronous, full JSON response)' })
  async query(@Body() dto: QueryDto, @CurrentUser() user: any) {
    return this.chatService.query(dto, user.id, user.role, user.departmentId ?? null);
  }

  @Post('query/stream')
  @ApiOperation({ summary: 'Ask a question (SSE streaming – tokens delivered in real time)' })
  async queryStream(
    @Body() dto: QueryDto,
    @CurrentUser() user: any,
    @Res() res: Response,
  ) {
    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable Nginx buffering

    res.flushHeaders();

    try {
      for await (const chunk of this.chatService.queryStream(
        dto,
        user.id,
        user.role,
        user.departmentId ?? null,
      )) {
        res.write(chunk);
      }
    } catch (err) {
      res.write(`data: ${JSON.stringify({ type: 'error', message: err.message })}\n\n`);
    } finally {
      res.end();
    }
  }

  @Post('messages/:messageId/feedback')
  @HttpCode(200)
  @ApiOperation({ summary: 'Submit feedback (Like/Dislike) for a message' })
  feedback(
    @Param('messageId') messageId: string,
    @Body() dto: FeedbackDto,
    @CurrentUser() user: any,
  ) {
    return this.feedbackService.submitFeedback(messageId, user.id, dto);
  }
}

