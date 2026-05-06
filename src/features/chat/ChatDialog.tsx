import { useEffect, useRef, useState } from 'react';
import { convertFileSrc } from '@tauri-apps/api/core';
import { Columns3, Grid2X2, ImagePlus, Mic, PanelRight, Plus, Rows3, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useChatStore, createMessage } from './chatStore';
import { useApiConfigStore } from '@/features/settings/apiConfigStore';
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

interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((event: { results: ArrayLike<{ 0: { transcript: string } }> }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start: () => void;
}

export function ChatDialog({
  initialConversationId,
  initialMode,
  maxHeight,
  standalone = false,
}: {
  initialConversationId?: number | null;
  initialMode: 'new' | 'history';
  maxHeight: number;
  onClose?: () => void;
  standalone?: boolean;
}) {
  const [input, setInput] = useState('');
  const [selectedImage, setSelectedImage] = useState<SelectedImage | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [mode, setMode] = useState<'chat' | 'history'>(initialMode === 'history' ? 'history' : 'chat');
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

  const { getDefaultConfig, loadConfigs } = useApiConfigStore();

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
    setHistoryItems(convos.map((c) => ({ id: c.id, title: c.title, updatedAt: c.updated_at })));
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
      await createConversation(messageText.slice(0, 50), apiConfig.id > 0 ? apiConfig.id : undefined);
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
    startSpeechInput(
      (text) => setInput((value) => `${value}${value ? ' ' : ''}${text}`),
      setIsListening,
    );
  }

  useEffect(() => {
    if (standalone) return;
    const imageHandler = () => { handlePickImage(); };
    const voiceHandler = () => { handleVoiceInput(); };
    window.addEventListener('desksprite:chat-image', imageHandler);
    window.addEventListener('desksprite:chat-voice', voiceHandler);
    return () => {
      window.removeEventListener('desksprite:chat-image', imageHandler);
      window.removeEventListener('desksprite:chat-voice', voiceHandler);
    };
  }, [standalone]);

  function resizeInput() {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = '32px';
    el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
  }

  if (standalone) {
    return <StandaloneChatWorkspace />;
  }

  return (
    <div
      className={`flex w-full flex-col overflow-hidden border border-border/50 bg-[var(--color-pet-dialog-bg)] shadow-lg backdrop-blur-sm ${standalone ? 'h-full rounded-none border-0 bg-background shadow-none' : 'rounded-xl'}`}
      style={{ maxHeight: standalone ? undefined : maxHeight, height: standalone ? '100%' : undefined }}
    >
      {mode === 'history' && (
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 py-2" style={{ maxHeight: standalone ? undefined : Math.max(120, maxHeight - 42) }}>
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
          style={{ maxHeight: standalone ? undefined : Math.max(80, maxHeight - 58) }}
        >
          <div className="py-2 space-y-2">
            {messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} />
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
    messages: [],
    input: '',
    conversationId: null,
    isStreaming: false,
    selectedImage: null,
    isListening: false,
  };
}

function StandaloneChatWorkspace() {
  const [historyItems, setHistoryItems] = useState<Array<{ id: number; title: string | null; updatedAt: string }>>([]);
  const [panels, setPanels] = useState<StandalonePanel[]>(() => [createPanel()]);
  const [activePanelId, setActivePanelId] = useState<number>(() => panelCounter);
  const [layout, setLayout] = useState<LayoutMode>('single');
  const { configs, getDefaultConfig, loadConfigs } = useApiConfigStore();

  useEffect(() => {
    loadConfigs();
    refreshHistory().catch(() => {});
  }, []);

  async function refreshHistory() {
    const convos = await getConversations();
    setHistoryItems(convos.map((c) => ({ id: c.id, title: c.title, updatedAt: c.updated_at })));
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
    const panelId = activePanelId;
    try {
      const msgs = await getMessages(conversationId);
      updatePanel(panelId, {
        conversationId,
        title: `对话 ${conversationId}`,
        messages: msgs.map((m) => ({
          id: `msg-${m.id}`,
          role: m.role as 'user' | 'assistant' | 'system',
          content: m.content,
          timestamp: new Date(m.timestamp).getTime(),
          imageUrl: m.image_path && /[/\\]/.test(m.image_path) ? convertFileSrc(m.image_path) : undefined,
        })),
      });
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
      await createConversation(messageText.slice(0, 50), resolved.config.id > 0 ? resolved.config.id : undefined);
      const convos = await getConversations();
      convoId = convos[0]?.id ?? null;
      updatePanel(panelId, { conversationId: convoId, title: messageText.slice(0, 24) || '新对话' });
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
    <div className="grid h-full grid-cols-[260px_minmax(0,1fr)] bg-background text-foreground">
      <aside className="flex min-h-0 flex-col border-r border-border bg-muted/35">
        <div className="flex items-center justify-between border-b border-border px-3 py-3">
          <span className="text-sm font-semibold">历史对话</span>
          <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => {
            const next = createPanel();
            setPanels([next]);
            setActivePanelId(next.id);
            setLayout('single');
          }}>新建</Button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
          {historyItems.map((item) => (
            <button key={item.id} className="block w-full rounded-md px-2 py-2 text-left text-sm hover:bg-accent" onClick={() => loadConversationIntoPanel(item.id)}>
              <div className="truncate">{item.title || `对话 ${item.id}`}</div>
              <div className="mt-0.5 text-[11px] text-muted-foreground">{item.updatedAt}</div>
            </button>
          ))}
        </div>
      </aside>
      <main className="flex min-h-0 flex-col">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h1 className="text-sm font-semibold">DeskSprite Chat</h1>
          <div className="flex items-center gap-1">
            <LayoutButton title="单窗口" active={layout === 'single'} onClick={() => setLayout('single')}><PanelRight className="h-4 w-4" /></LayoutButton>
            <LayoutButton title="横向并排" active={layout === 'columns'} onClick={() => setLayout('columns')}><Columns3 className="h-4 w-4" /></LayoutButton>
            <LayoutButton title="纵向并排" active={layout === 'rows'} onClick={() => setLayout('rows')}><Rows3 className="h-4 w-4" /></LayoutButton>
            <LayoutButton title="四宫格" active={layout === 'grid'} onClick={() => setLayout('grid')}><Grid2X2 className="h-4 w-4" /></LayoutButton>
            <Button variant="outline" size="sm" className="ml-2 h-8 gap-1 px-2" onClick={addPanel} disabled={panels.length >= 4}>
              <Plus className="h-4 w-4" />
              添加
            </Button>
          </div>
        </div>
        <div className="min-h-0 flex-1 p-3">
          <div className="grid h-full gap-3" style={layoutGridStyle(layout, visiblePanels.length)}>
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
                onVoiceInput={() => startSpeechInput(
                  (text) => updatePanel(panel.id, (current) => ({ ...current, input: `${current.input}${current.input ? ' ' : ''}${text}` })),
                  (listening) => updatePanel(panel.id, { isListening: listening }),
                )}
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

function startSpeechInput(onText: (text: string) => void, setListening: (listening: boolean) => void) {
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
  recognition.lang = navigator.language || 'zh-CN';
  recognition.interimResults = false;
  recognition.continuous = false;
  recognition.onresult = (event) => {
    const transcript = event.results[0]?.[0]?.transcript?.trim();
    if (transcript) onText(transcript);
  };
  recognition.onend = () => setListening(false);
  recognition.onerror = () => setListening(false);
  setListening(true);
  recognition.start();
}

function LayoutButton({ title, active, onClick, children }: { title: string; active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <Button
      variant={active ? 'secondary' : 'ghost'}
      size="sm"
      className="h-8 w-8 p-0"
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
      className={`flex min-h-0 flex-col overflow-hidden rounded-lg border bg-background shadow-sm ${active ? 'border-primary/50' : 'border-border'}`}
      onMouseDown={onActivate}
    >
      <div className="flex items-center gap-2 border-b border-border px-3 py-2">
        <select
          className="min-w-0 flex-1 rounded-md border border-border bg-background px-2 py-1.5 text-xs"
          value={panel.modelId}
          onChange={(e) => onModelChange(e.target.value)}
        >
          <option value="default">默认模型</option>
          <option value="builtin">CloseAI · {BUILTIN_CLOSEAI_CONFIG.model}</option>
          {configs.map((c) => (
            <option key={c.id} value={String(c.id)}>{c.provider} · {c.model}</option>
          ))}
        </select>
        {canClose && (
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={onClose} title="关闭">
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-4">
        <div className="mx-auto max-w-3xl py-5 space-y-3">
          {panel.messages.length === 0 ? (
            <div className="pt-12 text-center text-sm text-muted-foreground">开始一次新的对话</div>
          ) : panel.messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} />
          ))}
        </div>
      </div>
      <div className="border-t border-border p-3">
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
    </section>
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
}) {
  return (
    <div className={compact ? "border-t border-border/30 p-2" : ""}>
      {selectedImage && (
        <div className="mb-2 flex items-center gap-2 rounded-md border border-border/50 px-2 py-1.5 text-xs text-muted-foreground">
          <img src={selectedImage.dataUrl} alt="" className="h-8 w-8 rounded object-cover" />
          <span className="min-w-0 flex-1 truncate">{selectedImage.name}</span>
        </div>
      )}
      <form
        className={`flex items-end gap-1.5 rounded-xl border border-border bg-background p-2 shadow-sm ${compact ? 'rounded-lg border-0 bg-transparent p-0 shadow-none' : ''}`}
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
      >
        {!compact && (
          <>
            <Button variant="ghost" size="sm" type="button" className="h-7 w-7 p-0" title="图片输入" onClick={onImagePick}>
              <ImagePlus className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" type="button" className={`h-7 w-7 p-0 ${isListening ? 'text-primary' : ''}`} title="语音输入" onClick={onVoiceInput}>
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
          className="min-h-[32px] max-h-[160px] resize-none overflow-y-auto border-0 bg-transparent text-[13px] leading-5 shadow-none focus-visible:ring-0"
          rows={1}
          disabled={isStreaming}
        />
        <Button size="sm" type="submit" disabled={(!input.trim() && !selectedImage) || isStreaming} className="h-7 shrink-0 px-2 text-xs">
          发送
        </Button>
      </form>
    </div>
  );
}

function MessageBubble({ message, isStreaming = false }: { message: ChatMessage; isStreaming?: boolean }) {
  const isUser = message.role === 'user';
  const isPending = message.role === 'assistant' && message.content === '...';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[82%] rounded-md px-2.5 py-1.5 text-[13px] leading-5 ${
          isUser
            ? 'bg-[var(--color-pet-bubble-user)] text-foreground'
            : 'bg-[var(--color-pet-bubble-ai)] text-[var(--color-pet-bubble-ai-text)]'
        }`}
      >
        {(message.imageDataUrl || message.imageUrl) && (
          <img src={message.imageDataUrl || message.imageUrl} alt="" className="mb-1.5 max-h-48 rounded object-contain" />
        )}
        {isPending ? (
          <TypingDots />
        ) : isUser ? (
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

function TypingDots() {
  return (
    <span className="inline-flex h-5 items-center gap-1">
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current [animation-delay:-0.2s]" />
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current [animation-delay:-0.1s]" />
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current" />
    </span>
  );
}
