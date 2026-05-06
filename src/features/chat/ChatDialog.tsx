import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useChatStore, createMessage } from './chatStore';
import { usePetStore } from '@/features/pet/petStore';
import { useApiConfigStore } from '@/features/settings/apiConfigStore';
import { useSettingsStore } from '@/features/settings/settingsStore';
import { streamChat } from '@/features/ai/aiService';
import { getActiveSystemPrompt } from '@/features/ai/systemPrompt';
import { getApiKey } from '@/lib/keychain';
import {
  getMessages,
  insertMessage,
  createConversation,
  getConversations,
} from '@/lib/db';
import type { ApiConfig } from '@/features/ai/types';
import type { ChatMessage } from './chatStore';
import { triggerHappy } from '@/features/pet/petStateEngine';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export function ChatDialog() {
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
    if (!defaultConfig) {
      addMessage(createMessage('assistant', '请先在设置中配置 API Key。'));
      return;
    }

    let apiKey: string;
    try {
      apiKey = defaultConfig.keyringRef
        ? await getApiKey(defaultConfig.keyringRef)
        : '';
    } catch {
      addMessage(createMessage('assistant', '无法读取 API Key，请重新配置。'));
      return;
    }

    const apiConfig: ApiConfig = {
      id: defaultConfig.id,
      provider: defaultConfig.provider as ApiConfig['provider'],
      baseUrl: defaultConfig.baseUrl,
      model: defaultConfig.model,
      apiKey,
      isDefault: true,
    };

    const userMsg = createMessage('user', text);
    addMessage(userMsg);
    setInput('');

    let convoId = currentConversationId;
    if (!convoId) {
      await createConversation(text.slice(0, 50), defaultConfig.id);
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

      triggerHappy();
      const assistantMsg = createMessage('assistant', fullContent);
      addMessage(assistantMsg);

      if (convoId) {
        await insertMessage(convoId, 'assistant', fullContent);
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

  return (
    <div className="flex flex-col h-full w-full bg-[var(--color-pet-dialog-bg)] backdrop-blur-sm rounded-xl border border-border/50 shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border/30">
        <span className="text-xs font-medium text-foreground/70">
          {settings.petName}
        </span>
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" className="h-6 text-xs px-2" onClick={handleNewConversation}>
            新对话
          </Button>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 px-3">
        <div ref={scrollRef} className="py-2 space-y-3">
          {messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} />
          ))}
          {isStreaming && streamingContent && (
            <MessageBubble
              message={{ id: 'streaming', role: 'assistant', content: streamingContent, timestamp: Date.now() }}
              isStreaming
            />
          )}
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="p-2 border-t border-border/30">
        <div className="flex gap-2">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="输入消息..."
            className="min-h-[36px] max-h-[120px] resize-none text-sm"
            rows={1}
            disabled={isStreaming}
          />
          <Button
            size="sm"
            onClick={handleSend}
            disabled={!input.trim() || isStreaming}
            className="shrink-0"
          >
            发送
          </Button>
        </div>
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
            : 'bg-[var(--color-pet-bubble-ai)] text-background'
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
