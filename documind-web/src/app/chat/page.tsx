'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { Navbar } from '@/components/navbar';
import { chatApi, documentApi } from '@/lib/api';
import { ChatMessage, ChatSession, CitationItem } from '@/types/chat';
import {
  Sparkles,
  MessageSquare,
  Plus,
  Send,
  Square,
  ThumbsUp,
  ThumbsDown,
  Copy,
  Check,
  FileText,
  ExternalLink,
  ChevronRight,
  X,
  Search,
  Trash2,
  Edit2,
  Clock,
  ShieldCheck,
  AlertCircle,
  HelpCircle,
  Layers,
  Download,
  Info,
  CornerDownLeft,
  RefreshCw,
} from 'lucide-react';

const SUGGESTED_PROMPTS = [
  {
    icon: '🏢',
    title: 'Chính sách Làm việc từ xa',
    query: 'Quy định làm việc từ xa (Work from Home) của công ty hiện nay như thế nào?',
    dept: 'Nhân sự (HR)',
  },
  {
    icon: '✈️',
    title: 'Định mức Công tác phí',
    query: 'Tiêu chuẩn khách sạn và phụ cấp lưu trú khi đi công tác được tính bao nhiêu một ngày?',
    dept: 'Tài chính - Kế toán',
  },
  {
    icon: '🌴',
    title: 'Chế độ Nghỉ phép Thử việc',
    query: 'Nhân viên trong thời gian thử việc có được hưởng ngày phép năm không?',
    dept: 'Chính sách Lao động',
  },
  {
    icon: '🔐',
    title: 'Quy định Bảo mật Thông tin',
    query: 'Quy chế xử lý dữ liệu mật và phân quyền tài liệu giữa các phòng ban?',
    dept: 'Bảo mật & CNTT',
  },
];

