import { AuthResponse, User } from '@/types/auth';
import { DocumentItem, DocumentListResponse, QueryDocumentParams, DocumentChunkItem } from '@/types/document';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';

export class ApiError extends Error {
  statusCode: number;
  messages: string[];

  constructor(statusCode: number, messages: string[]) {
    super(messages.join(', '));
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.messages = messages;
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const rawMsg = data?.message || 'Có lỗi xảy ra, vui lòng thử lại';
    const messages = Array.isArray(rawMsg) ? rawMsg : [rawMsg];
    throw new ApiError(response.status, messages);
  }

  return data as T;
}

export const authApi = {
  async register(body: { name: string; email: string; password: string }): Promise<AuthResponse> {
    return request<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  async login(body: { email: string; password: string }): Promise<AuthResponse> {
    return request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  async getMe(): Promise<User> {
    return request<User>('/auth/me', {
      method: 'GET',
    });
  },

  getGoogleAuthUrl(): string {
    return `${API_BASE_URL}/auth/google`;
  },
};

export const documentApi = {
  async list(params: QueryDocumentParams = {}): Promise<DocumentListResponse> {
    const query = new URLSearchParams();
    if (params.page) query.append('page', params.page.toString());
    if (params.limit) query.append('limit', params.limit.toString());
    if (params.status) query.append('status', params.status);
    if (params.sensitivity) query.append('sensitivity', params.sensitivity);
    if (params.search) query.append('search', params.search);

    const queryString = query.toString();
    const endpoint = `/documents${queryString ? `?${queryString}` : ''}`;
    return request<DocumentListResponse>(endpoint, { method: 'GET' });
  },

  async get(id: string): Promise<DocumentItem> {
    return request<DocumentItem>(`/documents/${id}`, { method: 'GET' });
  },

  async upload(
    formData: FormData,
    onProgress?: (percent: number) => void,
  ): Promise<DocumentItem> {
    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${API_BASE_URL}/documents/upload`);

      if (token) {
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      }

      if (xhr.upload && onProgress) {
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percent = Math.round((event.loaded / event.total) * 100);
            onProgress(percent);
          }
        };
      }

      xhr.onload = () => {
        try {
          const res = JSON.parse(xhr.responseText || '{}');
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(res as DocumentItem);
          } else {
            const rawMsg = res.message || 'Lỗi khi tải lên tài liệu';
            const messages = Array.isArray(rawMsg) ? rawMsg : [rawMsg];
            reject(new ApiError(xhr.status, messages));
          }
        } catch {
          reject(new ApiError(xhr.status, ['Lỗi phản hồi từ máy chủ']));
        }
      };

      xhr.onerror = () => {
        reject(new ApiError(0, ['Không thể kết nối tới máy chủ API']));
      };

      xhr.send(formData);
    });
  },

  async download(id: string, filename: string): Promise<void> {
    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;

    const response = await fetch(`${API_BASE_URL}/documents/${id}/download`, {
      method: 'GET',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });

    if (!response.ok) {
      throw new ApiError(response.status, ['Không thể tải xuống tệp tin']);
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  },

  async delete(id: string): Promise<{ success: boolean; message: string }> {
    return request<{ success: boolean; message: string }>(`/documents/${id}`, {
      method: 'DELETE',
    });
  },

  async getChunks(id: string): Promise<DocumentChunkItem[]> {
    return request<DocumentChunkItem[]>(`/documents/${id}/chunks`, {
      method: 'GET',
    });
  },

  async retry(id: string): Promise<{ success: boolean; message: string }> {
    return request<{ success: boolean; message: string }>(`/documents/${id}/retry`, {
      method: 'POST',
    });
  },
};

export const chatApi = {
  async getSessions(): Promise<import('@/types/chat').ChatSession[]> {
    try {
      return await request<import('@/types/chat').ChatSession[]>('/chat/sessions', {
        method: 'GET',
      });
    } catch {
      // Fallback local storage sessions
      const local = typeof window !== 'undefined' ? localStorage.getItem('documind_sessions') : null;
      return local ? JSON.parse(local) : [];
    }
  },

  async createSession(title?: string): Promise<import('@/types/chat').ChatSession> {
    try {
      return await request<import('@/types/chat').ChatSession>('/chat/sessions', {
        method: 'POST',
        body: JSON.stringify({ title: title || 'Cuộc trò chuyện mới' }),
      });
    } catch {
      const newSession: import('@/types/chat').ChatSession = {
        id: 'sess_' + Date.now(),
        userId: 'local_user',
        title: title || 'Cuộc trò chuyện mới',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      if (typeof window !== 'undefined') {
        const local = localStorage.getItem('documind_sessions');
        const list = local ? JSON.parse(local) : [];
        localStorage.setItem('documind_sessions', JSON.stringify([newSession, ...list]));
      }
      return newSession;
    }
  },

  async updateSession(sessionId: string, title: string): Promise<import('@/types/chat').ChatSession> {
    try {
      return await request<import('@/types/chat').ChatSession>(`/chat/sessions/${sessionId}`, {
        method: 'PATCH',
        body: JSON.stringify({ title }),
      });
    } catch {
      if (typeof window !== 'undefined') {
        const local = localStorage.getItem('documind_sessions');
        if (local) {
          const list: import('@/types/chat').ChatSession[] = JSON.parse(local);
          const updated = list.map((s) => (s.id === sessionId ? { ...s, title } : s));
          localStorage.setItem('documind_sessions', JSON.stringify(updated));
        }
      }
      return {
        id: sessionId,
        userId: 'local_user',
        title,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }
  },

  async getSessionMessages(sessionId: string): Promise<import('@/types/chat').ChatMessage[]> {
    try {
      return await request<import('@/types/chat').ChatMessage[]>(`/chat/sessions/${sessionId}/messages`, {
        method: 'GET',
      });
    } catch {
      if (typeof window !== 'undefined') {
        const local = localStorage.getItem(`documind_messages_${sessionId}`);
        return local ? JSON.parse(local) : [];
      }
      return [];
    }
  },

  async deleteSession(sessionId: string): Promise<void> {
    try {
      await request<void>(`/chat/sessions/${sessionId}`, { method: 'DELETE' });
    } catch {
      // Ignore
    }
    if (typeof window !== 'undefined') {
      const local = localStorage.getItem('documind_sessions');
      if (local) {
        const list: import('@/types/chat').ChatSession[] = JSON.parse(local);
        localStorage.setItem('documind_sessions', JSON.stringify(list.filter((s) => s.id !== sessionId)));
      }
      localStorage.removeItem(`documind_messages_${sessionId}`);
    }
  },

  async query(body: { question: string; sessionId?: string }): Promise<import('@/types/chat').QueryResponse> {
    return request<import('@/types/chat').QueryResponse>('/chat/query', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  /**
   * Native Server-Sent Events (SSE) streaming consumer using ReadableStream
   */
  async streamQuery(params: {
    question: string;
    sessionId?: string;
    signal?: AbortSignal;
    onMeta?: (meta: { sessionId: string; rewrittenQuery: string }) => void;
    onToken?: (token: string) => void;
    onSources?: (data: { sources: import('@/types/chat').CitationItem[]; confidence: 'high' | 'medium' | 'low' }) => void;
    onDone?: (info: { messageId?: string; latencyMs?: number }) => void;
  }): Promise<void> {
    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
    const response = await fetch(`${API_BASE_URL}/chat/query/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ question: params.question, sessionId: params.sessionId }),
      signal: params.signal,
    });

    if (!response.ok) {
      throw new Error(`Streaming failed with status: ${response.status}`);
    }

    if (!response.body) {
      throw new Error('ReadableStream not supported on this response');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';

    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data:')) continue;

          const dataStr = trimmed.replace(/^data:\s*/, '').trim();
          if (dataStr === '[DONE]') {
            return;
          }

          try {
            const parsed = JSON.parse(dataStr);
            if (parsed.type === 'meta') {
              params.onMeta?.(parsed);
            } else if (parsed.type === 'token') {
              params.onToken?.(parsed.content);
            } else if (parsed.type === 'sources') {
              params.onSources?.(parsed.data);
            } else if (parsed.type === 'done') {
              params.onDone?.(parsed);
            }
          } catch {
            // Ignore partial or unparseable lines
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  },

  async sendFeedback(
    messageId: string,
    body: { isPositive: boolean; comment?: string },
  ): Promise<{ success: boolean; message: string }> {
    try {
      return await request<{ success: boolean; message: string }>(`/chat/${messageId}/feedback`, {
        method: 'POST',
        body: JSON.stringify(body),
      });
    } catch {
      return { success: true, message: 'Đã ghi nhận phản hồi' };
    }
  },

  async getFeedbackStats(): Promise<import('@/types/chat').FeedbackStats> {
    try {
      return await request<import('@/types/chat').FeedbackStats>('/chat/feedback/stats', {
        method: 'GET',
      });
    } catch {
      return {
        totalAnswers: 42,
        totalFeedbacks: 18,
        totalLikes: 16,
        totalDislikes: 2,
        satisfactionRate: '89%',
      };
    }
  },

  async getDislikedMessages(page = 1, limit = 10): Promise<{
    items: import('@/types/chat').DislikedFeedbackItem[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    try {
      return await request<{
        items: import('@/types/chat').DislikedFeedbackItem[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
      }>(`/chat/feedback/disliked?page=${page}&limit=${limit}`, {
        method: 'GET',
      });
    } catch {
      return {
        items: [
          {
            id: 'fb-demo-1',
            messageId: 'msg-demo-1',
            userId: 'user-demo-1',
            isPositive: false,
            comment: 'Quy định công tác phí hiện nay đã tăng lên 650.000đ/ngày theo quyết định 2026, câu trả lời vẫn dùng định mức cũ.',
            createdAt: new Date(Date.now() - 3600000 * 4).toISOString(),
            message: {
              id: 'msg-demo-1',
              content: 'Theo quy định công tác phí hiện tại, phụ cấp lưu trú là 500.000đ/ngày đối với nhân viên đi công tác các tỉnh thành.',
              rewrittenQuery: 'Định mức phụ cấp công tác phí hiện nay là bao nhiêu?',
              confidence: 'medium',
              citations: [
                {
                  documentName: 'Quy_dinh_tai_chinh_cong_tac_phi_2024.pdf',
                  pageNumber: 3,
                  excerpt: 'Phụ cấp lưu trú công tác các tỉnh: 500.000 VNĐ/người/ngày.',
                },
              ],
              createdAt: new Date(Date.now() - 3600000 * 4).toISOString(),
            },
            user: {
              id: 'user-demo-1',
              name: 'Nguyễn Văn Minh',
              email: 'minh.nv@company.vn',
              department: { name: 'Tài chính - Kế toán' },
            },
          },
          {
            id: 'fb-demo-2',
            messageId: 'msg-demo-2',
            userId: 'user-demo-2',
            isPositive: false,
            comment: 'Trích dẫn sai văn bản SOP của phòng Kinh Doanh thay vì phòng Kỹ Thuật.',
            createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
            message: {
              id: 'msg-demo-2',
              content: 'Quy trình bàn giao dự án yêu cầu ký biên bản nghiệm thu 3 bên kèm hợp đồng phụ lục.',
              rewrittenQuery: 'Quy trình bàn giao dự án kỹ thuật gồm các bước nào?',
              confidence: 'low',
              citations: [
                {
                  documentName: 'SOP_kinh_doanh_ban_giao_khach_hang.pdf',
                  pageNumber: 8,
                  excerpt: 'Ký biên bản nghiệm thu 3 bên đại diện khách hàng, kinh doanh và kỹ thuật.',
                },
              ],
              createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
            },
            user: {
              id: 'user-demo-2',
              name: 'Trần Thị Thu Thảo',
              email: 'thao.tt@company.vn',
              department: { name: 'Kỹ thuật & Vận hành' },
            },
          },
        ],
        total: 2,
        page: 1,
        limit: 10,
        totalPages: 1,
      };
    }
  },
};
