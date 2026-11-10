'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import {
  Sparkles,
  LogOut,
  Shield,
  FileText,
  MessageSquare,
  BarChart3,
  CheckCircle2,
  Lock,
  ArrowRight,
} from 'lucide-react';

export default function HomePage() {
  const { user, isLoading, logout } = useAuth();
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
      {/* Top Navigation */}
      <header className="sticky top-0 z-40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-lg tracking-tight">DocuMind AI</span>
              <span className="ml-2 text-xs py-0.5 px-2 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-semibold">
                MVP v1.0
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <div className="text-sm font-semibold">{user.name || 'Người dùng'}</div>
              <div className="text-xs text-slate-500">{user.email}</div>
            </div>

            <button
              onClick={logout}
              title="Đăng xuất"
              className="flex items-center gap-2 py-2 px-3 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-sm font-medium transition cursor-pointer text-slate-700 dark:text-slate-300"
            >
              <LogOut className="w-4 h-4 text-slate-500" />
              <span className="hidden sm:inline">Đăng xuất</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-8">
        {/* Welcome Banner */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-900 via-indigo-800 to-purple-900 text-white p-8 mb-8 shadow-xl">
          <div className="relative z-10 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-white/10 backdrop-blur-sm border border-white/20 mb-4">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              Xác thực JWT Token thành công
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight">
              Xin chào, {user.name || user.email}! 👋
            </h1>
            <p className="mt-2 text-indigo-100 text-sm sm:text-base leading-relaxed">
              Bạn đã đăng nhập thành công vào hệ thống DocuMind AI. Phiên làm việc của bạn đang
              được bảo vệ an toàn với JSON Web Token và cơ chế kiểm soát truy cập phân quyền RBAC.
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <div
                className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl border text-xs font-bold uppercase tracking-wider ${roleInfo.color} bg-white dark:bg-slate-900`}
              >
                <Shield className="w-4 h-4" />
                {roleInfo.label}
              </div>
            </div>
          </div>
        </div>

        {/* User Profile Card & Security Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-3 text-slate-500 mb-2">
              <Shield className="w-5 h-5 text-indigo-600" />
              <span className="text-xs uppercase font-bold tracking-wider">Vai trò truy cập</span>
            </div>
            <div className="text-lg font-bold text-slate-900 dark:text-white mt-1">
              {user.role}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Định danh quyền đọc tài liệu và gọi model RAG theo chính sách RBAC.
            </p>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-3 text-slate-500 mb-2">
              <Lock className="w-5 h-5 text-emerald-600" />
              <span className="text-xs uppercase font-bold tracking-wider">Cơ chế Bảo mật</span>
            </div>
            <div className="text-lg font-bold text-slate-900 dark:text-white mt-1">
              JWT Bearer (7 ngày)
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Access Token kèm Refresh Token (30 ngày) được lưu trữ an toàn.
            </p>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-3 text-slate-500 mb-2">
              <Sparkles className="w-5 h-5 text-purple-600" />
              <span className="text-xs uppercase font-bold tracking-wider">Trạng thái Module</span>
            </div>
            <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5" /> Module 1: Sẵn sàng
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Đăng ký, Đăng nhập, Google SSO & Xác thực người dùng hoàn tất.
            </p>
          </div>
        </div>

        {/* Upcoming Modules Roadmap */}
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">
            Lộ trình các Module tiếp theo (2 - 6)
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 flex items-start justify-between">
              <div>
                <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 flex items-center justify-center mb-3">
                  <FileText className="w-5 h-5" />
                </div>
                <h3 className="font-semibold text-sm">Module 2: Quản lý & Nạp Tài liệu</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Upload file PDF, Word, Markdown, bóc tách trang và lưu trữ metadata.
                </p>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500">
                Tiếp theo
              </span>
            </div>

            <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 flex items-start justify-between">
              <div>
                <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 flex items-center justify-center mb-3">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <h3 className="font-semibold text-sm">Module 4 & 5: RAG & Trò chuyện AI</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Hybrid Search (Vector + Full-text), Streaming SSE từng token, trích dẫn nguồn.
                </p>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500">
                Chờ nạp
              </span>
            </div>

            <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 flex items-start justify-between">
              <div>
                <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center mb-3">
                  <BarChart3 className="w-5 h-5" />
                </div>
                <h3 className="font-semibold text-sm">Module 6: Quản trị & Giám sát</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Thống kê tiêu thụ token, chi phí LLM, phân quyền người dùng và Audit Log.
                </p>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500">
                Chờ nạp
              </span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
