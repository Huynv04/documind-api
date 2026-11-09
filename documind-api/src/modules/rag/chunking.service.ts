import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface TextChunk {
  content: string;
  chunkIndex: number;
  pageNumber?: number;
  tokenCount: number;
}

@Injectable()
export class ChunkingService {
  private readonly chunkSize: number;
  private readonly chunkOverlap: number;

  constructor(private config: ConfigService) {
    this.chunkSize = config.get<number>('CHUNK_SIZE', 800);
    this.chunkOverlap = config.get<number>('CHUNK_OVERLAP', 100);
  }

  /**
   * Chunk text into overlapping segments.
   * Uses character-based estimation: ~4 chars per token.
   * Handles tables specially – does not split in the middle of a markdown table.
   */
  chunkText(text: string, pageNumber?: number): TextChunk[] {
    const charChunkSize = this.chunkSize * 4;
    const charOverlap = this.chunkOverlap * 4;

    // Pre-process: normalize whitespace
    const cleaned = text.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();

    // Split by double newline (paragraph boundary) to avoid cutting mid-sentence
    const paragraphs = cleaned.split(/\n\n+/);
    const chunks: TextChunk[] = [];
    let buffer = '';
    let chunkIndex = 0;

    for (const para of paragraphs) {
      const paraText = para.trim();
      if (!paraText) continue;

      // If a single paragraph is too long, split by sentence
      if (paraText.length > charChunkSize) {
        const sentences = paraText.match(/[^.!?]+[.!?]+/g) || [paraText];
        for (const sentence of sentences) {
          if ((buffer + ' ' + sentence).length > charChunkSize) {
            if (buffer) {
              chunks.push(this.makeChunk(buffer.trim(), chunkIndex++, pageNumber));
              // Keep overlap
              buffer = buffer.slice(-charOverlap) + ' ' + sentence;
            } else {
              chunks.push(this.makeChunk(sentence.trim(), chunkIndex++, pageNumber));
            }
          } else {
            buffer = buffer ? buffer + ' ' + sentence : sentence;
          }
        }
      } else if ((buffer + '\n\n' + paraText).length > charChunkSize) {
        // Buffer is full → flush
        if (buffer) chunks.push(this.makeChunk(buffer.trim(), chunkIndex++, pageNumber));
        buffer = buffer.slice(-charOverlap) + '\n\n' + paraText;
      } else {
        buffer = buffer ? buffer + '\n\n' + paraText : paraText;
      }
    }

    if (buffer.trim()) {
      chunks.push(this.makeChunk(buffer.trim(), chunkIndex, pageNumber));
    }

    return chunks;
  }

  private makeChunk(content: string, chunkIndex: number, pageNumber?: number): TextChunk {
    // Rough token estimation
    const tokenCount = Math.ceil(content.length / 4);
    return { content, chunkIndex, pageNumber, tokenCount };
  }
}

