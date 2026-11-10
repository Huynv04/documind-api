'use client';

export const dynamic = 'force-dynamic';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { Navbar } from '@/components/navbar';
import { documentApi, ApiError } from '@/lib/api';
import { DocumentItem, DocumentStatus, SensitivityLevel } from '@/types/document';
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
  Filter,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  Shield,
  Layers,
  ChevronLeft,
  ChevronRight,
  Plus,
  X,
} from 'lucide-react';

export default function DocumentsPage() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const router = useRouter();

  // Documents state
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

  // Drag and drop state
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check auth
  useEffect(() => {
    if (!isAuthLoading && !user) {
      router.push('/login');
    }
  }, [user, isAuthLoading, router]);

  // Fetch documents list
  const fetchDocuments = useCallback(async () => {
    setIsLoadingDocs(true);
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
    } catch (err: any) {
      console.error('Failed to fetch documents:', err);
    } finally {
      setIsLoadingDocs(false);
    }
  }, [page, search, statusFilter, sensitivityFilter]);

  useEffect(() => {
    if (user) {
      fetchDocuments();
    }
  }, [user, fetchDocuments]);

  // Handle Drag & Drop
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

      setActionSuccess(`Đã tải lên tệp "${selectedFile.name}" thành công vào MinIO/S3!`);
      setSelectedFile(null);
      setTagsInput('');
      setIsUploadOpen(false);
      fetchDocuments();
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

  // Download File
  const handleDownload = async (doc: DocumentItem) => {
    try {
      await documentApi.download(doc.id, doc.originalName);
    } catch {
      alert('Không thể tải xuống tệp tin. Vui lòng kiểm tra lại quyền truy cập.');
    }
  };

  // Delete Document
  const handleDelete = async (doc: DocumentItem) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa tài liệu "${doc.originalName}" không?`)) {
      return;
    }

    try {
      await documentApi.delete(doc.id);
      setActionSuccess(`Đã xóa tài liệu "${doc.originalName}"`);
      fetchDocuments();
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err) {
      if (err instanceof ApiError) {
        alert(err.messages.join(' | '));
      } else {
        alert('Lỗi khi xóa tài liệu.');
      }
    }
  };

  // Helpers
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

  const getStatusBadge = (status: DocumentStatus) => {
    switch (status) {
      case 'INDEXED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Đã lập chỉ mục
          </span>
        );
      case 'PROCESSING':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            <Clock className="w-3.5 h-3.5 animate-spin" />
            Đang bóc tách & embed
          </span>
        );
      case 'UPLOADING':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
            <Clock className="w-3.5 h-3.5" />
            Đang tải lên
          </span>
        );
      case 'FAILED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
            <AlertTriangle className="w-3.5 h-3.5" />
            Thất bại
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-500/10 text-slate-500 border border-slate-500/20">
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
          <div className="mb-6 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-sm font-medium flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              <span>{actionSuccess}</span>
            </div>
            <button onClick={() => setActionSuccess(null)}>
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Kho Tài liệu Tri thức</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Quản lý và tiếp nhận tệp tin PDF, Word, Markdown để phục vụ hệ thống RAG & Tìm kiếm ngữ nghĩa
            </p>
          </div>

          {canUploadOrDelete && (
            <button
              onClick={() => {
                setSelectedFile(null);
                setUploadError(null);
                setIsUploadOpen(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm shadow-md shadow-indigo-500/20 transition cursor-pointer self-start md:self-auto"
            >
              <Plus className="w-4 h-4" />
              Tải lên tài liệu mới
            </button>
          )}
        </div>

        {/* Drag & Drop Upload Zone (For KM and Admin) */}
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
              Kéo thả tệp tài liệu vào đây hoặc <span className="text-indigo-600 dark:text-indigo-400 underline">duyệt tệp từ máy tính</span>
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
              className="py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-medium"
            >
              <option value="">Tất cả trạng thái</option>
              <option value="INDEXED">Đã lập chỉ mục (INDEXED)</option>
              <option value="PROCESSING">Đang xử lý (PROCESSING)</option>
              <option value="UPLOADING">Đang tải lên (UPLOADING)</option>
              <option value="FAILED">Thất bại (FAILED)</option>
            </select>

            <select
              value={sensitivityFilter}
              onChange={(e) => setSensitivityFilter(e.target.value)}
              className="py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-medium"
            >
              <option value="">Mọi cấp độ nhạy cảm</option>
              <option value="PUBLIC">PUBLIC</option>
              <option value="INTERNAL">INTERNAL</option>
              <option value="CONFIDENTIAL">CONFIDENTIAL</option>
            </select>

            <button
              onClick={() => fetchDocuments()}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition"
              title="Làm mới"
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
                  <th className="py-3.5 px-4">Trạng thái</th>
                  <th className="py-3.5 px-4">Kích thước</th>
                  <th className="py-3.5 px-4">Phân quyền (RBAC)</th>
                  <th className="py-3.5 px-4">Số Chunks</th>
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
                      <p className="font-medium text-slate-600 dark:text-slate-400">Chưa có tài liệu nào</p>
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
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800">
                            {getFileIcon(doc.mimeType, doc.originalName)}
                          </div>
                          <div>
                            <span className="font-semibold text-slate-900 dark:text-white line-clamp-1 block">
                              {doc.originalName}
                            </span>
                            <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-400">
                              {getSensitivityBadge(doc.sensitivity)}
                              {doc.pageCount && <span>{doc.pageCount} trang</span>}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        {getStatusBadge(doc.status)}
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
                        <span className="inline-flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-400 font-semibold">
                          <Layers className="w-3.5 h-3.5" />
                          {doc._count?.chunks || 0}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-xs text-slate-400">
                        {new Date(doc.createdAt).toLocaleDateString('vi-VN')}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            onClick={() => handleDownload(doc)}
                            title="Tải xuống tệp gốc"
                            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 transition"
                          >
                            <Download className="w-4 h-4" />
                          </button>

                          {canUploadOrDelete && (
                            <button
                              onClick={() => handleDelete(doc)}
                              title="Xóa tài liệu"
                              className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition"
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
                  className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Upload Modal Drawer */}
      {isUploadOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative">
            <button
              onClick={() => {
                if (!isUploading) setIsUploadOpen(false);
              }}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-lg font-bold mb-1">Cấu hình & Tải lên Tài liệu</h2>
            <p className="text-xs text-slate-500 mb-5">
              Tệp tin sẽ được lưu trữ an toàn trên MinIO/S3 và đưa vào luồng bóc tách tự động
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
                      className="text-xs text-red-500 hover:underline"
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
                    className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
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
                      className={`py-2 px-3 rounded-xl border text-xs font-bold transition ${
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
                        className={`py-1.5 px-3 rounded-lg border text-xs font-medium transition ${
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
                  className="px-4 py-2 rounded-xl text-sm font-semibold border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isUploading || !selectedFile}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm transition shadow-md shadow-indigo-500/20 disabled:opacity-50"
                >
                  {isUploading ? 'Đang tải lên...' : 'Tải lên & Xử lý'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