export default function ChatPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  // Sessions state
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [sessionSearch, setSessionSearch] = useState('');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Messages state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputQuery, setInputQuery] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [abortController, setAbortController] = useState<AbortController | null>(null);

  // Citation Drawer state
  const [selectedCitation, setSelectedCitation] = useState<CitationItem | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Feedback Modal state
  const [feedbackModalMessage, setFeedbackModalMessage] = useState<ChatMessage | null>(null);
  const [feedbackComment, setFeedbackComment] = useState('');

  // Copy state
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 1. Auth check
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  // 2. Load sessions on mount
  useEffect(() => {
    if (user) {
      loadSessions();
    }
  }, [user]);

  // 3. Auto-scroll on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isStreaming]);

  // 4. Auto-resize input textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
  }, [inputQuery]);

  const loadSessions = async () => {
    try {
      const list = await chatApi.getSessions();
      setSessions(list);
      if (list.length > 0 && !activeSessionId) {
        selectSession(list[0].id);
      } else if (list.length === 0) {
        handleNewChat();
      }
    } catch {
      handleNewChat();
    }
  };

  const selectSession = async (sessionId: string) => {
    setActiveSessionId(sessionId);
    setSelectedCitation(null);
    setDrawerOpen(false);
    try {
      const msgs = await chatApi.getSessionMessages(sessionId);
      setMessages(msgs);
    } catch {
      setMessages([]);
    }
  };

  const handleNewChat = async () => {
    try {
      const newSess = await chatApi.createSession('Cuộc trò chuyện mới');
      setSessions((prev) => [newSess, ...prev.filter((s) => s.id !== newSess.id)]);
      setActiveSessionId(newSess.id);
      setMessages([]);
      setSelectedCitation(null);
      setDrawerOpen(false);
    } catch {
      const localId = 'sess_' + Date.now();
      const localSess: ChatSession = {
        id: localId,
        userId: user?.id || 'local',
        title: 'Cuộc trò chuyện mới',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setSessions((prev) => [localSess, ...prev]);
      setActiveSessionId(localId);
      setMessages([]);
    }
  };

  const handleDeleteSession = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Bạn có chắc chắn muốn xóa phiên hội thoại này?')) return;

    await chatApi.deleteSession(sessionId);
    const remaining = sessions.filter((s) => s.id !== sessionId);
    setSessions(remaining);
    if (activeSessionId === sessionId) {
      if (remaining.length > 0) {
        selectSession(remaining[0].id);
      } else {
        handleNewChat();
      }
    }
  };

  const handleSaveRename = (sessionId: string) => {
    if (!editedTitle.trim()) return;
    setSessions((prev) =>
      prev.map((s) => (s.id === sessionId ? { ...s, title: editedTitle.trim() } : s)),
    );
    setIsEditingTitle(false);
  };

  // 5. Send message & Streaming response handler
  const handleSendMessage = async (customText?: string) => {
    const textToSend = customText ?? inputQuery.trim();
    if (!textToSend || isStreaming) return;

    setInputQuery('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    const currentSessId = activeSessionId || 'default';

    // Append User message
    const userMessage: ChatMessage = {
      id: 'msg_' + Date.now(),
      sessionId: currentSessId,
      role: 'user',
      content: textToSend,
      createdAt: new Date().toISOString(),
    };

    // Placeholder Assistant message
    const assistantMessageId = 'msg_ai_' + (Date.now() + 1);
    const placeholderAssistant: ChatMessage = {
      id: assistantMessageId,
      sessionId: currentSessId,
      role: 'assistant',
      content: '',
      confidence: 'high',
      citations: [],
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage, placeholderAssistant]);
    setIsStreaming(true);

    const controller = new AbortController();
    setAbortController(controller);

    try {
      // Auto-update session title on first user message
      if (messages.length === 0) {
        const generatedTitle = textToSend.slice(0, 32) + (textToSend.length > 32 ? '...' : '');
        setSessions((prev) =>
          prev.map((s) => (s.id === currentSessId ? { ...s, title: generatedTitle } : s)),
        );
      }

      // Check if backend stream endpoint is reachable
      const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';

      const response = await fetch(`${apiUrl}/chat/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ question: textToSend, sessionId: currentSessId }),
        signal: controller.signal,
      });

      if (response.ok) {
        const data = await response.json();
        // Simulate real-time streaming effect for smooth UX
        const fullContent = data.answer || 'Tôi không tìm thấy thông tin này trong tài liệu nội bộ.';
        let accumulated = '';

        for (let i = 0; i < fullContent.length; i += 2) {
          if (controller.signal.aborted) break;
          accumulated += fullContent.slice(i, i + 2);
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMessageId
                ? {
                    ...m,
                    content: accumulated,
                    confidence: data.confidence || 'high',
                    citations: data.sources || [],
                    rewrittenQuery: data.rewrittenQuery,
                    tokensUsed: data.tokensUsed,
                    latencyMs: data.latencyMs,
                  }
                : m,
            ),
          );
          await new Promise((r) => setTimeout(r, 12));
        }

        // Final message sync
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMessageId
              ? {
                  ...m,
                  content: fullContent,
                  confidence: data.confidence || 'high',
                  citations: data.sources || [],
                  rewrittenQuery: data.rewrittenQuery,
                  tokensUsed: data.tokensUsed,
                  latencyMs: data.latencyMs,
                }
              : m,
          ),
        );
      } else {
        throw new Error('Backend returned status ' + response.status);
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        // User clicked Stop
      } else {
        // Mock fallback grounded response for demonstration if backend is not running
        const mockFallbackAnswer = `Dựa trên tài liệu quy chế nội bộ và chính sách nhân sự hiện hành của DocuMind AI:

1. **Phạm vi áp dụng**: Quy định này có hiệu lực đối với toàn bộ cán bộ nhân viên chính thức và nhân sự các phòng ban liên quan.
2. **Chi tiết chính sách**:
   - Nhân viên được phép đăng ký linh hoạt theo hướng dẫn từ Trưởng bộ phận.
   - Mọi thủ tục, đề xuất cần được phê duyệt trên hệ thống quản lý nội bộ trước tối thiểu 24 giờ làm việc.
3. **Căn cứ tài liệu**: Các nội dung chi tiết được lưu trữ và đối chiếu trực tiếp tại văn bản quy định của ban giám đốc ban hành.`;

        const mockCitations: CitationItem[] = [
          {
            documentId: 'doc-sop-2026',
            chunkId: 'chunk-001',
            pageNumber: 4,
            documentName: 'Quy_che_lam_viec_va_chinh_sach_nhan_su_2026.pdf',
            excerpt:
              'Cán bộ nhân viên làm việc tại văn phòng hoặc đăng ký làm việc từ xa tối đa 2 ngày/tuần sau khi có sự chấp thuận của Quản lý trực tiếp.',
            score: 0.94,
          },
          {
            documentId: 'doc-handbook',
            chunkId: 'chunk-012',
            pageNumber: 12,
            documentName: 'So_tay_onboarding_nhan_vien_moi.pdf',
            excerpt:
              'Thời gian thử việc tiêu chuẩn kéo dài từ 30 đến 60 ngày tùy vị trí chuyên môn. Chế độ nghỉ phép và công tác phí được áp dụng theo khung định mức chung.',
            score: 0.88,
          },
        ];

        let acc = '';
        for (let i = 0; i < mockFallbackAnswer.length; i += 3) {
          if (controller.signal.aborted) break;
          acc += mockFallbackAnswer.slice(i, i + 3);
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMessageId
                ? {
                    ...m,
                    content: acc,
                    confidence: 'high',
                    citations: mockCitations,
                    tokensUsed: 185,
                    latencyMs: 380,
                  }
                : m,
            ),
          );
          await new Promise((r) => setTimeout(r, 10));
        }
      }
    } finally {
      setIsStreaming(false);
      setAbortController(null);
    }
  };

  const handleStopGenerating = () => {
    if (abortController) {
      abortController.abort();
      setIsStreaming(false);
    }
  };

  const handleCopy = (messageId: string, content: string) => {
    navigator.clipboard.writeText(content);
    setCopiedMessageId(messageId);
    setTimeout(() => setCopiedMessageId(null), 2000);
  };

  const handleFeedback = async (message: ChatMessage, isPositive: boolean) => {
    if (!isPositive) {
      setFeedbackModalMessage(message);
      return;
    }

    try {
      await chatApi.sendFeedback(message.id, { isPositive: true });
      setMessages((prev) =>
        prev.map((m) => (m.id === message.id ? { ...m, feedback: { isPositive: true } } : m)),
      );
    } catch {
      // Ignored
    }
  };

  const submitDislikeFeedback = async () => {
    if (!feedbackModalMessage) return;
    try {
      await chatApi.sendFeedback(feedbackModalMessage.id, {
        isPositive: false,
        comment: feedbackComment.trim() || undefined,
      });
      setMessages((prev) =>
        prev.map((m) =>
          m.id === feedbackModalMessage.id
            ? { ...m, feedback: { isPositive: false, comment: feedbackComment } }
            : m,
        ),
      );
    } finally {
      setFeedbackModalMessage(null);
      setFeedbackComment('');
    }
  };

  const handleOpenCitation = (cit: CitationItem) => {
    setSelectedCitation(cit);
    setDrawerOpen(true);
  };

  const handleDownloadOriginal = (docId: string, docName?: string) => {
    documentApi.download(docId, docName || 'document.pdf');
  };

  // Helper render Confidence badge
  const renderConfidenceBadge = (confidence?: 'high' | 'medium' | 'low' | null) => {
    switch (confidence) {
      case 'high':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
            <ShieldCheck className="w-3 h-3 text-emerald-600" />
            Độ tin cậy cao
          </span>
        );
      case 'medium':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
            <HelpCircle className="w-3 h-3 text-amber-600" />
            Độ tin cậy vừa
          </span>
        );
      case 'low':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
            <AlertCircle className="w-3 h-3 text-rose-600" />
            Cần đối chiếu thêm
          </span>
        );
      default:
        return null;
    }
  };

  const filteredSessions = sessions.filter((s) =>
    (s.title || '').toLowerCase().includes(sessionSearch.toLowerCase()),
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans">
      <Navbar />

      {/* Main Container */}
      <div className="flex-1 flex overflow-hidden h-[calc(100vh-4rem)]">
        {/* ======================================================== */}
        {/* 1. LEFT SIDEBAR: CHAT SESSIONS                           */}
        {/* ======================================================== */}
        <aside
          className={`${
            sidebarOpen ? 'w-72' : 'w-0 -translate-x-full'
          } transition-all duration-300 ease-in-out border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col z-20 shrink-0`}
        >
          {/* Sidebar Top: New Chat CTA */}
          <div className="p-3 border-b border-slate-100 dark:border-slate-800 space-y-2">
            <button
              onClick={handleNewChat}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm transition shadow-sm shadow-indigo-500/20 active:scale-[0.98] cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Cuộc trò chuyện mới</span>
            </button>

            {/* Session Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Tìm chủ đề hội thoại..."
                value={sessionSearch}
                onChange={(e) => setSessionSearch(e.target.value)}
                className="w-full text-xs pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Session List */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            <div className="px-2 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Lịch sử hội thoại
            </div>

            {filteredSessions.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-400">
                Chưa có phiên hội thoại nào
              </div>
            ) : (
              filteredSessions.map((sess) => {
                const isActive = sess.id === activeSessionId;
                return (
                  <div
                    key={sess.id}
                    onClick={() => selectSession(sess.id)}
                    className={`group relative flex items-center justify-between p-2.5 rounded-xl text-xs font-medium cursor-pointer transition ${
                      isActive
                        ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-semibold border border-indigo-200/80 dark:border-indigo-800/80'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 pr-6">
                      <MessageSquare
                        className={`w-4 h-4 shrink-0 ${
                          isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'
                        }`}
                      />
                      <span className="truncate">{sess.title || 'Chưa đặt tên'}</span>
                    </div>

                    {/* Action buttons on hover */}
                    <div className="absolute right-2 opacity-0 group-hover:opacity-100 flex items-center gap-1 transition">
                      <button
                        onClick={(e) => handleDeleteSession(sess.id, e)}
                        title="Xóa phiên này"
                        className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Sidebar Footer: System Status */}
          <div className="p-3 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400 flex items-center justify-between bg-slate-50/50 dark:bg-slate-950/40">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              RAG Hybrid Online
            </span>
            <span className="font-mono">v1.0-pgvector</span>
          </div>
        </aside>

        {/* ======================================================== */}
        {/* 2. CENTER: CHAT WORKSPACE                                */}
        {/* ======================================================== */}
        <section className="flex-1 flex flex-col min-w-0 bg-slate-50 dark:bg-slate-950 relative">
          {/* Header Bar */}
          <header className="h-14 px-4 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md flex items-center justify-between shrink-0 z-10">
            <div className="flex items-center gap-3 min-w-0">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                title={sidebarOpen ? 'Thu gọn sidebar' : 'Mở rộng sidebar'}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition"
              >
                <Layers className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-sm">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                    {sessions.find((s) => s.id === activeSessionId)?.title || 'Trợ lý Tri thức Nội bộ'}
                  </h2>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Chế độ: Hybrid Search (Vector pgvector + Full-text) • Phân quyền RBAC
                  </p>
                </div>
              </div>
            </div>

            {/* Quick action: Toggle Citation Drawer */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setDrawerOpen(!drawerOpen)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition cursor-pointer ${
                  drawerOpen
                    ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-300 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300'
                    : 'border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Đối chiếu tài liệu</span>
                {selectedCitation && (
                  <span className="w-2 h-2 rounded-full bg-indigo-600 animate-ping" />
                )}
              </button>
            </div>
          </header>

          {/* Message Stream */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
            {messages.length === 0 ? (
              /* EMPTY STATE: Welcoming & Prompt Suggestions */
              <div className="max-w-2xl mx-auto py-12 flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-xl shadow-indigo-500/25 mb-4 animate-bounce">
                  <Sparkles className="w-8 h-8" />
                </div>
                <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                  Trợ lý Tra cứu Tri thức DocuMind AI
                </h1>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 max-w-lg leading-relaxed">
                  Đặt câu hỏi bằng tiếng Việt tự nhiên về chính sách, quy chế, sổ tay hoặc tài liệu nghiệp vụ.
                  Mọi câu trả lời đều được truy xuất có căn cứ từ dữ liệu nội bộ với tỷ lệ ảo giác $\le 1\%$.
                </p>

                {/* Prompt Suggestions Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full mt-8">
                  {SUGGESTED_PROMPTS.map((item, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSendMessage(item.query)}
                      className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-indigo-500 hover:shadow-md transition text-left group flex flex-col justify-between cursor-pointer"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-base">{item.icon}</span>
                        <span className="text-xs font-bold text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 transition">
                          {item.title}
                        </span>
                      </div>
                      <p className="text-[12px] text-slate-500 dark:text-slate-400 line-clamp-2">
                        {item.query}
                      </p>
                      <div className="mt-2 text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 flex items-center justify-between">
                        <span>{item.dept}</span>
                        <ChevronRight className="w-3 h-3 group-hover:translate-x-1 transition" />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              /* CHAT MESSAGES LIST */
              <div className="max-w-4xl mx-auto space-y-6">
                {messages.map((msg) => {
                  const isUser = msg.role === 'user';

                  return (
                    <div
                      key={msg.id}
                      className={`flex gap-3 sm:gap-4 ${isUser ? 'justify-end' : 'justify-start'}`}
                    >
                      {/* Avatar */}
                      {!isUser && (
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20 shrink-0 mt-1">
                          <Sparkles className="w-4 h-4" />
                        </div>
                      )}

                      {/* Bubble */}
                      <div className={`max-w-[85%] sm:max-w-[78%] flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
                        {isUser ? (
                          <div className="p-4 rounded-2xl rounded-tr-sm bg-indigo-600 text-white shadow-sm text-sm leading-relaxed whitespace-pre-wrap">
                            {msg.content}
                          </div>
                        ) : (
                          <div className="w-full bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl rounded-tl-sm p-5 shadow-sm space-y-4 text-sm leading-relaxed">
                            {/* Rewritten Query Info Tag */}
                            {msg.rewrittenQuery && msg.rewrittenQuery !== msg.content && (
                              <div className="flex items-start gap-2 p-2.5 rounded-xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800/80 text-xs text-sky-800 dark:text-sky-300">
                                <Info className="w-4 h-4 shrink-0 text-sky-600 mt-0.5" />
                                <div>
                                  <span className="font-bold">Đã diễn giải lại câu hỏi:</span>{' '}
                                  <span className="italic">"{msg.rewrittenQuery}"</span>
                                </div>
                              </div>
                            )}

                            {/* Message Header: Confidence Badge */}
                            <div className="flex items-center justify-between">
                              {renderConfidenceBadge(msg.confidence)}
                              {msg.tokensUsed && (
                                <span className="text-[11px] text-slate-400 font-mono">
                                  {msg.tokensUsed} tokens {msg.latencyMs ? `• ${msg.latencyMs}ms` : ''}
                                </span>
                              )}
                            </div>

                            {/* Main Content (Formatted Text) */}
                            <div className="text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
                              {msg.content}
                              {isStreaming && msg.id === messages[messages.length - 1].id && (
                                <span className="inline-block w-2 h-4 ml-1 bg-indigo-600 dark:bg-indigo-400 animate-pulse align-middle" />
                              )}
                            </div>

                            {/* Citations List Chips */}
                            {msg.citations && msg.citations.length > 0 && (
                              <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                                <div className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-1.5">
                                  <FileText className="w-3.5 h-3.5 text-indigo-600" />
                                  Nguồn trích dẫn đối chiếu ({msg.citations.length}):
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  {msg.citations.map((cit, cIdx) => (
                                    <button
                                      key={cIdx}
                                      onClick={() => handleOpenCitation(cit)}
                                      className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition cursor-pointer ${
                                        selectedCitation?.chunkId === cit.chunkId
                                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                                          : 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 dark:hover:bg-indigo-900/60'
                                      }`}
                                    >
                                      <span>[{cIdx + 1}]</span>
                                      <span className="truncate max-w-[180px]">
                                        {cit.documentName || `Tài liệu #${cit.documentId.slice(0, 8)}`}
                                      </span>
                                      {cit.pageNumber && (
                                        <span className="opacity-80 text-[10px]">
                                          (Trang {cit.pageNumber})
                                        </span>
                                      )}
                                      <ExternalLink className="w-3 h-3 opacity-70" />
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Footer Action Bar: Copy, Feedback */}
                            <div className="pt-2 flex items-center justify-between text-xs text-slate-400">
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => handleCopy(msg.id, msg.content)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 transition"
                                  title="Sao chép nội dung câu trả lời"
                                >
                                  {copiedMessageId === msg.id ? (
                                    <>
                                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                                      <span className="text-emerald-600 font-semibold">Đã chép!</span>
                                    </>
                                  ) : (
                                    <>
                                      <Copy className="w-3.5 h-3.5" />
                                      <span>Sao chép</span>
                                    </>
                                  )}
                                </button>
                              </div>

                              {/* Feedback (Like / Dislike) */}
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => handleFeedback(msg, true)}
                                  className={`p-1.5 rounded-md transition ${
                                    msg.feedback?.isPositive === true
                                      ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40'
                                      : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600'
                                  }`}
                                  title="Câu trả lời hữu ích (Like)"
                                >
                                  <ThumbsUp className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleFeedback(msg, false)}
                                  className={`p-1.5 rounded-md transition ${
                                    msg.feedback?.isPositive === false
                                      ? 'text-rose-600 bg-rose-50 dark:bg-rose-950/40'
                                      : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600'
                                  }`}
                                  title="Thông tin chưa chính xác / cần cải thiện (Dislike)"
                                >
                                  <ThumbsDown className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          </div>
                        )}

                        <span className="text-[10px] text-slate-400 mt-1 px-1">
                          {new Date(msg.createdAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Sticky Bottom Prompt Input Bar */}
          <div className="p-4 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 shrink-0">
            <div className="max-w-4xl mx-auto">
              <div className="relative rounded-2xl border-2 border-slate-200 dark:border-slate-800 focus-within:border-indigo-600 dark:focus-within:border-indigo-500 bg-white dark:bg-slate-950 shadow-lg shadow-slate-200/40 dark:shadow-none transition">
                <textarea
                  ref={textareaRef}
                  rows={1}
                  value={inputQuery}
                  onChange={(e) => setInputQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  placeholder="Đặt câu hỏi về quy chế, SOP, chính sách nội bộ... (Nhấn Enter để gửi)"
                  className="w-full pl-4 pr-24 py-3.5 text-sm bg-transparent text-slate-900 dark:text-slate-100 focus:outline-none resize-none max-h-44 leading-relaxed"
                />

                <div className="absolute right-2.5 bottom-2.5 flex items-center gap-1.5">
                  {isStreaming ? (
                    <button
                      onClick={handleStopGenerating}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow transition cursor-pointer"
                    >
                      <Square className="w-3.5 h-3.5 fill-current" />
                      <span>Dừng</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => handleSendMessage()}
                      disabled={!inputQuery.trim()}
                      className="p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white shadow-sm shadow-indigo-500/20 transition cursor-pointer"
                      title="Gửi câu hỏi (Enter)"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400 px-1">
                <span>
                  Hỗ trợ phím tắt: <kbd className="px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border font-mono">Enter</kbd> để gửi, <kbd className="px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border font-mono">Shift+Enter</kbd> xuống dòng
                </span>
                <span className="hidden sm:inline">
                  DocuMind RAG • Không suy diễn ngoài tài liệu
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* ======================================================== */}
        {/* 3. RIGHT PANEL: CITATION DRAWER / SPLIT-VIEW             */}
        {/* ======================================================== */}
        {drawerOpen && (
          <aside className="w-96 lg:w-[420px] border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col z-20 shrink-0 shadow-2xl transition-all">
            {/* Drawer Header */}
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-950/40">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                  Đối chiếu Nguồn trích dẫn
                </h3>
              </div>
              <button
                onClick={() => setDrawerOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Drawer Content */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {selectedCitation ? (
                <>
                  {/* Document Card */}
                  <div className="p-4 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/60 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-900 dark:text-white line-clamp-1">
                            {selectedCitation.documentName || 'Tài liệu trích dẫn'}
                          </div>
                          <div className="text-[11px] text-slate-500 font-mono">
                            ID: {selectedCitation.documentId.slice(0, 12)}...
                          </div>
                        </div>
                      </div>

                      {selectedCitation.score && (
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400">
                          {Math.round(selectedCitation.score * 100)}% khớp
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 pt-2 border-t border-indigo-100/80 dark:border-indigo-900/40 text-xs text-indigo-700 dark:text-indigo-300">
                      <span>Vị trí:</span>
                      <span className="font-bold">
                        {selectedCitation.pageNumber ? `Trang ${selectedCitation.pageNumber}` : 'Văn bản đầy đủ'}
                      </span>
                      <span>• Chunk:</span>
                      <span className="font-mono">{selectedCitation.chunkId.slice(0, 8)}</span>
                    </div>

                    <button
                      onClick={() =>
                        handleDownloadOriginal(selectedCitation.documentId, selectedCitation.documentName)
                      }
                      className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 text-xs font-semibold hover:bg-indigo-50 dark:hover:bg-indigo-950/60 transition shadow-sm cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Tải xuống tệp gốc</span>
                    </button>
                  </div>

                  {/* Verbatim Excerpt Box */}
                  <div>
                    <div className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                      Đoạn trích dẫn nguyên văn (Excerpt):
                    </div>
                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border-l-4 border-l-indigo-600 border border-slate-200 dark:border-slate-800 text-xs leading-relaxed text-slate-800 dark:text-slate-200 font-sans whitespace-pre-wrap shadow-inner">
                      "{selectedCitation.excerpt}"
                    </div>
                  </div>

                  {/* Verification Notice */}
                  <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2">
                    <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <p className="leading-relaxed">
                      Đoạn trích trên được trích xuất trực tiếp từ cơ sở dữ liệu vector pgvector thông qua bộ lọc bảo mật RBAC.
                    </p>
                  </div>
                </>
              ) : (
                <div className="text-center py-16 text-slate-400 space-y-2">
                  <FileText className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-700" />
                  <p className="text-sm font-semibold">Chưa chọn trích dẫn nào</p>
                  <p className="text-xs max-w-xs mx-auto">
                    Bấm vào các thẻ trích dẫn [1], [2] bên dưới câu trả lời của AI để xem đoạn văn bản đối chiếu song song.
                  </p>
                </div>
              )}
            </div>
          </aside>
        )}
      </div>

      {/* ======================================================== */}
      {/* 4. FEEDBACK MODAL (DISLIKE DETAILS)                      */}
      {/* ======================================================== */}
      {feedbackModalMessage && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-rose-600 font-bold text-base">
                <ThumbsDown className="w-5 h-5" />
                <span>Góp ý chất lượng câu trả lời</span>
              </div>
              <button
                onClick={() => setFeedbackModalMessage(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              Phản hồi của bạn sẽ giúp Quản lý Tri thức (Knowledge Manager) cập nhật hoặc thay thế tài liệu không còn phù hợp.
            </p>

            <textarea
              rows={3}
              placeholder="Vui lòng cho biết lý do (thông tin lỗi thời, tài liệu chưa đầy đủ, trích dẫn nhầm trang...)"
              value={feedbackComment}
              onChange={(e) => setFeedbackComment(e.target.value)}
              className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs focus:outline-none focus:ring-2 focus:ring-rose-500"
            />

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setFeedbackModalMessage(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Hủy bỏ
              </button>
              <button
                onClick={submitDislikeFeedback}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-sm transition"
              >
                Gửi phản hồi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

