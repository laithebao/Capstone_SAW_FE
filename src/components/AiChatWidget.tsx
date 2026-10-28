import { useState, useRef, useEffect, useCallback } from 'react'
import axios from 'axios'
import { sendAiChatMessage, type ChatMessage } from '@/services/aiChatService'

// ── Types ──────────────────────────────────────────────────────────────────
interface UiMessage {
  id: string
  role: 'user' | 'model' | 'error'
  content: string
  timestamp: Date
}

interface Props {
  /** If provided (e.g. user is on a lot detail page), context is sent to AI */
  batchContextId?: number | null
  batchContextCode?: string | null
  batchCode?: string | null
}

// ── Markdown-lite renderer (bold, bullets, line breaks) ────────────────────
function renderMarkdown(text: string) {
  const lines = text.split('\n')
  const elements: React.ReactNode[] = []
  let key = 0

  for (const line of lines) {
    if (line.startsWith('## ')) {
      elements.push(<h3 key={key++} className="agri-chat-h3">{line.slice(3)}</h3>)
    } else if (line.startsWith('### ')) {
      elements.push(<h4 key={key++} className="agri-chat-h4">{line.slice(4)}</h4>)
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      elements.push(<li key={key++} className="agri-chat-li">{renderInline(line.slice(2))}</li>)
    } else if (line.startsWith('| ') && line.endsWith(' |')) {
      // Skip table separator rows
      if (!line.match(/^\|[-\s|]+\|$/)) {
        const cells = line.split('|').filter((_, i, arr) => i > 0 && i < arr.length - 1)
        elements.push(
          <div key={key++} className="agri-chat-tr">
            {cells.map((c, i) => <span key={i} className="agri-chat-td">{renderInline(c.trim())}</span>)}
          </div>
        )
      }
    } else if (line.trim() === '') {
      elements.push(<div key={key++} className="agri-chat-br" />)
    } else {
      elements.push(<p key={key++} className="agri-chat-p">{renderInline(line)}</p>)
    }
  }
  return <>{elements}</>
}

function renderInline(text: string): React.ReactNode {
  // Bold: **text** or *text*
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|⚠️[^:]+:)/g)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i}>{part.slice(2, -2)}</strong>
    }
    if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
      return <em key={i}>{part.slice(1, -1)}</em>
    }
    return part
  })
}

// ── Bot avatar icon ────────────────────────────────────────────────────────
function BotAvatar() {
  return (
    <div className="agri-avatar agri-avatar--bot" aria-hidden>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7H3a7 7 0 0 1 7-7h1V5.73A2 2 0 0 1 10 4a2 2 0 0 1 2-2z"/>
        <path d="M5 14v6a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-6"/>
        <circle cx="9" cy="17" r="1" fill="currentColor"/>
        <circle cx="15" cy="17" r="1" fill="currentColor"/>
      </svg>
    </div>
  )
}

