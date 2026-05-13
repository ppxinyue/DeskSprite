import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useApiConfigStore } from '@/features/settings/apiConfigStore';
import { useSettingsStore } from '@/features/settings/settingsStore';
import { useChatStore, createMessage } from './chatStore';
import { usePetStore } from '@/features/pet/petStore';
import { streamChat } from '@/features/ai/aiService';
import { recordBuiltinUsage, resolveChatConfig } from '@/features/ai/defaultModel';
import { getActiveSystemPrompt } from '@/features/ai/systemPrompt';
import { shouldQuerySystemKnowledge, withSystemKnowledge } from '@/features/ai/systemKnowledge';
import { getConversations, createConversation, insertMessage } from '@/lib/db';
import { shouldSubmitMessage } from './sendShortcut';

interface HoverInputBarProps {
  petName: string;
  dialogWidth: number;
  onExpand: () => void;
}

export function HoverInputBar({ petName, dialogWidth, onExpand }: HoverInputBarProps) {
  const [input, setInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [shakeKey, setShakeKey] = useState(0);
  const { getDefaultConfig } = useApiConfigStore();
  const { settings } = useSettingsStore();
  const hasApiKey = true;

  const {
    messages, addMessage, setStreaming, setStreamingContent,
    appendStreamingContent, currentConversationId, setCurrentConversationId,
  } = useChatStore();
  const { setPetState } = usePetStore();

  const handleSend = async () => {
    const text = input.trim();
    if (!text) {
      setError('先写点内容再发送。');
      setShakeKey((value) => value + 1);
      return;
    }

    const defaultConfig = settings.chatModelMode === 'custom' ? getDefaultConfig() : undefined;
    const resolved = await resolveChatConfig(defaultConfig);
    if (!resolved.config) {
      addMessage(createMessage('assistant', resolved.error ?? '请先在设置中配置 API Key。'));
      return;
    }
    const apiConfig = resolved.config;

    addMessage(createMessage('user', text));
    setInput('');
    setError(null);
    onExpand();

    let convoId = currentConversationId;
    if (!convoId) {
      await createConversation(text.slice(0, 50), apiConfig.id > 0 ? apiConfig.id : undefined);
      const convos = await getConversations();
      convoId = convos[0]?.id ?? null;
      setCurrentConversationId(convoId);
    }
    if (convoId) await insertMessage(convoId, 'user', text);

    setStreaming(true);
    setStreamingContent('');
    setPetState('thinking');

    try {
      const systemPrompt = await getActiveSystemPrompt();
      const baseMessages = [
        { role: 'system' as const, content: systemPrompt },
        ...messages.map((m) => ({ role: m.role, content: m.content })),
        { role: 'user' as const, content: text },
      ];
      if (shouldQuerySystemKnowledge(baseMessages, settings.systemKnowledgeEnabled)) {
        setStreamingContent('查询中...');
      }
      const chatMessages = await withSystemKnowledge(baseMessages, settings.systemKnowledgeEnabled);

      let fullContent = '';
      setStreamingContent('');
      for await (const token of streamChat(chatMessages, apiConfig)) {
        fullContent += token;
        appendStreamingContent(token);
      }

      setPetState('idle');
      addMessage(createMessage('assistant', fullContent));
      if (convoId) await insertMessage(convoId, 'assistant', fullContent);
      if (resolved.usingBuiltin) await recordBuiltinUsage(chatMessages, fullContent);
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : String(e);
      addMessage(createMessage('assistant', `出错了：${errMsg}`));
      setPetState('idle');
    } finally {
      setStreaming(false);
      setStreamingContent('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (shouldSubmitMessage(e, settings.messageSendShortcut)) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div
      className="absolute top-full mt-2 left-1/2 -translate-x-1/2 z-20"
      style={{ width: `${Math.max(dialogWidth, 240)}px` }}
    >
      <div
        key={shakeKey}
        className={`glass-panel overflow-hidden rounded-[11px] transition-all ${error ? 'animate-input-shake border-destructive/50' : ''}`}
      >
        {!hasApiKey ? (
          <div className="px-3 py-2.5 text-xs text-white/70 text-center">
            请先在{' '}
            <button
              className="underline text-white/90 hover:text-white"
              onClick={async () => {
                invoke('show_settings_cmd').catch(() => {});
              }}
            >
              设置
            </button>
            {' '}中配置 API Key
          </div>
        ) : (
          <div className="flex items-center gap-2 px-3 py-2">
            <textarea
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                if (error) setError(null);
              }}
              onKeyDown={handleKeyDown}
              placeholder={`和 ${petName} 说点什么...`}
              rows={1}
              className="flex-1 resize-none bg-transparent text-sm leading-5 text-foreground outline-none placeholder:text-muted-foreground"
              style={{ minHeight: '20px', maxHeight: '80px' }}
            />
            {input.trim() && (
              <button
                onClick={handleSend}
                className="rounded-[10px] bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground shadow-sm transition-all hover:bg-primary/90 active:scale-[0.98]"
              >
                发送
              </button>
            )}
          </div>
        )}
      </div>
      {error && (
        <p className="mt-1.5 px-2 text-[11px] text-destructive">{error}</p>
      )}
    </div>
  );
}
