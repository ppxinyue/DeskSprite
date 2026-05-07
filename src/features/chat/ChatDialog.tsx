import { useEffect, useRef, useState } from 'react';
import { convertFileSrc } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { Check, ChevronDown, Columns3, Copy, Grid2X2, Mic, PanelRight, Paperclip, Plus, Rows3, Speaker, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { PulseDot } from '@/components/loading-ui/pulse-dot';
import { useChatStore, createMessage } from './chatStore';
import { useApiConfigStore } from '@/features/settings/apiConfigStore';
import { useSettingsStore } from '@/features/settings/settingsStore';
import { streamChat } from '@/features/ai/aiService';
import { BUILTIN_CLOSEAI_CONFIG, recordBuiltinUsage, resolveChatConfig, resolveStoredChatConfig } from '@/features/ai/defaultModel';
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

interface SelectedImage {
  path: string;
  name: string;
  dataUrl: string;
}

interface HistoryItem {
  id: number;
  title: string | null;
  updatedAt: string;
  modelId: number | null;
}

interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((event: { results: ArrayLike<{ 0: { transcript: string } }>; resultIndex?: number }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start: () => void;
}

export function ChatDialog({
  dialogOpacity = 1,
  compactFontSize = 13,
  initialConversationId,
  initialMode,
  maxHeight,
  onConversationChange,
  standalone = false,
}: {
  dialogOpacity?: number;
  compactFontSize?: number;
  initialConversationId?: number | null;
  initialMode: 'new' | 'history';
  maxHeight: number;
  onClose?: () => void;
  onConversationChange?: (conversationId: number | null) => void;
  standalone?: boolean;
}) {
  const [input, setInput] = useState('');
  const [selectedImage, setSelectedImage] = useState<SelectedImage | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [mode, setMode] = useState<'chat' | 'history'>(initialMode === 'history' ? 'history' : 'chat');
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
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

  const { getDefaultConfig, loadConfigs } = useApiConfigStore();
  const { settings } = useSettingsStore();

  useEffect(() => {
    if (!standalone) onConversationChange?.(currentConversationId);
  }, [currentConversationId, onConversationChange, standalone]);

  useEffect(() => {
    loadConfigs();
    if (standalone) loadHistory().catch(() => {});
    if (initialConversationId) {
      loadConversation(initialConversationId);
    } else if (initialMode === 'history') {
      loadHistory().catch(() => {});
    } else {
      handleNewConversation();
    }
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
          imageUrl: m.image_path && /[/\\]/.test(m.image_path) ? convertFileSrc(m.image_path) : undefined,
        }))
      );
      setMode('chat');
    } catch (e) {
      console.warn('Failed to load conversation:', e);
    }
  }

  async function loadHistory() {
    const convos = await getConversations();
    setHistoryItems(convos.map((c) => ({ id: c.id, title: c.title, updatedAt: c.updated_at, modelId: c.model_id })));
    setMode('history');
  }

  async function handleSend() {
    const text = input.trim();
    if ((!text && !selectedImage) || isStreaming) return;
    const messageText = text || '请分析这张图片。';

    const defaultConfig = getDefaultConfig();
    const resolved = await resolveChatConfig(defaultConfig);
    if (!resolved.config) {
      addMessage(createMessage('assistant', resolved.error ?? '请先在设置中配置 API Key。'));
      return;
    }
    const apiConfig = resolved.config;

    const imageForMessage = selectedImage;
    const userMsg = createMessage('user', messageText, imageForMessage ? {
      imageUrl: imageForMessage.dataUrl,
      imageDataUrl: imageForMessage.dataUrl,
    } : {});
    addMessage(userMsg);
    addMessage(createMessage('assistant', '...'));
    setInput('');
    setSelectedImage(null);

    let convoId = currentConversationId;
    if (!convoId) {
      await createConversation(messageText.slice(0, 50), apiConfig.id);
      const convos = await getConversations();
      convoId = convos[0]?.id ?? null;
      setCurrentConversationId(convoId);
    }

    if (convoId) {
      await insertMessage(convoId, 'user', messageText, imageForMessage?.path || undefined);
    }

    setStreaming(true);
    setStreamingContent('');

    try {
      const systemPrompt = await getActiveSystemPrompt();
      const chatMessages = [
        { role: 'system' as const, content: systemPrompt },
        ...messages.map((m) => ({ role: m.role, content: m.content, imageDataUrl: m.imageDataUrl })),
        { role: 'user' as const, content: messageText, imageDataUrl: imageForMessage?.dataUrl },
      ];

      let fullContent = '';
      for await (const token of streamChat(chatMessages, apiConfig)) {
        fullContent += token;
        updateLastAssistant(fullContent || '...');
        appendStreamingContent(token);
      }

      updateLastAssistant(fullContent);

      if (convoId) {
        await insertMessage(convoId, 'assistant', fullContent);
      }
      if (resolved.usingBuiltin) {
        await recordBuiltinUsage(chatMessages, fullContent);
      }

      // Auto-speak if enabled
      if (settings.autoSpeak && fullContent && fullContent !== '...') {
        speakText(fullContent, settings.speakRate);
      }
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : String(e);
      updateLastAssistant(`出错了：${errMsg}`);
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
    setSelectedImage(null);
  }

  async function handlePickImage() {
    const image = await pickImage();
    if (image) setSelectedImage(image);
  }

  function handleVoiceInput() {
    const lang = settings.voiceInputLang === 'system' ? (navigator.language || 'zh-CN') : settings.voiceInputLang;
    startSpeechInput(
      (text) => setInput((value) => `${value}${value ? ' ' : ''}${text}`),
      setIsListening,
      lang,
    );
  }

  useEffect(() => {
    if (standalone) return;
    const imageHandler = () => { handlePickImage(); };
    const voiceHandler = () => { handleVoiceInput(); };
    const focusHandler = () => {
      textareaRef.current?.focus();
    };
    window.addEventListener('desksprite:chat-image', imageHandler);
    window.addEventListener('desksprite:chat-voice', voiceHandler);
    window.addEventListener('desksprite:chat-focus', focusHandler);
    return () => {
      window.removeEventListener('desksprite:chat-image', imageHandler);
      window.removeEventListener('desksprite:chat-voice', voiceHandler);
      window.removeEventListener('desksprite:chat-focus', focusHandler);
    };
  }, [standalone]);

  function resizeInput() {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = '32px';
    el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
  }

  if (standalone) {
    return <StandaloneChatWorkspace initialConversationId={initialConversationId ?? null} />;
  }

  return (
    <div
      className="chat-dialog mx-auto flex w-full max-w-[720px] flex-col overflow-hidden rounded-[10px] border border-[var(--color-chat-border)] bg-[var(--color-chat-bg)] font-sans text-[14px] text-[var(--color-chat-text)] shadow-none"
      style={{
        maxHeight: standalone ? undefined : maxHeight,
        height: standalone ? '100%' : undefined,
        opacity: standalone ? 1 : dialogOpacity,
        fontSize: standalone ? undefined : compactFontSize,
      }}
    >
      {mode === 'history' && (
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3" style={{ maxHeight: standalone ? undefined : Math.max(120, maxHeight - 42) }}>
          {historyItems.length === 0 ? (
            <div className="px-2 py-6 text-center text-[12px] text-[var(--color-chat-muted)]">暂无历史对话</div>
          ) : historyItems.map((item) => (
            <button
              key={item.id}
              className="block w-full rounded-[8px] px-2.5 py-1.5 text-left transition-colors hover:bg-[color-mix(in_srgb,var(--color-chat-text)_8%,transparent)]"
              onClick={() => loadConversation(item.id)}
            >
              <div className="truncate leading-[1.45]" style={{ fontSize: compactFontSize }}>{item.title || `对话 ${item.id}`}</div>
              <div className="mt-0.5 text-[11px] leading-[1.45] text-[var(--color-chat-muted)]">{formatConversationTime(item.updatedAt)}</div>
            </button>
          ))}
        </div>
      )}

      {mode === 'chat' && messages.length > 0 && (
        <div
          ref={scrollRef}
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3"
          style={{ maxHeight: standalone ? undefined : Math.max(80, maxHeight - 60) }}
        >
          <div className="space-y-1 py-2.5">
            {messages.map((msg) => (
              <MessageBubble
                key={msg.id}
                message={msg}
                fullWidth
                compactFontSize={compactFontSize}
                compact
                speakRate={settings.speakRate}
                onSpeak={speakText}
              />
            ))}
          </div>
        </div>
      )}

      {mode === 'chat' && (
        <Composer
          input={input}
          isStreaming={isStreaming}
          onImagePick={handlePickImage}
          onInputChange={setInput}
          onKeyDown={handleKeyDown}
          onSubmit={handleSend}
          onVoiceInput={handleVoiceInput}
          selectedImage={selectedImage}
          textareaRef={textareaRef}
          compact
          compactFontSize={compactFontSize}
          isListening={isListening}
        />
      )}
    </div>
  );
}

