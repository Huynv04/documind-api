import { UserRole } from './auth';

export type DocumentStatus =
  | 'UPLOADING'
  | 'PROCESSING'
  | 'INDEXED'
  | 'FAILED'
  | 'ARCHIVED'
  | 'DELETED';

export type SensitivityLevel = 'PUBLIC' | 'INTERNAL' | 'CONFIDENTIAL';

export interface DocumentTag {
  id: string;
  tag: string;
}

export interface DocumentChunkItem {
  id: string;
  chunkIndex: number;
  content: string;
  pageNumber: number | null;
  tokenCount: number;
  createdAt: string;
}

export interface DocumentItem {
  id: string;
  originalName: string;
  storagePath: string;
  mimeType: string;
  sizeBytes: number;
  status: DocumentStatus;
  sensitivity: SensitivityLevel;
  allowedRoles: UserRole[];
  departmentId?: string | null;
  department?: { id: string; name: string } | null;
  uploadedById: string;
  pageCount?: number | null;
  errorMessage?: string | null;
  tags?: DocumentTag[];
  _count?: { chunks: number };
  createdAt: string;
  updatedAt: string;
}

export interface DocumentListResponse {
  items: DocumentItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface QueryDocumentParams {
  page?: number;
  limit?: number;
  status?: DocumentStatus;
  sensitivity?: SensitivityLevel;
  search?: string;
}
