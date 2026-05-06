import { useState } from 'react';
import { useApiConfigStore } from '@/features/settings/apiConfigStore';
import { useChatStore, createMessage } from './chatStore';
import { usePetStore } from '@/features/pet/petStore';
import { streamChat } from '@/features/ai/aiService';
import { getActiveSystemPrompt } from '@/features/ai/systemPrompt';
import { getApiKey } from '@/lib/keychain';
import { getConversations, createConversation, insertMessage } from '@/lib/db';
import type { ApiConfig } from '@/features/ai/types';

interface HoverInputBarProps {
  petName: string;
  dialogWidth: number;
  onExpand: () => void;
}

export function HoverInputBar({ petName, dialogWidth, onExpand }: HoverInputBarProps) {
  const [input, setInput] = useState('');
  const { getDefaultConfig } = useApiConfigStore();
  const hasApiKey = !!getDefaultConfig();

  const {
    messages, addMessage, setStreaming, setStreamingContent,
    appendStreamingContent, currentConversationId, setCurrentConversationId,
  } = useChatStore();
  const { setPetState } = usePetStore();

  const handleSend = async () => {
    const text = input.trim();
    if (!text) return;

    const defaultConfig = getDefaultConfig();
    if (!defaultConfig) return;

    let apiKey: string;
    try { apiKey = defaultConfig.keyringRef ? await getApiKey(defaultConfig.keyringRef) : ''; }
    catch { return; }

    const apiConfig: ApiConfig = {
      id: defaultConfig.id,
      provider: defaultConfig.provider as ApiConfig['provider'],
      baseUrl: defaultConfig.baseUrl,
      model: defaultConfig.model,
      apiKey,
      isDefault: true,
    };

    addMessage(createMessage('user', text));
    setInput('');
    onExpand();

    let convoId = currentConversationId;
    if (!convoId) {
      await createConversation(text.slice(0, 50), defaultConfig.id);
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
      const chatMessages = [
        { role: 'system' as const, content: systemPrompt },
        ...messages.map((m) => ({ role: m.role, content: m.content })),
        { role: 'user' as const, content: text },
      ];

      let fullContent = '';
      for await (const token of streamChat(chatMessages, apiConfig)) {
        fullContent += token;
        appendStreamingContent(token);
      }

      setPetState('idle');
      addMessage(createMessage('assistant', fullContent));
      if (convoId) await insertMessage(convoId, 'assistant', fullContent);
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
    if (e.key === 'Enter' && !e.shiftKey) {
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
        className="rounded-xl border border-white/20 shadow-xl overflow-hidden"
        style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(20px)' }}
      >
        {!hasApiKey ? (
          <div className="px-4 py-3 text-xs text-white/70 text-center">
            请先在{' '}
            <button
              className="underline text-white/90 hover:text-white"
              onClick={async () => {
                const { invoke } = await import('@tauri-apps/api/core');
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
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`和 ${petName} 说点什么...`}
              rows={1}
              className="flex-1 bg-transparent text-sm text-white placeholder-white/50 resize-none outline-none leading-5"
              style={{ minHeight: '20px', maxHeight: '80px' }}
            />
            {input.trim() && (
              <button
                onClick={handleSend}
                className="text-white/80 hover:text-white text-xs px-2 py-1 rounded-md transition-colors"
                style={{ background: 'rgba(255,255,255,0.2)' }}
              >
                发送
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
