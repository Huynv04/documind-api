export interface ParsedPage {
  pageNumber: number;
  text: string;
}

export interface ParseResult {
  pages: ParsedPage[];
  totalCharacters: number;
  rawText: string;
}

export interface DocumentParser {
  supports(mimeType: string, filename?: string): boolean;
  parse(buffer: Buffer): Promise<ParseResult>;
}

