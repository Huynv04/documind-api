import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { PrismaModule } from '../prisma/prisma.module';
import { DocumentModule } from '../document/document.module';
import { RagModule } from '../rag/rag.module';
import { IngestionWorker } from './ingestion.worker';
import { JobsService } from './jobs.service';
import { JobsController } from './jobs.controller';

@Module({
  imports: [
    PrismaModule,
    DocumentModule,
    RagModule,
    BullModule.registerQueue({
      name: 'ingestion',
    }),
  ],
  controllers: [JobsController],
  providers: [JobsService, IngestionWorker],
  exports: [JobsService],
})
export class JobsModule {}

