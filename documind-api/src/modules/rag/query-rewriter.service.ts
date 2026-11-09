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
  private openai: OpenAI;
  private readonly model: string;

  constructor(private config: ConfigService) {
    this.openai = new OpenAI({ apiKey: config.get('OPENAI_API_KEY') });
    this.model = config.get('OPENAI_CHAT_MODEL', 'gpt-4o-mini');
  }

  /**
   * Rewrites the current user question by incorporating context from recent chat history.
   *
   * Problem: In multi-turn chat, questions like "What about probationary employees?"
   * are ambiguous without context. If sent directly to vector search, results will be poor.
   *
   * Solution: Use LLM to condense chat history + current question into one
   * standalone, self-contained question suitable for vector retrieval.
   *
   * Example:
   *   History: "What is the remote work policy?"
   *   Current: "What about probationary employees?"
   *   Rewritten: "What is the remote work policy for employees on probation?"
   */
  async rewrite(currentQuery: string, history: ChatHistoryItem[]): Promise<string> {
    // If no history, no rewriting needed
    if (!history || history.length === 0) return currentQuery;

    // Only use the last 3 turns to avoid context bloat
    const recentHistory = history.slice(-6); // 3 user + 3 assistant turns

    try {
      const response = await this.openai.chat.completions.create({
        model: this.model,
        temperature: 0,
        max_tokens: 150,
        messages: [
          {
            role: 'system',
            content: `You are a query reformulation assistant. 
Given a conversation history and a follow-up question, rewrite the follow-up question to be a 
complete, standalone question that includes all necessary context from the conversation history.
Return ONLY the rewritten question. Do not explain or add any extra text.
If the question is already standalone, return it unchanged.`,
          },
          {
            role: 'user',
            content: `Conversation history:
${recentHistory.map((m) => `${m.role.toUpperCase()}: ${m.content}`).join('\n')}

Follow-up question: ${currentQuery}

Rewritten standalone question:`,
          },
        ],
      });

      const rewritten = response.choices[0]?.message?.content?.trim();
      if (rewritten) {
        this.logger.debug(`Query rewritten: "${currentQuery}" → "${rewritten}"`);
        return rewritten;
      }
    } catch (err) {
      this.logger.warn(`Query rewriting failed, using original: ${err.message}`);
    }

    return currentQuery;
  }
}

