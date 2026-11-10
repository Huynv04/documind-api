import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { get_encoding, Tiktoken } from 'tiktoken';

export interface TextChunk {
  content: string;
  chunkIndex: number;
  pageNumber?: number;
  tokenCount: number;
}

@Injectable()
export class ChunkingService {
  private readonly logger = new Logger(ChunkingService.name);
  private readonly chunkSize: number;
  private readonly chunkOverlap: number;
  private tokenizer: Tiktoken | null = null;

  constructor(private config: ConfigService) {
    this.chunkSize = this.config.get<number>('CHUNK_SIZE', 800);
    this.chunkOverlap = this.config.get<number>('CHUNK_OVERLAP', 100);
    try {
      this.tokenizer = get_encoding('cl100k_base');
    } catch (err) {
      this.logger.warn(`Could not initialize tiktoken cl100k_base, using char estimation: ${err.message}`);
    }
  }

  /**
   * Estimates or calculates exact token count.
   */
  countTokens(text: string): number {
    if (!text) return 0;
    if (this.tokenizer) {
      try {
        return this.tokenizer.encode(text).length;
      } catch {
        // Fallback
      }
    }
    // Fallback: ~4 chars per token for English, ~1.5-2 chars per token for Vietnamese/Unicode
    return Math.ceil(text.length / 3.5);
  }

  /**
   * Split text into semantic chunks with 800 tokens max and 100 tokens overlap,
   * guaranteeing that Markdown tables are never broken awkwardly.
   */
  chunkText(
    text: string,
    pageNumber?: number,
    options?: { chunkSize?: number; chunkOverlap?: number },
  ): TextChunk[] {
    if (!text || !text.trim()) return [];

    const effectiveChunkSize = options?.chunkSize ?? this.chunkSize;
    const effectiveOverlap = options?.chunkOverlap ?? this.chunkOverlap;

    // Normalize line breaks
    const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();

    // 1. Segment text into blocks: Code blocks, Markdown tables, Headings, and Paragraphs
    const blocks = this.parseDocumentBlocks(normalized);

    const chunks: TextChunk[] = [];
    let currentBlockTexts: string[] = [];
    let currentTokens = 0;
    let chunkIndex = 0;

    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i];
      const blockTokens = this.countTokens(block);

      // Case A: A single block is itself larger than chunkSize
      if (blockTokens > effectiveChunkSize) {
        // Flush existing accumulated blocks first
        if (currentBlockTexts.length > 0) {
          const chunkContent = currentBlockTexts.join('\n\n').trim();
          if (chunkContent) {
            chunks.push(this.makeChunk(chunkContent, chunkIndex++, pageNumber));
          }
          currentBlockTexts = [];
          currentTokens = 0;
        }

        // Check if this oversized block is a markdown table
        if (this.isMarkdownTable(block)) {
          const tableChunks = this.splitOversizedTable(block, effectiveChunkSize, effectiveOverlap);
          for (const tChunk of tableChunks) {
            chunks.push(this.makeChunk(tChunk, chunkIndex++, pageNumber));
          }
        } else {
          // Regular oversized text/paragraph -> split by sentences
          const paraChunks = this.splitOversizedParagraph(block, effectiveChunkSize, effectiveOverlap);
          for (const pChunk of paraChunks) {
            chunks.push(this.makeChunk(pChunk, chunkIndex++, pageNumber));
          }
        }
        continue;
      }

