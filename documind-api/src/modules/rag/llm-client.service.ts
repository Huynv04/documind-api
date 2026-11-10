import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { RetrievedChunk } from './retrieval.service';

export interface SourceCitation {
  documentId: string;
  chunkId: string;
  pageNumber: number | null;
  excerpt: string;
}

export interface LlmAnswer {
  answer: string;
  confidence: 'high' | 'medium' | 'low';
  sources: SourceCitation[];
  tokensUsed: number;
}

export type StreamChunk =
  | { type: 'token'; content: string }
  | { type: 'sources'; data: { sources: SourceCitation[]; confidence: 'high' | 'medium' | 'low' } }
  | { type: 'error'; message: string };

const STRICT_SYSTEM_PROMPT = `Bạn là DocuMind AI, trợ lý tra cứu tài liệu và quy chuẩn nội bộ của doanh nghiệp.

QUY TẮC BẮT BUỘC TUÂN THỦ:
1. Bạn CHỈ ĐƯỢC PHÉP trả lời dựa trên những đoạn trích từ tài liệu nội bộ được cung cấp trong phần "Ngữ cảnh tài liệu nội bộ" dưới đây. Tuyệt đối KHÔNG sử dụng bất kỳ kiến thức bên ngoài nào.
2. Nếu ngữ cảnh được cung cấp không chứa câu trả lời hoặc không đủ căn cứ, bạn BẮT BUỘC phải trả lời chính xác:
   "Tôi không tìm thấy thông tin này trong tài liệu nội bộ."
   Tuyệt đối KHÔNG suy đoán, bịa đặt (hallucinate) hoặc trả lời ngoài tài liệu.
3. Luôn trích dẫn nguồn cụ thể cho từng ý trả lời, bao gồm Document ID, Chunk ID, Số trang (nếu có) và trích đoạn ngắn liên quan.
4. Trả lời bằng tiếng Việt chuyên nghiệp, gãy gọn, mạch lạc và chính xác.
5. Đánh giá mức độ tự tin (confidence) của câu trả lời:
   - "high": Thông tin nêu rõ ràng, trực tiếp trong tài liệu.
   - "medium": Thông tin cần tổng hợp từ 2 đoạn trích trở lên hoặc ngụ ý logic rõ ràng.
   - "low": Thông tin chỉ đề cập một phần hoặc không tìm thấy thông tin.`;

const JSON_SCHEMA_INSTRUCTION = `
Bạn PHẢI trả về câu trả lời ở định dạng JSON thuần túy theo cấu trúc sau (không kèm markdown code fence \`\`\`json):
{
  "answer": "Nội dung câu trả lời bằng tiếng Việt...",
  "confidence": "high" | "medium" | "low",
  "sources": [
    {
      "documentId": "ID tài liệu",
      "chunkId": "ID đoạn trích",
      "pageNumber": 1 hoặc null,
      "excerpt": "Đoạn trích dẫn ngắn từ tài liệu chứng minh cho câu trả lời"
    }
  ]
}`;

@Injectable()
export class LlmClientService {
  private readonly logger = new Logger(LlmClientService.name);
  private openai: OpenAI | null = null;
  private readonly model: string;

