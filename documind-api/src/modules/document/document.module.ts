import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { DocumentController } from './document.controller';
import { DocumentService } from './document.service';
import { StorageService } from './storage/storage.service';
import { PdfParser } from './parsers/pdf.parser';
import { DocxParser } from './parsers/docx.parser';
import { MarkdownParser } from './parsers/markdown.parser';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [
    PrismaModule,
    BullModule.registerQueue({
      name: 'ingestion',
    }),
  ],
  controllers: [DocumentController],
  providers: [
    DocumentService,
    StorageService,
    PdfParser,
    DocxParser,
    MarkdownParser,
  ],
  exports: [
    DocumentService,
    StorageService,
    PdfParser,
    DocxParser,
    MarkdownParser,
  ],
})
export class DocumentModule {}

