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
    setCurrentConversationId,
    clearMessages,
  } = useChatStore();

  const { setPetState } = usePetStore();
  const { getDefaultConfig, loadConfigs } = useApiConfigStore();
  const { settings, loadSettings } = useSettingsStore();

  useEffect(() => {
    loadConfigs();
    loadSettings();
    loadRecentConversation();
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, streamingContent]);

  useEffect(() => {
    resizeInput();
  }, [input]);

  async function loadRecentConversation() {
    try {
      const convos = await getConversations();
      if (convos.length > 0) {
        const latest = convos[0];
        setCurrentConversationId(latest.id);
        const msgs = await getMessages(latest.id);
        setMessages(
          msgs.map((m) => ({
            id: `msg-${m.id}`,
            role: m.role as 'user' | 'assistant' | 'system',
          content: m.content,
          timestamp: new Date(m.timestamp).getTime(),
          imageUrl: m.image_path ?? undefined,
        }))
      );
    }
    } catch (e) {
      console.warn('Failed to load recent conversation:', e);
    }
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
        appendStreamingContent(token);
        if (fullContent.length === token.length) {
          setPetState('thinking');
        }
      }

      setPetState('idle');
      const assistantMsg = createMessage('assistant', fullContent);
      addMessage(assistantMsg);

      if (convoId) {
        await insertMessage(convoId, 'assistant', fullContent);
      }
      if (resolved.usingBuiltin) {
        await recordBuiltinUsage(chatMessages, fullContent);
      }
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : String(e);
      addMessage(createMessage('assistant', `出错了：${errMsg}`));
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
  }

  function resizeInput() {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = '32px';
    el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
  }

  const hasVisibleMessages = messages.length > 0 || !!streamingContent;

  return (
    <div
      className="flex flex-col w-full overflow-hidden rounded-xl border border-border/50 bg-[var(--color-pet-dialog-bg)] shadow-lg backdrop-blur-sm"
      style={{ maxHeight }}
    >
      {hasVisibleMessages && (
        <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/30">
          <span className="text-xs font-medium text-foreground/70">{settings.petName}</span>
          <Button variant="ghost" size="sm" className="h-6 text-xs px-2" onClick={handleNewConversation}>
            新对话
          </Button>
        </div>
      )}

      {hasVisibleMessages && (
        <div
          ref={scrollRef}
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3"
          style={{ maxHeight: Math.max(80, maxHeight - 92) }}
        >
          <div className="py-2 space-y-2">
            {messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} />
            ))}
            {isStreaming && streamingContent && (
              <MessageBubble
                message={{ id: 'streaming', role: 'assistant', content: streamingContent, timestamp: 0 }}
                isStreaming
              />
            )}
          </div>
        </div>
      )}

      <div className={hasVisibleMessages ? "p-2 border-t border-border/30" : "p-2"}>
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
      </div>
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
