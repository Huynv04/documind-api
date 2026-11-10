export type PipelineStage =
  | 'STORAGE'
  | 'PARSER'
  | 'CHUNKING'
  | 'EMBEDDING'
  | 'PGVECTOR'
  | 'COMPLETED'
  | 'FAILED';

export type JobStatus = 'ACTIVE' | 'WAITING' | 'COMPLETED' | 'FAILED' | 'DELAYED';

export interface PipelineJobItem {
  id: string;
  documentId: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  pageCount: number | null | undefined;
  status: JobStatus;
  currentStage: PipelineStage;
  progressPercent: number;
  attempts: number;
  maxAttempts: number;
  durationMs: number;
  errorMessage?: string | null;
  departmentName?: string | null;
  departmentId?: string | null;
  chunkCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface QueueStats {
  active: number;
  waiting: number;
  completed: number;
  failed: number;
  delayed: number;
  total: number;
  workerStatus: 'ACTIVE' | 'IDLE';
  activeWorkers: number;
  throughputDocsPerMin: number;
  throughputChunksPerSec: number;
  avgIngestionTimeMs: number;
  successRatePercent: number;
}

export interface PipelineConfig {
  chunkSize: number;
  chunkOverlap: number;
  preserveTables: boolean;
  embeddingModel: string;
  embeddingDimensions: number;
  batchSize: number;
  maxRetries: number;
  backoffType: 'exponential' | 'fixed';
  backoffDelayMs: number;
  storageEngine: string;
}

export interface QueryPipelineParams {
  status?: string;
  search?: string;
  departmentId?: string;
  page?: number;
  limit?: number;
}

export interface PipelineJobsResponse {
  items: PipelineJobItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  stats: QueueStats;
  config: PipelineConfig;
}
