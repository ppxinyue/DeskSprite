import { useEffect, useRef, useState } from 'react';
import { convertFileSrc, invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { Check, ChevronDown, Columns3, Copy, Grid2X2, ImagePlus, Mic, PanelRight, Plus, Rows3, Speaker, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { PulseDot } from '@/components/loading-ui/pulse-dot';
import { useChatStore, createMessage } from './chatStore';
import { useApiConfigStore } from '@/features/settings/apiConfigStore';
import { useSettingsStore, type AppSettings, type VoiceProviderMode } from '@/features/settings/settingsStore';
import { streamChat } from '@/features/ai/aiService';
import { BUILTIN_CLOSEAI_CONFIG, recordBuiltinUsage, resolveChatConfig, resolveStoredChatConfig } from '@/features/ai/defaultModel';
import { getProviderName } from '@/features/ai/providers';
import { getActiveSystemPrompt } from '@/features/ai/systemPrompt';
import { speakWithCloudVoice, stopCloudVoice, transcribeWithCloudVoice } from '@/features/voice/voiceService';
import type { ApiConfig } from '@/features/ai/types';
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

const ALLOWED_IMAGE_MIME_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/bmp']);
const ALLOWED_IMAGE_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp']);

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
  onresult: ((event: { results: ArrayLike<{ 0: { transcript: string }; isFinal?: boolean }>; resultIndex?: number }) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: Event) => void) | null;
  start: () => void;
}

