'use client';

export const dynamic = 'force-dynamic';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { Navbar } from '@/components/navbar';
import { documentApi, ApiError } from '@/lib/api';
import {
  DocumentItem,
  DocumentStatus,
  SensitivityLevel,
  DocumentChunkItem,
} from '@/types/document';
import { UserRole } from '@/types/auth';
import {
  UploadCloud,
  FileText,
  FileCode,
  FileSpreadsheet,
  Download,
  Trash2,
  RefreshCw,
  Search,
  CheckCircle2,
  Clock,
  AlertTriangle,
  RotateCw,
  Layers,
  ChevronLeft,
  ChevronRight,
  Plus,
  X,
  Copy,
  Check,
  Activity,
  AlertCircle,
  Database,
} from 'lucide-react';

export default function DocumentsPage() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const router = useRouter();

  // Documents list state
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoadingDocs, setIsLoadingDocs] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [sensitivityFilter, setSensitivityFilter] = useState<string>('');

  // Upload modal & state
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [sensitivity, setSensitivity] = useState<SensitivityLevel>('INTERNAL');
  const [allowedRoles, setAllowedRoles] = useState<UserRole[]>([
    'EMPLOYEE',
    'KNOWLEDGE_MANAGER',
    'ADMIN',
  ]);
  const [tagsInput, setTagsInput] = useState('');
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [isRetryingId, setIsRetryingId] = useState<string | null>(null);

  // Drag & drop
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Chunk Inspector Modal state (Module 3 Feature)
  const [inspectDoc, setInspectDoc] = useState<DocumentItem | null>(null);
  const [chunks, setChunks] = useState<DocumentChunkItem[]>([]);
  const [isLoadingChunks, setIsLoadingChunks] = useState(false);
  const [chunkSearch, setChunkSearch] = useState('');
  const [copiedChunkId, setCopiedChunkId] = useState<string | null>(null);

  // Derived state: Live auto-polling active when any document is in background pipeline
  const isLivePolling = documents.some(
    (d) => d.status === 'PROCESSING' || d.status === 'UPLOADING',
  );

  // Auth Guard
  useEffect(() => {
    if (!isAuthLoading && !user) {
      router.push('/login');
    }
  }, [user, isAuthLoading, router]);

  // Reusable refresh handler
  const refreshList = useCallback(
    async (silent = false) => {
      if (!silent) setIsLoadingDocs(true);
      try {
        const res = await documentApi.list({
          page,
          limit: 10,
          search: search || undefined,
          status: (statusFilter as DocumentStatus) || undefined,
          sensitivity: (sensitivityFilter as SensitivityLevel) || undefined,
        });
        setDocuments(res.items);
        setTotal(res.total);
        setTotalPages(res.totalPages || 1);
      } catch (err: unknown) {
        console.error('Failed to fetch documents:', err);
      } finally {
        if (!silent) setIsLoadingDocs(false);
      }
    },
    [page, search, statusFilter, sensitivityFilter],
  );

  // Initial and reactive fetch when filters change
  useEffect(() => {
    if (!user) return;
    let isCancelled = false;

    const loadData = async () => {
      setIsLoadingDocs(true);
      try {
        const res = await documentApi.list({
          page,
          limit: 10,
          search: search || undefined,
          status: (statusFilter as DocumentStatus) || undefined,
          sensitivity: (sensitivityFilter as SensitivityLevel) || undefined,
        });
        if (!isCancelled) {
          setDocuments(res.items);
          setTotal(res.total);
          setTotalPages(res.totalPages || 1);
        }
      } catch (err: unknown) {
        if (!isCancelled) {
          console.error('Failed to load documents:', err);
        }
      } finally {
        if (!isCancelled) {
          setIsLoadingDocs(false);
        }
      }
    };

    loadData();

    return () => {
      isCancelled = true;
    };
  }, [user, page, search, statusFilter, sensitivityFilter]);

  // Auto-polling effect (runs every 3.5s silently while documents are in background pipeline)
  useEffect(() => {
    if (!isLivePolling) return;

    const interval = setInterval(() => {
      refreshList(true);
    }, 3500);

    return () => {
      clearInterval(interval);
    };
  }, [isLivePolling, refreshList]);

  // Open Chunk Inspector
  const handleInspectChunks = async (doc: DocumentItem) => {
    setInspectDoc(doc);
    setChunkSearch('');
    setIsLoadingChunks(true);
    try {
      const data = await documentApi.getChunks(doc.id);
      setChunks(data);
    } catch {
      setChunks([]);
    } finally {
      setIsLoadingChunks(false);
    }
  };

  // Copy chunk text
  const handleCopyChunk = (chunkId: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedChunkId(chunkId);
    setTimeout(() => setCopiedChunkId(null), 2000);
  };

  // Retry ingestion for a failed document (BullMQ re-queue)
  const handleRetryIngestion = async (doc: DocumentItem) => {
    setIsRetryingId(doc.id);
    try {
      const res = await documentApi.retry(doc.id);
      setActionSuccess(res.message);
      refreshList(true);
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: unknown) {
      const errorMsg =
        err instanceof ApiError
          ? err.messages.join(' | ')
          : 'Lỗi khi kích hoạt thử lại nạp tệp';
      alert(errorMsg);
    } finally {
      setIsRetryingId(null);
    }
  };

  // Drag & drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelected(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelected = (file: File) => {
    const validExtensions = /\.(pdf|docx|doc|md|txt)$/i;
    if (!validExtensions.test(file.name)) {
      setUploadError('Chỉ hỗ trợ tệp định dạng: PDF, DOCX, DOC, Markdown (.md), Text (.txt)');
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      setUploadError('Dung lượng tệp vượt quá 20MB');
      return;
    }
    setSelectedFile(file);
    setUploadError(null);
    setIsUploadOpen(true);
  };

  // Submit Upload
  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;

    setIsUploading(true);
    setUploadProgress(0);
    setUploadError(null);

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('sensitivity', sensitivity);
    formData.append('allowedRoles', JSON.stringify(allowedRoles));

    if (tagsInput.trim()) {
      const tags = tagsInput
        .split(',')
        .map((t) => t.trim())
        .filter((t) => t.length > 0);
      formData.append('tags', JSON.stringify(tags));
    }

    try {
      await documentApi.upload(formData, (progress) => {
        setUploadProgress(progress);
      });

      setActionSuccess(`Đã đẩy tệp "${selectedFile.name}" vào hàng đợi Ingestion (BullMQ)!`);
      setSelectedFile(null);
      setTagsInput('');
      setIsUploadOpen(false);
      refreshList();
      setTimeout(() => setActionSuccess(null), 5000);
    } catch (err) {
      if (err instanceof ApiError) {
        setUploadError(err.messages.join(' | '));
      } else {
        setUploadError('Không thể tải lên tệp tin. Vui lòng thử lại.');
      }
    } finally {
      setIsUploading(false);
      setUploadProgress(null);
    }
  };

  // Download
  const handleDownload = async (doc: DocumentItem) => {
    try {
      await documentApi.download(doc.id, doc.originalName);
    } catch {
      alert('Không thể tải xuống tệp tin. Vui lòng kiểm tra quyền truy cập.');
    }
  };

  // Delete
  const handleDelete = async (doc: DocumentItem) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa tài liệu "${doc.originalName}" không?`)) {
      return;
    }

    try {
      await documentApi.delete(doc.id);
      setActionSuccess(`Đã xóa tài liệu "${doc.originalName}"`);
      refreshList();
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err) {
      if (err instanceof ApiError) {
        alert(err.messages.join(' | '));
      } else {
        alert('Lỗi khi xóa tài liệu.');
      }
    }
  };

  // Calculations for summary queue metrics
  const indexedCount = documents.filter((d) => d.status === 'INDEXED').length;
  const processingCount = documents.filter((d) => d.status === 'PROCESSING' || d.status === 'UPLOADING').length;
  const failedCount = documents.filter((d) => d.status === 'FAILED').length;

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (mimeType: string, filename: string) => {
    if (mimeType.includes('pdf') || filename.endsWith('.pdf')) {
      return <FileText className="w-5 h-5 text-rose-500" />;
    }
    if (mimeType.includes('word') || filename.endsWith('.docx') || filename.endsWith('.doc')) {
      return <FileSpreadsheet className="w-5 h-5 text-blue-500" />;
    }
    return <FileCode className="w-5 h-5 text-purple-500" />;
  };

  const getStatusBadge = (status: DocumentStatus, errorMessage?: string | null) => {
    switch (status) {
      case 'INDEXED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Đã lập chỉ mục
          </span>
        );
      case 'PROCESSING':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 animate-pulse">
            <RotateCw className="w-3.5 h-3.5 animate-spin" />
            Đang nạp ngầm...
          </span>
        );
      case 'UPLOADING':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
            <Clock className="w-3.5 h-3.5" />
            Đang tải lên
          </span>
        );
      case 'FAILED':
        return (
          <span
            title={errorMessage || 'Xử lý thất bại'}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30"
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            Thất bại
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-500/10 text-slate-500 border border-slate-500/20">
            {status}
          </span>
        );
    }
  };

  const getSensitivityBadge = (sens: SensitivityLevel) => {
    switch (sens) {
      case 'CONFIDENTIAL':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-400">
            CONFIDENTIAL
          </span>
        );
      case 'PUBLIC':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-green-100 text-green-700 dark:bg-green-950/60 dark:text-green-400">
            PUBLIC
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400">
            INTERNAL
          </span>
        );
    }
  };

  const canUploadOrDelete =
    user?.role === 'ADMIN' || user?.role === 'KNOWLEDGE_MANAGER';

  // Filter chunks in inspector
  const filteredChunks = chunks.filter((c) =>
    c.content.toLowerCase().includes(chunkSearch.toLowerCase()),
  );

  if (isAuthLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
        <div className="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-8">
        {/* Action Success Alert */}
        {actionSuccess && (
          <div className="mb-6 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-sm font-medium flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
              <span>{actionSuccess}</span>
            </div>
            <button
              onClick={() => setActionSuccess(null)}
              aria-label="Đóng thông báo"
              className="cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Page Header with Live Polling Status */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight">Kho Tài liệu Tri thức</h1>
              {isLivePolling && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                  Đang đồng bộ hàng đợi ngầm...
                </span>
              )}
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Quản lý tài liệu và theo dõi tiến trình bóc tách, bẻ chunks và nạp vector tự động vào PostgreSQL
            </p>
          </div>

          {canUploadOrDelete && (
            <button
              onClick={() => {
                setSelectedFile(null);
                setUploadError(null);
                setIsUploadOpen(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm shadow-md shadow-indigo-500/20 transition cursor-pointer self-start md:self-auto focus-visible:ring-2 focus-visible:ring-indigo-500"
            >
              <Plus className="w-4 h-4" />
              Tải lên tài liệu mới
            </button>
          )}
        </div>

        {/* Pipeline Queue Metrics Cards (Module 3 Feature) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Tổng tài liệu
              </span>
              <div className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1">
                {total}
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                Đã lập chỉ mục
              </span>
              <div className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">
                {indexedCount}
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>

          <div
            className={`border rounded-2xl p-4 shadow-sm flex items-center justify-between transition ${
              processingCount > 0
                ? 'bg-amber-50/50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
            }`}
          >
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                Đang xử lý ngầm
                {processingCount > 0 && <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />}
              </span>
              <div className="text-2xl font-extrabold text-amber-600 dark:text-amber-400 mt-1">
                {processingCount}
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-100/70 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center">
              <Activity className={`w-5 h-5 ${processingCount > 0 ? 'animate-pulse' : ''}`} />
            </div>
          </div>

          <div
            className={`border rounded-2xl p-4 shadow-sm flex items-center justify-between transition ${
              failedCount > 0
                ? 'bg-rose-50/50 dark:bg-rose-950/30 border-rose-300 dark:border-rose-800'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
            }`}
          >
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-rose-600 dark:text-rose-400">
                Thất bại
              </span>
              <div className="text-2xl font-extrabold text-rose-600 dark:text-rose-400 mt-1">
                {failedCount}
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 flex items-center justify-center">
              <AlertCircle className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Drag & Drop Upload Zone */}
        {canUploadOrDelete && (
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`mb-8 border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer ${
              isDragging
                ? 'border-indigo-500 bg-indigo-500/10 scale-[1.005]'
                : 'border-slate-300 dark:border-slate-800 bg-white/60 dark:bg-slate-900/40 hover:border-indigo-400'
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  handleFileSelected(e.target.files[0]);
                }
              }}
              className="hidden"
              accept=".pdf,.docx,.doc,.md,.txt"
            />
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 mb-3">
              <UploadCloud className="w-6 h-6" />
            </div>
            <h3 className="font-semibold text-sm sm:text-base">
              Kéo thả tệp tài liệu vào đây hoặc{' '}
              <span className="text-indigo-600 dark:text-indigo-400 underline">
                duyệt tệp từ máy tính
              </span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Hỗ trợ: PDF (text-based), Word (.docx, .doc), Markdown (.md), Text (.txt) • Dung lượng tối đa: 20MB
            </p>
          </div>
        )}

        {/* Search & Filters Bar */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 mb-6 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-sm">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm kiếm tài liệu..."
              className="w-full pl-10 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-medium cursor-pointer"
            >
              <option value="">Tất cả trạng thái</option>
              <option value="INDEXED">Đã lập chỉ mục (INDEXED)</option>
              <option value="PROCESSING">Đang nạp ngầm (PROCESSING)</option>
              <option value="UPLOADING">Đang tải lên (UPLOADING)</option>
              <option value="FAILED">Thất bại (FAILED)</option>
            </select>

            <select
              value={sensitivityFilter}
              onChange={(e) => setSensitivityFilter(e.target.value)}
              className="py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-medium cursor-pointer"
            >
              <option value="">Mọi cấp độ nhạy cảm</option>
              <option value="PUBLIC">PUBLIC</option>
              <option value="INTERNAL">INTERNAL</option>
              <option value="CONFIDENTIAL">CONFIDENTIAL</option>
            </select>

            <button
              onClick={() => refreshList()}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition cursor-pointer"
              title="Làm mới danh sách"
              aria-label="Làm mới danh sách"
            >
              <RefreshCw className={`w-4 h-4 ${isLoadingDocs ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Document Table */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/75 dark:bg-slate-800/50 text-xs uppercase tracking-wider text-slate-500 font-semibold">
                  <th className="py-3.5 px-4">Tên tài liệu</th>
                  <th className="py-3.5 px-4">Trạng thái Pipeline</th>
                  <th className="py-3.5 px-4">Kích thước</th>
                  <th className="py-3.5 px-4">Phân quyền (RBAC)</th>
                  <th className="py-3.5 px-4">Chunks (pgvector)</th>
                  <th className="py-3.5 px-4">Ngày tạo</th>
                  <th className="py-3.5 px-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {isLoadingDocs ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                      Đang tải danh sách tài liệu...
                    </td>
                  </tr>
                ) : documents.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-16 text-center text-slate-400">
                      <FileText className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-700 mb-2" />
                      <p className="font-medium text-slate-600 dark:text-slate-400">
                        Chưa có tài liệu nào
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {canUploadOrDelete
                          ? 'Hãy kéo thả hoặc tải lên tệp tin đầu tiên để bắt đầu'
                          : 'Hiện chưa có tài liệu nào được phân quyền cho bạn'}
                      </p>
                    </td>
                  </tr>
                ) : (
                  documents.map((doc) => (
                    <tr
                      key={doc.id}
                      className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition"
                    >
                      <td className="py-3 px-4 max-w-xs">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 flex-shrink-0">
                            {getFileIcon(doc.mimeType, doc.originalName)}
                          </div>
                          <div className="overflow-hidden">
                            <span
                              title={doc.originalName}
                              className="font-semibold text-slate-900 dark:text-white truncate block"
                            >
                              {doc.originalName}
                            </span>
                            <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-400">
                              {getSensitivityBadge(doc.sensitivity)}
                              {doc.pageCount && <span>{doc.pageCount} trang</span>}
                            </div>
                            {doc.status === 'FAILED' && doc.errorMessage && (
                              <p className="text-[11px] text-rose-500 truncate mt-1">
                                Lỗi: {doc.errorMessage}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        {getStatusBadge(doc.status, doc.errorMessage)}
                      </td>

                      <td className="py-3 px-4 text-xs text-slate-500">
                        {formatBytes(doc.sizeBytes)}
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1">
                          {doc.allowedRoles.map((role) => (
                            <span
                              key={role}
                              className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium"
                            >
                              {role === 'KNOWLEDGE_MANAGER' ? 'KM' : role}
                            </span>
                          ))}
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <button
                          onClick={() => handleInspectChunks(doc)}
                          className="inline-flex items-center gap-1.5 py-1 px-2.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-semibold text-xs hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition cursor-pointer"
                          title="Bấm để soi chi tiết từng Chunks và vector"
                          aria-label={`Soi Chunks của tài liệu ${doc.originalName}`}
                        >
                          <Layers className="w-3.5 h-3.5" />
                          <span>{doc._count?.chunks || 0} chunks</span>
                        </button>
                      </td>

                      <td className="py-3 px-4 text-xs text-slate-400">
                        {new Date(doc.createdAt).toLocaleDateString('vi-VN')}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          {/* Retry button for FAILED status */}
                          {doc.status === 'FAILED' && canUploadOrDelete && (
                            <button
                              onClick={() => handleRetryIngestion(doc)}
                              disabled={isRetryingId === doc.id}
                              title="Thử lại quy trình nạp ngầm (BullMQ)"
                              aria-label="Thử lại nạp ngầm"
                              className="inline-flex items-center gap-1 py-1 px-2 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 text-xs font-semibold transition cursor-pointer disabled:opacity-50"
                            >
                              <RotateCw
                                className={`w-3.5 h-3.5 ${
                                  isRetryingId === doc.id ? 'animate-spin' : ''
                                }`}
                              />
                              <span>Thử lại</span>
                            </button>
                          )}

                          {/* Download button */}
                          <button
                            onClick={() => handleDownload(doc)}
                            title="Tải xuống tệp gốc"
                            aria-label="Tải xuống tệp gốc"
                            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 transition cursor-pointer"
                          >
                            <Download className="w-4 h-4" />
                          </button>

                          {/* Delete button */}
                          {canUploadOrDelete && (
                            <button
                              onClick={() => handleDelete(doc)}
                              title="Xóa tài liệu"
                              aria-label="Xóa tài liệu"
                              className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
              <div>
                Hiển thị trang <span className="font-semibold text-slate-800 dark:text-slate-200">{page}</span> / {totalPages} (Tổng số: {total} tài liệu)
              </div>
              <div className="flex items-center gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  aria-label="Trang trước"
                  className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40 cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  aria-label="Trang tiếp theo"
                  className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40 cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Chunk Inspector Modal (Module 3 Feature) */}
      {inspectDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-3xl w-full max-h-[85vh] flex flex-col shadow-2xl relative">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 mb-1">
                  <Database className="w-4 h-4" />
                  <span className="text-xs font-bold uppercase tracking-wider">
                    Trình Soi Chunks & Vector (pgvector)
                  </span>
                </div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white truncate max-w-xl">
                  {inspectDoc.originalName}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Tổng số: <span className="font-semibold text-indigo-600 dark:text-indigo-400">{chunks.length} chunks</span> đã bóc tách và tạo vector nhúng 1536 chiều
                </p>
              </div>
              <button
                onClick={() => setInspectDoc(null)}
                aria-label="Đóng cửa sổ soi chunk"
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Chunk Search Bar */}
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={chunkSearch}
                  onChange={(e) => setChunkSearch(e.target.value)}
                  placeholder="Tìm kiếm nội dung bên trong các Chunks..."
                  className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                />
              </div>
            </div>

            {/* Chunk List Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-3">
              {isLoadingChunks ? (
                <div className="py-16 text-center text-slate-400">
                  <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  Đang tải danh sách Chunks từ PostgreSQL...
                </div>
              ) : filteredChunks.length === 0 ? (
                <div className="py-16 text-center text-slate-400">
                  <Layers className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-700 mb-2" />
                  <p className="font-medium text-slate-600 dark:text-slate-400">
                    {chunks.length === 0
                      ? 'Chưa có chunks nào được lưu cho tài liệu này'
                      : 'Không tìm thấy chunk nào khớp với từ khóa tìm kiếm'}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    {chunks.length === 0
                      ? 'Tài liệu đang trong hàng đợi xử lý hoặc đã thất bại khi bóc tách.'
                      : 'Hãy thử tìm kiếm với cụm từ khác.'}
                  </p>
                </div>
              ) : (
                filteredChunks.map((chunk) => (
                  <div
                    key={chunk.id}
                    className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 space-y-2 hover:border-indigo-300 dark:hover:border-indigo-700 transition"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/80">
                          Chunk #{chunk.chunkIndex + 1}
                        </span>
                        {chunk.pageNumber && (
                          <span className="text-slate-500 font-medium">
                            Trang {chunk.pageNumber}
                          </span>
                        )}
                        <span className="text-slate-400 text-[11px]">
                          ~{chunk.tokenCount} tokens
                        </span>
                      </div>

                      <button
                        onClick={() => handleCopyChunk(chunk.id, chunk.content)}
                        className="inline-flex items-center gap-1 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition cursor-pointer text-xs"
                        aria-label="Sao chép nội dung đoạn chunk"
                      >
                        {copiedChunkId === chunk.id ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-500" />
                            <span className="text-emerald-500 font-semibold text-[11px]">Đã chép</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span className="text-[11px]">Sao chép</span>
                          </>
                        )}
                      </button>
                    </div>

                    <div className="text-xs text-slate-700 dark:text-slate-300 font-mono leading-relaxed bg-white dark:bg-slate-900/90 p-3 rounded-lg border border-slate-100 dark:border-slate-800/80 whitespace-pre-wrap max-h-48 overflow-y-auto">
                      {chunk.content}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex justify-end">
              <button
                onClick={() => setInspectDoc(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upload Modal Drawer */}
      {isUploadOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative">
            <button
              onClick={() => {
                if (!isUploading) setIsUploadOpen(false);
              }}
              aria-label="Đóng bảng tải lên"
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-lg font-bold mb-1">Cấu hình & Tải lên Tài liệu</h2>
            <p className="text-xs text-slate-500 mb-5">
              Tệp tin sẽ được lưu trữ an toàn trên MinIO/S3 và đưa vào luồng bóc tách tự động (BullMQ Ingestion Queue)
            </p>

            {uploadError && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-300 text-xs">
                {uploadError}
              </div>
            )}

            <form onSubmit={handleUploadSubmit} className="space-y-4">
              {/* File selector preview */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                  Tệp tin đã chọn
                </label>
                {selectedFile ? (
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      <FileText className="w-5 h-5 text-indigo-600 flex-shrink-0" />
                      <div className="overflow-hidden">
                        <p className="text-sm font-semibold truncate">{selectedFile.name}</p>
                        <p className="text-xs text-slate-400">{formatBytes(selectedFile.size)}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedFile(null)}
                      className="text-xs text-red-500 hover:underline cursor-pointer"
                    >
                      Đổi tệp
                    </button>
                  </div>
                ) : (
                  <input
                    type="file"
                    required
                    onChange={(e) => {
                      if (e.target.files && e.target.files.length > 0) {
                        handleFileSelected(e.target.files[0]);
                      }
                    }}
                    accept=".pdf,.docx,.doc,.md,.txt"
                    className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer"
                  />
                )}
              </div>

              {/* Sensitivity Level */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                  Cấp độ Bảo mật (Sensitivity)
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['INTERNAL', 'PUBLIC', 'CONFIDENTIAL'] as SensitivityLevel[]).map((level) => (
                    <button
                      key={level}
                      type="button"
                      onClick={() => setSensitivity(level)}
                      className={`py-2 px-3 rounded-xl border text-xs font-bold transition cursor-pointer ${
                        sensitivity === level
                          ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400'
                          : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      {level}
                    </button>
                  ))}
                </div>
              </div>

              {/* Allowed Roles */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                  Phân quyền truy cập (RBAC)
                </label>
                <div className="flex flex-wrap gap-2">
                  {(['EMPLOYEE', 'KNOWLEDGE_MANAGER', 'ADMIN'] as UserRole[]).map((role) => {
                    const isChecked = allowedRoles.includes(role);
                    return (
                      <button
                        key={role}
                        type="button"
                        onClick={() => {
                          if (isChecked) {
                            if (allowedRoles.length > 1) {
                              setAllowedRoles(allowedRoles.filter((r) => r !== role));
                            }
                          } else {
                            setAllowedRoles([...allowedRoles, role]);
                          }
                        }}
                        className={`py-1.5 px-3 rounded-lg border text-xs font-medium transition cursor-pointer ${
                          isChecked
                            ? 'bg-slate-800 text-white dark:bg-white dark:text-slate-900 border-transparent'
                            : 'border-slate-200 dark:border-slate-700 text-slate-500'
                        }`}
                      >
                        {role}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Tags */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                  Thẻ Tags phân loại (ngăn cách bởi dấu phẩy)
                </label>
                <input
                  type="text"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  placeholder="HR, ChinhSach, QuyTrinh2026..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                />
              </div>

              {/* Upload Progress Bar */}
              {isUploading && uploadProgress !== null && (
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>Đang tải tệp lên MinIO/S3...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className="h-full bg-indigo-600 transition-all duration-200"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  disabled={isUploading}
                  onClick={() => setIsUploadOpen(false)}
                  className="px-4 py-2 rounded-xl text-sm font-semibold border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isUploading || !selectedFile}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm transition shadow-md shadow-indigo-500/20 disabled:opacity-50 cursor-pointer"
                >
                  {isUploading ? 'Đang tải lên...' : 'Tải lên & Nạp hàng đợi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
