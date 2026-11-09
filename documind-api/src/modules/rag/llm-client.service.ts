import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { RetrievedChunk } from './retrieval.service';

export interface LlmAnswer {
  answer: string;
  confidence: 'high' | 'medium' | 'low';
  sources: Array<{
    documentId: string;
    chunkId: string;
    pageNumber: number | null;
    excerpt: string;
  }>;
  tokensUsed: number;
}

const SYSTEM_PROMPT = `You are DocuMind AI, an internal knowledge base assistant.

STRICT RULES you MUST follow:
1. Answer ONLY based on the provided context. Do not use any external knowledge.
2. If the context does not contain the answer, respond EXACTLY with: "Tôi không tìm thấy thông tin này trong tài liệu nội bộ." Do NOT guess or invent information.
3. Always cite your sources by referencing the document and page number provided in the context.
4. Keep answers concise and accurate. Use the same language as the user's question.
5. For sensitive information, remind the user to verify with the appropriate department.

Respond in the following JSON format ONLY:
{
  "answer": "<your answer in Vietnamese>",
  "confidence": "<high|medium|low>",
  "sources": [
    { "documentId": "<id>", "chunkId": "<id>", "pageNumber": <number or null>, "excerpt": "<relevant excerpt>" }
  ]
}`;

@Injectable()
export class LlmClientService {
  private readonly logger = new Logger(LlmClientService.name);
  private openai: OpenAI;
  private readonly model: string;

  constructor(private config: ConfigService) {
    this.openai = new OpenAI({ apiKey: config.get('OPENAI_API_KEY') });
    this.model = config.get('OPENAI_CHAT_MODEL', 'gpt-4o-mini');
  }

  /**
   * Generate a grounded answer from retrieved chunks (non-streaming).
   * Returns structured JSON with answer, confidence, and citations.
   */
  async generateAnswer(query: string, chunks: RetrievedChunk[]): Promise<LlmAnswer> {
    const context = chunks
      .map(
        (c, i) =>
          `[Chunk ${i + 1}]\nDocument ID: ${c.documentId}\nChunk ID: ${c.chunkId}\nPage: ${c.pageNumber ?? 'N/A'}\nContent:\n${c.content}`,
      )
      .join('\n\n---\n\n');

    const response = await this.openai.chat.completions.create({
      model: this.model,
      temperature: 0.1,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: `Context from internal documents:\n\n${context}\n\nUser question: ${query}`,
        },
      ],
    });

    const raw = response.choices[0]?.message?.content || '{}';
    let parsed: Omit<LlmAnswer, 'tokensUsed'>;
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = {
        answer: 'Xin lỗi, hệ thống gặp lỗi khi xử lý câu trả lời. Vui lòng thử lại.',
        confidence: 'low',
        sources: [],
      };
    }

    return {
      ...parsed,
      tokensUsed: response.usage?.total_tokens ?? 0,
    };
  }

  /**
   * Generate a streaming answer (Server-Sent Events).
   * Yields text tokens and then the final sources payload.
   */
  async *generateAnswerStream(
    query: string,
    chunks: RetrievedChunk[],
  ): AsyncGenerator<{ type: 'token' | 'done'; content: string }> {
    const context = chunks
      .map(
        (c, i) =>
          `[Chunk ${i + 1}]\nDocument ID: ${c.documentId}\nPage: ${c.pageNumber ?? 'N/A'}\nContent:\n${c.content}`,
      )
      .join('\n\n---\n\n');

    const streamPrompt = `${SYSTEM_PROMPT}

For streaming mode, first write your answer text naturally (not JSON), then at the very end write:
<<<SOURCES>>>
(followed by your sources JSON array)`;

    const stream = await this.openai.chat.completions.create({
      model: this.model,
      temperature: 0.1,
      stream: true,
      messages: [
        { role: 'system', content: streamPrompt },
        {
          role: 'user',
          content: `Context:\n\n${context}\n\nQuestion: ${query}`,
        },
      ],
    });

    let buffer = '';
    for await (const chunk of stream) {
      const token = chunk.choices[0]?.delta?.content || '';
      buffer += token;
      if (token) yield { type: 'token', content: token };
    }

    // Extract sources from the end of the buffer if present
    const sourcesMatch = buffer.match(/<<<SOURCES>>>([\s\S]*)/);
    if (sourcesMatch) {
      yield {
        type: 'done',
        content: JSON.stringify({
          sources: JSON.parse(sourcesMatch[1].trim() || '[]'),
        }),
      };
    } else {
      yield { type: 'done', content: JSON.stringify({ sources: [] }) };
    }
  }
}

