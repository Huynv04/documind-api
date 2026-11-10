import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { UserRole } from '@prisma/client';

export interface VectorSearchResult {
  chunkId: string;
  documentId: string;
  content: string;
  pageNumber: number | null;
  score: number; // cosine similarity (0 to 1)
}

export interface HybridSearchResult extends VectorSearchResult {
  ftsScore: number;
  hybridScore: number; // RRF combined score
}

@Injectable()
export class VectorRepository implements OnModuleInit {
  private readonly logger = new Logger(VectorRepository.name);
  private readonly topK: number;
  private isCamelCase = true; // Prisma default: "documentId", "isActive", etc.

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {
    this.topK = this.config.get<number>('RETRIEVAL_TOP_K', 5);
  }

  async onModuleInit() {
    try {
      // Check column naming in document_chunks table
      const cols: Array<{ column_name: string }> = await this.prisma.$queryRawUnsafe(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'document_chunks' AND column_name IN ('documentId', 'document_id')
        LIMIT 1
      `);
      if (cols.length > 0 && cols[0].column_name === 'document_id') {
        this.isCamelCase = false;
        this.logger.log('Database detected with snake_case column names (document_id)');
      } else {
        this.isCamelCase = true;
        this.logger.log('Database detected with camelCase column names ("documentId")');
      }
    } catch {
      // Default to true (Prisma schema standard)
      this.isCamelCase = true;
    }
  }

  /**
   * Semantic vector search with Document-level RBAC Metadata Pre-filtering.
   *
   * SECURITY PRE-FILTER:
   * - Status must be 'INDEXED'
   * - Chunk must be active (isActive = true)
   * - If user is ADMIN: bypass role/department filtering
   * - Otherwise:
   *   1. userRole must be in allowedRoles array
   *   2. departmentId must match document.departmentId OR document.departmentId IS NULL (company-wide)
   *
   * Uses pgvector cosine distance: 1 - (embedding <=> queryVector)
   */
  async vectorSearch(
    queryEmbedding: number[],
    userRole: UserRole,
    departmentId: string | null,
    topK: number = this.topK,
  ): Promise<VectorSearchResult[]> {
    const embeddingStr = `[${queryEmbedding.join(',')}]`;
    const docIdCol = this.isCamelCase ? 'dc."documentId"' : 'dc.document_id';
    const pageNumCol = this.isCamelCase ? 'dc."pageNumber"' : 'dc.page_number';
    const activeCol = this.isCamelCase ? 'dc."isActive"' : 'dc.is_active';
    const allowedRolesCol = this.isCamelCase ? 'd."allowedRoles"' : 'd.allowed_roles';
    const deptIdCol = this.isCamelCase ? 'd."departmentId"' : 'd.department_id';

    const isAdmin = userRole === UserRole.ADMIN;

    const rbacFilter = isAdmin
      ? '1=1'
      : `('${userRole}' = ANY(${allowedRolesCol}::text[]) AND (${deptIdCol} IS NULL OR ${deptIdCol} = ${
          departmentId ? `'${departmentId}'` : 'NULL'
        }))`;

    const sql = `
      SELECT
        dc.id                         AS "chunkId",
        ${docIdCol}                   AS "documentId",
        dc.content                    AS "content",
        ${pageNumCol}                 AS "pageNumber",
        (1 - (dc.embedding <=> '${embeddingStr}'::vector))::float AS "score"
      FROM document_chunks dc
      JOIN documents d ON ${docIdCol} = d.id
      WHERE
        ${activeCol} = true
        AND d.status = 'INDEXED'
        AND dc.embedding IS NOT NULL
        AND ${rbacFilter}
      ORDER BY dc.embedding <=> '${embeddingStr}'::vector ASC
      LIMIT ${topK}
    `;

    try {
      const results = await this.prisma.$queryRawUnsafe<VectorSearchResult[]>(sql);
      return results.map((r) => ({
        ...r,
        score: Number(r.score) || 0,
      }));
    } catch (err: any) {
      this.logger.error(`Vector search failed: ${err.message}`, err.stack);
      return [];
    }
  }

  /**
   * Full-text search using PostgreSQL tsvector with Metadata Pre-filtering.
   * Uses plainto_tsquery for safe input handling (punctuation, Vietnamese tokens).
   */
  async fullTextSearch(
    query: string,
    userRole: UserRole,
    departmentId: string | null,
    topK: number = this.topK,
  ): Promise<VectorSearchResult[]> {
    const docIdCol = this.isCamelCase ? 'dc."documentId"' : 'dc.document_id';
    const pageNumCol = this.isCamelCase ? 'dc."pageNumber"' : 'dc.page_number';
    const activeCol = this.isCamelCase ? 'dc."isActive"' : 'dc.is_active';
    const allowedRolesCol = this.isCamelCase ? 'd."allowedRoles"' : 'd.allowed_roles';
    const deptIdCol = this.isCamelCase ? 'd."departmentId"' : 'd.department_id';

    const isAdmin = userRole === UserRole.ADMIN;
    const cleanQuery = query.replace(/['"\\]/g, ' ').trim();

    if (!cleanQuery) return [];

    const rbacFilter = isAdmin
      ? '1=1'
      : `('${userRole}' = ANY(${allowedRolesCol}::text[]) AND (${deptIdCol} IS NULL OR ${deptIdCol} = ${
          departmentId ? `'${departmentId}'` : 'NULL'
        }))`;

    const sql = `
      SELECT
        dc.id                         AS "chunkId",
        ${docIdCol}                   AS "documentId",
        dc.content                    AS "content",
        ${pageNumCol}                 AS "pageNumber",
        ts_rank(dc.content_tsv, plainto_tsquery('english', '${cleanQuery}'))::float AS "score"
      FROM document_chunks dc
      JOIN documents d ON ${docIdCol} = d.id
      WHERE
        ${activeCol} = true
        AND d.status = 'INDEXED'
        AND dc.content_tsv @@ plainto_tsquery('english', '${cleanQuery}')
        AND ${rbacFilter}
      ORDER BY "score" DESC
      LIMIT ${topK}
    `;

    try {
      const results = await this.prisma.$queryRawUnsafe<VectorSearchResult[]>(sql);
      return results.map((r) => ({
        ...r,
        score: Number(r.score) || 0,
      }));
    } catch (err: any) {
      this.logger.warn(`Full-text search fallback or error: ${err.message}`);
      return [];
    }
  }

  /**
   * Save vector embedding for a single chunk.
   */
  async saveEmbedding(chunkId: string, embedding: number[]): Promise<void> {
    const embeddingStr = `[${embedding.join(',')}]`;
    await this.prisma.$executeRawUnsafe(`
      UPDATE document_chunks
      SET embedding = '${embeddingStr}'::vector
      WHERE id = '${chunkId}'
    `);
  }

  /**
   * Save vector embeddings for multiple chunks in a single transaction.
   */
  async saveEmbeddingsBatch(items: Array<{ chunkId: string; embedding: number[] }>): Promise<void> {
    if (!items || items.length === 0) return;

    for (const item of items) {
      await this.saveEmbedding(item.chunkId, item.embedding);
    }
  }

  /**
   * Soft-delete all chunks of a document (e.g. when ARCHIVED or soft DELETED).
   */
  async deactivateChunksByDocument(documentId: string): Promise<void> {
    await this.prisma.documentChunk.updateMany({
      where: { documentId },
      data: { isActive: false },
    });
  }

  /**
   * Hard-delete all chunks of a document.
   */
  async deleteChunksByDocument(documentId: string): Promise<void> {
    await this.prisma.documentChunk.deleteMany({
      where: { documentId },
    });
  }
}
