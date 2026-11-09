import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ConfigService } from '@nestjs/config';
import { IngestionWorker } from './ingestion.worker';
import { RagModule } from '../rag/rag.module';
import { PdfParser } from '../document/parsers/pdf.parser';
import { DocxParser } from '../document/parsers/docx.parser';
import { MarkdownParser } from '../document/parsers/markdown.parser';
import { StorageService } from '../document/storage/storage.service';

@Module({
  imports: [
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        redis: {
          host: config.get('REDIS_HOST', 'localhost'),
          port: config.get<number>('REDIS_PORT', 6379),
          password: config.get('REDIS_PASSWORD') || undefined,
        },
      }),
    }),
    BullModule.registerQueue({
      name: 'ingestion',
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: true,
      },
    }),
    RagModule,
  ],
  providers: [
    IngestionWorker,
    PdfParser,
    DocxParser,
    MarkdownParser,
    StorageService,
  ],
  exports: [BullModule],
})
export class JobsModule {}
