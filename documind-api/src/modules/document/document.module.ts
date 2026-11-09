import { Module } from '@nestjs/common';
import { DocumentController } from './document.controller';
import { DocumentService } from './document.service';
import { PdfParser } from './parsers/pdf.parser';
import { DocxParser } from './parsers/docx.parser';
import { MarkdownParser } from './parsers/markdown.parser';
import { StorageService } from './storage/storage.service';
import { RagModule } from '../rag/rag.module';
import { JobsModule } from '../jobs/jobs.module';

@Module({
  imports: [RagModule, JobsModule],
  controllers: [DocumentController],
  providers: [
    DocumentService,
    PdfParser,
    DocxParser,
    MarkdownParser,
    StorageService,
  ],
  exports: [DocumentService, StorageService],
})
export class DocumentModule {}

