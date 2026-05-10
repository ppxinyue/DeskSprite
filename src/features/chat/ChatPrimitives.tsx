import { useEffect, useMemo, useRef, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Check, Copy, ImagePlus, Loader2, Mic, Speaker, X } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { PulseDot } from '@/components/loading-ui/pulse-dot';
import { stopCloudVoice } from '@/features/voice/voiceService';
import type { ChatMessage } from './chatStore';

export interface SelectedImage {
  path: string;
  name: string;
  dataUrl: string;
}

const ALLOWED_IMAGE_MIME_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/bmp']);
const ALLOWED_IMAGE_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp']);

export function Composer({
  input,
  isStreaming,
  isListening = false,
  isVoiceLoading = false,
  voiceLevel = 0,
  onImagePick,
  onInputChange,
  onKeyDown,
  onPasteImage,
  onSubmit,
  onVoiceInput,
  onVoiceStop,
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
  isVoiceLoading?: boolean;
  voiceLevel?: number;
  onImagePick?: () => void;
  onInputChange: (value: string) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  onPasteImage?: (image: SelectedImage) => void;
  onSubmit: () => void;
  onVoiceInput?: () => void;
  onVoiceStop?: () => void;
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
    <div className={`${compact ? "p-1.5 pt-1" : "p-2.5"} min-w-0 max-w-full overflow-x-hidden`}>
      {selectedImage && (
        <div className={`mb-1.5 flex items-center gap-1.5 rounded-[7px] border px-2 py-1 text-[12px] leading-[1.5] text-[var(--color-chat-muted)] ${error ? 'animate-input-shake border-destructive/45 bg-destructive/5' : 'border-[var(--color-chat-border)] bg-background'}`}>
          <img src={selectedImage.dataUrl} alt="" className="h-9 w-9 rounded-[9px] object-cover shadow-sm" />
          <span className="min-w-0 flex-1 truncate">{selectedImage.name}</span>
        </div>
      )}
      <form
        key={shakeKey}
        className={`${compact ? 'rounded-[7px]' : 'rounded-[9px]'} ${error ? 'animate-input-shake border-destructive/55' : 'border-[var(--color-chat-border)]'} flex w-full min-w-0 max-w-full items-end gap-0.5 overflow-hidden border bg-[var(--surface-flat)] p-0.5 shadow-[0_1px_0_rgba(255,255,255,0.55)_inset,0_6px_18px_rgba(42,38,31,0.06)] transition-[border-color,box-shadow,background] hover:border-[var(--color-chat-accent)] focus-within:border-[var(--color-chat-accent)] focus-within:shadow-[0_0_0_2px_color-mix(in_srgb,var(--color-chat-accent)_13%,transparent)] dark:bg-[var(--surface-flat)]`}
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
      >
        <Button variant="ghost" size="sm" type="button" className={`${compact ? 'h-6 w-6 rounded-[5px]' : 'ml-0.5 h-7 w-7 rounded-[6px]'} p-0 text-[var(--text-secondary)] transition-transform hover:scale-105 hover:bg-[color-mix(in_srgb,var(--text-primary)_8%,transparent)] hover:text-[var(--text-primary)]`} title="上传图片" aria-label="上传图片" onClick={onImagePick}>
          <ImagePlus className={`${compact ? 'h-[14px] w-[14px]' : 'h-3.5 w-3.5'}`} />
        </Button>
        <Button variant="ghost" size="sm" type="button" className={`${compact ? 'h-6 w-6 rounded-[5px]' : 'h-7 w-7 rounded-[6px]'} relative overflow-hidden p-0 transition-transform hover:scale-105 hover:bg-[color-mix(in_srgb,var(--text-primary)_8%,transparent)] ${(isListening || isVoiceLoading) ? 'text-[var(--color-chat-accent)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`} title="语音输入" onClick={onVoiceInput} disabled={isStreaming || isVoiceLoading}>
          {isVoiceLoading ? (
            <Loader2 className={`${compact ? 'h-[14px] w-[14px]' : 'h-3.5 w-3.5'} animate-spin`} />
          ) : (
            <Mic className={`${compact ? 'h-[14px] w-[14px]' : 'h-3.5 w-3.5'} relative z-10`} />
          )}
        </Button>
        {isListening ? (
          <>
            <AudioWaveform level={voiceLevel} compact={compact} />
            <Button
              variant="ghost"
              size="sm"
              type="button"
              className={`${compact ? 'h-6 w-6 rounded-[5px]' : 'h-7 w-7 rounded-[6px]'} shrink-0 p-0 text-[var(--color-chat-accent)] hover:bg-[color-mix(in_srgb,var(--color-chat-accent)_10%,transparent)]`}
              title="结束录音"
              aria-label="结束录音"
              onClick={onVoiceStop}
            >
              <Check className={`${compact ? 'h-[14px] w-[14px]' : 'h-3.5 w-3.5'}`} />
            </Button>
          </>
        ) : (
          <>
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => onInputChange(e.target.value)}
              onKeyDown={onKeyDown}
              onPaste={handlePaste}
              onMouseDown={() => {
                if (compact) invoke('focus_compact_chat_window').catch(() => {});
              }}
              placeholder={isVoiceLoading ? '正在识别...' : '输入消息...'}
              className={`${compact ? 'min-h-[28px] px-1.5 py-1.5 leading-[1.35] overflow-hidden' : 'min-h-[34px] px-2 py-1.5 text-[14px] leading-[1.45] overflow-y-auto'} max-h-[112px] min-w-0 flex-1 resize-none border-0 bg-transparent text-[var(--color-chat-text)] shadow-none placeholder:text-[var(--color-chat-muted)] focus-visible:ring-0`}
              style={{ fontSize: compact ? compactFontSize : undefined }}
              rows={1}
              disabled={isStreaming || isVoiceLoading}
            />
            <Button size="sm" type="submit" disabled={isStreaming || isVoiceLoading} className={`${compact ? 'h-6 rounded-[5px] px-2 text-[10px]' : 'h-7 rounded-[6px] px-2.5 text-[11px]'} shrink-0 ${(!input.trim() && !selectedImage) ? 'opacity-55' : ''}`}>
              发送
            </Button>
          </>
        )}
      </form>
      {error && (
        <p className="mt-2 px-1 text-[11px] leading-5 text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

function AudioWaveform({ level, compact }: { level: number; compact: boolean }) {
  const clamped = Math.max(0, Math.min(1, level));
  const voiceAmount = clamped < 0.01 ? 0 : Math.min(1, (clamped - 0.01) * 3.2);
  const barCount = compact ? 42 : 54;
  const centerIndex = Math.floor(barCount * 0.52);
  const [samples, setSamples] = useState<number[]>(() => Array.from({ length: centerIndex + 1 }, () => 0));
  const latestVoiceAmountRef = useRef(0);
  const shapedSamples = useMemo(
    () => Array.from({ length: barCount }, (_, index) => {
      if (index > centerIndex) return 0;
      return samples[centerIndex - index] ?? 0;
    }),
    [barCount, centerIndex, samples],
  );
  const silentHeight = compact ? 6 : 7;
  const voiceRange = compact ? 15 : 18;

  useEffect(() => {
    latestVoiceAmountRef.current = voiceAmount;
  }, [voiceAmount]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setSamples((current) => {
        const nextSample = latestVoiceAmountRef.current;
        const next = [nextSample, ...current];
        return next.slice(0, centerIndex + 1);
      });
    }, 120);
    return () => window.clearInterval(timer);
  }, [centerIndex]);

  return (
    <div className={`${compact ? 'h-7' : 'h-8'} relative min-w-0 flex-1 overflow-hidden rounded-[6px] bg-transparent`}>
      <div className="pointer-events-none absolute inset-y-0 left-0 flex w-full items-center justify-between px-2" aria-hidden="true">
        {shapedSamples.map((sample, index) => (
          <span
            key={index}
            className="block w-[2px] rounded-full bg-[var(--color-chat-text)] opacity-80 transition-[height,opacity] duration-150 ease-out"
            style={{
              height: `${silentHeight + sample * voiceRange}px`,
              opacity: 0.38 + sample * 0.46,
            }}
          />
        ))}
      </div>
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
    <div className={`group flex w-full min-w-0 max-w-full flex-col overflow-x-hidden animate-[chatFadeIn_150ms_ease-out] ${isUser ? 'items-end' : 'items-start'}`}>
      <div
        className={`relative min-w-0 max-w-full overflow-hidden border leading-[1.55] text-[var(--color-chat-text)] transition-all duration-200 [overflow-wrap:anywhere] ${
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
          <p data-i18n-ignore="true" className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]">{cleanChatText(message.content)}</p>
        ) : (
          <div data-i18n-ignore="true" className="chat-markdown max-w-full overflow-hidden [overflow-wrap:anywhere]">
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

function cleanChatText(text: string) {
  return text
    .replace(/[\u{1F300}-\u{1FAFF}]/gu, '')
    .replace(/^[（(][^）)]{1,24}[）)]\s*/gm, '')
    .trim();
}