export function ChatDialog({
  dialogOpacity = 1,
  compactFontSize = 13,
  initialConversationId,
  initialMode,
  maxHeight,
  onContentHeightChange,
  onConversationChange,
  standalone = false,
}: {
  dialogOpacity?: number;
  compactFontSize?: number;
  initialConversationId?: number | null;
  initialMode: 'new' | 'history';
  maxHeight: number;
  onClose?: () => void;
  onContentHeightChange?: (height: number) => void;
  onConversationChange?: (conversationId: number | null) => void;
  standalone?: boolean;
}) {
  const [input, setInput] = useState('');
  const [selectedImage, setSelectedImage] = useState<SelectedImage | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [mode, setMode] = useState<'chat' | 'history'>(initialMode === 'history' ? 'history' : 'chat');
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const [composerError, setComposerError] = useState<string | null>(null);
  const [composerShakeKey, setComposerShakeKey] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const stickToBottomRef = useRef(true);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);

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

  function handleScroll() {
    const el = scrollRef.current;
    if (!el) return;
    stickToBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 28;
  }

  useEffect(() => {
    if (!stickToBottomRef.current) return;
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, streamingContent]);

  useEffect(() => {
    resizeInput();
  }, [input]);

  useEffect(() => {
    if (standalone || !onContentHeightChange) return;
    const frame = window.requestAnimationFrame(() => {
      const root = rootRef.current;
      if (!root) return;
      onContentHeightChange(Math.ceil(root.scrollHeight));
    });
    return () => window.cancelAnimationFrame(frame);
  }, [standalone, onContentHeightChange, mode, messages, input, selectedImage, isStreaming, streamingContent, composerError, compactFontSize, historyItems.length]);

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
          ...messageImageFields(m.image_path),
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
    if (isStreaming) return;
    if (!text && !selectedImage) {
      setComposerError('先写点内容，或添加一张图片。');
      setComposerShakeKey((value) => value + 1);
      return;
    }
    const messageText = text || '请分析这张图片。';

    const defaultConfig = settings.chatModelMode === 'custom' ? getDefaultConfig() : undefined;
    const resolved = await resolveChatConfig(defaultConfig);
    if (!resolved.config) {
      addMessage(createMessage('assistant', resolved.error ?? '请先在设置中配置 API Key。'));
      return;
    }
    const apiConfig = resolved.config;

    const imageForMessage = selectedImage;
    if (imageForMessage && !supportsImageOrFileInput(apiConfig)) {
      setComposerError(`${apiConfig.model} 暂不支持图片输入，请切换到支持视觉的模型。`);
      setComposerShakeKey((value) => value + 1);
      return;
    }

    const userMsg = createMessage('user', messageText, imageForMessage ? {
      imageUrl: imageForMessage.dataUrl,
      imageDataUrl: imageForMessage.dataUrl,
    } : {});
    addMessage(userMsg);
    addMessage(createMessage('assistant', '...'));
    setInput('');
    setSelectedImage(null);
    setComposerError(null);

    let convoId = currentConversationId;
    if (!convoId) {
      await createConversation(messageText.slice(0, 50), apiConfig.id);
      const convos = await getConversations();
      convoId = convos[0]?.id ?? null;
      setCurrentConversationId(convoId);
    }

    if (convoId) {
      await insertMessage(convoId, 'user', messageText, imageForMessage?.dataUrl || imageForMessage?.path || undefined);
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

      if (settings.autoSpeak && fullContent && fullContent !== '...') {
        speakAssistantText(fullContent, settings);
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
    if (image) {
      setSelectedImage(image);
      setComposerError(null);
    }
  }

  function handlePasteImage(image: SelectedImage) {
    setSelectedImage(image);
    setComposerError(null);
  }

  function handleVoiceInput() {
    const lang = settings.voiceInputLang === 'system' ? (navigator.language || 'zh-CN') : settings.voiceInputLang;
    startSpeechInput(
      (text) => setInput((value) => `${value}${value ? ' ' : ''}${text}`),
      setIsListening,
      lang,
      settings.voiceInputProvider,
      settings,
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
      ref={rootRef}
      className={`chat-dialog mx-auto flex w-full max-w-[720px] min-w-0 flex-col overflow-hidden rounded-[10px] font-sans text-[14px] text-[var(--color-chat-text)] ${standalone ? 'glass-panel' : 'border border-[var(--color-chat-border)] bg-[var(--surface-flat)] shadow-[0_8px_24px_rgba(42,38,31,0.10)] dark:bg-[var(--surface-flat)]'}`}
      style={{
        maxHeight: standalone ? undefined : maxHeight,
        height: standalone ? '100%' : undefined,
        opacity: standalone ? 1 : dialogOpacity,
        fontSize: standalone ? undefined : compactFontSize,
        background: standalone ? undefined : 'color-mix(in srgb, var(--surface-flat) 68%, transparent)',
        backdropFilter: standalone ? undefined : 'blur(10px)',
        WebkitBackdropFilter: standalone ? undefined : 'blur(10px)',
      }}
    >
      {mode === 'history' && (
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3" style={{ maxHeight: standalone ? undefined : Math.max(120, maxHeight - 42) }}>
          {historyItems.length === 0 ? (
            <div className="px-2 py-6 text-center text-[12px] text-[var(--color-chat-muted)]">暂无历史对话</div>
          ) : historyItems.map((item) => (
            <button
              key={item.id}
              className="block w-full rounded-[12px] px-3 py-2 text-left transition-all duration-200 hover:bg-background/52"
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
          className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain px-4"
          onScroll={handleScroll}
          style={{ maxHeight: standalone ? undefined : Math.max(80, maxHeight - 60) }}
        >
          <div className="min-w-0 space-y-2.5 overflow-x-hidden py-4">
            {messages.map((msg) => (
              <MessageBubble
                key={msg.id}
                message={msg}
                fullWidth
                compactFontSize={compactFontSize}
                compact
                speakRate={settings.speakRate}
                onSpeak={(text) => speakAssistantText(text, settings)}
              />
            ))}
          </div>
        </div>
      )}

      {mode === 'chat' && messages.length === 0 && (
        <div className="min-h-0" />
      )}

      {mode === 'chat' && (
        <Composer
          input={input}
          isStreaming={isStreaming}
          onImagePick={handlePickImage}
          onInputChange={setInput}
          onKeyDown={handleKeyDown}
          onPasteImage={handlePasteImage}
          onSubmit={handleSend}
          onVoiceInput={handleVoiceInput}
          selectedImage={selectedImage}
          textareaRef={textareaRef}
          compact
          compactFontSize={compactFontSize}
          isListening={isListening}
          error={composerError}
          shakeKey={composerShakeKey}
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
          ...messageImageFields(m.image_path),
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
    const defaultConfig = settings.chatModelMode === 'custom' ? getDefaultConfig() : undefined;
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
    if (imageForMessage && !supportsImageOrFileInput(resolved.config)) {
      const modelName = resolved.config.model;
      updatePanel(panelId, (current) => ({
        ...current,
        messages: [
          ...current.messages,
          createMessage('assistant', `当前模型 ${modelName} 暂不支持图片输入，请切换到支持视觉的模型。`),
        ],
      }));
      return;
    }

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

    if (convoId) await insertMessage(convoId, 'user', messageText, imageForMessage?.dataUrl || imageForMessage?.path || undefined);

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

      if (settings.autoSpeak && fullContent && fullContent !== '...') {
        speakAssistantText(fullContent, settings);
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
    <div className="relative grid h-full grid-cols-[260px_minmax(0,1fr)] bg-background pt-14 text-[var(--text-primary)]">
      <div className="app-drag-region fixed inset-x-0 top-0 z-50 h-14" />
      <aside className="glass-panel flex min-h-0 flex-col rounded-none border-y-0 border-l-0">
        <div className="app-no-drag shrink-0 p-3">
          <button className="flex h-10 w-full items-center gap-2 rounded-[12px] px-3 text-left text-[14px] font-medium leading-[1.5] transition-all duration-200 hover:bg-background/55" onClick={() => {
            const next = createPanel();
            setPanels([next]);
            setActivePanelId(next.id);
            setLayout('single');
          }}>
            <Plus className="h-4 w-4" />
            新建对话
          </button>
        </div>
        <div className="app-no-drag min-h-0 flex-1 overflow-y-auto px-2 pb-3">
          {historyItems.map((item) => (
            <button key={item.id} className="block w-full rounded-[13px] px-3 py-2.5 text-left transition-all duration-200 hover:bg-background/52" onClick={() => loadConversationIntoPanel(item.id)}>
              <div className="truncate text-[14px] leading-[1.5]">{item.title || `对话 ${item.id}`}</div>
              <div className="mt-0.5 flex items-center gap-1.5 truncate text-[12px] leading-[1.5] text-[var(--text-secondary)]">
                <span>{formatConversationTime(item.updatedAt)}</span>
                <span className="truncate">· {getModelLabel(item.modelId, configs)}</span>
              </div>
            </button>
          ))}
        </div>
      </aside>
      <main className="flex min-h-0 flex-col bg-background">
        <div className="app-no-drag flex h-11 shrink-0 items-center justify-end border-b border-border/55 px-4">
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
        <div className="app-no-drag min-h-0 flex-1 overflow-hidden p-3">
          <div className="grid h-full gap-3" style={layoutGridStyle(layout, visiblePanels.length)}>
            {visiblePanels.map((panel) => (
              <StandaloneChatPanel
                key={panel.id}
                panel={panel}
                active={panel.id === activePanelId}
                canClose={panels.length > 1}
                configs={configs}
                speakRate={settings.speakRate}
                onActivate={() => setActivePanelId(panel.id)}
                onClose={() => closePanel(panel.id)}
                onImagePick={async () => {
                  const image = await pickImage();
                  if (image) updatePanel(panel.id, { selectedImage: image });
                }}
                onInputChange={(value) => updatePanel(panel.id, { input: value })}
                onModelChange={(modelId) => updatePanel(panel.id, { modelId })}
                onPasteImage={(image) => updatePanel(panel.id, { selectedImage: image })}
                onSubmit={() => sendFromPanel(panel.id)}
                onVoiceInput={() => {
                  const lang = settings.voiceInputLang === 'system' ? (navigator.language || 'zh-CN') : settings.voiceInputLang;
                  startSpeechInput(
                    (text) => updatePanel(panel.id, (current) => ({ ...current, input: `${current.input}${current.input ? ' ' : ''}${text}` })),
                    (listening) => updatePanel(panel.id, { isListening: listening }),
                    lang,
                    settings.voiceInputProvider,
                    settings,
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
      const providerName = getProviderName(config.providerId || config.provider);
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

function messageImageFields(imagePath: string | null | undefined): Partial<Pick<ChatMessage, 'imageUrl' | 'imageDataUrl'>> {
  if (!imagePath) return {};
  if (imagePath.startsWith('data:image/')) return { imageDataUrl: imagePath };
  if (/[/\\]/.test(imagePath)) return { imageUrl: convertFileSrc(imagePath) };
  return {};
}

async function pickImage(): Promise<SelectedImage | null> {
  const file = await new Promise<File | null>((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/png,image/jpeg,image/webp,image/gif,image/bmp';
    input.onchange = () => resolve(input.files?.[0] ?? null);
    input.click();
  });
  if (!file) return null;
  if (!isAllowedImageFile(file)) {
    window.alert('只能上传图片，请选择 PNG、JPG、JPEG、WEBP、GIF 或 BMP 格式。');
    return null;
  }
  return fileToSelectedImage(file);
}

async function fileToSelectedImage(file: File, fallbackName = '图片'): Promise<SelectedImage> {
  if (!isAllowedImageFile(file)) {
    throw new Error('Unsupported image type');
  }
  return {
    path: '',
    name: file.name || `${fallbackName}.${imageExtensionFromType(file.type)}`,
    dataUrl: await fileToDataUrl(file),
  };
}

function isAllowedImageFile(file: File) {
  const typeAllowed = file.type ? ALLOWED_IMAGE_MIME_TYPES.has(file.type.toLowerCase()) : false;
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  return typeAllowed || ALLOWED_IMAGE_EXTENSIONS.has(ext);
}

function imageExtensionFromType(type: string) {
  const subtype = type.split('/')[1]?.toLowerCase();
  if (!subtype) return 'png';
  if (subtype === 'jpeg') return 'jpg';
  return subtype.replace(/[^a-z0-9]/g, '') || 'png';
}

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

async function clipboardImageToSelectedImage(event: React.ClipboardEvent): Promise<SelectedImage | null> {
  const files = Array.from(event.clipboardData.files ?? []);
  const directFile = files.find((file) => file.type.startsWith('image/'));
  if (directFile) return fileToSelectedImage(directFile, '剪贴板图片');

  const items = Array.from(event.clipboardData.items ?? []);
  const imageItem = items.find((item) => item.kind === 'file' && item.type.startsWith('image/'));
  const file = imageItem?.getAsFile();
  if (!file) return null;
  return fileToSelectedImage(file, `clipboard-${Date.now()}`);
}

function clipboardHasImage(event: React.ClipboardEvent) {
  return Array.from(event.clipboardData.files ?? []).some((file) => file.type.startsWith('image/')) ||
    Array.from(event.clipboardData.items ?? []).some((item) => item.kind === 'file' && item.type.startsWith('image/'));
}

function supportsImageOrFileInput(config: ApiConfig) {
  const provider = String(config.provider).toLowerCase();
  const model = config.model.toLowerCase();
  if (provider === 'anthropic') {
    return /claude-(3|4)|sonnet|haiku|opus/.test(model);
  }
  if (provider === 'google') {
    return model.includes('gemini');
  }
  if (provider === 'deepseek' || provider === 'kimi' || provider === 'minimax') {
    return /\b(vl|vision|image|visual|omni|multimodal)\b/.test(model);
  }
  if (provider === 'zhipu') {
    return /glm-4v|vision|vl|image|visual|omni/.test(model);
  }
  if (provider === 'qwen') {
    return /qwen.*(vl|omni|vision|image|visual)|vl/.test(model);
  }
  if (provider === 'hunyuan') {
    return /vision|vl|image|visual|omni/.test(model);
  }
  return /gpt-4o|gpt-4\.1|gpt-4-turbo|gpt-5|o3|o4|vision|vl|image|visual|omni|gemini|claude|qwen.*vl|glm-4v/.test(model);
}

async function startSpeechInput(
  onText: (text: string) => void,
  setListening: (listening: boolean) => void,
  lang?: string,
  providerMode: VoiceProviderMode = 'system',
  settings?: AppSettings,
) {
  if (providerMode !== 'system') {
    setListening(true);
    try {
      if (!settings) throw new Error('missing voice settings');
      const text = await transcribeWithCloudVoice(providerMode, lang || (navigator.language || 'zh-CN'), settings);
      setListening(false);
      if (text) {
        onText(text);
        return;
      }
    } catch (e) {
      console.warn('Cloud speech recognition failed, falling back to system speech:', e);
      setListening(false);
      if (providerMode === 'cloud-auto') {
        window.alert('内置语音输入额度已用完或云端识别暂不可用，已切换到系统语音输入。');
      } else if (providerMode === 'user-cloud') {
        window.alert('自定义 STT 未配置或暂不可用，已切换到系统语音输入。');
      }
    }
  }

  setListening(true);
  let canStart = true;
  try {
    canStart = await invoke<boolean>('can_start_speech_recognition');
  } catch (e) {
    console.warn('Failed to check speech recognition availability:', e);
  }
  if (!canStart) {
    setListening(false);
    window.alert('当前运行环境缺少系统语音识别权限说明，已阻止启动以避免 macOS 闪退。请使用打包后的 .app 版本。');
    return;
  }

  if (navigator.mediaDevices?.getUserMedia) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
    } catch {
      setListening(false);
      onText('请允许麦克风权限以使用语音输入。');
      return;
    }
  }

  const win = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  const Recognition = win.SpeechRecognition ?? win.webkitSpeechRecognition;
  if (!Recognition) {
    setListening(false);
    window.alert('当前系统 WebView 没有暴露系统语音识别接口，无法直接启动语音输入。');
    return;
  }

  const recognition = new Recognition();
  recognition.lang = lang || (navigator.language || 'zh-CN');
  recognition.interimResults = true;
  recognition.continuous = false;

  recognition.onresult = (event) => {
    const results = event.results;
    const startIndex = event.resultIndex ?? 0;
    for (let i = startIndex; i < results.length; i += 1) {
      const result = results[i];
      const transcript = result?.[0]?.transcript ?? '';
      if (result?.isFinal) {
        onText(transcript.trim());
      }
    }
  };

  recognition.onend = () => setListening(false);
  recognition.onerror = (e) => {
    console.error('Speech recognition error:', e);
    setListening(false);
  };

  try {
    recognition.start();
  } catch (e) {
    console.error('Failed to start speech recognition:', e);
    setListening(false);
    onText('无法启动系统语音输入。');
  }
}

async function speakAssistantText(text: string, settings: AppSettings) {
  if (!settings.voiceOutput) return;
  const cleanText = stripMarkdown(cleanChatText(text));
  if (!cleanText) return;

  if (settings.voiceOutputProvider !== 'system') {
    const spoken = await speakWithCloudVoice(cleanText, settings.voiceOutputProvider, settings);
    if (spoken) return;
  }

  speakText(cleanText, settings.speakRate);
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
  onPasteImage,
  speakRate,
  onSubmit,
  onVoiceInput,
}: {
  panel: StandalonePanel;
  active: boolean;
  canClose: boolean;
  configs: ReturnType<typeof useApiConfigStore.getState>['configs'];
  speakRate: number;
  onActivate: () => void;
  onClose: () => void;
  onImagePick: () => void;
  onInputChange: (value: string) => void;
  onModelChange: (value: string) => void;
  onPasteImage: (image: SelectedImage) => void;
  onSubmit: () => void;
  onVoiceInput: () => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const stickToBottomRef = useRef(true);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function handleScroll() {
    const el = scrollRef.current;
    if (!el) return;
    stickToBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 28;
  }

  useEffect(() => {
    if (!stickToBottomRef.current) return;
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
      className={`quiet-card flex min-h-0 flex-col overflow-hidden rounded-[12px] transition-all duration-200 ${active ? 'ring-2 ring-ring/16' : ''}`}
      onMouseDown={onActivate}
    >
      <div className="flex h-14 shrink-0 items-center gap-2 border-b border-border/45 px-3">
        <ModelControl
          configs={configs}
          locked={panel.modelLocked}
          modelId={panel.modelId}
          modelLabel={panel.modelLabel}
          onChange={onModelChange}
        />
        {canClose && (
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={onClose} title="关闭">
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-5" onScroll={handleScroll}>
        <div className="mx-auto w-full max-w-none space-y-3 py-5">
          {panel.messages.length === 0 ? (
            <div className="pt-16 text-center text-[14px] leading-[1.5] text-muted-foreground">开始一次新的对话</div>
          ) : panel.messages.map((msg) => (
            <MessageBubble
              key={msg.id}
              message={msg}
              speakRate={speakRate}
              onSpeak={(text, rate) => {
                const currentSettings = useSettingsStore.getState().settings;
                speakAssistantText(text, { ...currentSettings, speakRate: rate });
              }}
            />
          ))}
        </div>
      </div>
      <div className="shrink-0 px-2 pb-2">
        <div className="mx-auto w-full max-w-none">
          <Composer
            input={panel.input}
            isStreaming={panel.isStreaming}
            isListening={panel.isListening}
            onImagePick={onImagePick}
            onInputChange={onInputChange}
            onKeyDown={handleKeyDown}
            onPasteImage={onPasteImage}
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
  const chatModelMode = useSettingsStore((state) => state.settings.chatModelMode);
  const defaultConfig = configs.find((config) => config.isDefault);
  const options = configs.length === 0
    ? [{ id: 'default', title: `CloseAI · ${BUILTIN_CLOSEAI_CONFIG.model}`, description: '内置默认模型' }]
    : [
        {
          id: 'default',
          title: chatModelMode === 'custom' && defaultConfig
            ? `默认 · ${defaultConfig.provider} · ${defaultConfig.model}`
            : `默认 · CloseAI · ${BUILTIN_CLOSEAI_CONFIG.model}`,
          description: chatModelMode === 'custom' && defaultConfig ? defaultConfig.baseUrl : '内置默认模型',
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
        className="min-w-0 max-w-[180px] rounded-[10px] bg-background/52 px-2 py-1 text-[11px] leading-[1.4] text-muted-foreground"
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
        className="flex h-10 w-full min-w-0 items-center justify-between gap-2 rounded-[12px] border border-border/70 bg-background/55 px-3 text-left text-[12px] leading-[1.5] text-[var(--text-primary)] outline-none transition-all hover:bg-background/72 focus-visible:ring-2 focus-visible:ring-ring/20"
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
          className="glass-panel-strong absolute left-0 top-11 z-50 w-[min(320px,calc(100vw-32px))] overflow-hidden rounded-[10px] py-1.5"
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

export function Composer({
  input,
  isStreaming,
  isListening = false,
  onImagePick,
  onInputChange,
  onKeyDown,
  onPasteImage,
  onSubmit,
  onVoiceInput,
  selectedImage,
  textareaRef,
  compact = false,
  compactFontSize = 13,
  error = null,
  shakeKey = 0,
}: {
  input: string;
  isStreaming: boolean;
  isListening?: boolean;
  onImagePick?: () => void;
  onInputChange: (value: string) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  onPasteImage?: (image: SelectedImage) => void;
  onSubmit: () => void;
  onVoiceInput?: () => void;
  selectedImage?: SelectedImage | null;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  compact?: boolean;
  compactFontSize?: number;
  error?: string | null;
  shakeKey?: number;
}) {
  async function handlePaste(event: React.ClipboardEvent<HTMLTextAreaElement>) {
    if (!clipboardHasImage(event)) return;
    event.preventDefault();
    const image = await clipboardImageToSelectedImage(event);
    if (!image) return;
    onPasteImage?.(image);
  }

  return (
    <div className={compact ? "p-1.5 pt-1" : "p-2.5"}>
      {selectedImage && (
        <div className={`mb-1.5 flex items-center gap-1.5 rounded-[7px] border px-2 py-1 text-[12px] leading-[1.5] text-[var(--color-chat-muted)] ${error ? 'animate-input-shake border-destructive/45 bg-destructive/5' : 'border-[var(--color-chat-border)] bg-background'}`}>
          <img src={selectedImage.dataUrl} alt="" className="h-9 w-9 rounded-[9px] object-cover shadow-sm" />
          <span className="min-w-0 flex-1 truncate">{selectedImage.name}</span>
        </div>
      )}
      <form
        key={shakeKey}
        className={`${compact ? 'rounded-[7px]' : 'rounded-[9px]'} ${error ? 'animate-input-shake border-destructive/55' : 'border-[var(--color-chat-border)]'} flex w-full items-end gap-0.5 border bg-[var(--surface-flat)] p-0.5 shadow-[0_1px_0_rgba(255,255,255,0.55)_inset,0_6px_18px_rgba(42,38,31,0.06)] transition-[border-color,box-shadow,background] hover:border-[var(--color-chat-accent)] focus-within:border-[var(--color-chat-accent)] focus-within:shadow-[0_0_0_2px_color-mix(in_srgb,var(--color-chat-accent)_13%,transparent)] dark:bg-[var(--surface-flat)]`}
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
      >
        <Button variant="ghost" size="sm" type="button" className={`${compact ? 'h-6 w-6 rounded-[5px]' : 'ml-0.5 h-7 w-7 rounded-[6px]'} p-0 text-[var(--text-secondary)] transition-transform hover:scale-105 hover:bg-[color-mix(in_srgb,var(--text-primary)_8%,transparent)] hover:text-[var(--text-primary)]`} title="上传图片" aria-label="上传图片" onClick={onImagePick}>
          <ImagePlus className={`${compact ? 'h-[14px] w-[14px]' : 'h-3.5 w-3.5'}`} />
        </Button>
        <Button variant="ghost" size="sm" type="button" className={`${compact ? 'h-6 w-6 rounded-[5px]' : 'h-7 w-7 rounded-[6px]'} p-0 transition-transform hover:scale-105 hover:bg-[color-mix(in_srgb,var(--text-primary)_8%,transparent)] ${isListening ? 'animate-pulse text-[var(--text-primary)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`} title="语音输入" onClick={onVoiceInput}>
          <Mic className={`${compact ? 'h-[14px] w-[14px]' : 'h-3.5 w-3.5'}`} />
        </Button>
        <Textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={onKeyDown}
          onPaste={handlePaste}
          onMouseDown={() => {
            if (compact) invoke('focus_compact_chat_window').catch(() => {});
          }}
          placeholder="输入消息..."
          className={`${compact ? 'min-h-[28px] px-1.5 py-1.5 leading-[1.35] overflow-hidden' : 'min-h-[34px] px-2 py-1.5 text-[14px] leading-[1.45] overflow-y-auto'} max-h-[112px] flex-1 resize-none border-0 bg-transparent text-[var(--color-chat-text)] shadow-none placeholder:text-[var(--color-chat-muted)] focus-visible:ring-0`}
          style={{ fontSize: compact ? compactFontSize : undefined }}
          rows={1}
          disabled={isStreaming}
        />
        <Button size="sm" type="submit" disabled={isStreaming} className={`${compact ? 'h-6 rounded-[5px] px-2 text-[10px]' : 'h-7 rounded-[6px] px-2.5 text-[11px]'} shrink-0 ${(!input.trim() && !selectedImage) ? 'opacity-55' : ''}`}>
          发送
        </Button>
      </form>
      {error && (
        <p className="mt-2 px-1 text-[11px] leading-5 text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

export function MessageBubble({
  message,
  isStreaming = false,
  fullWidth = false,
  compact = false,
  bubble = false,
  compactFontSize = 13,
  speakRate = 1.0,
  onSpeak,
}: {
  message: ChatMessage;
  isStreaming?: boolean;
  fullWidth?: boolean;
  compact?: boolean;
  bubble?: boolean;
  compactFontSize?: number;
  speakRate?: number;
  onSpeak?: (text: string, rate: number) => void;
}) {
  const isUser = message.role === 'user';
  const isPending = message.role === 'assistant' && message.content === '...';
  const [isSpeaking, setIsSpeaking] = useState(false);
  const canSpeak = !isPending && Boolean(message.content) && !isUser;
  const canCopy = !isPending && Boolean(message.content);

  const handleSpeak = () => {
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      stopCloudVoice();
      setIsSpeaking(false);
    } else {
      window.speechSynthesis.cancel();
      stopCloudVoice();
      onSpeak?.(message.content, speakRate);
      setIsSpeaking(true);
      setTimeout(() => setIsSpeaking(false), message.content.length * 100);
    }
  };

  const actionButtonClass = "flex h-7 w-7 items-center justify-center rounded-[9px] border border-[var(--color-chat-border)] bg-background/72 text-[var(--color-chat-muted)] shadow-sm backdrop-blur hover:text-[var(--color-chat-text)]";

  return (
    <div className={`group flex w-full min-w-0 flex-col overflow-x-hidden animate-[chatFadeIn_150ms_ease-out] ${isUser ? 'items-end' : 'items-start'}`}>
      <div
        className={`relative min-w-0 overflow-hidden border leading-[1.55] text-[var(--color-chat-text)] transition-all duration-200 ${
          compact ? 'rounded-[7px] px-2.5 py-1.5' : 'rounded-[9px] px-3 py-2 text-[14px] leading-[1.55]'
        } ${
          fullWidth ? 'max-w-full' : 'max-w-[84%]'
        } ${
          isUser
            ? 'border-[var(--color-chat-bubble-border)] bg-[var(--surface-flat)] text-right shadow-[0_1px_0_rgba(255,255,255,0.55)_inset]'
            : (compact || bubble) ? 'border-[var(--color-chat-bubble-border)] bg-[var(--surface-flat)] text-left shadow-[0_1px_0_rgba(255,255,255,0.45)_inset]' : 'border-transparent bg-transparent text-left shadow-none'
        }`}
        style={{ fontSize: compact ? compactFontSize : undefined }}
      >
        {(message.imageDataUrl || message.imageUrl) && (
          <img src={message.imageDataUrl || message.imageUrl} alt="" className="mb-2 max-h-48 rounded-[8px] object-contain" />
        )}
        {isPending ? (
          <PulseDot className="text-[var(--color-chat-muted)]" />
        ) : isUser ? (
          <p className="whitespace-pre-wrap break-words">{cleanChatText(message.content)}</p>
        ) : (
          <div className="chat-markdown max-w-full overflow-hidden">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {cleanChatText(message.content)}
            </ReactMarkdown>
          </div>
        )}
        {isStreaming && (
          <span className="inline-block w-1.5 h-4 bg-current animate-pulse ml-0.5" />
        )}
        {!compact && canSpeak && (
          <button
            className={`absolute top-1 hidden group-hover:flex -right-8 ${actionButtonClass}`}
            title={isSpeaking ? '停止朗读' : '朗读'}
            onClick={handleSpeak}
          >
            {isSpeaking ? <X className="h-3.5 w-3.5" /> : <Speaker className="h-3.5 w-3.5" />}
          </button>
        )}
        {!compact && canCopy && (
          <button
            className={`absolute top-1 hidden group-hover:flex ${isUser ? '-left-8' : '-right-14'} ${actionButtonClass}`}
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
