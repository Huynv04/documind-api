'use client';

export const dynamic = 'force-dynamic';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/auth-context';
import { authApi, ApiError } from '@/lib/api';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  LogIn,
  Sparkles,
  AlertCircle,
  ShieldCheck,
  Search,
  CheckCircle2,
  HelpCircle,
  X,
  FileText,
  UserCheck,
  Building2,
  KeyRound,
} from 'lucide-react';

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [helpdeskModalOpen, setHelpdeskModalOpen] = useState(false);

  // Preset demo accounts for rapid testing and review of RBAC
  const demoAccounts = [
    {
      role: 'Nhân viên (Employee)',
      email: 'user@documind.vn',
      pass: 'Employee@123',
      color: 'border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 bg-indigo-50/50 dark:bg-indigo-950/40',
    },
    {
      role: 'Quản lý Tri thức (KM)',
      email: 'km@documind.vn',
      pass: 'Manager@123',
      color: 'border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 bg-emerald-50/50 dark:bg-emerald-950/40',
    },
    {
      role: 'Quản trị viên (Admin)',
      email: 'admin@documind.vn',
      pass: 'Admin@123',
      color: 'border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 bg-rose-50/50 dark:bg-rose-950/40',
    },
  ];

  const fillDemoAccount = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setErrorMsg(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setErrorMsg('Vui lòng nhập đầy đủ Email và Mật khẩu.');
      return;
    }

    if (password.length < 6) {
      setErrorMsg('Mật khẩu phải từ 6 ký tự trở lên.');
      return;
    }

    setIsSubmitting(true);
    try {
      await login(trimmedEmail, password);
    } catch (err) {
      if (err instanceof ApiError) {
        setErrorMsg(err.messages.join(' | '));
      } else {
        setErrorMsg('Không thể kết nối đến máy chủ API. Vui lòng kiểm tra lại trạng thái Backend.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleLogin = () => {
    window.location.href = authApi.getGoogleAuthUrl();
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex font-sans">
      {/* ======================================================== */}
      {/* 1. LEFT COLUMN: ENTERPRISE BRAND HERO PRESENTATION       */}
      {/* ======================================================== */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-950 text-white p-12 flex-col justify-between overflow-hidden border-r border-slate-800">
        {/* Glow ambient lights */}
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl pointer-events-none" />

        {/* Brand Top */}
        <div className="relative z-10">
          <div className="inline-flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-xl shadow-indigo-500/30">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <span className="font-extrabold text-xl tracking-tight">DocuMind AI</span>
              <span className="ml-2 px-2 py-0.5 rounded-full text-[10px] font-mono bg-white/10 text-indigo-200 border border-white/20">
                Enterprise RAG
              </span>
            </div>
          </div>
        </div>

        {/* Center Presentation: Core Value Propositions */}
        <div className="relative z-10 space-y-6 max-w-lg my-auto py-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-300 border border-indigo-500/30">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            Nền tảng Tra cứu Tri thức & Trợ lý RAG Doanh nghiệp
          </div>

          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight leading-tight">
            Truy xuất tri thức tức thì. <br />
            <span className="bg-gradient-to-r from-indigo-400 via-sky-300 to-purple-300 bg-clip-text text-transparent">
              Chính xác từng trang tài liệu.
            </span>
          </h2>

          <p className="text-sm text-slate-300 leading-relaxed">
            DocuMind AI kết hợp tìm kiếm lai Hybrid Search (Vector pgvector + Full-text Search) với cơ chế phân quyền bảo mật tài liệu nghiêm ngặt theo phòng ban.
          </p>

          {/* Feature Highlights Grid */}
          <div className="space-y-3 pt-2">
            <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div className="text-xs">
                <strong className="text-white block font-semibold mb-0.5">
                  Tỷ lệ ảo giác (Hallucination) $\le 1\%$
                </strong>
                <span className="text-slate-400 leading-relaxed">
                  Câu trả lời được ghim chặt vào dữ liệu nội bộ và trích dẫn số trang nguyên văn.
                </span>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
              <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0 mt-0.5">
                <KeyRound className="w-4 h-4" />
              </div>
              <div className="text-xs">
                <strong className="text-white block font-semibold mb-0.5">
                  Bảo mật phân quyền theo vai trò (Zero-Leak RBAC)
                </strong>
                <span className="text-slate-400 leading-relaxed">
                  Lọc trước metadata tại tầng truy vấn SQL, đảm bảo không rò rỉ tài liệu nhạy cảm giữa các phòng ban.
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Badges */}
        <div className="relative z-10 pt-4 border-t border-white/10 flex items-center justify-between text-xs text-slate-400">
          <span>Tiêu chuẩn bảo mật ISO/IEC 27001</span>
          <span className="font-mono">v1.0-pgvector</span>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 2. RIGHT COLUMN: LOGIN FORM & QUICK DEMO SWITCHER        */}
      {/* ======================================================== */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 overflow-y-auto">
        <div className="max-w-md w-full space-y-6">
          {/* Mobile Brand Logo */}
          <div className="lg:hidden flex items-center gap-2.5 mb-2">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-md">
              <Sparkles className="w-5 h-5" />
            </div>
            <span className="font-extrabold text-lg tracking-tight">DocuMind AI</span>
          </div>

          {/* Form Header */}
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Đăng nhập hệ thống
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
              Nhập email doanh nghiệp hoặc đăng nhập nhanh với tài khoản Google SSO.
            </p>
          </div>

          {/* Error Alert */}
          {errorMsg && (
            <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 flex items-start gap-3 animate-in fade-in">
              <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
              <div className="flex-1 text-xs text-rose-800 dark:text-rose-300 font-medium leading-relaxed">
                {errorMsg}
              </div>
              <button
                onClick={() => setErrorMsg(null)}
                className="text-rose-400 hover:text-rose-600 p-0.5"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Google Workspace SSO Button */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-700 dark:text-slate-200 font-semibold text-xs transition shadow-sm active:scale-[0.99] cursor-pointer"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>Đăng nhập với Google Workspace (SSO)</span>
          </button>

          {/* Divider */}
          <div className="relative flex items-center justify-center">
            <div className="border-t border-slate-200 dark:border-slate-800 w-full" />
            <span className="bg-slate-50 dark:bg-slate-950 px-3 text-[11px] uppercase tracking-wider text-slate-400 font-bold absolute">
              hoặc tài khoản email
            </span>
          </div>

          {/* Credentials Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                Email công ty
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.vn"
                  required
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition text-xs leading-relaxed"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Mật khẩu
                </label>
                <button
                  type="button"
                  onClick={() => setHelpdeskModalOpen(true)}
                  className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-semibold cursor-pointer"
                >
                  Quên mật khẩu?
                </button>
              </div>

              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition text-xs leading-relaxed"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition shadow-md shadow-indigo-500/25 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.99] cursor-pointer"
            >
              {isSubmitting ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>Đăng nhập hệ thống</span>
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Credentials Switcher for Evaluators */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <UserCheck className="w-3.5 h-3.5" />
              Điền nhanh tài khoản thử nghiệm RBAC:
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {demoAccounts.map((acc, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => fillDemoAccount(acc.email, acc.pass)}
                  className={`p-2 rounded-xl border text-left text-[11px] transition hover:shadow-sm cursor-pointer ${acc.color}`}
                  title={`Điền tự động: ${acc.email}`}
                >
                  <div className="font-bold truncate">{acc.role.split(' ')[0]}</div>
                  <div className="text-[10px] opacity-80 truncate">{acc.email.split('@')[0]}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Footer Navigation */}
          <div className="text-center text-xs text-slate-500 dark:text-slate-400">
            Chưa có tài khoản nhân viên?{' '}
            <Link
              href="/register"
              className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline"
            >
              Đăng ký tài khoản mới
            </Link>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 3. MODAL: IT HELPDESK ASSISTANCE FOR FORGOT PASSWORD     */}
      {/* ======================================================== */}
      {helpdeskModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-indigo-600 font-bold text-base">
                <HelpCircle className="w-5 h-5" />
                <span>Hỗ trợ cấp lại Mật khẩu</span>
              </div>
              <button
                onClick={() => setHelpdeskModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Nhằm đảm bảo an toàn thông tin theo chính sách Zero-Leak nội bộ của công ty, mật khẩu tài khoản truy cập cơ sở tri thức DocuMind AI được bảo mật tập trung:
            </p>

            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
              <div className="flex items-start gap-2">
                <span className="font-bold text-indigo-600">1.</span>
                <span>Liên hệ quản trị viên IT nội bộ qua email: <code className="font-mono bg-indigo-50 dark:bg-indigo-950 px-1 rounded text-indigo-600">it-support@company.vn</code></span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-bold text-indigo-600">2.</span>
                <span>Hoặc đăng nhập nhanh bằng <strong>Google Workspace (SSO)</strong> nếu tài khoản email đã được kích hoạt.</span>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setHelpdeskModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition cursor-pointer"
              >
                Đã hiểu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
