import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

@Injectable()
export class EmbeddingService {
  private readonly logger = new Logger(EmbeddingService.name);
  private openai: OpenAI | null = null;
  private readonly model: string;
  private readonly dimensions: number;

  constructor(private config: ConfigService) {
    const apiKey = this.config.get<string>('OPENAI_API_KEY');
    this.model = this.config.get<string>('OPENAI_EMBEDDING_MODEL', 'text-embedding-3-small');
    this.dimensions = this.config.get<number>('OPENAI_EMBEDDING_DIMENSIONS', 1536);

    if (apiKey) {
      this.openai = new OpenAI({ apiKey });
    } else {
      this.logger.warn(
        'OPENAI_API_KEY is not configured. EmbeddingService calls will fail until a valid key is provided in .env.',
      );
    }
  }

  private getClient(): OpenAI {
    if (!this.openai) {
      const apiKey = this.config.get<string>('OPENAI_API_KEY');
      if (apiKey) {
        this.openai = new OpenAI({ apiKey });
      } else {
        throw new InternalServerErrorException(
          'OpenAI API key is missing. Please set OPENAI_API_KEY in the environment configuration.',
        );
      }
    }
    return this.openai;
  }

  /**
   * Clean and normalize input text for OpenAI embedding.
   * OpenAI rejects empty strings or whitespace-only inputs.
   */
  private sanitizeText(text: string): string {
    const trimmed = (text || '').trim();
    if (!trimmed) return ' '; // single space fallback to avoid 400 Bad Request
    // text-embedding-3-small limit is 8191 tokens (~30,000 chars)
    return trimmed.slice(0, 30000);
  }

  /**
   * Generate an embedding vector for a single text.
   * Returns a float array of 1536 dimensions.
   */
  async embed(text: string): Promise<number[]> {
    const client = this.getClient();
    const sanitized = this.sanitizeText(text);

    try {
      const response = await client.embeddings.create({
        model: this.model,
        input: sanitized,
        dimensions: this.dimensions,
      });

      return response.data[0].embedding;
    } catch (err: any) {
      this.logger.error(`Failed to generate embedding for text: ${err.message}`, err.stack);
      throw new InternalServerErrorException(`Embedding generation failed: ${err.message}`);
    }
  }

  /**
   * Batch embed multiple texts.
   * Automatically splits into sub-batches of 100 items to comply with OpenAI rate limits
   * and API payload constraints.
   */
  async embedBatch(texts: string[]): Promise<number[][]> {
    if (!texts || texts.length === 0) return [];

    const client = this.getClient();
    const BATCH_SIZE = 100;
    const allEmbeddings: number[][] = [];

    const sanitizedTexts = texts.map((t) => this.sanitizeText(t));

    for (let i = 0; i < sanitizedTexts.length; i += BATCH_SIZE) {
      const batch = sanitizedTexts.slice(i, i + BATCH_SIZE);
      const batchNum = Math.floor(i / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(sanitizedTexts.length / BATCH_SIZE);

      this.logger.log(`Embedding batch ${batchNum}/${totalBatches} (${batch.length} items)...`);

      try {
        const response = await client.embeddings.create({
          model: this.model,
          input: batch,
          dimensions: this.dimensions,
        });

        // Ensure order is preserved matching response.data index
        const sortedData = [...response.data].sort((a, b) => a.index - b.index);
        allEmbeddings.push(...sortedData.map((d) => d.embedding));
      } catch (err: any) {
        this.logger.error(
          `Embedding batch ${batchNum}/${totalBatches} failed: ${err.message}`,
          err.stack,
        );
        throw new InternalServerErrorException(
          `Batch embedding failed at batch ${batchNum}: ${err.message}`,
        );
      }
    }

    return allEmbeddings;
  }
}
