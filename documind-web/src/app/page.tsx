'use client';

export const dynamic = 'force-dynamic';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { Navbar } from '@/components/navbar';
import {
  Sparkles,
  Shield,
  FileText,
  MessageSquare,
  BarChart3,
  CheckCircle2,
  Lock,
  ArrowRight,
  UploadCloud,
  Cpu,
} from 'lucide-react';

export default function HomePage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-slate-400">Đang tải phiên làm việc...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return {
          label: 'Quản trị viên Hệ thống (System Admin)',
          color: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
        };
      case 'KNOWLEDGE_MANAGER':
        return {
          label: 'Quản lý Tri thức (Knowledge Manager)',
          color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
        };
      default:
        return {
          label: 'Nhân viên (Employee)',
          color: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20',
        };
    }
  };

  const roleInfo = getRoleBadge(user.role);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col">
      <Navbar />

      {/* Main Content */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-8">
        {/* Welcome Banner */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-900 via-indigo-800 to-purple-900 text-white p-8 mb-8 shadow-xl">
          <div className="relative z-10 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-white/10 backdrop-blur-sm border border-white/20 mb-4">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              Phiên làm việc JWT Token đã xác thực
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight">
              Xin chào, {user.name || user.email}! 👋
            </h1>
            <p className="mt-2 text-indigo-100 text-sm sm:text-base leading-relaxed">
              Chào mừng bạn đến với hệ sinh thái DocuMind AI. Bạn có thể tải lên tài liệu mới để nạp vào cơ sở dữ liệu vector hoặc tra cứu tri thức nội bộ.
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <div
                className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl border text-xs font-bold uppercase tracking-wider ${roleInfo.color} bg-white dark:bg-slate-900`}
              >
                <Shield className="w-4 h-4" />
                {roleInfo.label}
              </div>

              <Link
                href="/chat"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white font-semibold text-xs transition shadow-sm"
              >
                <MessageSquare className="w-4 h-4" />
                Hỏi đáp Tri thức (RAG Chat)
              </Link>

              <Link
                href="/documents"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white text-indigo-900 font-semibold text-xs hover:bg-indigo-50 transition shadow-sm"
              >
                <UploadCloud className="w-4 h-4" />
                Đến Kho Tài Liệu
              </Link>
            </div>
          </div>
        </div>

        {/* Status Metrics Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-3 text-slate-500 mb-2">
              <Shield className="w-5 h-5 text-indigo-600" />
              <span className="text-xs uppercase font-bold tracking-wider">Vai trò RBAC</span>
            </div>
            <div className="text-lg font-bold text-slate-900 dark:text-white mt-1">
              {user.role}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {user.role === 'EMPLOYEE'
                ? 'Quyền đọc tài liệu nội bộ theo phòng ban'
                : 'Quyền nạp, phân quyền và quản lý tài liệu tri thức'}
            </p>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-3 text-slate-500 mb-2">
              <Lock className="w-5 h-5 text-emerald-600" />
              <span className="text-xs uppercase font-bold tracking-wider">Lưu trữ Đối tượng</span>
            </div>
            <div className="text-lg font-bold text-slate-900 dark:text-white mt-1">
              MinIO / S3 Storage
            </div>
            <p className="text-xs text-slate-500 mt-1">
              File lưu trữ trên Object Storage độc lập, bảo mật và phân quyền tải về.
            </p>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-3 text-slate-500 mb-2">
              <Sparkles className="w-5 h-5 text-purple-600" />
              <span className="text-xs uppercase font-bold tracking-wider">Tiến độ Module</span>
            </div>
            <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5" /> Module 1, 2, 3: Sẵn sàng
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Auth + Ingestion Pipeline & Giám sát Hàng đợi BullMQ đã hoàn tất.
            </p>
          </div>
        </div>

        {/* Modules Roadmap & Direct Actions */}
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">
            Tính năng & Các Module hệ thống
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Module 2: Active */}
            <Link
              href="/documents"
              className="p-5 rounded-2xl border-2 border-indigo-500/40 bg-white dark:bg-slate-900/80 hover:border-indigo-500 transition group flex items-start justify-between shadow-sm"
            >
              <div>
                <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-3">
                  <FileText className="w-5 h-5" />
                </div>
                <h3 className="font-semibold text-sm group-hover:text-indigo-600 transition flex items-center gap-1.5">
                  Module 2: Quản lý & Nạp Tài liệu
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition" />
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Kéo thả upload PDF, DOCX, Markdown, lưu trữ MinIO/S3 và quản lý trạng thái nạp.
                </p>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                Đang mở
              </span>
            </Link>

            {/* Module 3: Jobs & Ingestion */}
            <Link
              href="/pipeline"
              className="p-5 rounded-2xl border-2 border-indigo-500/40 bg-white dark:bg-slate-900/80 hover:border-indigo-500 transition group flex items-start justify-between shadow-sm"
            >
              <div>
                <div className="w-9 h-9 rounded-xl bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center mb-3">
                  <Cpu className="w-5 h-5" />
                </div>
                <h3 className="font-semibold text-sm group-hover:text-indigo-600 transition flex items-center gap-1.5">
                  Module 3: Hàng đợi & Pipeline Ingestion
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition" />
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Giám sát BullMQ 5 chặng, Worker throughput, bẻ chunks 800 tokens, retry và Soi Chunks.
                </p>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                Đang mở
              </span>
            </Link>

            {/* Module 4: Active RAG & Chat Workspace */}
            <Link
              href="/chat"
              className="p-5 rounded-2xl border-2 border-indigo-500/40 bg-white dark:bg-slate-900/80 hover:border-indigo-500 transition group flex items-start justify-between shadow-sm"
            >
              <div>
                <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 flex items-center justify-center mb-3">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <h3 className="font-semibold text-sm group-hover:text-indigo-600 transition flex items-center gap-1.5">
                  Module 4: Khung Chat Đối chiếu Tri thức
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition" />
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Hỏi đáp đa lượt với Query Rewriting, Streaming SSE từng token, đối chiếu song song với Citation Drawer.
                </p>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 shrink-0">
                Đang mở
              </span>
            </Link>

            {/* Module 6: Admin */}
            <Link
              href="/admin"
              className="p-5 rounded-2xl border-2 border-indigo-500/40 bg-white dark:bg-slate-900/80 hover:border-indigo-500 transition group flex items-start justify-between shadow-sm"
            >
              <div>
                <div className="w-9 h-9 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 flex items-center justify-center mb-3">
                  <BarChart3 className="w-5 h-5" />
                </div>
                <h3 className="font-semibold text-sm group-hover:text-indigo-600 transition flex items-center gap-1.5">
                  Module 6: Quản trị & Giám sát Hệ thống
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition" />
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Thống kê tiêu thụ token, chi phí AI (USD/VND), tài nguyên người dùng/tài liệu và Audit Logs.
                </p>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 shrink-0">
                Đang mở
              </span>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
