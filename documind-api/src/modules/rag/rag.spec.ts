import { describe, it, expect, beforeEach } from '@jest/globals';
import { ConfigService } from '@nestjs/config';
import { ChunkingService } from './chunking.service';
import { RetrievalService } from './retrieval.service';
import { VectorRepository } from './vector.repository';
import { EmbeddingService } from './embedding.service';
import { QueryRewriterService } from './query-rewriter.service';
import { LlmClientService } from './llm-client.service';
import { UserRole } from '@prisma/client';

describe('RAG Module Services', () => {
  describe('ChunkingService', () => {
    let service: ChunkingService;

    beforeEach(() => {
      const config = new ConfigService({
        CHUNK_SIZE: 150,
        CHUNK_OVERLAP: 30,
      });
      service = new ChunkingService(config);
    });

    it('should accurately count tokens using tiktoken', () => {
      const tokens = service.countTokens('Hello world');
      expect(tokens).toBe(2);
    });

    it('should preserve Markdown tables and not break them across rows', () => {
      const markdown = `
# Quy định

Nội dung trước bảng.

| Mã | Tên phòng ban | Phụ cấp |
| :--- | :--- | :--- |
| IT | Kỹ thuật | 1000 |
| HR | Nhân sự | 800 |
| FIN | Tài chính | 900 |

Nội dung sau bảng.
`;
      const chunks = service.chunkText(markdown, 1);
      expect(chunks.length).toBeGreaterThan(0);

      // Ensure the table block exists with its headers
      const tableChunk = chunks.find((c) => c.content.includes('| Mã | Tên phòng ban |'));
      expect(tableChunk).toBeDefined();
      expect(tableChunk?.content).toContain('| IT | Kỹ thuật |');
    });

    it('should split oversized tables and duplicate the header row', () => {
      const smallChunkConfig = new ConfigService({
        CHUNK_SIZE: 50,
        CHUNK_OVERLAP: 10,
      });
      const smallChunker = new ChunkingService(smallChunkConfig);

      const largeTable = `
| STT | Họ tên | Vai trò | Chức vụ | Phòng ban |
| :--- | :--- | :--- | :--- | :--- |
| 1 | Nguyễn Văn A | Trưởng nhóm | Kỹ sư | Phát triển phần mềm |
| 2 | Trần Thị B | Chuyên viên | Tester | Đảm bảo chất lượng |
| 3 | Lê Văn C | Trưởng phòng | Quản lý | Tài chính kế toán |
| 4 | Phạm Thị D | Nhân viên | Kế toán | Kế toán nội bộ |
| 5 | Hoàng Văn E | Giám đốc | Lãnh đạo | Ban giám đốc |
`;
      const chunks = smallChunker.chunkText(largeTable, undefined, { chunkSize: 50, chunkOverlap: 10 });
      expect(chunks.length).toBeGreaterThan(1);
      for (const chunk of chunks) {
        expect(chunk.content).toContain('| STT | Họ tên |');
      }
    });
  });

  describe('RetrievalService - RRF Fusion', () => {
    let retrieval: RetrievalService;
    let mockEmbedding: any;
    let mockVectorRepo: any;

    beforeEach(() => {
      const config = new ConfigService({ RETRIEVAL_TOP_K: 3 });

      mockEmbedding = {
        embed: async (_text: string) => new Array(1536).fill(0.1),
      };

      mockVectorRepo = {
        vectorSearch: async () => [
          { chunkId: 'c1', documentId: 'd1', content: 'Doc 1 chunk 1', pageNumber: 1, score: 0.9 },
          { chunkId: 'c2', documentId: 'd1', content: 'Doc 1 chunk 2', pageNumber: 2, score: 0.8 },
        ],
        fullTextSearch: async () => [
          { chunkId: 'c2', documentId: 'd1', content: 'Doc 1 chunk 2', pageNumber: 2, score: 1.5 },
          { chunkId: 'c3', documentId: 'd2', content: 'Doc 2 chunk 1', pageNumber: 1, score: 1.2 },
        ],
      };

      retrieval = new RetrievalService(
        mockEmbedding as EmbeddingService,
        mockVectorRepo as VectorRepository,
        config,
      );
    });

    it('should boost chunks appearing in both Vector search and FTS via RRF', async () => {
      const results = await retrieval.retrieve('test query', UserRole.EMPLOYEE, 'dept-1', 3);

      expect(results.length).toBe(3);
      // c2 appears in BOTH Vector (rank 2) and FTS (rank 1), so its combined RRF score is highest
      expect(results[0].chunkId).toBe('c2');
      expect(results[0].sourceType).toBe('both');
    });
  });

  describe('QueryRewriterService', () => {
    it('should return original query when history is empty', async () => {
      const config = new ConfigService();
      const rewriter = new QueryRewriterService(config);

      const result = await rewriter.rewrite('Chính sách nghỉ phép?', []);
      expect(result).toBe('Chính sách nghỉ phép?');
    });
  });

  describe('LlmClientService', () => {
    it('should return default not-found response when no chunks are found', async () => {
      const config = new ConfigService();
      const llm = new LlmClientService(config);

      const result = await llm.generateAnswer('Câu hỏi?', []);
      expect(result.answer).toBe('Tôi không tìm thấy thông tin này trong tài liệu nội bộ.');
      expect(result.confidence).toBe('low');
      expect(result.sources).toEqual([]);
    });

    it('should stream fallback response when chunks are empty', async () => {
      const config = new ConfigService();
      const llm = new LlmClientService(config);

      const events: any[] = [];
      for await (const chunk of llm.generateAnswerStream('Câu hỏi?', [])) {
        events.push(chunk);
      }

      expect(events[0]).toEqual({
        type: 'token',
        content: 'Tôi không tìm thấy thông tin này trong tài liệu nội bộ.',
      });
      expect(events[1]).toEqual({
        type: 'sources',
        data: { sources: [], confidence: 'low' },
      });
    });
  });
});
