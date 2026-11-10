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
