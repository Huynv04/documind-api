import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../document/storage/storage.service';
import { PdfParser } from '../document/parsers/pdf.parser';
import { DocxParser } from '../document/parsers/docx.parser';
import { MarkdownParser } from '../document/parsers/markdown.parser';
import { ChunkingService, TextChunk } from '../rag/chunking.service';
import { EmbeddingService } from '../rag/embedding.service';
import { VectorRepository } from '../rag/vector.repository';

interface IngestionJobData {
  documentId: string;
  storageKey: string;
  mimeType: string;
}

@Processor('ingestion')
export class IngestionWorker {
  private readonly logger = new Logger(IngestionWorker.name);

  constructor(
    private prisma: PrismaService,
    private storage: StorageService,
    private pdfParser: PdfParser,
    private docxParser: DocxParser,
    private mdParser: MarkdownParser,
    private chunkingService: ChunkingService,
    private embeddingService: EmbeddingService,
    private vectorRepo: VectorRepository,
  ) {}

  @Process('process-document')
  async handleProcessDocument(job: Job<IngestionJobData>) {
    const { documentId, storageKey, mimeType } = job.data;
    this.logger.log(`[Job ${job.id}] Ingesting document: ${documentId}`);

    try {
      // 1. Update status to PROCESSING
      await this.prisma.document.update({
        where: { id: documentId },
        data: { status: 'PROCESSING' },
      });

      // 2. Fetch file buffer from storage
      const buffer = await this.storage.getFileBuffer(storageKey);

      // 3. Parse file based on mime-type
      let allChunks: TextChunk[] = [];
      let pageCount = 1;

      if (mimeType === 'application/pdf') {
        const parsed = await this.pdfParser.parse(buffer);
        pageCount = parsed.pageCount;
        // Chunk per page to retain page numbers for accurate citations
        for (const page of parsed.pages) {
          if (page.text.trim()) {
            const pageChunks = this.chunkingService.chunkText(page.text, page.pageNumber);
            allChunks.push(...pageChunks);
          }
        }
      } else if (
        mimeType ===
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ) {
        const parsed = await this.docxParser.parse(buffer);
        allChunks = this.chunkingService.chunkText(parsed.text);
      } else {
        const parsed = await this.mdParser.parse(buffer);
        allChunks = this.chunkingService.chunkText(parsed.text);
      }

      this.logger.log(
        `[Job ${job.id}] Extracted ${allChunks.length} chunks from document ${documentId}`,
      );

      if (allChunks.length === 0) {
        throw new Error('No readable text content extracted from document');
      }

      // 4. Batch generate embeddings for all chunks
      const texts = allChunks.map((c) => c.content);
      const embeddings = await this.embeddingService.embedBatch(texts);

      // 5. Store chunks in database and update pgvector column
      for (let i = 0; i < allChunks.length; i++) {
        const chunk = allChunks[i];
        const embedding = embeddings[i];

        const savedChunk = await this.prisma.documentChunk.create({
          data: {
            documentId,
            chunkIndex: i,
            content: chunk.content,
            pageNumber: chunk.pageNumber ?? null,
            tokenCount: chunk.tokenCount,
            isActive: true,
          },
        });

        // Update vector column via raw SQL
        await this.vectorRepo.saveEmbedding(savedChunk.id, embedding);
      }

      // 6. Update document status to INDEXED
      await this.prisma.document.update({
        where: { id: documentId },
        data: {
          status: 'INDEXED',
          pageCount,
          processedAt: new Date(),
        },
      });

      this.logger.log(`[Job ${job.id}] Successfully indexed document: ${documentId}`);
    } catch (err) {
      this.logger.error(`[Job ${job.id}] Ingestion failed for ${documentId}: ${err.message}`);

      await this.prisma.document.update({
        where: { id: documentId },
        data: {
          status: 'FAILED',
          errorMessage: err.message,
          retryCount: { increment: 1 },
        },
      });

      throw err; // Re-throw to trigger Bull backoff/retry
    }
  }
}