  constructor(private config: ConfigService) {
    const apiKey = this.config.get<string>('OPENAI_API_KEY');
    this.model = this.config.get<string>('OPENAI_CHAT_MODEL', 'gpt-4o-mini');

    if (apiKey) {
      this.openai = new OpenAI({ apiKey });
    } else {
      this.logger.warn(
        'OPENAI_API_KEY is not configured. LlmClientService will return fallback responses.',
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
          'OpenAI API key is missing. Please configure OPENAI_API_KEY in .env.',
        );
      }
    }
    return this.openai;
  }

  private formatContext(chunks: RetrievedChunk[]): string {
    if (!chunks || chunks.length === 0) {
      return '(Không tìm thấy đoạn trích tài liệu nào phù hợp với câu hỏi)';
    }

    return chunks
      .map(
        (c, i) =>
          `[TÀI LIỆU ${i + 1}]\n- Document ID: ${c.documentId}\n- Chunk ID: ${c.chunkId}\n- Trang: ${
            c.pageNumber ?? 'N/A'
          }\n- Nội dung:\n${c.content}`,
      )
      .join('\n\n========================================\n\n');
  }

  /**
   * Generates a grounded answer with strict JSON formatting (Non-streaming).
   */
  async generateAnswer(query: string, chunks: RetrievedChunk[]): Promise<LlmAnswer> {
    if (!chunks || chunks.length === 0) {
      return {
        answer: 'Tôi không tìm thấy thông tin này trong tài liệu nội bộ.',
        confidence: 'low',
        sources: [],
        tokensUsed: 0,
      };
    }

    const client = this.getClient();
    const context = this.formatContext(chunks);

    try {
      const response = await client.chat.completions.create({
        model: this.model,
        temperature: 0.1,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content: `${STRICT_SYSTEM_PROMPT}\n\n${JSON_SCHEMA_INSTRUCTION}`,
          },
          {
            role: 'user',
            content: `Ngữ cảnh tài liệu nội bộ:\n\n${context}\n\nCâu hỏi của người dùng:\n${query}`,
          },
        ],
      });

      const raw = response.choices[0]?.message?.content || '{}';
      let parsed: {
        answer?: string;
        confidence?: 'high' | 'medium' | 'low';
        sources?: SourceCitation[];
      };

      try {
        parsed = JSON.parse(raw);
      } catch {
        parsed = {
          answer: raw,
          confidence: 'medium',
          sources: [],
        };
      }

      return {
        answer: parsed.answer || 'Tôi không tìm thấy thông tin này trong tài liệu nội bộ.',
        confidence: parsed.confidence || 'medium',
        sources: Array.isArray(parsed.sources) ? parsed.sources : [],
        tokensUsed: response.usage?.total_tokens ?? 0,
      };
    } catch (err: any) {
      this.logger.error(`LLM answer generation failed: ${err.message}`, err.stack);
      return {
        answer: 'Hệ thống gặp sự cố khi tổng hợp câu trả lời từ tài liệu. Vui lòng thử lại sau.',
        confidence: 'low',
        sources: [],
        tokensUsed: 0,
      };
    }
  }

  /**
   * Generates a real-time streaming answer for Server-Sent Events (SSE).
   * Yields text tokens in real time, and finally yields the citations and confidence.
   */
  async *generateAnswerStream(
    query: string,
    chunks: RetrievedChunk[],
  ): AsyncGenerator<StreamChunk> {
    if (!chunks || chunks.length === 0) {
      yield {
        type: 'token',
        content: 'Tôi không tìm thấy thông tin này trong tài liệu nội bộ.',
      };
      yield {
        type: 'sources',
        data: { sources: [], confidence: 'low' },
      };
      return;
    }

    const client = this.getClient();
    const context = this.formatContext(chunks);

    const streamPrompt = `${STRICT_SYSTEM_PROMPT}

HƯỚNG DẪN STREAMING:
1. Trả lời trực tiếp nội dung bằng tiếng Việt tự nhiên dưới dạng văn bản thông thường (Markdown).
2. Khi trả lời xong câu trả lời, ở dòng cuối cùng, hãy viết chính xác cú pháp phân cách sau:
<<<SOURCES_JSON>>>
(kèm theo JSON object chứa danh sách sources và confidence, ví dụ: {"confidence": "high", "sources": [{"documentId": "...", "chunkId": "...", "pageNumber": 1, "excerpt": "..."}]})`;

    try {
      const stream = await client.chat.completions.create({
        model: this.model,
        temperature: 0.1,
        stream: true,
        messages: [
          { role: 'system', content: streamPrompt },
          {
            role: 'user',
            content: `Ngữ cảnh tài liệu nội bộ:\n\n${context}\n\nCâu hỏi của người dùng:\n${query}`,
          },
        ],
      });

      let fullAccumulated = '';
      let isReadingJson = false;

      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta?.content || '';
        if (!delta) continue;

        fullAccumulated += delta;

        if (!isReadingJson) {
          if (fullAccumulated.includes('<<<SOURCES_JSON>>>')) {
            isReadingJson = true;
            // Send whatever text was before the delimiter
            const parts = fullAccumulated.split('<<<SOURCES_JSON>>>');
            const remainingText = parts[0];
            // Delta might have had the delimiter, so don't emit delimiter to UI
          } else {
            yield { type: 'token', content: delta };
          }
        }
      }

      // Parse sources from the tail
      const match = fullAccumulated.match(/<<<SOURCES_JSON>>>([\s\S]*)/);
      if (match) {
        try {
          const parsed = JSON.parse(match[1].trim());
          yield {
            type: 'sources',
            data: {
              sources: Array.isArray(parsed.sources) ? parsed.sources : [],
              confidence: parsed.confidence || 'high',
            },
          };
          return;
        } catch {
          // If JSON parse failed, build fallback sources from chunks
        }
      }

      // Fallback citations if model omitted delimiter
      const defaultSources: SourceCitation[] = chunks.slice(0, 3).map((c) => ({
        documentId: c.documentId,
        chunkId: c.chunkId,
        pageNumber: c.pageNumber,
        excerpt: c.content.slice(0, 200),
      }));

      yield {
        type: 'sources',
        data: { sources: defaultSources, confidence: 'medium' },
      };
    } catch (err: any) {
      this.logger.error(`Streaming answer failed: ${err.message}`, err.stack);
      yield {
        type: 'error',
        message: `Lỗi kết nối AI: ${err.message}`,
      };
    }
  }
}