      // Case B: Adding this block exceeds chunkSize
      if (currentTokens + blockTokens > effectiveChunkSize && currentBlockTexts.length > 0) {
        const chunkContent = currentBlockTexts.join('\n\n').trim();
        chunks.push(this.makeChunk(chunkContent, chunkIndex++, pageNumber));

        // Prepare overlap for the next chunk
        const overlapBlocks = this.getOverlapBlocks(currentBlockTexts, effectiveOverlap);
        currentBlockTexts = [...overlapBlocks, block];
        currentTokens = this.countTokens(currentBlockTexts.join('\n\n'));
      } else {
        // Case C: Fits in the current chunk
        currentBlockTexts.push(block);
        currentTokens += blockTokens;
      }
    }

    // Flush any remaining blocks
    if (currentBlockTexts.length > 0) {
      const remainingContent = currentBlockTexts.join('\n\n').trim();
      if (remainingContent) {
        chunks.push(this.makeChunk(remainingContent, chunkIndex++, pageNumber));
      }
    }

    return chunks;
  }

  /**
   * Parses the raw text into semantic units:
   * - Preserves entire Markdown tables intact
   * - Preserves fenced code blocks intact
   * - Splits remaining text along markdown headings and double newlines
   */
  private parseDocumentBlocks(text: string): string[] {
    const lines = text.split('\n');
    const blocks: string[] = [];
    let currentLines: string[] = [];
    let inCodeBlock = false;
    let inTable = false;

    const flushCurrent = () => {
      if (currentLines.length > 0) {
        const content = currentLines.join('\n').trim();
        if (content) blocks.push(content);
        currentLines = [];
      }
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      // Detect code fences
      if (trimmed.startsWith('```')) {
        if (!inCodeBlock) {
          flushCurrent();
          inCodeBlock = true;
          currentLines.push(line);
        } else {
          currentLines.push(line);
          inCodeBlock = false;
          flushCurrent();
        }
        continue;
      }

      if (inCodeBlock) {
        currentLines.push(line);
        continue;
      }

      // Detect start of markdown table
      // A table row typically begins with | and the next line is a separator |---|
      const isTableRow = trimmed.startsWith('|') && trimmed.endsWith('|');
      const isNextSeparator =
        i + 1 < lines.length &&
        /^\s*\|?\s*[-:]+[-| :]*\|\s*$/.test(lines[i + 1].trim());

      if (!inTable && isTableRow && isNextSeparator) {
        flushCurrent();
        inTable = true;
        currentLines.push(line);
        continue;
      }

      if (inTable) {
        if (isTableRow) {
          currentLines.push(line);
          continue;
        } else {
          // Table ended
          inTable = false;
          flushCurrent();
          if (trimmed) currentLines.push(line);
          continue;
        }
      }

      // Heading detection: flush so heading starts a clean block
      if (/^#{1,6}\s+/.test(trimmed)) {
        flushCurrent();
        currentLines.push(line);
        continue;
      }

      // Double newline boundary
      if (trimmed === '') {
        flushCurrent();
        continue;
      }

      currentLines.push(line);
    }

    flushCurrent();
    return blocks;
  }

  /**
   * Checks if a block of text represents a Markdown table.
   */
  private isMarkdownTable(block: string): boolean {
    const lines = block.trim().split('\n');
    if (lines.length < 2) return false;
    const firstLine = lines[0].trim();
    const secondLine = lines[1].trim();
    return (
      firstLine.startsWith('|') &&
      /^\s*\|?\s*[-:]+[-| :]*\|\s*$/.test(secondLine)
    );
  }

  /**
   * If a table alone exceeds the chunk size, split by rows while
   * repeating the header row and separator on every chunk.
   */
  private splitOversizedTable(tableBlock: string, maxTokens: number, overlapTokens: number): string[] {
    const lines = tableBlock.trim().split('\n');
    if (lines.length < 3) return [tableBlock];

    const header = lines[0];
    const separator = lines[1];
    const rows = lines.slice(2);
    const headerBlock = `${header}\n${separator}`;
    const headerTokens = this.countTokens(headerBlock);

    const tableChunks: string[] = [];
    let currentRows: string[] = [];
    let currentTokens = headerTokens;

    for (const row of rows) {
      const rowTokens = this.countTokens(row);
      if (currentTokens + rowTokens > maxTokens && currentRows.length > 0) {
        tableChunks.push(`${headerBlock}\n${currentRows.join('\n')}`);
        // Overlap a few rows if they fit within overlapTokens
        const overlapRows: string[] = [];
        let ovTokens = 0;
        for (let r = currentRows.length - 1; r >= 0; r--) {
          const rTokens = this.countTokens(currentRows[r]);
          if (ovTokens + rTokens <= overlapTokens) {
            overlapRows.unshift(currentRows[r]);
            ovTokens += rTokens;
          } else {
            break;
          }
        }
        currentRows = [...overlapRows, row];
        currentTokens = headerTokens + this.countTokens(currentRows.join('\n'));
      } else {
        currentRows.push(row);
        currentTokens += rowTokens;
      }
    }

    if (currentRows.length > 0) {
      tableChunks.push(`${headerBlock}\n${currentRows.join('\n')}`);
    }

    return tableChunks;
  }

  /**
   * Splits an oversized paragraph or block along sentence or word boundaries.
   */
  private splitOversizedParagraph(text: string, maxTokens: number, overlapTokens: number): string[] {
    // Split by sentence boundaries
    const sentences = text.match(/[^.!?\n]+[.!?\n]+|[^.!?\n]+$/g) || [text];
    const chunks: string[] = [];
    let currentSentences: string[] = [];
    let currentTokens = 0;

    for (const sentence of sentences) {
      const sTokens = this.countTokens(sentence);
      if (currentTokens + sTokens > maxTokens && currentSentences.length > 0) {
        chunks.push(currentSentences.join(' ').trim());

        // Calculate overlap
        const overlap: string[] = [];
        let ovTokens = 0;
        for (let j = currentSentences.length - 1; j >= 0; j--) {
          const jTokens = this.countTokens(currentSentences[j]);
          if (ovTokens + jTokens <= overlapTokens) {
            overlap.unshift(currentSentences[j]);
            ovTokens += jTokens;
          } else {
            break;
          }
        }
        currentSentences = [...overlap, sentence];
        currentTokens = this.countTokens(currentSentences.join(' '));
      } else {
        currentSentences.push(sentence);
        currentTokens += sTokens;
      }
    }

    if (currentSentences.length > 0) {
      chunks.push(currentSentences.join(' ').trim());
    }

    return chunks;
  }

  /**
   * Calculates which blocks from the end of the previous chunk should be retained as overlap.
   */
  private getOverlapBlocks(previousBlocks: string[], overlapTokens: number): string[] {
    const overlap: string[] = [];
    let accumulated = 0;

    for (let i = previousBlocks.length - 1; i >= 0; i--) {
      const block = previousBlocks[i];
      // Do not duplicate large markdown tables as block overlap to prevent bloat
      if (this.isMarkdownTable(block)) continue;

      const tokens = this.countTokens(block);
      if (accumulated + tokens <= overlapTokens) {
        overlap.unshift(block);
        accumulated += tokens;
      } else {
        break;
      }
    }

    return overlap;
  }

  private makeChunk(content: string, chunkIndex: number, pageNumber?: number): TextChunk {
    return {
      content: content.trim(),
      chunkIndex,
      pageNumber,
      tokenCount: this.countTokens(content),
    };
  }
}
