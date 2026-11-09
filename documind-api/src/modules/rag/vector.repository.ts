import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { UserRole } from '../../common/guards/roles.guard';

export interface VectorSearchResult {
  chunkId: string;
  documentId: string;
  content: string;
  pageNumber: number | null;
  score: number; // cosine similarity (0-1)
}

export interface HybridSearchResult extends VectorSearchResult {
  ftsScore: number;
  hybridScore: number; // RRF combined score
}

@Injectable()
export class VectorRepository {
  private readonly topK: number;

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {
    this.topK = config.get<number>('RETRIEVAL_TOP_K', 5);
  }

  /**
   * Semantic vector search with RBAC metadata filtering.
   * Only searches chunks belonging to documents the user has permission to access.
   * Uses pgvector cosine distance via raw SQL.
   *
   * SECURITY: The `userRole` and `departmentId` params enforce Document-level RBAC.
   * No vectors from restricted documents are ever included in results.
   */
  async vectorSearch(
    queryEmbedding: number[],
    userRole: UserRole,
    departmentId: string | null,
    topK: number = this.topK,
  ): Promise<VectorSearchResult[]> {
    const embeddingStr = `[${queryEmbedding.join(',')}]`;

    // Build RBAC filter: user can access docs where their role is in allowed_roles
    // and (document is not department-restricted OR their department matches)
    const results = await this.prisma.$queryRaw<VectorSearchResult[]>`
      SELECT
        dc.id              AS "chunkId",
        dc.document_id     AS "documentId",
        dc.content,
        dc.page_number     AS "pageNumber",
        1 - (dc.embedding <=> ${embeddingStr}::vector) AS score
      FROM document_chunks dc
      JOIN documents d ON dc.document_id = d.id
      WHERE
        dc.is_active = true
        AND d.status = 'INDEXED'
        AND ${userRole}::text = ANY(d.allowed_roles::text[])
        AND (d.department_id IS NULL OR d.department_id = ${departmentId})
      ORDER BY dc.embedding <=> ${embeddingStr}::vector
      LIMIT ${topK}
    `;

    return results;
  }

  /**
   * Full-text search using PostgreSQL tsvector.
   * Returns chunks that contain the query keywords.
   */
  async fullTextSearch(
    query: string,
    userRole: UserRole,
    departmentId: string | null,
    topK: number = this.topK,
  ): Promise<VectorSearchResult[]> {
    const tsQuery = query
      .split(/\s+/)
      .filter(Boolean)
      .map((w) => w + ':*')
      .join(' & ');

    const results = await this.prisma.$queryRaw<VectorSearchResult[]>`
      SELECT
        dc.id              AS "chunkId",
        dc.document_id     AS "documentId",
        dc.content,
        dc.page_number     AS "pageNumber",
        ts_rank(dc.content_tsv, to_tsquery('english', ${tsQuery})) AS score
      FROM document_chunks dc
      JOIN documents d ON dc.document_id = d.id
      WHERE
        dc.is_active = true
        AND d.status = 'INDEXED'
        AND ${userRole}::text = ANY(d.allowed_roles::text[])
        AND (d.department_id IS NULL OR d.department_id = ${departmentId})
        AND dc.content_tsv @@ to_tsquery('english', ${tsQuery})
      ORDER BY score DESC
      LIMIT ${topK}
    `;

    return results;
  }

  /**
   * Save vector embedding for a document chunk.
   * Updates the embedding column via raw SQL (Prisma doesn't support vector type natively).
   */
  async saveEmbedding(chunkId: string, embedding: number[]): Promise<void> {
    const embeddingStr = `[${embedding.join(',')}]`;
    await this.prisma.$executeRaw`
      UPDATE document_chunks
      SET embedding = ${embeddingStr}::vector
      WHERE id = ${chunkId}
    `;
  }

  /**
   * Soft-delete all chunks of a document (called when document is ARCHIVED/DELETED).
   * Sets is_active = false so the chunks are excluded from future searches.
   */
  async deactivateChunksByDocument(documentId: string): Promise<void> {
    await this.prisma.documentChunk.updateMany({
      where: { documentId },
      data: { isActive: false },
    });
  }

  /**
   * Hard-delete all chunks of a document (called when document is permanently DELETED).
   */
  async deleteChunksByDocument(documentId: string): Promise<void> {
    await this.prisma.documentChunk.deleteMany({ where: { documentId } });
  }
}

