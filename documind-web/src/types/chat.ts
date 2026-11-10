export interface CitationItem {
  documentId: string;
  chunkId: string;
  pageNumber: number | null;
  excerpt: string;
  score?: number;
  documentName?: string;
  mimeType?: string;
}

export interface ChatMessage {
  id: string;
  sessionId: string;
  role: 'user' | 'assistant';
  content: string;
  citations?: CitationItem[] | null;
  confidence?: 'high' | 'medium' | 'low' | null;
  tokensUsed?: number | null;
  latencyMs?: number | null;
  rewrittenQuery?: string | null;
  createdAt: string;
  feedback?: {
    id?: string;
    isPositive: boolean;
    comment?: string;
  } | null;
}

export interface ChatSession {
  id: string;
  userId: string;
  title: string | null;
  createdAt: string;
  updatedAt: string;
  messages?: ChatMessage[];
}

export interface QueryResponse {
  answer: string;
  confidence: 'high' | 'medium' | 'low';
  sources: CitationItem[];
  tokensUsed?: number;
  latencyMs?: number;
  rewrittenQuery?: string;
  sessionId: string;
  messageId: string;
}

