'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { Sparkles, AlertCircle } from 'lucide-react';

function CallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setSession } = useAuth();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const accessToken = searchParams.get('accessToken') || searchParams.get('token');
    const refreshToken = searchParams.get('refreshToken') || searchParams.get('refresh');

    if (accessToken && refreshToken) {
      try {
        // Decode user payload from token or fetch profile
        const payloadBase64 = accessToken.split('.')[1];
        const decoded = JSON.parse(atob(payloadBase64));

        setSession({
          accessToken,
          refreshToken,
          user: {
            id: decoded.sub,
            email: decoded.email,
            name: decoded.name || decoded.email.split('@')[0],
            role: decoded.role || 'EMPLOYEE',
          },
        });

        router.push('/');
      } catch {
        setTimeout(() => {
          setError('Không thể xử lý mã xác thực Google OAuth2.');
        }, 0);
      }
    } else {
      // Check if opened inside popup
      const handleMessage = (event: MessageEvent) => {
        if (event.data?.type === 'GOOGLE_AUTH_SUCCESS') {
          setSession(event.data.payload);
          router.push('/');
        }
      };

      window.addEventListener('message', handleMessage);
      return () => window.removeEventListener('message', handleMessage);
    }
  }, [searchParams, router, setSession]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-8 max-w-sm w-full text-center">
        {error ? (
          <div>
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Lỗi xác thực</h2>
            <p className="text-sm text-slate-500 mt-1 mb-4">{error}</p>
            <button
              onClick={() => router.push('/login')}
              className="w-full py-2 px-4 rounded-xl bg-indigo-600 text-white font-medium text-sm"
            >
              Quay về Đăng nhập
            </button>
          </div>
        ) : (
          <div>
            <div className="w-12 h-12 rounded-2xl bg-indigo-600/10 text-indigo-600 flex items-center justify-center mx-auto mb-3 animate-pulse">
              <Sparkles className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Đang xác thực Google...
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Vui lòng đợi giây lát trong khi chúng tôi hoàn tất đăng nhập.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function GoogleCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
          Đang tải...
        </div>
      }
    >
      <CallbackContent />
    </Suspense>
  );
}