// ── Main Widget Component ──────────────────────────────────────────────────
export default function AiChatWidget({ batchContextId, batchContextCode, batchCode }: Props) {
  const currentBatchCode = (batchContextCode || batchCode)?.trim() || null
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<UiMessage[]>([
    {
      id: 'welcome',
      role: 'model',
      content: 'Xin chào! Tôi là **SAW Agri-Copilot** 🌾\n\nTôi có thể giúp bạn:\n- Tra cứu thông tin và kiểm định lô hàng theo **Mã lô (BatchCode)**\n- Giải thích kết quả kiểm định chất lượng (QC, dư lượng, vi sinh)\n- Tư vấn điều kiện bảo quản và vận chuyển\n- Tra cứu tiêu chuẩn TCVN/VietGAP\n\nBạn muốn hỏi gì về lô hàng hôm nay?',
      timestamp: new Date(),
    },
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  // Build history for API (exclude welcome and error messages)
  const apiHistory = useCallback((): ChatMessage[] =>
    messages
      .filter(m => m.id !== 'welcome' && m.role !== 'error')
      .map(m => ({ role: m.role as 'user' | 'model', content: m.content })),
    [messages])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isOpen])

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [isOpen])

  const sendMessage = useCallback(async () => {
    const text = input.trim()
    if (!text || isLoading) return

    const userMsg: UiMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text,
      timestamp: new Date(),
    }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setIsLoading(true)

    abortRef.current = new AbortController()
    try {
      const response = await sendAiChatMessage(
        {
          message: text,
          batchContextId: batchContextId ?? null,
          batchContextCode: currentBatchCode,
          history: apiHistory(),
        },
        abortRef.current.signal,
      )

      const botMsg: UiMessage = {
        id: crypto.randomUUID(),
        role: response.isError ? 'error' : 'model',
        content: response.reply,
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, botMsg])
    } catch (err: unknown) {
      // Cancelled by AbortController — do nothing
      if (axios.isCancel(err) || (err as Error)?.name === 'CanceledError') return

      // Log chi tiết để debug trong DevTools Console
      console.error('[AiChat] Lỗi gửi tin nhắn:', err)
      if (axios.isAxiosError(err)) {
        console.error('[AiChat] HTTP status:', err.response?.status)
        console.error('[AiChat] Response data:', err.response?.data)
        console.error('[AiChat] Error code:', err.code) // ECONNABORTED = timeout
      }

      // Try to extract the actual error message from the response body
      let errorMsg = 'Không thể kết nối đến máy chủ. Vui lòng thử lại.'
      if (axios.isAxiosError(err)) {
        if (err.code === 'ECONNABORTED') {
          errorMsg = '⏱️ Yêu cầu mất quá nhiều thời gian. Gemini AI đang bận — vui lòng thử lại.'
        } else {
          const serverMsg =
            err.response?.data?.data?.reply ||
            err.response?.data?.message ||
            err.response?.data?.title
          if (serverMsg && typeof serverMsg === 'string') errorMsg = serverMsg
          else if (err.response?.status === 401) errorMsg = 'Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.'
          else if (err.response?.status === 403) errorMsg = 'Bạn không có quyền sử dụng trợ lý AI.'
          else if (err.response?.status === 500) errorMsg = '⚠️ Lỗi máy chủ. Kiểm tra console backend để biết chi tiết.'
          else if (!err.response) errorMsg = 'Không thể kết nối đến máy chủ. Kiểm tra kết nối mạng và backend đang chạy.'
        }
      }
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        role: 'error',
        content: errorMsg,
        timestamp: new Date(),
      }])
    } finally {
      setIsLoading(false)
      abortRef.current = null
    }
  }, [input, isLoading, batchContextId, currentBatchCode, apiHistory])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const clearChat = () => {
    setMessages(prev => [prev[0]]) // keep welcome
  }

  return (
    <>
      {/* ── Floating Button ─────────────────────────────────────────── */}
      <button
        id="agri-chat-toggle"
        aria-label={isOpen ? 'Đóng trợ lý AI' : 'Mở trợ lý AI nông sản'}
        onClick={() => setIsOpen(v => !v)}
        className="agri-chat-fab"
      >
        {isOpen ? (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        ) : (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7H3a7 7 0 0 1 7-7h1V5.73A2 2 0 0 1 10 4a2 2 0 0 1 2-2z"/>
            <path d="M5 14v6a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-6"/>
            <circle cx="9" cy="17" r="1" fill="currentColor"/>
            <circle cx="15" cy="17" r="1" fill="currentColor"/>
          </svg>
        )}
        {!isOpen && <span className="agri-chat-fab-badge" aria-hidden>AI</span>}
      </button>

      {/* ── Chat Panel ──────────────────────────────────────────────── */}
      {isOpen && (
        <div className="agri-chat-panel" role="dialog" aria-label="SAW Agri-Copilot">
          {/* Header */}
          <header className="agri-chat-header">
            <div className="agri-chat-header-info">
              <BotAvatar />
              <div>
                <p className="agri-chat-title">SAW Agri-Copilot</p>
                <p className="agri-chat-subtitle">
                  {currentBatchCode
                    ? `Đang xem lô ${currentBatchCode}`
                    : batchContextId
                      ? `Đang xem lô #${batchContextId}`
                      : 'Trợ lý nông sản AI'}
                </p>
              </div>
            </div>
            <div className="agri-chat-header-actions">
              <button
                id="agri-chat-clear"
                aria-label="Xóa lịch sử chat"
                onClick={clearChat}
                className="agri-chat-icon-btn"
                title="Xóa lịch sử"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
                </svg>
              </button>
              <button
                id="agri-chat-close"
                aria-label="Đóng"
                onClick={() => setIsOpen(false)}
                className="agri-chat-icon-btn"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
          </header>

          {/* Messages */}
          <div className="agri-chat-messages" role="log" aria-live="polite">
            {messages.map(msg => (
              <div key={msg.id} className={`agri-chat-row agri-chat-row--${msg.role}`}>
                {msg.role !== 'user' && <BotAvatar />}
                <div className={`agri-chat-bubble agri-chat-bubble--${msg.role}`}>
                  {msg.role !== 'user'
                    ? renderMarkdown(msg.content)
                    : <span>{msg.content}</span>}
                  <time className="agri-chat-time">
                    {msg.timestamp.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                  </time>
                </div>
              </div>
            ))}

            {/* Loading indicator */}
            {isLoading && (
              <div className="agri-chat-row agri-chat-row--model">
                <BotAvatar />
                <div className="agri-chat-bubble agri-chat-bubble--model agri-chat-bubble--loading">
                  <span className="agri-dot" /><span className="agri-dot" /><span className="agri-dot" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Suggestion chips */}
          {messages.length <= 2 && !isLoading && (
            <div className="agri-chat-chips">
              {(currentBatchCode
                ? [
                    `Lô ${currentBatchCode} đạt chất lượng gì?`,
                    `Bảo quản lô ${currentBatchCode} thế nào?`,
                    'Brix là gì?',
                    'MRL là gì?',
                  ]
                : [
                    'Lô hàng này đạt chất lượng gì?',
                    'Brix là gì?',
                    'Nhiệt độ bảo quản xoài?',
                    'MRL là gì?',
                  ]
              ).map(chip => (
                <button
                  key={chip}
                  className="agri-chat-chip"
                  onClick={() => { setInput(chip); inputRef.current?.focus() }}
                >
                  {chip}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="agri-chat-input-area">
            <input
              ref={inputRef}
              id="agri-chat-input"
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Hỏi về lô hàng, kiểm định, bảo quản..."
              maxLength={2000}
              disabled={isLoading}
              className="agri-chat-input"
              aria-label="Nhập câu hỏi"
            />
            <button
              id="agri-chat-send"
              onClick={sendMessage}
              disabled={!input.trim() || isLoading}
              className="agri-chat-send-btn"
              aria-label="Gửi tin nhắn"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="22" y1="2" x2="11" y2="13"/>
                <polygon points="22 2 15 22 11 13 2 9 22 2"/>
              </svg>
            </button>
          </div>
          <p className="agri-chat-footer">
            Powered by Google Gemini · Chỉ trả lời về nông sản &amp; chất lượng
          </p>
        </div>
      )}

      {/* ── Styles ──────────────────────────────────────────────────── */}
      <style>{`
        /* FAB */
        .agri-chat-fab {
          position: fixed;
          bottom: 28px;
          right: 28px;
          z-index: 9999;
          width: 58px;
          height: 58px;
          border-radius: 50%;
          background: linear-gradient(135deg, #16a34a 0%, #15803d 100%);
          color: white;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 20px rgba(22,163,74,0.45), 0 2px 8px rgba(0,0,0,0.15);
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .agri-chat-fab:hover {
          transform: scale(1.08);
          box-shadow: 0 6px 28px rgba(22,163,74,0.55), 0 3px 12px rgba(0,0,0,0.2);
        }
        .agri-chat-fab:active { transform: scale(0.96); }
        .agri-chat-fab-badge {
          position: absolute;
          top: -4px;
          right: -4px;
          background: #f59e0b;
          color: white;
          font-size: 9px;
          font-weight: 700;
          border-radius: 20px;
          padding: 1px 5px;
          letter-spacing: 0.05em;
        }

        /* Panel */
        .agri-chat-panel {
          position: fixed;
          bottom: 100px;
          right: 24px;
          z-index: 9998;
          width: 390px;
          max-width: calc(100vw - 32px);
          height: 580px;
          max-height: calc(100dvh - 120px);
          background: #ffffff;
          border-radius: 20px;
          box-shadow: 0 20px 60px rgba(0,0,0,0.18), 0 4px 20px rgba(0,0,0,0.08);
          display: flex;
          flex-direction: column;
          overflow: hidden;
          animation: agri-slide-up 0.25s cubic-bezier(0.34,1.56,0.64,1);
          border: 1px solid rgba(22,163,74,0.12);
        }
        @keyframes agri-slide-up {
          from { opacity: 0; transform: translateY(20px) scale(0.96); }
          to   { opacity: 1; transform: translateY(0)   scale(1); }
        }

        /* Header */
        .agri-chat-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 16px;
          background: linear-gradient(135deg, #16a34a 0%, #15803d 100%);
          color: white;
          flex-shrink: 0;
        }
        .agri-chat-header-info { display: flex; align-items: center; gap: 10px; }
        .agri-chat-title { font-weight: 700; font-size: 14px; line-height: 1.2; }
        .agri-chat-subtitle { font-size: 11px; opacity: 0.8; margin-top: 1px; }
        .agri-chat-header-actions { display: flex; gap: 4px; }
        .agri-chat-icon-btn {
          background: rgba(255,255,255,0.15);
          border: none;
          color: white;
          width: 30px;
          height: 30px;
          border-radius: 8px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.15s;
        }
        .agri-chat-icon-btn:hover { background: rgba(255,255,255,0.25); }

        /* Bot avatar */
        .agri-avatar {
          width: 30px;
          height: 30px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .agri-avatar--bot {
          background: linear-gradient(135deg, #dcfce7, #bbf7d0);
          color: #16a34a;
        }

        /* Messages area */
        .agri-chat-messages {
          flex: 1;
          overflow-y: auto;
          padding: 16px 14px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          scroll-behavior: smooth;
        }
        .agri-chat-messages::-webkit-scrollbar { width: 4px; }
        .agri-chat-messages::-webkit-scrollbar-track { background: transparent; }
        .agri-chat-messages::-webkit-scrollbar-thumb { background: #d1fae5; border-radius: 4px; }

        /* Message rows */
        .agri-chat-row { display: flex; gap: 8px; align-items: flex-end; }
        .agri-chat-row--user { flex-direction: row-reverse; }
        .agri-chat-row--error { flex-direction: row; }

        /* Bubbles */
        .agri-chat-bubble {
          max-width: 82%;
          padding: 10px 13px;
          border-radius: 16px;
          font-size: 13.5px;
          line-height: 1.55;
          color: #1e293b;
          word-break: break-word;
        }
        .agri-chat-bubble--model {
          background: #f0fdf4;
          border: 1px solid #bbf7d0;
          border-bottom-left-radius: 4px;
        }
        .agri-chat-bubble--user {
          background: linear-gradient(135deg, #16a34a, #15803d);
          color: white;
          border-bottom-right-radius: 4px;
        }
        .agri-chat-bubble--error {
          background: #fff1f2;
          border: 1px solid #fecdd3;
          color: #be123c;
        }
        .agri-chat-bubble--loading {
          display: flex;
          gap: 5px;
          align-items: center;
          padding: 12px 16px;
        }

        /* Typing dots */
        .agri-dot {
          width: 7px; height: 7px;
          border-radius: 50%;
          background: #16a34a;
          animation: agri-bounce 1.2s infinite;
          display: inline-block;
        }
        .agri-dot:nth-child(2) { animation-delay: 0.2s; }
        .agri-dot:nth-child(3) { animation-delay: 0.4s; }
        @keyframes agri-bounce {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.6; }
          30% { transform: translateY(-6px); opacity: 1; }
        }

        /* Timestamp */
        .agri-chat-time {
          display: block;
          font-size: 10px;
          opacity: 0.5;
          margin-top: 4px;
          text-align: right;
        }
        .agri-chat-bubble--user .agri-chat-time { color: rgba(255,255,255,0.8); }

        /* Markdown styles inside bubbles */
        .agri-chat-h3 { font-size: 13px; font-weight: 700; color: #15803d; margin: 6px 0 3px; }
        .agri-chat-h4 { font-size: 12.5px; font-weight: 600; color: #166534; margin: 5px 0 2px; }
        .agri-chat-li { margin-left: 14px; list-style: disc; margin-bottom: 2px; }
        .agri-chat-p { margin: 1px 0; }
        .agri-chat-br { height: 6px; }
        .agri-chat-tr { display: flex; gap: 8px; flex-wrap: wrap; border-bottom: 1px solid #d1fae5; padding: 3px 0; }
        .agri-chat-td { font-size: 12px; flex: 1; min-width: 80px; }

        /* Suggestion chips */
        .agri-chat-chips {
          display: flex;
          gap: 6px;
          padding: 6px 14px;
          flex-wrap: wrap;
          border-top: 1px solid #f0fdf4;
          flex-shrink: 0;
        }
        .agri-chat-chip {
          background: #f0fdf4;
          border: 1px solid #bbf7d0;
          color: #15803d;
          font-size: 11.5px;
          padding: 4px 10px;
          border-radius: 20px;
          cursor: pointer;
          transition: background 0.15s, border-color 0.15s;
          white-space: nowrap;
        }
        .agri-chat-chip:hover { background: #dcfce7; border-color: #86efac; }

        /* Input area */
        .agri-chat-input-area {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 12px;
          border-top: 1px solid #f1f5f9;
          flex-shrink: 0;
          background: #fafafa;
        }
        .agri-chat-input {
          flex: 1;
          border: 1.5px solid #e2e8f0;
          border-radius: 12px;
          padding: 9px 13px;
          font-size: 13.5px;
          outline: none;
          transition: border-color 0.15s, box-shadow 0.15s;
          background: white;
          color: #1e293b;
        }
        .agri-chat-input:focus {
          border-color: #86efac;
          box-shadow: 0 0 0 3px rgba(134,239,172,0.2);
        }
        .agri-chat-input::placeholder { color: #94a3b8; }
        .agri-chat-input:disabled { background: #f8fafc; opacity: 0.7; }
        .agri-chat-send-btn {
          width: 38px;
          height: 38px;
          border-radius: 10px;
          background: linear-gradient(135deg, #16a34a, #15803d);
          color: white;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          transition: opacity 0.15s, transform 0.1s;
        }
        .agri-chat-send-btn:disabled { opacity: 0.4; cursor: not-allowed; }
        .agri-chat-send-btn:not(:disabled):hover { opacity: 0.9; }
        .agri-chat-send-btn:not(:disabled):active { transform: scale(0.92); }

        /* Footer */
        .agri-chat-footer {
          text-align: center;
          font-size: 10px;
          color: #94a3b8;
          padding: 4px 12px 8px;
          flex-shrink: 0;
          background: #fafafa;
        }
      `}</style>
    </>
  )
}