type LayoutMode = 'single' | 'columns' | 'rows' | 'grid';

interface StandalonePanel {
  id: number;
  title: string;
  modelId: string;
  modelLocked: boolean;
  modelLabel: string;
  messages: ChatMessage[];
  input: string;
  conversationId: number | null;
  isStreaming: boolean;
  selectedImage: SelectedImage | null;
  isListening: boolean;
}

let panelCounter = 0;

function createPanel(title = '新对话'): StandalonePanel {
  return {
    id: ++panelCounter,
    title,
    modelId: 'default',
    modelLocked: false,
    modelLabel: '默认模型',
    messages: [],
    input: '',
    conversationId: null,
    isStreaming: false,
    selectedImage: null,
    isListening: false,
  };
}

function StandaloneChatWorkspace({ initialConversationId }: { initialConversationId: number | null }) {
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const [panels, setPanels] = useState<StandalonePanel[]>(() => [createPanel()]);
  const [activePanelId, setActivePanelId] = useState<number>(() => panelCounter);
  const [layout, setLayout] = useState<LayoutMode>('single');
  const { configs, getDefaultConfig, loadConfigs } = useApiConfigStore();
  const { settings } = useSettingsStore();

  useEffect(() => {
    loadConfigs();
    refreshHistory().catch(() => {});
    if (initialConversationId) {
      loadConversationIntoPanel(initialConversationId);
    }
  }, []);

  useEffect(() => {
    const unlisten = listen<{ conversationId: number | null }>('chat:open-conversation', ({ payload }) => {
      if (payload.conversationId) {
        loadConversationIntoPanel(payload.conversationId);
      } else {
        const next = createPanel();
        setPanels([next]);
        setActivePanelId(next.id);
        setLayout('single');
      }
    });
    return () => { unlisten.then((fn) => fn()); };
  }, [activePanelId, configs, historyItems, panels]);

  async function refreshHistory() {
    const convos = await getConversations();
    setHistoryItems(convos.map((c) => ({ id: c.id, title: c.title, updatedAt: c.updated_at, modelId: c.model_id })));
  }

  function updatePanel(panelId: number, update: Partial<StandalonePanel> | ((panel: StandalonePanel) => StandalonePanel)) {
    setPanels((items) => items.map((panel) => {
      if (panel.id !== panelId) return panel;
      return typeof update === 'function' ? update(panel) : { ...panel, ...update };
    }));
  }

  function addPanel() {
    setPanels((items) => {
      if (items.length >= 4) return items;
      const next = createPanel();
      setActivePanelId(next.id);
      return [...items, next];
    });
    if (layout === 'single') setLayout('columns');
  }

  function closePanel(panelId: number) {
    setPanels((items) => {
      if (items.length <= 1) return items;
      const next = items.filter((panel) => panel.id !== panelId);
      if (!next.some((panel) => panel.id === activePanelId)) {
        setActivePanelId(next[0].id);
      }
      return next;
    });
  }

  async function loadConversationIntoPanel(conversationId: number) {
    try {
      const convos = await getConversations();
      const conversation = convos.find((item) => item.id === conversationId);
      const historyItem = historyItems.find((item) => item.id === conversationId);
      const modelSource = conversation?.model_id ?? historyItem?.modelId ?? null;
      const modelId = modelIdToPanelValue(modelSource);
      const msgs = await getMessages(conversationId);
      const targetPanel = panels.find((panel) => panel.id === activePanelId) ?? panels[0] ?? createPanel();
      const panelId = targetPanel.id;
      const loadedPanel = {
        conversationId,
        title: conversation?.title || historyItem?.title || `对话 ${conversationId}`,
        modelId,
        modelLocked: true,
        modelLabel: getModelLabel(modelSource, configs),
        input: '',
        selectedImage: null,
        isStreaming: false,
        messages: msgs.map((m) => ({
          id: `msg-${m.id}`,
          role: m.role as 'user' | 'assistant' | 'system',
          content: m.content,
          timestamp: new Date(m.timestamp).getTime(),
          imageUrl: m.image_path && /[/\\]/.test(m.image_path) ? convertFileSrc(m.image_path) : undefined,
        })),
      };
      setPanels((items) => {
        if (items.some((panel) => panel.id === panelId)) {
          return items.map((panel) => panel.id === panelId ? { ...panel, ...loadedPanel } : panel);
        }
        return [{ ...targetPanel, ...loadedPanel }];
      });
      setActivePanelId(panelId);
      setLayout('single');
    } catch (e) {
      console.warn('Failed to load conversation:', e);
    }
  }

  async function resolvePanelConfig(modelId: string) {
    const defaultConfig = getDefaultConfig();
    const modelConfig = configs.find((c) => String(c.id) === modelId);
    return modelConfig
      ? { ...(await resolveStoredChatConfig(modelConfig)), usingBuiltin: false }
      : modelId === 'builtin'
        ? { config: BUILTIN_CLOSEAI_CONFIG, usingBuiltin: true }
        : await resolveChatConfig(defaultConfig);
  }

  async function sendFromPanel(panelId: number) {
    const panel = panels.find((item) => item.id === panelId);
    if (!panel || panel.isStreaming) return;
    const text = panel.input.trim();
    if (!text && !panel.selectedImage) return;
    const messageText = text || '请分析这张图片。';

    const resolved = await resolvePanelConfig(panel.modelId);
    if (!resolved.config) {
      updatePanel(panelId, (current) => ({
        ...current,
        messages: [...current.messages, createMessage('assistant', resolved.error ?? '请先在设置中配置 API Key。')],
      }));
      return;
    }

    const imageForMessage = panel.selectedImage;
    const finalUserMsg = createMessage('user', messageText, imageForMessage ? {
      imageUrl: imageForMessage.dataUrl,
      imageDataUrl: imageForMessage.dataUrl,
    } : {});
    const assistantMsg = createMessage('assistant', '...');
    const previousMessages = panel.messages;
    updatePanel(panelId, {
      input: '',
      selectedImage: null,
      isStreaming: true,
      messages: [...previousMessages, finalUserMsg, assistantMsg],
    });

    let convoId = panel.conversationId;
    if (!convoId) {
      await createConversation(messageText.slice(0, 50), resolved.config.id);
      const convos = await getConversations();
      convoId = convos[0]?.id ?? null;
      updatePanel(panelId, {
        conversationId: convoId,
        title: messageText.slice(0, 24) || '新对话',
        modelLocked: true,
        modelLabel: getModelLabel(resolved.config.id, configs),
      });
    }

    if (convoId) await insertMessage(convoId, 'user', messageText, imageForMessage?.path || undefined);

    try {
      const systemPrompt = await getActiveSystemPrompt();
      const chatMessages = [
        { role: 'system' as const, content: systemPrompt },
        ...previousMessages.map((m) => ({ role: m.role, content: m.content, imageDataUrl: m.imageDataUrl })),
        { role: 'user' as const, content: messageText, imageDataUrl: imageForMessage?.dataUrl },
      ];

      let fullContent = '';
      for await (const token of streamChat(chatMessages, resolved.config)) {
        fullContent += token;
        updatePanel(panelId, (current) => ({
          ...current,
          messages: replaceLastAssistant(current.messages, fullContent || '...'),
        }));
      }

      updatePanel(panelId, (current) => ({
        ...current,
        isStreaming: false,
        messages: replaceLastAssistant(current.messages, fullContent),
      }));
      if (convoId) await insertMessage(convoId, 'assistant', fullContent);
      if (resolved.usingBuiltin) await recordBuiltinUsage(chatMessages, fullContent);
      await refreshHistory();

      // Auto-speak if enabled
      if (settings.autoSpeak && fullContent && fullContent !== '...') {
        speakText(fullContent, settings.speakRate);
      }
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : String(e);
      updatePanel(panelId, (current) => ({
        ...current,
        isStreaming: false,
        messages: replaceLastAssistant(current.messages, `出错了：${errMsg}`),
      }));
    }
  }

  const visiblePanels = layout === 'single'
    ? [panels.find((panel) => panel.id === activePanelId) ?? panels[0]]
    : panels;

  return (
    <div className="grid h-full grid-cols-[240px_minmax(0,1fr)] bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <aside className="flex min-h-0 flex-col border-r border-[var(--border-color)] bg-[var(--bg-secondary)]">
        <div className="shrink-0 p-3">
          <button className="flex h-9 w-full items-center gap-2 rounded-[8px] px-3 text-left text-[14px] leading-[1.5] transition-colors hover:bg-[color-mix(in_srgb,var(--text-primary)_8%,transparent)]" onClick={() => {
            const next = createPanel();
            setPanels([next]);
            setActivePanelId(next.id);
            setLayout('single');
          }}>
            <Plus className="h-4 w-4" />
            新建对话
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-3">
          {historyItems.map((item) => (
            <button key={item.id} className="block w-full rounded-[8px] px-3 py-2 text-left transition-colors hover:bg-[color-mix(in_srgb,var(--text-primary)_8%,transparent)]" onClick={() => loadConversationIntoPanel(item.id)}>
              <div className="truncate text-[14px] leading-[1.5]">{item.title || `对话 ${item.id}`}</div>
              <div className="mt-0.5 flex items-center gap-1.5 truncate text-[12px] leading-[1.5] text-[var(--text-secondary)]">
                <span>{formatConversationTime(item.updatedAt)}</span>
                <span className="truncate">· {getModelLabel(item.modelId, configs)}</span>
              </div>
            </button>
          ))}
        </div>
      </aside>
      <main className="flex min-h-0 flex-col bg-[var(--bg-primary)]">
        <div className="flex h-12 shrink-0 items-center justify-end border-b border-[var(--border-color)] px-4">
          <div className="flex items-center gap-1">
            <LayoutButton title="单窗口" active={layout === 'single'} onClick={() => setLayout('single')}><PanelRight className="h-4 w-4" /></LayoutButton>
            <LayoutButton title="横向并排" active={layout === 'columns'} onClick={() => setLayout('columns')}><Columns3 className="h-4 w-4" /></LayoutButton>
            <LayoutButton title="纵向并排" active={layout === 'rows'} onClick={() => setLayout('rows')}><Rows3 className="h-4 w-4" /></LayoutButton>
            <LayoutButton title="四宫格" active={layout === 'grid'} onClick={() => setLayout('grid')}><Grid2X2 className="h-4 w-4" /></LayoutButton>
            <Button variant="ghost" size="sm" className="ml-1 h-8 w-8 p-0 hover:bg-[color-mix(in_srgb,var(--text-primary)_8%,transparent)]" title="新建面板" onClick={addPanel} disabled={panels.length >= 4}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-hidden">
          <div className="grid h-full gap-px bg-[var(--border-color)]" style={layoutGridStyle(layout, visiblePanels.length)}>
            {visiblePanels.map((panel) => (
              <StandaloneChatPanel
                key={panel.id}
                panel={panel}
                active={panel.id === activePanelId}
                canClose={panels.length > 1}
                configs={configs}
                onActivate={() => setActivePanelId(panel.id)}
                onClose={() => closePanel(panel.id)}
                onImagePick={async () => {
                  const image = await pickImage();
                  if (image) updatePanel(panel.id, { selectedImage: image });
                }}
                onInputChange={(value) => updatePanel(panel.id, { input: value })}
                onModelChange={(modelId) => updatePanel(panel.id, { modelId })}
                onSubmit={() => sendFromPanel(panel.id)}
                onVoiceInput={() => {
                  const lang = settings.voiceInputLang === 'system' ? (navigator.language || 'zh-CN') : settings.voiceInputLang;
                  startSpeechInput(
                    (text) => updatePanel(panel.id, (current) => ({ ...current, input: `${current.input}${current.input ? ' ' : ''}${text}` })),
                    (listening) => updatePanel(panel.id, { isListening: listening }),
                    lang,
                  );
                }}
              />
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

function layoutGridStyle(layout: LayoutMode, count: number): React.CSSProperties {
  if (layout === 'rows') {
    return { gridTemplateRows: `repeat(${Math.max(1, count)}, minmax(0, 1fr))` };
  }
  if (layout === 'grid') {
    return {
      gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
      gridTemplateRows: 'repeat(2, minmax(0, 1fr))',
    };
  }
  return { gridTemplateColumns: `repeat(${Math.max(1, count)}, minmax(0, 1fr))` };
}

function modelIdToPanelValue(modelId: number | null) {
  if (modelId === -1) return 'builtin';
  if (typeof modelId === 'number' && modelId > 0) return String(modelId);
  return 'default';
}

function getModelLabel(
  modelId: number | null,
  configs: ReturnType<typeof useApiConfigStore.getState>['configs'],
) {
  if (modelId === -1) return `CloseAI · ${BUILTIN_CLOSEAI_CONFIG.model}`;
  if (modelId === null && configs.length === 0) return `CloseAI · ${BUILTIN_CLOSEAI_CONFIG.model}`;
  if (typeof modelId === 'number' && modelId > 0) {
    const config = configs.find((item) => item.id === modelId);
    if (config) {
      const providerName = config.name || config.provider;
      return `${providerName} · ${config.model}`;
    }
    return `模型 #${modelId}`;
  }
  return '默认模型';
}

function formatConversationTime(value: string) {
  if (!value) return '';
  const normalized = /[zZ]|[+-]\d{2}:?\d{2}$/.test(value)
    ? value
    : `${value.replace(' ', 'T')}Z`;
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}

function replaceLastAssistant(messages: ChatMessage[], content: string) {
  const next = [...messages];
  for (let i = next.length - 1; i >= 0; i--) {
    if (next[i].role === 'assistant') {
      next[i] = { ...next[i], content };
      break;
    }
  }
  return next;
}

async function pickImage(): Promise<SelectedImage | null> {
  const file = await new Promise<File | null>((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/png,image/jpeg,image/webp';
    input.onchange = () => resolve(input.files?.[0] ?? null);
    input.click();
  });
  if (!file) return null;
  return {
    path: '',
    name: file.name,
    dataUrl: await fileToDataUrl(file),
  };
}

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

async function startSpeechInput(
  onText: (text: string) => void,
  setListening: (listening: boolean) => void,
  lang?: string
) {
  try {
    // Request microphone permission
    await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch (e) {
    onText('请允许麦克风权限以使用语音输入。');
    return;
  }

  const win = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  const Recognition = win.SpeechRecognition ?? win.webkitSpeechRecognition;
  if (!Recognition) {
    onText('当前系统 WebView 不支持语音识别。');
    return;
  }

  const recognition = new Recognition();
  recognition.lang = lang || (navigator.language || 'zh-CN');
  recognition.interimResults = true;
  recognition.continuous = false;

  recognition.onresult = (event) => {
    const results = event.results;
    for (let i = event.resultIndex; i < results.length; i++) {
      const transcript = results[i][0].transcript;
      if (results[i].isFinal) {
        onText(transcript.trim());
      }
    }
  };

  recognition.onend = () => setListening(false);
  recognition.onerror = (e) => {
    console.error('Speech recognition error:', e);
    setListening(false);
  };

  setListening(true);
  recognition.start();
}

function LayoutButton({ title, active, onClick, children }: { title: string; active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <Button
      variant="ghost"
      size="sm"
      className={`h-8 w-8 p-0 transition-colors hover:bg-[color-mix(in_srgb,var(--text-primary)_8%,transparent)] ${active ? 'bg-[color-mix(in_srgb,var(--text-primary)_10%,transparent)]' : ''}`}
      title={title}
      onClick={onClick}
    >
      {children}
    </Button>
  );
}

function StandaloneChatPanel({
  panel,
  active,
  canClose,
  configs,
  onActivate,
  onClose,
  onImagePick,
  onInputChange,
  onModelChange,
  onSubmit,
  onVoiceInput,
}: {
  panel: StandalonePanel;
  active: boolean;
  canClose: boolean;
  configs: ReturnType<typeof useApiConfigStore.getState>['configs'];
  onActivate: () => void;
  onClose: () => void;
  onImagePick: () => void;
  onInputChange: (value: string) => void;
  onModelChange: (value: string) => void;
  onSubmit: () => void;
  onVoiceInput: () => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [panel.messages]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = '36px';
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [panel.input]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSubmit();
    }
  }

  return (
    <section
      className={`flex min-h-0 flex-col overflow-hidden bg-[var(--bg-primary)] ${active ? 'outline outline-1 outline-[var(--border-color)]' : ''}`}
      onMouseDown={onActivate}
    >
      <div className="flex h-12 shrink-0 items-start gap-2 px-3 pt-2">
        <ModelControl
          configs={configs}
          locked={panel.modelLocked}
          modelId={panel.modelId}
          modelLabel={panel.modelLabel}
          onChange={onModelChange}
        />
        {canClose && (
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 hover:bg-[color-mix(in_srgb,var(--text-primary)_8%,transparent)]" onClick={onClose} title="关闭">
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-4">
        <div className="mx-auto w-full max-w-none space-y-1.5 py-4">
          {panel.messages.length === 0 ? (
            <div className="pt-12 text-center text-[14px] leading-[1.5] text-[var(--text-secondary)]">开始一次新的对话</div>
          ) : panel.messages.map((msg) => (
            <MessageBubble
              key={msg.id}
              message={msg}
              speakRate={settings.speakRate}
              onSpeak={speakText}
            />
          ))}
        </div>
      </div>
      <div className="shrink-0 px-4 pb-4">
        <div className="mx-auto w-full max-w-none">
          <Composer
            input={panel.input}
            isStreaming={panel.isStreaming}
            isListening={panel.isListening}
            onImagePick={onImagePick}
            onInputChange={onInputChange}
            onKeyDown={handleKeyDown}
            onSubmit={onSubmit}
            onVoiceInput={onVoiceInput}
            selectedImage={panel.selectedImage}
            textareaRef={textareaRef}
          />
        </div>
      </div>
    </section>
  );
}

function ModelControl({
  configs,
  locked,
  modelId,
  modelLabel,
  onChange,
}: {
  configs: ReturnType<typeof useApiConfigStore.getState>['configs'];
  locked: boolean;
  modelId: string;
  modelLabel: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const defaultConfig = configs.find((config) => config.isDefault);
  const options = configs.length === 0
    ? [{ id: 'default', title: `CloseAI · ${BUILTIN_CLOSEAI_CONFIG.model}`, description: '内置默认模型' }]
    : [
        {
          id: 'default',
          title: defaultConfig
            ? `默认 · ${defaultConfig.provider} · ${defaultConfig.model}`
            : `默认 · CloseAI · ${BUILTIN_CLOSEAI_CONFIG.model}`,
          description: defaultConfig?.baseUrl ?? '内置默认模型',
        },
        { id: 'builtin', title: `CloseAI · ${BUILTIN_CLOSEAI_CONFIG.model}`, description: '内置默认模型' },
        ...configs.map((config) => ({
          id: String(config.id),
          title: `${config.provider} · ${config.model}`,
          description: config.baseUrl,
        })),
      ];
  const current = options.find((item) => item.id === modelId) ?? options[0];

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  if (locked) {
    return (
      <div
        className="min-w-0 max-w-[180px] bg-white text-[11px] leading-[1.4] text-neutral-500"
        title={modelLabel}
      >
        <span className="block truncate">{modelLabel}</span>
      </div>
    );
  }

  return (
    <div ref={menuRef} className="relative flex w-[220px] max-w-full min-w-0">
      <button
        type="button"
        className="flex h-10 w-full min-w-0 items-center justify-between gap-2 rounded-[10px] bg-[color-mix(in_srgb,var(--bg-secondary)_82%,var(--bg-primary))] px-3 text-left text-[12px] leading-[1.5] text-[var(--text-primary)] outline-none transition-colors hover:bg-[var(--bg-secondary)] focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--text-secondary)_28%,transparent)]"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="listbox"
        aria-expanded={open}
        title={current.title}
      >
        <span className="min-w-0">
          <span className="block truncate text-[13px] leading-[1.5] text-[var(--text-primary)]">{current.title}</span>
        </span>
        <ChevronDown className={`h-3.5 w-3.5 shrink-0 text-[var(--text-secondary)] transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div
          className="absolute left-0 top-11 z-50 w-[min(320px,calc(100vw-32px))] overflow-hidden rounded-[14px] bg-[var(--bg-primary)] py-1.5 shadow-[0_10px_34px_rgba(0,0,0,0.16)] ring-1 ring-[color-mix(in_srgb,var(--border-color)_75%,transparent)] dark:shadow-[0_14px_38px_rgba(0,0,0,0.42)]"
          role="listbox"
        >
          <div className="px-3 pb-1.5 pt-1 text-[11px] leading-[1.5] text-[var(--text-secondary)]">选择模型</div>
          {options.map((option) => {
            const selected = option.id === modelId;
            return (
              <button
                key={option.id}
                type="button"
                role="option"
                aria-selected={selected}
                className={`flex min-h-11 w-full items-center gap-3 px-3.5 py-2 text-left transition-colors hover:bg-[color-mix(in_srgb,var(--text-primary)_7%,transparent)] ${
                  selected ? 'bg-[color-mix(in_srgb,var(--text-primary)_6%,transparent)]' : ''
                }`}
                onClick={() => {
                  onChange(option.id);
                  setOpen(false);
                }}
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] leading-[1.35] text-[var(--text-primary)]">{option.title}</span>
                  <span className="block truncate text-[11px] leading-[1.35] text-[var(--text-secondary)]">{option.description}</span>
                </span>
                {selected && <Check className="h-4 w-4 shrink-0 text-[var(--text-primary)]" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Composer({
  input,
  isStreaming,
  isListening = false,
  onImagePick,
  onInputChange,
  onKeyDown,
  onSubmit,
  onVoiceInput,
  selectedImage,
  textareaRef,
  compact = false,
  compactFontSize = 13,
}: {
  input: string;
  isStreaming: boolean;
  isListening?: boolean;
  onImagePick?: () => void;
  onInputChange: (value: string) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  onSubmit: () => void;
  onVoiceInput?: () => void;
  selectedImage?: SelectedImage | null;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  compact?: boolean;
  compactFontSize?: number;
}) {
  return (
    <div className={compact ? "p-2.5 pt-1.5" : ""}>
      {selectedImage && (
        <div className="mb-2 flex items-center gap-2 rounded-[8px] border border-[var(--color-chat-border)] px-2 py-1.5 text-[12px] leading-[1.5] text-[var(--color-chat-muted)]">
          <img src={selectedImage.dataUrl} alt="" className="h-8 w-8 rounded-[6px] object-cover" />
          <span className="min-w-0 flex-1 truncate">{selectedImage.name}</span>
        </div>
      )}
      <form
        className={`${compact ? 'rounded-[9px]' : 'rounded-[10px]'} flex w-full items-end gap-1 border border-[var(--color-chat-border)] bg-[var(--color-chat-input-bg)] p-0 shadow-none transition-[border-color,box-shadow] focus-within:border-[var(--color-chat-accent)] focus-within:shadow-[0_0_0_2px_color-mix(in_srgb,var(--color-chat-accent)_18%,transparent)]`}
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
      >
        {!compact && (
          <>
            <Button variant="ghost" size="sm" type="button" className="ml-1 h-9 w-8 p-0 text-[var(--text-secondary)] hover:bg-[color-mix(in_srgb,var(--text-primary)_8%,transparent)] hover:text-[var(--text-primary)]" title="上传图片" onClick={onImagePick}>
              <Paperclip className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" type="button" className={`h-9 w-8 p-0 hover:bg-[color-mix(in_srgb,var(--text-primary)_8%,transparent)] ${isListening ? 'animate-pulse text-[var(--text-primary)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`} title="语音输入" onClick={onVoiceInput}>
              <Mic className="h-4 w-4" />
            </Button>
          </>
        )}
        <Textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="输入消息..."
          className={`${compact ? 'min-h-[34px] px-2.5 py-2 leading-[1.45]' : 'min-h-[40px] px-3 py-2.5 text-[14px] leading-[1.5]'} max-h-[132px] flex-1 resize-none overflow-y-auto border-0 bg-transparent text-[var(--color-chat-text)] shadow-none placeholder:text-[var(--color-chat-muted)] focus-visible:ring-0`}
          style={{ fontSize: compact ? compactFontSize : undefined }}
          rows={1}
          disabled={isStreaming}
        />
        <Button size="sm" type="submit" disabled={(!input.trim() && !selectedImage) || isStreaming} className={`${compact ? 'm-0.5 h-7 rounded-[7px] px-2.5 text-[11px]' : 'm-1 h-8 rounded-[8px] px-3 text-[12px]'} shrink-0`}>
          发送
        </Button>
      </form>
    </div>
  );
}

function MessageBubble({
  message,
  isStreaming = false,
  fullWidth = false,
  compact = false,
  compactFontSize = 13,
  speakRate = 1.0,
  onSpeak,
}: {
  message: ChatMessage;
  isStreaming?: boolean;
  fullWidth?: boolean;
  compact?: boolean;
  compactFontSize?: number;
  speakRate?: number;
  onSpeak?: (text: string, rate: number) => void;
}) {
  const isUser = message.role === 'user';
  const isPending = message.role === 'assistant' && message.content === '...';
  const [isSpeaking, setIsSpeaking] = useState(false);

  const handleSpeak = () => {
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    } else {
      window.speechSynthesis.cancel();
      onSpeak?.(message.content, speakRate);
      setIsSpeaking(true);
      setTimeout(() => setIsSpeaking(false), message.content.length * 100);
    }
  };

  return (
    <div className={`group flex animate-[chatFadeIn_150ms_ease-out] ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`relative border border-[var(--color-chat-bubble-border)] leading-[1.45] text-[var(--color-chat-text)] shadow-none transition-colors ${
          compact ? 'rounded-[9px] px-2.5 py-1.5' : 'rounded-[10px] px-3 py-2 text-[14px] leading-[1.5]'
        } ${
          fullWidth ? 'max-w-full' : 'max-w-[84%]'
        } ${
          isUser
            ? 'bg-[var(--color-chat-user-bubble)] text-right'
            : 'bg-[var(--color-chat-assistant-bubble)] text-left'
        }`}
        style={{ fontSize: compact ? compactFontSize : undefined }}
      >
        {(message.imageDataUrl || message.imageUrl) && (
          <img src={message.imageDataUrl || message.imageUrl} alt="" className="mb-2 max-h-48 rounded-[8px] object-contain" />
        )}
        {isPending ? (
          <PulseDot className="text-[var(--color-chat-muted)]" />
        ) : isUser ? (
          <p className="whitespace-pre-wrap">{cleanChatText(message.content)}</p>
        ) : (
          <div className="chat-markdown max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {cleanChatText(message.content)}
            </ReactMarkdown>
          </div>
        )}
        {isStreaming && (
          <span className="inline-block w-1.5 h-4 bg-current animate-pulse ml-0.5" />
        )}
        {!isPending && message.content && !isUser && (
          <button
            className={`absolute top-1 hidden h-6 w-6 items-center justify-center rounded-[6px] border border-[var(--color-chat-border)] bg-[var(--color-chat-bg)] text-[var(--color-chat-muted)] hover:text-[var(--color-chat-text)] group-hover:flex -right-8`}
            title={isSpeaking ? '停止朗读' : '朗读'}
            onClick={handleSpeak}
          >
            {isSpeaking ? <X className="h-3.5 w-3.5" /> : <Speaker className="h-3.5 w-3.5" />}
          </button>
        )}
        {!isPending && message.content && (
          <button
            className={`absolute top-1 hidden h-6 w-6 items-center justify-center rounded-[6px] border border-[var(--color-chat-border)] bg-[var(--color-chat-bg)] text-[var(--color-chat-muted)] hover:text-[var(--color-chat-text)] group-hover:flex ${isUser ? '-left-8' : '-right-14'}`}
            title="复制"
            onClick={() => navigator.clipboard?.writeText(cleanChatText(message.content)).catch(() => {})}
          >
            <Copy className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

function cleanChatText(text: string) {
  return text
    .replace(/[\u{1F300}-\u{1FAFF}]/gu, '')
    .replace(/^[（(][^）)]{1,24}[）)]\s*/gm, '')
    .trim();
}

function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*\*(.+?)\*\*\*/g, '$1')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/`(.+?)`/g, '$1')
    .replace(/```.+?```/gs, '')
    .replace(/`(.+?)`/g, '$1')
    .replace(/#{1,6}\s/g, '')
    .replace(/\[(.+?)\]\(.+?\)/g, '$1')
    .replace(/!\[.*?\]\(.+?\)/g, '')
    .replace(/^\s*[-*+]\s+/gm, '')
    .replace(/^\s*\d+\.\s+/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function speakText(text: string, rate: number = 1.0) {
  if (!window.speechSynthesis) {
    console.warn('Speech synthesis not supported');
    return;
  }

  window.speechSynthesis.cancel();
  const cleanText = stripMarkdown(cleanChatText(text));
  if (!cleanText) return;

  const utterance = new SpeechSynthesisUtterance(cleanText);
  utterance.lang = 'zh-CN';
  utterance.rate = rate;
  utterance.pitch = 1.0;

  window.speechSynthesis.speak(utterance);
}
