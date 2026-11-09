import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UserRole } from '../../common/guards/roles.guard';
import { EmbeddingService } from './embedding.service';
import { VectorRepository, VectorSearchResult } from './vector.repository';

export interface RetrievedChunk extends VectorSearchResult {
  rank: number;
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
    this.topK = config.get<number>('RETRIEVAL_TOP_K', 5);
  }

  /**
   * Hybrid Retrieval = Vector Search + Full-Text Search + RRF (Reciprocal Rank Fusion)
   *
   * RRF score formula: sum(1 / (k + rank_i)) for each result list
   * Default k=60 from the original RRF paper (Cormack et al., 2009)
   *
   * This approach combines:
   * - Semantic understanding (vector search) → great for conceptual questions
   * - Exact keyword matching (FTS) → great for codes, error messages, specific terms
   */
  async retrieve(
    query: string,
    userRole: UserRole,
    departmentId: string | null,
  ): Promise<RetrievedChunk[]> {
    const RRF_K = 60;

    // Run vector search and FTS in parallel
    const [queryVector, ftsResults] = await Promise.all([
      this.embedding.embed(query),
      this.vectorRepo.fullTextSearch(query, userRole, departmentId, this.topK * 2),
    ]);

    const vectorResults = await this.vectorRepo.vectorSearch(
      queryVector,
      userRole,
      departmentId,
      this.topK * 2,
    );

    this.logger.debug(
      `Vector: ${vectorResults.length} results, FTS: ${ftsResults.length} results`,
    );

    // Build RRF score map: chunkId → combined score
    const scoreMap = new Map<string, { chunk: VectorSearchResult; rrfScore: number }>();

    // Score from vector search
    vectorResults.forEach((chunk, rank) => {
      const rrfScore = 1 / (RRF_K + rank + 1);
      scoreMap.set(chunk.chunkId, { chunk, rrfScore });
    });

    // Add score from FTS
    ftsResults.forEach((chunk, rank) => {
      const rrfScore = 1 / (RRF_K + rank + 1);
      const existing = scoreMap.get(chunk.chunkId);
      if (existing) {
        existing.rrfScore += rrfScore; // Boost chunks that appear in both results
      } else {
        scoreMap.set(chunk.chunkId, { chunk, rrfScore });
      }
    });

    // Sort by combined RRF score and return top-K
    return Array.from(scoreMap.values())
      .sort((a, b) => b.rrfScore - a.rrfScore)
      .slice(0, this.topK)
      .map(({ chunk }, index) => ({ ...chunk, rank: index + 1 }));
  }
}

