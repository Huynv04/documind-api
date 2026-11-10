import { Injectable, BadRequestException } from '@nestjs/common';
import { DocumentParser, ParseResult, ParsedPage } from './parser.interface';
 
const pdfParse = require('pdf-parse');

@Injectable()
export class PdfParser implements DocumentParser {
  supports(mimeType: string, filename?: string): boolean {
    return (
      mimeType === 'application/pdf' ||
      (filename ? filename.toLowerCase().endsWith('.pdf') : false)
    );
  }

  async parse(buffer: Buffer): Promise<ParseResult> {
    try {
      const pages: ParsedPage[] = [];

      // Custom pagerender to capture text page by page
      const options = {
        pagerender: (pageData: any) => {
          return pageData
            .getTextContent({
              normalizeWhitespace: false,
              disableCombineTextItems: false,
            })
            .then((textContent: any) => {
              let text = '';
              let lastY: number | null = null;

              for (const item of textContent.items) {
                if (lastY === null || lastY === item.transform[5]) {
                  text += item.str;
                } else {
                  text += '\n' + item.str;
                }
                lastY = item.transform[5];
              }

              const cleanText = text.trim();
              if (cleanText.length > 0) {
                pages.push({
                  pageNumber: pageData.pageIndex + 1,
                  text: cleanText,
                });
              }

              return text;
            });
        },
      };

      const data = await pdfParse(buffer, options);

      // Fallback if custom pagerender did not populate pages
      if (pages.length === 0 && data.text) {
        pages.push({
          pageNumber: 1,
          text: data.text.trim(),
        });
      }

      // Sort pages ascending by pageNumber
      pages.sort((a, b) => a.pageNumber - b.pageNumber);

      const rawText = pages.map((p) => p.text).join('\n\n');

      return {
        pages,
        totalCharacters: rawText.length,
        rawText,
      };
    } catch (error: any) {
      throw new BadRequestException(
        `Không thể phân tích tệp PDF. Tệp có thể bị hỏng hoặc có mật khẩu bảo vệ: ${error?.message || error}`,
      );
    }
  }
}
