import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UserRole } from '@prisma/client';
import { EmbeddingService } from './embedding.service';
import { VectorRepository, VectorSearchResult } from './vector.repository';

export interface RetrievedChunk extends VectorSearchResult {
  rank: number;
  rrfScore?: number;
  sourceType?: 'vector' | 'fts' | 'both';
}

@Injectable()
export class RetrievalService {
  private readonly logger = new Logger(RetrievalService.name);
  private readonly topK: number;

  constructor(
    private embedding: EmbeddingService,
    private vectorRepo: VectorRepository,
    private config: ConfigService,
  ) {
    this.topK = this.config.get<number>('RETRIEVAL_TOP_K', 5);
  }

  /**
   * Hybrid Retrieval = Vector Search + Full-Text Search + RRF (Reciprocal Rank Fusion).
   *
   * RRF score formula: sum(1 / (k + rank_i)) for each result list
   * Default k = 60 (from Cormack et al., 2009).
   *
   * This approach combines:
   * 1. Semantic understanding (vector search) -> conceptual/semantic queries
   * 2. Keyword matching (FTS) -> acronyms, product names, numbers, error codes
   */
  async retrieve(
    query: string,
    userRole: UserRole,
    departmentId: string | null,
    limit: number = this.topK,
  ): Promise<RetrievedChunk[]> {
    const cleanQuery = (query || '').trim();
    if (!cleanQuery) return [];

    const RRF_K = 60;
    const fetchLimit = limit * 2; // Fetch 2x topK for fusion

    // 1. Generate query embedding and run FTS in parallel
    let queryVector: number[] = [];
    let ftsResults: VectorSearchResult[] = [];

    try {
      const [vector, fts] = await Promise.all([
        this.embedding.embed(cleanQuery).catch((err) => {
          this.logger.warn(`Query embedding failed: ${err.message}. Relying on FTS only.`);
          return [] as number[];
        }),
        this.vectorRepo.fullTextSearch(cleanQuery, userRole, departmentId, fetchLimit).catch((err) => {
          this.logger.warn(`FTS query failed: ${err.message}. Relying on Vector search only.`);
          return [] as VectorSearchResult[];
        }),
      ]);
      queryVector = vector;
      ftsResults = fts;
    } catch (err: any) {
      this.logger.error(`Retrieval parallel fetch failed: ${err.message}`, err.stack);
    }

    // 2. Run vector search if embedding was successful
    let vectorResults: VectorSearchResult[] = [];
    if (queryVector.length > 0) {
      vectorResults = await this.vectorRepo.vectorSearch(
        queryVector,
        userRole,
        departmentId,
        fetchLimit,
      );
    }

    this.logger.debug(
      `Hybrid Search: Vector found ${vectorResults.length} chunks, FTS found ${ftsResults.length} chunks`,
    );

    // 3. Compute RRF fusion scores
    const scoreMap = new Map<
      string,
      {
        chunk: VectorSearchResult;
        rrfScore: number;
        sourceType: 'vector' | 'fts' | 'both';
      }
    >();

    // Process Vector search rankings
    vectorResults.forEach((chunk, index) => {
      const rank = index + 1; // 1-based rank
      const rrfScore = 1 / (RRF_K + rank);
      scoreMap.set(chunk.chunkId, {
        chunk,
        rrfScore,
        sourceType: 'vector',
      });
    });

    // Process FTS rankings and fuse
    ftsResults.forEach((chunk, index) => {
      const rank = index + 1; // 1-based rank
      const rrfScore = 1 / (RRF_K + rank);
      const existing = scoreMap.get(chunk.chunkId);
      if (existing) {
        existing.rrfScore += rrfScore; // Combined boost for chunks appearing in both
        existing.sourceType = 'both';
      } else {
        scoreMap.set(chunk.chunkId, {
          chunk,
          rrfScore,
          sourceType: 'fts',
        });
      }
    });

    // 4. Sort descending by RRF score and slice to top-K
    const fusedResults = Array.from(scoreMap.values())
      .sort((a, b) => b.rrfScore - a.rrfScore)
      .slice(0, limit)
      .map(({ chunk, rrfScore, sourceType }, index) => ({
        ...chunk,
        rank: index + 1,
        rrfScore,
        sourceType,
      }));

    return fusedResults;
  }
}
