export interface CitationItem {
  documentId: string;
  chunkId: string;
  pageNumber: number | null;
  excerpt: string;
  score?: number;
  documentName?: string;
  mimeType?: string;
}

export type FeedbackReason =
  | 'OUTDATED'
  | 'INCORRECT'
  | 'INCOMPLETE'
  | 'CITATION_ERROR'
  | 'OTHER';

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
    reason?: FeedbackReason;
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

export interface FeedbackStats {
  totalAnswers: number;
  totalFeedbacks: number;
  totalLikes: number;
  totalDislikes: number;
  satisfactionRate: string;
}

export interface DislikedFeedbackItem {
  id: string;
  messageId: string;
  userId: string;
  isPositive: boolean;
  comment?: string | null;
  createdAt: string;
  message?: {
    id: string;
    content: string;
    rewrittenQuery?: string | null;
    confidence?: 'high' | 'medium' | 'low' | null;
    citations?: any;
    createdAt: string;
  };
  user?: {
    id: string;
    name: string;
    email: string;
    department?: {
      name: string;
    } | null;
  };
}
