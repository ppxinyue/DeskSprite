import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useChatStore, createMessage } from './chatStore';
import { usePetStore } from '@/features/pet/petStore';
import { useApiConfigStore } from '@/features/settings/apiConfigStore';
import { useSettingsStore } from '@/features/settings/settingsStore';
import { streamChat } from '@/features/ai/aiService';
import { recordBuiltinUsage, resolveChatConfig } from '@/features/ai/defaultModel';
import { getActiveSystemPrompt } from '@/features/ai/systemPrompt';
import {
  getMessages,
  insertMessage,
  createConversation,
  getConversations,
} from '@/lib/db';
import type { ChatMessage } from './chatStore';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export function ChatDialog({ maxHeight }: { maxHeight: number }) {
  const [input, setInput] = useState('');
  const [mode, setMode] = useState<'chat' | 'history'>('chat');
  const [historyItems, setHistoryItems] = useState<Array<{ id: number; title: string | null; updatedAt: string }>>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const {
    messages,
    isStreaming,
    streamingContent,
    currentConversationId,
    setMessages,
    addMessage,
    setStreaming,
    setStreamingContent,
    appendStreamingContent,
    updateLastAssistant,
    setCurrentConversationId,
    clearMessages,
  } = useChatStore();

  const { setPetState } = usePetStore();
  const { getDefaultConfig, loadConfigs } = useApiConfigStore();
  const { settings, loadSettings } = useSettingsStore();

  useEffect(() => {
    loadConfigs();
    loadSettings();
    handleNewConversation();
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, streamingContent]);

  useEffect(() => {
    resizeInput();
  }, [input]);

  async function loadConversation(conversationId: number) {
    try {
      const msgs = await getMessages(conversationId);
      setCurrentConversationId(conversationId);
      setMessages(
        msgs.map((m) => ({
          id: `msg-${m.id}`,
          role: m.role as 'user' | 'assistant' | 'system',
          content: m.content,
          timestamp: new Date(m.timestamp).getTime(),
          imageUrl: m.image_path ?? undefined,
        }))
      );
      setMode('chat');
    } catch (e) {
      console.warn('Failed to load conversation:', e);
    }
  }

  async function loadHistory() {
    const convos = await getConversations();
    setHistoryItems(convos.map((c) => ({ id: c.id, title: c.title, updatedAt: c.updated_at })));
    setMode('history');
  }

  async function handleSend() {
    const text = input.trim();
    if (!text || isStreaming) return;

    const defaultConfig = getDefaultConfig();
    const resolved = await resolveChatConfig(defaultConfig);
    if (!resolved.config) {
      addMessage(createMessage('assistant', resolved.error ?? '请先在设置中配置 API Key。'));
      return;
    }
    const apiConfig = resolved.config;

    const userMsg = createMessage('user', text);
    addMessage(userMsg);
    addMessage(createMessage('assistant', '...'));
    setInput('');

    let convoId = currentConversationId;
    if (!convoId) {
      await createConversation(text.slice(0, 50), apiConfig.id > 0 ? apiConfig.id : undefined);
      const convos = await getConversations();
      convoId = convos[0]?.id ?? null;
      setCurrentConversationId(convoId);
    }

    if (convoId) {
      await insertMessage(convoId, 'user', text);
    }

    setStreaming(true);
    setStreamingContent('');
    setPetState('thinking');

    try {
      const systemPrompt = await getActiveSystemPrompt();
      const chatMessages = [
        { role: 'system' as const, content: systemPrompt },
        ...messages.map((m) => ({ role: m.role, content: m.content })),
        { role: 'user' as const, content: text },
      ];

      let fullContent = '';
      for await (const token of streamChat(chatMessages, apiConfig)) {
        fullContent += token;
        updateLastAssistant(fullContent || '...');
        appendStreamingContent(token);
        if (fullContent.length === token.length) {
          setPetState('thinking');
        }
      }

      setPetState('idle');
      updateLastAssistant(fullContent);

      if (convoId) {
        await insertMessage(convoId, 'assistant', fullContent);
      }
      if (resolved.usingBuiltin) {
        await recordBuiltinUsage(chatMessages, fullContent);
      }
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : String(e);
      updateLastAssistant(`出错了：${errMsg}`);
      setPetState('idle');
    } finally {
      setStreaming(false);
      setStreamingContent('');
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleNewConversation() {
    clearMessages();
    setCurrentConversationId(null);
    setMode('chat');
  }

  function resizeInput() {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = '32px';
    el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
  }

  return (
    <div
      className="flex flex-col w-full overflow-hidden rounded-xl border border-border/50 bg-[var(--color-pet-dialog-bg)] shadow-lg backdrop-blur-sm"
      style={{ maxHeight }}
    >
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/30">
          <span className="text-xs font-medium text-foreground/70">{settings.petName}</span>
          <div className="flex gap-1">
            <Button variant={mode === 'chat' ? 'secondary' : 'ghost'} size="sm" className="h-6 text-xs px-2" onClick={handleNewConversation}>
              新对话
            </Button>
            <Button variant={mode === 'history' ? 'secondary' : 'ghost'} size="sm" className="h-6 text-xs px-2" onClick={() => loadHistory().catch(() => {})}>
              历史对话
            </Button>
          </div>
        </div>

      {mode === 'history' && (
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 py-2" style={{ maxHeight: Math.max(120, maxHeight - 42) }}>
          {historyItems.length === 0 ? (
            <div className="px-2 py-6 text-center text-xs text-muted-foreground">暂无历史对话</div>
          ) : historyItems.map((item) => (
            <button
              key={item.id}
              className="block w-full rounded-md px-2 py-2 text-left hover:bg-accent"
              onClick={() => loadConversation(item.id)}
            >
              <div className="truncate text-xs font-medium">{item.title || `对话 ${item.id}`}</div>
              <div className="mt-0.5 text-[11px] text-muted-foreground">{item.updatedAt}</div>
            </button>
          ))}
        </div>
      )}

      {mode === 'chat' && messages.length > 0 && (
        <div
          ref={scrollRef}
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3"
          style={{ maxHeight: Math.max(80, maxHeight - 98) }}
        >
          <div className="py-2 space-y-2">
            {messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} />
            ))}
          </div>
        </div>
      )}

      {mode === 'chat' && <div className={messages.length > 0 ? "p-2 border-t border-border/30" : "p-2"}>
        <form
          className="flex items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
        >
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="输入消息..."
            className="min-h-[32px] max-h-[140px] resize-none overflow-y-auto text-sm leading-5"
            rows={1}
            disabled={isStreaming}
          />
          <Button size="sm" type="submit" disabled={!input.trim() || isStreaming} className="h-8 shrink-0">
            发送
          </Button>
        </form>
      </div>}
    </div>
  );
}

function MessageBubble({ message, isStreaming = false }: { message: ChatMessage; isStreaming?: boolean }) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[80%] rounded-lg px-3 py-2 text-sm leading-relaxed ${
          isUser
            ? 'bg-[var(--color-pet-bubble-user)] text-foreground'
            : 'bg-[var(--color-pet-bubble-ai)] text-[var(--color-pet-bubble-ai-text)]'
        }`}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap">{message.content}</p>
        ) : (
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {message.content}
            </ReactMarkdown>
          </div>
        )}
        {isStreaming && (
          <span className="inline-block w-1.5 h-4 bg-current animate-pulse ml-0.5" />
        )}
      </div>
    </div>
  );
}
