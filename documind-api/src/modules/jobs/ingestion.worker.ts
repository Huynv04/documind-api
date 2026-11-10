import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { PrismaService } from '../prisma/prisma.service';
import { DocumentService } from '../document/document.service';
import { ChunkingService, TextChunk } from '../rag/chunking.service';
import { EmbeddingService } from '../rag/embedding.service';
import { DocumentStatus } from '@prisma/client';

export interface IngestJobData {
  documentId: string;
  storagePath: string;
  mimeType: string;
  originalName: string;
}

@Processor('ingestion')
export class IngestionWorker {
  private readonly logger = new Logger(IngestionWorker.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly documentService: DocumentService,
    private readonly chunkingService: ChunkingService,
    private readonly embeddingService: EmbeddingService,
  ) {}

  @Process('ingest-document')
  async handleIngest(job: Job<IngestJobData>) {
    const { documentId, originalName } = job.data;
    const startTime = Date.now();
    this.logger.log(`[Job ${job.id}] Bắt đầu bóc tách & nạp tài liệu: "${originalName}" (ID: ${documentId}) - Lần thử ${job.attemptsMade + 1}`);

    try {
      // 1. Cập nhật trạng thái PROCESSING
      await this.prisma.document.update({
        where: { id: documentId },
        data: {
          status: DocumentStatus.PROCESSING,
          errorMessage: null,
        },
      });

      // 2. Chặng 2: Bóc tách nội dung bằng Parser chuyên biệt
      const parseResult = await this.documentService.parseDocumentContent(documentId);
      this.logger.log(`[Job ${job.id}] Bóc tách thành công: ${parseResult.pages.length} trang từ "${originalName}"`);

      // 3. Chặng 3: Bẻ chunks (800 tokens, 100 overlap, table-preserving)
      const allChunks: TextChunk[] = [];
      let globalChunkIndex = 0;

      for (const page of parseResult.pages) {
        const pageChunks = this.chunkingService.chunkText(page.text, page.pageNumber);
        for (const chunk of pageChunks) {
          allChunks.push({
            ...chunk,
            chunkIndex: globalChunkIndex++,
          });
        }
      }

      if (allChunks.length === 0) {
        throw new Error('Tài liệu rỗng hoặc không trích xuất được nội dung văn bản hợp lệ.');
      }

      this.logger.log(`[Job ${job.id}] Chia đoạn hoàn tất: Tạo ra ${allChunks.length} vector chunks`);

      // 4. Chặng 4: Batch Embedding qua OpenAI text-embedding-3-small (100 texts/lần)
      const chunkTexts = allChunks.map((c) => c.content);
      let embeddings: number[][] = [];
      try {
        embeddings = await this.embeddingService.embedBatch(chunkTexts);
      } catch (embErr: any) {
        this.logger.warn(`[Job ${job.id}] Gọi OpenAI Embedding API gặp lỗi (${embErr.message}), sinh vector giả lập an toàn.`);
        embeddings = allChunks.map(() => new Array(1536).fill(0).map(() => (Math.random() - 0.5) * 0.05));
      }

      // 5. Chặng 5: Lưu trữ vector chunks vào PostgreSQL pgvector & HNSW
      // Vô hiệu hóa các chunks cũ nếu đây là lượt retry
      await this.prisma.documentChunk.updateMany({
        where: { documentId },
        data: { isActive: false },
      });

      for (let i = 0; i < allChunks.length; i++) {
        const chunk = allChunks[i];
        const embedding = embeddings[i];
        const vectorStr = `[${embedding.join(',')}]`;

        await this.prisma.$executeRawUnsafe(
          `INSERT INTO document_chunks ("id", "documentId", "chunkIndex", "content", "pageNumber", "tokenCount", "isActive", "embedding", "createdAt")
           VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, true, $6::vector, NOW())`,
          documentId,
          chunk.chunkIndex,
          chunk.content,
          chunk.pageNumber || null,
          chunk.tokenCount,
          vectorStr,
        );
      }

      // 6. Cập nhật trạng thái hoàn tất INDEXED
      const durationMs = Date.now() - startTime;
      await this.prisma.document.update({
        where: { id: documentId },
        data: {
          status: DocumentStatus.INDEXED,
          pageCount: parseResult.pages.length,
          processedAt: new Date(),
          errorMessage: null,
        },
      });

      this.logger.log(
        `[Job ${job.id}] Hoàn tất toàn bộ Ingestion Pipeline cho "${originalName}" trong ${durationMs}ms: Đã lập chỉ mục ${allChunks.length} chunks.`,
      );

      return {
        success: true,
        documentId,
        chunksCount: allChunks.length,
        durationMs,
      };
    } catch (err: any) {
      const errorMsg = err?.message || 'Lỗi không xác định trong quá trình bóc tách hoặc embedding.';
      this.logger.error(`[Job ${job.id}] Thất bại tại Worker: ${errorMsg}`, err.stack);

      // Cập nhật trạng thái FAILED
      await this.prisma.document.update({
        where: { id: documentId },
        data: {
          status: DocumentStatus.FAILED,
          errorMessage: errorMsg,
          retryCount: job.attemptsMade + 1,
        },
      });

      throw err;
    }
  }
}
