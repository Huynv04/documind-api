import { Injectable } from '@nestjs/common';
import * as mammoth from 'mammoth';
import { ParsedDocument } from './pdf.parser';

@Injectable()
export class DocxParser {
  /**
   * Parse Word (.docx) file into text.
   * Mammoth extracts paragraphs and table text cleanly.
   */
  async parse(buffer: Buffer): Promise<ParsedDocument> {
    const result = await mammoth.extractRawText({ buffer });
    return {
      text: result.value,
      pages: [{ pageNumber: 1, text: result.value }],
      pageCount: 1, // DOCX does not have fixed pages; treat as page 1
    };
  }
}

