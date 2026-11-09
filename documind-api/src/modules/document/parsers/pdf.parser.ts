import { Injectable, Logger } from '@nestjs/common';
import * as pdfParse from 'pdf-parse';

export interface ParsedPage {
  pageNumber: number;
  text: string;
}

export interface ParsedDocument {
  text: string;
  pages: ParsedPage[];
  pageCount: number;
}

@Injectable()
export class PdfParser {
  private readonly logger = new Logger(PdfParser.name);

  /**
   * Parse text-based PDF file.
   * Extracts text page-by-page to preserve page number metadata for citations.
   */
  async parse(buffer: Buffer): Promise<ParsedDocument> {
    const pages: ParsedPage[] = [];

    const options: pdfParse.Options = {
      pagerender: (pageData: any) => {
        return pageData.getTextContent().then((textContent: any) => {
          let lastY: number | null = null;
          let text = '';
          for (const item of textContent.items) {
            if (lastY === item.transform[5] || lastY === null) {
              text += item.str;
            } else {
              text += '\n' + item.str;
            }
            lastY = item.transform[5];
          }
          pages.push({ pageNumber: pageData.pageIndex + 1, text });
          return text;
        });
      },
    };

    const data = await pdfParse(buffer, options);

    return {
      text: data.text,
      pages,
      pageCount: data.numpages,
    };
  }
}

