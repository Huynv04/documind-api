import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module';
import { ChunkingService } from './chunking.service';
import { EmbeddingService } from './embedding.service';
import { VectorRepository } from './vector.repository';
import { RetrievalService } from './retrieval.service';
import { QueryRewriterService } from './query-rewriter.service';
import { LlmClientService } from './llm-client.service';

@Module({
  imports: [ConfigModule, PrismaModule],
  providers: [
    ChunkingService,
    EmbeddingService,
    VectorRepository,
    RetrievalService,
    QueryRewriterService,
    LlmClientService,
  ],
  exports: [
    ChunkingService,
    EmbeddingService,
    VectorRepository,
    RetrievalService,
    QueryRewriterService,
    LlmClientService,
  ],
})
export class RagModule {}
