import { Injectable, BadRequestException } from '@nestjs/common';
import * as mammoth from 'mammoth';
import { DocumentParser, ParseResult, ParsedPage } from './parser.interface';

@Injectable()
export class DocxParser implements DocumentParser {
  supports(mimeType: string, filename?: string): boolean {
    const isDocxMime =
      mimeType ===
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      mimeType === 'application/msword';
    const isDocxExt = filename
      ? filename.toLowerCase().endsWith('.docx') || filename.toLowerCase().endsWith('.doc')
      : false;
    return isDocxMime || isDocxExt;
  }

  async parse(buffer: Buffer): Promise<ParseResult> {
    try {
      const result = await mammoth.extractRawText({ buffer });
      const rawText = result.value.trim();

      if (!rawText) {
        throw new BadRequestException('Tệp DOCX trống hoặc không thể trích xuất văn bản.');
      }

      // DOCX doesn't have intrinsic fixed page cuts like PDF, so we group paragraphs
      // or split by page break / large paragraph blocks
      const paragraphs = rawText.split(/\n\s*\n/).filter((p) => p.trim().length > 0);

      // Estimate ~500 words or 3000 chars per page if long document
      const pages: ParsedPage[] = [];
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

      return {
        pages,
        totalCharacters: rawText.length,
        rawText,
      };
    } catch (error: any) {
      if (error instanceof BadRequestException) throw error;
      throw new BadRequestException(
        `Không thể phân tích tệp Word (DOCX): ${error?.message || error}`,
      );
    }
  }
}

