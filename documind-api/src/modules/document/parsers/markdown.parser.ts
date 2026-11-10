import { Injectable, BadRequestException } from '@nestjs/common';
import { DocumentParser, ParseResult, ParsedPage } from './parser.interface';

@Injectable()
export class MarkdownParser implements DocumentParser {
  supports(mimeType: string, filename?: string): boolean {
    const isMdMime =
      mimeType === 'text/markdown' ||
      mimeType === 'text/plain' ||
      mimeType === 'text/x-markdown';
    const isMdExt = filename
      ? filename.toLowerCase().endsWith('.md') ||
        filename.toLowerCase().endsWith('.txt') ||
        filename.toLowerCase().endsWith('.markdown')
      : false;
    return isMdMime || isMdExt;
  }

  async parse(buffer: Buffer): Promise<ParseResult> {
    try {
      const rawText = buffer.toString('utf-8').trim();

      if (!rawText) {
        throw new BadRequestException('Tệp văn bản/Markdown trống.');
      }

      // Check if markdown has horizontal rules / page breaks (--- or ===)
      const sections = rawText.split(/\n\s*---\s*\n/);
      const pages: ParsedPage[] = [];

      if (sections.length > 1) {
        sections.forEach((sec, idx) => {
          if (sec.trim().length > 0) {
            pages.push({
              pageNumber: idx + 1,
              text: sec.trim(),
            });
          }
        });
      } else {
        // Break into pages if document is long (> 3000 chars)
        const paragraphs = rawText.split(/\n\s*\n/).filter((p) => p.trim().length > 0);
        let currentPageText = '';
        let pageIndex = 1;

        for (const p of paragraphs) {
          if (currentPageText.length + p.length > 3000) {
            pages.push({
              pageNumber: pageIndex++,
              text: currentPageText.trim(),
            });
            currentPageText = p + '\n\n';
          } else {
            currentPageText += p + '\n\n';
          }
        }

        if (currentPageText.trim().length > 0) {
          pages.push({
            pageNumber: pageIndex,
            text: currentPageText.trim(),
          });
        }
      }

      return {
        pages,
        totalCharacters: rawText.length,
        rawText,
      };
    } catch (error: any) {
      if (error instanceof BadRequestException) throw error;
      throw new BadRequestException(
        `Không thể phân tích tệp Markdown/Text: ${error?.message || error}`,
      );
    }
  }
}

