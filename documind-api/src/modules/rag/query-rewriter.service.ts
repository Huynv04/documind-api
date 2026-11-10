import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

export interface ChatHistoryItem {
  role: 'user' | 'assistant';
  content: string;
}

@Injectable()
export class QueryRewriterService {
  private readonly logger = new Logger(QueryRewriterService.name);
  private openai: OpenAI | null = null;
  private readonly model: string;

  constructor(private config: ConfigService) {
    const apiKey = this.config.get<string>('OPENAI_API_KEY');
    this.model = this.config.get<string>('OPENAI_CHAT_MODEL', 'gpt-4o-mini');

    if (apiKey) {
      this.openai = new OpenAI({ apiKey });
    } else {
      this.logger.warn(
        'OPENAI_API_KEY not configured. QueryRewriterService will return queries verbatim without rewriting.',
      );
    }
  }

  /**
   * Rewrites a follow-up query into a complete standalone question
   * using context from the last 3 chat turns (up to 6 messages).
   *
   * Example:
   *   History:
   *     User: "Quy định làm việc từ xa của công ty là gì?"
   *     Assistant: "Công ty cho phép nhân viên chính thức làm việc từ xa tối đa 2 ngày/tuần..."
   *   Current: "Thế còn nhân viên thử việc thì sao?"
   *   Rewritten: "Quy định làm việc từ xa đối với nhân viên thử việc như thế nào?"
   */
  async rewrite(currentQuery: string, history: ChatHistoryItem[]): Promise<string> {
    const trimmedQuery = (currentQuery || '').trim();
    if (!trimmedQuery) return currentQuery;

    // If no conversation history, query is already standalone
    if (!history || history.length === 0) {
      return trimmedQuery;
    }

    if (!this.openai) {
      return trimmedQuery;
    }

    // Only take the last 3 turns (up to 6 messages: 3 user + 3 assistant)
    const recentHistory = history.slice(-6);

    try {
      const response = await this.openai.chat.completions.create({
        model: this.model,
        temperature: 0,
        max_tokens: 200,
        messages: [
          {
            role: 'system',
            content: `Bạn là trợ lý viết lại câu hỏi (Query Reformulation Assistant) cho hệ thống tìm kiếm tài liệu nội bộ doanh nghiệp.
Nhiệm vụ của bạn là đọc lịch sử hội thoại gần nhất và câu hỏi tiếp theo của người dùng, sau đó viết lại câu hỏi này thành một câu hỏi ĐỘC LẬP, ĐẦY ĐỦ Ý NGHĨA để đưa vào hệ thống tìm kiếm Vector / RAG.

Quy tắc bắt buộc:
1. Nếu câu hỏi hiện tại đã đầy đủ ý nghĩa và không phụ thuộc vào ngữ cảnh trước đó, giữ nguyên câu hỏi.
2. Nếu câu hỏi có đại từ thay thế (nó, cái này, điều đó...) hoặc câu hỏi nối tiếp ("còn cái này thì sao?", "chi phí thế nào?", "ai duyệt?"), hãy bổ sung đầy đủ chủ ngữ, tân ngữ và thực thể liên quan từ lịch sử hội thoại.
3. Giữ nguyên ngôn ngữ gốc của người dùng (tiếng Việt hoặc tiếng Anh).
4. Chỉ trả về DUY NHẤT nội dung câu hỏi đã viết lại. Không giải thích, không thêm dấu ngoặc kép, không thêm bất kỳ văn bản nào khác.`,
          },
          {
            role: 'user',
            content: `Lịch sử hội thoại (3 lượt gần nhất):
${recentHistory.map((m) => `${m.role.toUpperCase()}: ${m.content}`).join('\n')}

Câu hỏi tiếp nối hiện tại:
${trimmedQuery}

Câu hỏi độc lập viết lại:`,
          },
        ],
      });

      const rewritten = response.choices[0]?.message?.content?.trim();
      if (rewritten && rewritten.length > 0) {
        this.logger.debug(`Query rewritten: "${trimmedQuery}" -> "${rewritten}"`);
        return rewritten;
      }
    } catch (err: any) {
      this.logger.warn(`Query rewriting failed: ${err.message}. Using original query.`);
    }

    return trimmedQuery;
  }
}
