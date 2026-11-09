import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

@Injectable()
export class EmbeddingService {
  private readonly logger = new Logger(EmbeddingService.name);
  private openai: OpenAI;
  private readonly model: string;
  private readonly dimensions: number;

  constructor(private config: ConfigService) {
    this.openai = new OpenAI({ apiKey: config.get('OPENAI_API_KEY') });
    this.model = config.get('OPENAI_EMBEDDING_MODEL', 'text-embedding-3-small');
    this.dimensions = config.get<number>('OPENAI_EMBEDDING_DIMENSIONS', 1536);
  }

  /**
   * Generate embedding vector for a single text.
   * Returns a float array of length `dimensions`.
   */
  async embed(text: string): Promise<number[]> {
    // Truncate to avoid token limit (8191 for text-embedding-3-small)
    const truncated = text.slice(0, 30000);
    const response = await this.openai.embeddings.create({
      model: this.model,
      input: truncated,
    });
    return response.data[0].embedding;
  }

  /**
   * Batch embed multiple texts.
   * Splits into batches of 100 to stay within rate limits.
   */
  async embedBatch(texts: string[]): Promise<number[][]> {
    const BATCH_SIZE = 100;
    const results: number[][] = [];

    for (let i = 0; i < texts.length; i += BATCH_SIZE) {
      const batch = texts.slice(i, i + BATCH_SIZE).map((t) => t.slice(0, 30000));
      this.logger.log(`Embedding batch ${i / BATCH_SIZE + 1} (${batch.length} items)`);
      const response = await this.openai.embeddings.create({
        model: this.model,
        input: batch,
      });
      results.push(...response.data.map((d) => d.embedding));
    }

    return results;
  }
}

