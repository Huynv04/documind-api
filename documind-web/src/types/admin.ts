export interface SystemOverview {
  users: {
    total: number;
    active: number;
    inactive: number;
    breakdownByRole: {
      EMPLOYEE: number;
      KNOWLEDGE_MANAGER: number;
      ADMIN: number;
    };
  };
  documents: {
    total: number;
    indexed: number;
    processing: number;
    failed: number;
    archived: number;
    breakdownByStatus: Record<string, number>;
    storage: {
      bytes: number;
      formatted: string;
    };
    chunks: {
      total: number;
    };
  };
  chat: {
    totalSessions: number;
    totalMessages: number;
    userMessages: number;
    assistantMessages: number;
    avgLatencyMs: number;
    feedback: {
      total: number;
      likes: number;
      dislikes: number;
      satisfactionRate: string;
    };
  };
  tokens: {
    chatTokens: number;
    embeddingTokens: number;
    grandTotalTokens: number;
    costEstimate: {
      chatModel: string;
      embeddingModel: string;
      chatCostUsd: number;
      embeddingCostUsd: number;
      totalCostUsd: number;
      totalCostVnd: number;
      formattedUsd: string;
      formattedVnd: string;
      currencyExchangeRate: number;
    };
  };
  timestamp: string;
}

export interface AuditLogItem {
  id: string;
  userId: string | null;
  action: string;
  resourceType: string | null;
  resourceId: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  metadata: any;
  createdAt: string;
  user?: {
    id: string;
    name: string;
    email: string;
    role: string;
    department?: {
      id: string;
      name: string;
    } | null;
  } | null;
}

export interface AuditLogsResponse {
  items: AuditLogItem[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface AuditLogQueryParams {
  page?: number;
  limit?: number;
  action?: string;
  resourceType?: string;
  userId?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
}

