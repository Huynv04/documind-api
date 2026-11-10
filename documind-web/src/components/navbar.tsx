'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { Sparkles, FileText, Home, LogOut, MessageSquare, ShieldCheck, Cpu } from 'lucide-react';

export function Navbar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();

  if (!user) return null;

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return {
          label: 'Admin',
          color: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
        };
      case 'KNOWLEDGE_MANAGER':
        return {
          label: 'KM Manager',
          color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
        };
      default:
        return {
          label: 'Employee',
          color: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20',
        };
    }
  };

  const roleBadge = getRoleBadge(user.role);

  const navLinks = [
    { href: '/', label: 'Tổng quan', icon: Home },
    { href: '/chat', label: 'Hỏi đáp Tri thức', icon: MessageSquare },
    { href: '/documents', label: 'Kho Tài liệu', icon: FileText },
    ...((user.role === 'ADMIN' || user.role === 'KNOWLEDGE_MANAGER')
      ? [{ href: '/pipeline', label: 'Hàng đợi Ingestion', icon: Cpu }]
      : []),
    ...(user.role === 'ADMIN'
      ? [{ href: '/admin', label: 'Quản trị Admin', icon: ShieldCheck }]
      : []),
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/85 dark:bg-slate-900/85 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <span className="font-bold text-lg tracking-tight text-slate-900 dark:text-white">
              DocuMind AI
            </span>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition ${
                    isActive
                      ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-semibold'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User Info & Actions */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white font-bold flex items-center justify-center text-xs shadow-sm uppercase shrink-0">
              {(user.name || user.email).slice(0, 2)}
            </div>
            <div className="flex flex-col items-start">
              <div className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate max-w-[140px]">
                {user.name || user.email}
              </div>
              <span
                className={`text-[10px] font-bold px-2 py-0.2 rounded-full border ${roleBadge.color} mt-0.5`}
              >
                {roleBadge.label}
              </span>
            </div>
          </div>

          <button
            onClick={logout}
            title="Đăng xuất khỏi hệ thống"
            className="flex items-center gap-1.5 py-1.5 px-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:text-rose-600 hover:border-rose-200 dark:hover:border-rose-800 text-xs font-semibold transition text-slate-600 dark:text-slate-300 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Đăng xuất</span>
          </button>
        </div>
      </div>
    </header>
  );
}

