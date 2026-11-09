import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { FeedbackService } from './feedback.service';
import { RagModule } from '../rag/rag.module';

@Module({
  imports: [RagModule],
  controllers: [ChatController],
  providers: [ChatService, FeedbackService],
})
export class ChatModule {}

