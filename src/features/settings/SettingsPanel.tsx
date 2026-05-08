import { useEffect, useRef, useState } from 'react';
import { Bot, Check, ChevronDown, Clock3, ExternalLink, Keyboard, Loader2, Palette, PawPrint, Pencil, Plus, Shield, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { SettingsLayout } from '@/components/layouts/SettingsLayout';
import { useSettingsStore, type ModelMode, type PetMotionName, type PetMotionSettings, type VoiceProviderMode } from '@/features/settings/settingsStore';
import { useApiConfigStore, type ApiConfig } from '@/features/settings/apiConfigStore';
import { usePetStore } from '@/features/pet/petStore';
import { BUILTIN_CLOSEAI_CONFIG, getBuiltinUsageStats } from '@/features/ai/defaultModel';
import { DEFAULT_SYSTEM_PROMPT, normalizeSystemPrompt } from '@/features/ai/systemPrompt';
import { PROVIDER_PRESETS, getProviderName } from '@/features/ai/providers';
import { BUILTIN_STT_MODEL, BUILTIN_TTS_MODEL, getBuiltinVoiceUsageStats } from '@/features/voice/voiceService';
import { describeApiKey, resolveStoredApiKey } from '@/lib/apiKeyStorage';
import { getConversations, getMessages, getSystemPrompt, setSetting, updateSystemPrompt } from '@/lib/db';
import type { PetState } from '@/features/pet/animations';
import { ALL_PET_STATES, DEFAULT_MEDIA_CONFIG, STATE_META, getBuiltinAssetUrl, isBuiltinAsset, normalizePetMediaConfig, type PetStateMediaConfig } from '@/features/pet/animations';
import { convertFileSrc, invoke } from '@tauri-apps/api/core';
import { emit } from '@tauri-apps/api/event';
import { open } from '@tauri-apps/plugin-dialog';
import type { ReactNode } from 'react';

type SettingsSection = 'appearance' | 'ai' | 'history' | 'shortcuts' | 'privacy';
const ALLOWED_STATIC_IMAGE_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'webp', 'bmp']);
const ALLOWED_GIF_EXTENSIONS = new Set(['gif']);
const MASKED_API_KEY = '••••••••';

const SECTIONS: { id: SettingsSection; label: string; icon: typeof Palette }[] = [
  { id: 'appearance', label: '外观', icon: Palette },
  { id: 'ai', label: 'AI 对话', icon: Bot },
  { id: 'history', label: '历史对话', icon: Clock3 },
  { id: 'shortcuts', label: '快捷键', icon: Keyboard },
  { id: 'privacy', label: '隐私与数据', icon: Shield },
];

export function SettingsPanel() {
  const [activeSection, setActiveSection] = useState<SettingsSection>('appearance');
  const { settings, loaded, loadSettings, updateSetting, updateSettings } = useSettingsStore();
  const { configs, loadConfigs, removeConfig, setDefault } = useApiConfigStore();
  const [systemPrompt, setSystemPrompt] = useState(DEFAULT_SYSTEM_PROMPT);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<any>(null);
  const [testingConfigId, setTestingConfigId] = useState<number | null>(null);
  const [testResults, setTestResults] = useState<Record<number, { success: boolean; message: string; latency?: number }>>({});

  useEffect(() => {
    loadSettings();
    loadConfigs();
    getSystemPrompt().then((prompt) => setSystemPrompt(normalizeSystemPrompt(prompt)));
  }, []);

  if (!loaded) return <div className="p-6">加载中...</div>;

  const sidebar = (
    <>
      {SECTIONS.map((s) => {
        const Icon = s.icon;
        return (
        <button
          key={s.id}
          className={`group flex h-9 w-full items-center gap-2 rounded-[9px] px-2.5 text-left text-[13px] font-medium transition-all duration-200 ${
            activeSection === s.id
              ? 'bg-background/72 text-foreground shadow-[0_1px_0_rgba(255,255,255,0.72)_inset,0_8px_22px_rgba(42,38,31,0.06)]'
              : 'text-muted-foreground hover:bg-background/42 hover:text-foreground'
          }`}
          onClick={() => setActiveSection(s.id)}
        >
          <Icon className={`h-[17px] w-[17px] transition-transform duration-200 ${activeSection === s.id ? 'text-foreground' : 'text-muted-foreground group-hover:text-foreground group-hover:scale-105'}`} />
          <span>{s.label}</span>
        </button>
      );
      })}
    </>
  );

  return (
    <SettingsLayout sidebar={sidebar}>
      {activeSection === 'appearance' && (
        <AppearanceSection settings={settings} updateSettings={updateSettings} />
      )}
      {activeSection === 'ai' && (
        <AISection
          settings={settings}
          updateSetting={updateSetting}
          systemPrompt={systemPrompt}
          setSystemPrompt={setSystemPrompt}
          configs={configs}
          onAdd={() => {
            setEditingConfig(null);
            setIsModalOpen(true);
          }}
          onEdit={(config) => {
            setEditingConfig(config);
            setIsModalOpen(true);
          }}
          onDelete={removeConfig}
          onSetDefault={setDefault}
          onTest={async (config) => {
            setTestingConfigId(config.id);
            try {
              const result = await testApiConfig(config);
              setTestResults(prev => ({ ...prev, [config.id]: result }));
            } catch (e) {
              setTestResults(prev => ({ ...prev, [config.id]: { success: false, message: String(e) } }));
            } finally {
              setTestingConfigId(null);
            }
          }}
          testResults={testResults}
          testingConfigId={testingConfigId}
          isModalOpen={isModalOpen}
          setIsModalOpen={setIsModalOpen}
          editingConfig={editingConfig}
        />
      )}
      {activeSection === 'shortcuts' && (
        <ShortcutsSection settings={settings} updateSetting={updateSetting} />
      )}
      {activeSection === 'history' && <HistorySection />}
      {activeSection === 'privacy' && <PrivacySection />}
    </SettingsLayout>
  );
}

function SectionTitle({ children }: { children: ReactNode }) {
  return <h2 className="mb-2 text-[18px] font-semibold tracking-[-0.018em] text-foreground">{children}</h2>;
}

function SettingRow({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="flex min-h-[44px] items-center justify-between gap-3 border-b border-border/45 px-0 py-2 last:border-0">
      <div className="min-w-0">
        <span className="text-[13px] font-medium leading-5 text-foreground">{label}</span>
        {hint && <p className="mt-1 max-w-[420px] text-[11px] leading-5 text-muted-foreground">{hint}</p>}
      </div>
      <div className="flex shrink-0 items-center gap-2">{children}</div>
    </div>
  );
}

function AppearanceRow({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="flex min-h-[44px] items-center justify-between gap-3 border-b border-border/45 px-0 py-2 last:border-0">
      <div className="min-w-0">
        <span className="text-[13px] font-medium leading-5 text-foreground">{label}</span>
        {hint && <p className="mt-1 text-[11px] leading-5 text-muted-foreground">{hint}</p>}
      </div>
      <div className="min-w-0 shrink-0">{children}</div>
    </div>
  );
}

function SettingsGroup({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`quiet-card mb-6 overflow-hidden rounded-[9px] ${className}`}>
      {children}
    </div>
  );
}

function AppearanceSection({
  settings,
  updateSettings,
}: {
  settings: import('./settingsStore').AppSettings;
  updateSettings: import('./settingsStore').SettingsState['updateSettings'];
}) {
  const [draft, setDraft] = useState({
    petOpacity: settings.petOpacity,
    petScale: settings.petScale,
    dialogWidth: settings.dialogWidth,
    compactChatFontSize: settings.compactChatFontSize,
    theme: settings.theme,
    petMotions: settings.petMotions,
    alwaysOnTop: settings.alwaysOnTop,
  });

  const update = <K extends keyof typeof draft>(k: K, v: typeof draft[K]) => {
    setDraft((d) => ({ ...d, [k]: v }));
    updateSettings({ [k]: v }).catch(() => {});
  };

  // Sync draft with settings when they change externally
  useEffect(() => {
    setDraft({
      petOpacity: settings.petOpacity,
      petScale: settings.petScale,
      dialogWidth: settings.dialogWidth,
      compactChatFontSize: settings.compactChatFontSize,
      theme: settings.theme,
      petMotions: settings.petMotions,
      alwaysOnTop: settings.alwaysOnTop,
    });
  }, [settings.petOpacity, settings.petScale, settings.dialogWidth, settings.compactChatFontSize, settings.theme, settings.petMotions, settings.alwaysOnTop]);

  return (
    <>
      <div className="mb-5">
        <h1 className="text-[18px] font-semibold leading-tight tracking-[-0.018em] text-foreground">外观设置</h1>
      </div>

      <SettingsGroup>
        <AppearanceRow label="主题">
          <ThemeSelect
            value={draft.theme}
            onChange={(theme) => update('theme', theme)}
          />
        </AppearanceRow>
        <AppearanceRow label="灵宠透明度">
          <div className="flex max-w-[320px] items-center gap-3">
            <span className="w-12 text-right text-[11px] text-muted-foreground">{draft.petOpacity.toFixed(1)}</span>
            <Slider
              value={[draft.petOpacity]}
              onValueChange={([v]) => update('petOpacity', v)}
              min={0.6} max={1} step={0.05} className="w-52"
            />
          </div>
        </AppearanceRow>
        <AppearanceRow label="灵宠大小">
          <div className="flex max-w-[320px] items-center gap-3">
            <span className="w-12 text-right text-[11px] text-muted-foreground">{draft.petScale.toFixed(1)}</span>
            <Slider
              value={[draft.petScale]}
              onValueChange={([v]) => update('petScale', v)}
              min={0.5} max={2} step={0.1} className="w-52"
            />
          </div>
        </AppearanceRow>
        <AppearanceRow label="对话框宽度">
          <div className="flex max-w-[320px] items-center gap-3">
            <span className="w-12 text-right text-[11px] text-muted-foreground">{draft.dialogWidth}px</span>
            <Slider
              value={[draft.dialogWidth]}
              onValueChange={([v]) => update('dialogWidth', v)}
              min={200} max={600} step={10} className="w-52"
            />
          </div>
        </AppearanceRow>
        <AppearanceRow label="对话字号">
          <div className="flex max-w-[320px] items-center gap-3">
            <span className="w-12 text-right text-[11px] text-muted-foreground">{draft.compactChatFontSize}px</span>
            <Slider
              value={[draft.compactChatFontSize]}
              onValueChange={([v]) => update('compactChatFontSize', v)}
              min={11} max={15} step={1} className="w-52"
            />
          </div>
        </AppearanceRow>
        <AppearanceRow label="始终置顶显示" hint="穿越全屏应用">
          <Switch
            checked={draft.alwaysOnTop}
            onCheckedChange={(v) => update('alwaysOnTop', v)}
          />
        </AppearanceRow>
      </SettingsGroup>

      <SectionTitle>灵宠动作</SectionTitle>
      <SettingsGroup>
        <div className="px-4 py-4">
          <PetMotionControls
            value={draft.petMotions}
            onChange={(petMotions) => update('petMotions', petMotions)}
          />
        </div>
      </SettingsGroup>

      <SectionTitle>形象自定义</SectionTitle>
      <ImageSection />

    </>
  );
}

const PET_MOTION_OPTIONS: Array<{
  id: PetMotionName;
  title: string;
  desc: string;
  amplitudeLabel: string;
  amplitudeMin: number;
  amplitudeMax: number;
  amplitudeStep: number;
  amplitudeUnit: string;
  speedMin: number;
  speedMax: number;
  speedStep: number;
}> = [
  {
    id: 'petJump',
    title: '跳动',
    desc: '上下轻跳',
    amplitudeLabel: '幅度',
    amplitudeMin: 2,
    amplitudeMax: 24,
    amplitudeStep: 1,
    amplitudeUnit: 'px',
    speedMin: 0.5,
    speedMax: 3,
    speedStep: 0.1,
  },
  {
    id: 'petWobble',
    title: '摇摆',
    desc: '左右轻晃',
    amplitudeLabel: '角度',
    amplitudeMin: 1,
    amplitudeMax: 12,
    amplitudeStep: 1,
    amplitudeUnit: 'deg',
    speedMin: 0.5,
    speedMax: 3,
    speedStep: 0.1,
  },
  {
    id: 'petBreathe',
    title: '呼吸',
    desc: '轻微缩放',
    amplitudeLabel: '幅度',
    amplitudeMin: 1,
    amplitudeMax: 8,
    amplitudeStep: 0.5,
    amplitudeUnit: '%',
    speedMin: 0.5,
    speedMax: 3,
    speedStep: 0.1,
  },
];

function PetMotionControls({
  value,
  onChange,
}: {
  value: PetMotionSettings;
  onChange: (value: PetMotionSettings) => void;
}) {
  const updateMotion = (id: PetMotionName, partial: Partial<PetMotionSettings[PetMotionName]>) => {
    onChange({
      ...value,
      [id]: {
        ...value[id],
        ...partial,
      },
    });
  };

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {PET_MOTION_OPTIONS.map((option) => {
        const motion = value[option.id];
        return (
          <div key={option.id} className="rounded-[10px] border border-border/60 bg-transparent px-3.5 py-3 transition-all duration-200 hover:border-border">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[13px] font-medium leading-[1.35] text-foreground">{option.title}</div>
                <div className="text-[11px] leading-[1.35] text-muted-foreground">{option.desc}</div>
              </div>
              <Switch
                checked={motion.enabled}
                onCheckedChange={(enabled) => updateMotion(option.id, { enabled })}
                aria-label={`${option.title}动作`}
              />
            </div>
            <div className={`mt-3 space-y-2.5 ${motion.enabled ? '' : 'opacity-45'}`}>
              <div className="grid grid-cols-[44px_1fr_48px] items-center gap-2">
                <span className="text-[11px] text-muted-foreground">{option.amplitudeLabel}</span>
                <Slider
                  value={[motion.amplitude]}
                  onValueChange={([amplitude]) => updateMotion(option.id, { amplitude })}
                  min={option.amplitudeMin}
                  max={option.amplitudeMax}
                  step={option.amplitudeStep}
                  disabled={!motion.enabled}
                />
                <span className="text-right text-[11px] text-muted-foreground">
                  {formatMotionValue(motion.amplitude, option.amplitudeUnit)}
                </span>
              </div>
              <div className="grid grid-cols-[44px_1fr_48px] items-center gap-2">
                <span className="text-[11px] text-muted-foreground">速度</span>
                <Slider
                  value={[motion.speed]}
                  onValueChange={([speed]) => updateMotion(option.id, { speed })}
                  min={option.speedMin}
                  max={option.speedMax}
                  step={option.speedStep}
                  disabled={!motion.enabled}
                />
                <span className="text-right text-[11px] text-muted-foreground">{motion.speed.toFixed(1)}x</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function formatMotionValue(value: number, unit: string): string {
  return `${Number.isInteger(value) ? value.toFixed(0) : value.toFixed(1)}${unit}`;
}

const THEME_OPTIONS: { id: import('./settingsStore').Theme; title: string; description: string }[] = [
  { id: 'system', title: '跟随系统', description: '跟随 macOS 外观设置' },
  { id: 'light', title: '浅色', description: '始终使用浅色主题' },
  { id: 'dark', title: '深色', description: '始终使用深色主题' },
];

function ThemeSelect({
  value,
  onChange,
}: {
  value: import('./settingsStore').Theme;
  onChange: (theme: import('./settingsStore').Theme) => void;
}) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const current = THEME_OPTIONS.find((option) => option.id === value) ?? THEME_OPTIONS[0];

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

  return (
    <div ref={menuRef} className="relative w-[220px]">
      <button
        type="button"
        className="flex h-10 w-full items-center justify-between gap-2 rounded-[12px] border border-border/70 bg-transparent px-3 text-left text-[13px] text-foreground outline-none transition-all hover:border-border focus-visible:ring-2 focus-visible:ring-ring/20"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="truncate">{current.title}</span>
        <ChevronDown className={`h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div
          className="glass-panel-strong absolute left-0 top-11 z-50 w-[260px] overflow-hidden rounded-[10px] py-1.5"
          role="listbox"
        >
          <div className="px-3 pb-1.5 pt-1 text-[11px] leading-[1.5] text-muted-foreground">选择主题</div>
          {THEME_OPTIONS.map((option) => {
            const selected = option.id === value;
            return (
              <button
                key={option.id}
                type="button"
                role="option"
                aria-selected={selected}
                className={`flex min-h-11 w-full items-center gap-3 px-3.5 py-2 text-left transition-colors hover:bg-muted/70 ${
                  selected ? 'bg-muted/72' : ''
                }`}
                onClick={() => {
                  onChange(option.id);
                  setOpen(false);
                }}
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] leading-[1.35] text-foreground">{option.title}</span>
                  <span className="block truncate text-[11px] leading-[1.35] text-muted-foreground">{option.description}</span>
                </span>
                {selected && <Check className="h-4 w-4 shrink-0 text-foreground" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

interface ImageTileProps {
  path: string;
  source: 'default' | 'user';
  src: string;
  enabled: boolean;
  hasError: boolean;
  isLoading: boolean;
  isDeleting: boolean;
  onToggleUse: () => void;
  onDelete: () => void;
  onImageError: () => void;
}

function ImageTile({
  path,
  source,
  src,
  enabled,
  hasError,
  isLoading,
  isDeleting,
  onToggleUse,
  onDelete,
  onImageError,
}: ImageTileProps) {
  return (
    <div
      data-path={path}
      className={`group relative aspect-square overflow-hidden rounded-[10px] border transition-all duration-200 hover:-translate-y-0.5 ${
        enabled ? 'border-border/70 bg-transparent' : 'border-border/40 bg-transparent opacity-70'
      }`}
    >
      {isLoading ? (
        <PawLoading />
      ) : !hasError && src ? (
        <img
          src={src}
          alt=""
          className="h-full w-full object-contain p-2"
          draggable={false}
          onError={onImageError}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center px-3 text-center text-[11px] leading-snug text-muted-foreground">
          {hasError ? '图片无法预览' : '加载中'}
        </div>
      )}
      <span className="absolute left-1.5 top-1.5 rounded bg-background/85 px-1.5 py-0.5 text-[11px] text-muted-foreground shadow-sm">
        {source === 'default' ? '默认' : '上传'}
      </span>
      <div className="absolute inset-x-1.5 bottom-1.5 z-20 flex gap-1 opacity-0 transition-all duration-200 group-hover:translate-y-0 group-hover:opacity-100">
        <button
          onClick={onToggleUse}
          className="min-w-0 flex-1 rounded-[10px] bg-background/90 px-2 py-1 text-[11px] font-medium text-foreground shadow-sm backdrop-blur hover:bg-background"
        >
          {enabled ? '不使用' : '使用'}
        </button>
        <button
          onClick={onDelete}
          disabled={source === 'default' || isDeleting}
          className="flex h-7 w-7 items-center justify-center rounded-[10px] bg-background/90 text-destructive shadow-sm backdrop-blur hover:bg-background disabled:cursor-not-allowed disabled:text-muted-foreground disabled:opacity-55"
          title={source === 'default' ? '系统默认图片不可删除' : '删除'}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
      {!enabled && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-background/50 text-[11px] text-muted-foreground backdrop-blur-[2px]">
          未使用
        </div>
      )}
    </div>
  );
}

function PawLoading() {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-muted-foreground">
      <PawPrint className="h-5 w-5 opacity-70" />
      <div className="flex gap-1">
        <span className="paw-dot h-1.5 w-1.5 rounded-full bg-current" />
        <span className="paw-dot h-1.5 w-1.5 rounded-full bg-current [animation-delay:120ms]" />
        <span className="paw-dot h-1.5 w-1.5 rounded-full bg-current [animation-delay:240ms]" />
      </div>
    </div>
  );
}

function ImageSection() {
  const {
    userFrames,
    userGifs,
    loadUserFrames,
    addUserFrame,
    addUserGif,
    removeUserFrame,
    removeUserGif,
    setStateMediaConfig,
    resetMediaConfig,
  } = usePetStore();
  const [selectedState, setSelectedState] = useState<PetState>('idle');
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [previewUrls, setPreviewUrls] = useState<Record<string, string>>({});
  const [previewErrors, setPreviewErrors] = useState<Record<string, string>>({});
  const [previewLoading, setPreviewLoading] = useState<Set<string>>(() => new Set());
  const mediaConfig = usePetStore((s) => s.mediaConfig);

  useEffect(() => {
    loadUserFrames();
  }, [loadUserFrames]);

  const persistMediaConfig = async (state: PetState, nextConfig: PetStateMediaConfig) => {
    const normalized = normalizePetMediaConfig(state, nextConfig);
    setStateMediaConfig(state, normalized);
    await setSetting(`petMedia_${state}`, JSON.stringify(normalized));
    await emit('pet-media:changed', { state });
  };

  const handleAddImages = async () => {
    const scheme = config.mediaMode;
    const result = await open({
      multiple: true,
      filters: [
        scheme === 'gif'
          ? { name: 'GIF 动图', extensions: ['gif'] }
          : { name: '常见图片格式', extensions: ['png', 'jpg', 'jpeg', 'webp', 'bmp'] }
      ],
    });
    if (!result || result.length === 0) return;
    const files = Array.isArray(result) ? result : [result];
    const acceptedFiles = files.filter((path) => scheme === 'gif' ? isAllowedPetGifPath(path) : isAllowedStaticPetImagePath(path));
    const rejectedCount = files.length - acceptedFiles.length;
    if (rejectedCount > 0) {
      alert(scheme === 'gif' ? 'GIF 方案只能上传 .gif 动图。' : '图片方案只能上传 PNG、JPG、JPEG、WEBP 或 BMP。');
    }
    if (acceptedFiles.length === 0) return;
    const { invoke } = await import('@tauri-apps/api/core');
    for (const file of acceptedFiles) {
      try {
        const importedPath = await invoke<string>('import_pet_image', {
          srcPath: file,
          state: selectedState,
        });
        setPreviewLoading((current) => new Set(current).add(importedPath));
        if (scheme === 'gif') addUserGif(selectedState, importedPath);
        else addUserFrame(selectedState, importedPath);
        loadPetPreviewDataUrl(importedPath)
          .then((dataUrl) => {
            setPreviewUrls((current) => ({ ...current, [importedPath]: dataUrl }));
            setPreviewErrors((current) => {
              const next = { ...current };
              delete next[importedPath];
              return next;
            });
          })
          .catch((e) => {
            const message = e instanceof Error ? e.message : String(e);
            setPreviewErrors((current) => ({ ...current, [importedPath]: message }));
          })
          .finally(() => {
            setPreviewLoading((current) => {
              const next = new Set(current);
              next.delete(importedPath);
              return next;
            });
          });
        const nextConfig = {
          ...mediaConfig[selectedState],
          mediaMode: scheme,
          ...(scheme === 'gif'
            ? { disabledGifs: (mediaConfig[selectedState].disabledGifs ?? []).filter((p) => p !== importedPath) }
            : { disabledFrames: (mediaConfig[selectedState].disabledFrames ?? []).filter((p) => p !== importedPath) }),
        };
        await persistMediaConfig(selectedState, nextConfig);
        await loadUserFrames();
      } catch (e) {
        console.error('Failed to import image:', e);
        alert(e instanceof Error ? e.message : String(e));
      }
    }
  };

  const handleDeleteImage = async (path: string) => {
    setIsDeleting(path);
    const scheme = config.mediaMode;
    const confirmed = confirm(scheme === 'gif' ? '确定要删除这个 GIF 吗？' : '确定要删除这张图片吗？');
    if (confirmed) {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        await invoke('delete_pet_image', { filePath: path });
        if (scheme === 'gif') removeUserGif(selectedState, path);
        else removeUserFrame(selectedState, path);
        const nextConfig = {
          ...mediaConfig[selectedState],
          ...(scheme === 'gif'
            ? { disabledGifs: (mediaConfig[selectedState].disabledGifs ?? []).filter((p) => p !== path) }
            : { disabledFrames: (mediaConfig[selectedState].disabledFrames ?? []).filter((p) => p !== path) }),
        };
        await persistMediaConfig(selectedState, nextConfig);
        await emit('pet-media:changed', { state: selectedState });
      } catch (e) {
        console.error('Failed to delete image:', e);
      }
    }
    setIsDeleting(null);
  };

  const handleResetAll = async () => {
    const confirmed = confirm('确定要恢复全部默认吗？这将删除所有自定义图片。');
    if (confirmed) {
      const { invoke } = await import('@tauri-apps/api/core');
      for (const state of ALL_PET_STATES) {
        for (const path of [...userFrames[state], ...userGifs[state]]) {
          try {
            await invoke('delete_pet_image', { filePath: path });
          } catch (e) {
            console.error('Failed to delete image:', e);
          }
        }
      }
      resetMediaConfig();
      for (const state of ALL_PET_STATES) {
        await setSetting(`petMedia_${state}`, JSON.stringify(DEFAULT_MEDIA_CONFIG[state]));
      }
      await loadUserFrames();
      await emit('pet-media:changed', {});
    }
  };

  const config = mediaConfig[selectedState];
  const scheme = config.mediaMode;
  const isGifScheme = scheme === 'gif';
  const currentStateFrames = isGifScheme ? userGifs[selectedState] || [] : userFrames[selectedState] || [];
  const defaultFrames = isGifScheme ? config.defaultGifAssets : config.defaultAssets;
  const allFrames = [...defaultFrames, ...currentStateFrames];
  const disabledFrames = new Set(isGifScheme ? config.disabledGifs ?? [] : config.disabledFrames ?? []);
  const enabledCount = allFrames.filter((path) => !disabledFrames.has(path)).length;
  const previewKey = allFrames.join('|');
  const toPreviewSrc = (path: string) => {
    if (previewUrls[path]) return previewUrls[path];
    if (isBuiltinAsset(path)) return getBuiltinAssetUrl(path);
    return '';
  };

  useEffect(() => {
    let cancelled = false;
    allFrames.forEach((path) => {
      loadPetPreviewDataUrl(path)
        .then((dataUrl) => {
          if (cancelled) return;
          setPreviewUrls((current) => current[path] === dataUrl ? current : { ...current, [path]: dataUrl });
          setPreviewErrors((current) => {
            if (!current[path]) return current;
            const next = { ...current };
            delete next[path];
            return next;
          });
        })
        .catch((e) => {
          if (cancelled) return;
          const message = e instanceof Error ? e.message : String(e);
          setPreviewErrors((current) => ({ ...current, [path]: message }));
          console.warn('Failed to load pet image preview:', path, e);
        });
    });
    return () => {
      cancelled = true;
    };
  }, [previewKey]);

  const handleToggleUse = async (path: string) => {
    const disabled = new Set(isGifScheme ? config.disabledGifs ?? [] : config.disabledFrames ?? []);
    const isEnabled = !disabled.has(path);
    if (isEnabled && enabledCount <= 1) {
      alert(isGifScheme ? '至少需要保留一个正在使用的灵宠 GIF。' : '至少需要保留一张正在使用的灵宠图片。');
      return;
    }
    if (isEnabled) disabled.add(path);
    else disabled.delete(path);
    await persistMediaConfig(selectedState, {
      ...config,
      ...(isGifScheme ? { disabledGifs: Array.from(disabled) } : { disabledFrames: Array.from(disabled) }),
    });
  };

  const handleSchemeChange = async (nextMode: 'gif' | 'image') => {
    if (nextMode === config.mediaMode) return;
    await persistMediaConfig(selectedState, {
      ...config,
      mediaMode: nextMode,
    });
  };

  return (
    <div className="quiet-card space-y-4 rounded-[11px] p-4">
      {/* State Tabs */}
      <div className="flex gap-1 rounded-[9px] bg-muted/42 p-1">
        {ALL_PET_STATES.map((state) => {
          const meta = STATE_META[state];
          const isActive = selectedState === state;
          const stateConfig = mediaConfig[state];
          const stateIsGif = stateConfig.mediaMode === 'gif';
          const count = stateIsGif ? userGifs[state]?.length ?? 0 : userFrames[state]?.length ?? 0;
          const defaultCount = stateIsGif ? stateConfig.defaultGifAssets.length : stateConfig.defaultAssets.length;
          return (
            <button
              key={state}
              className={`relative rounded-[11px] px-4 py-2 text-[13px] font-medium transition-all duration-200 ${
                isActive
                  ? 'bg-background/78 text-foreground shadow-[0_1px_0_rgba(255,255,255,0.70)_inset,0_6px_16px_rgba(42,38,31,0.06)]'
                  : 'text-muted-foreground hover:bg-background/42 hover:text-foreground'
              }`}
              onClick={() => setSelectedState(state)}
            >
              {meta.label}
              <span className="ml-1.5 text-[11px] text-muted-foreground">({defaultCount + count})</span>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-2 gap-2 rounded-[10px] border border-border/55 bg-transparent p-1">
        {([
          { id: 'gif' as const, label: 'GIF 动图', detail: `${config.defaultGifAssets.length + userGifs[selectedState].length} 个` },
          { id: 'image' as const, label: '图片', detail: `${config.defaultAssets.length + userFrames[selectedState].length} 张` },
        ]).map((option) => {
          const active = scheme === option.id;
          return (
            <button
              key={option.id}
              type="button"
              className={`rounded-[9px] px-3 py-2 text-left transition-all duration-200 ${
                active
                  ? 'bg-background/78 text-foreground shadow-[0_1px_0_rgba(255,255,255,0.70)_inset,0_6px_16px_rgba(42,38,31,0.06)]'
                  : 'text-muted-foreground hover:bg-background/42 hover:text-foreground'
              }`}
              onClick={() => handleSchemeChange(option.id)}
            >
              <span className="block text-[13px] font-medium">{option.label}</span>
              <span className="block text-[11px] text-muted-foreground">{option.detail}</span>
            </button>
          );
        })}
      </div>

      {/* Image Grid */}
      <div className="grid grid-cols-4 gap-3">
        {defaultFrames.map((path) => (
          <ImageTile
            key={`default-${path}`}
            path={path}
            source="default"
            src={toPreviewSrc(path)}
            enabled={!disabledFrames.has(path)}
            hasError={Boolean(previewErrors[path])}
            isLoading={previewLoading.has(path)}
            isDeleting={isDeleting === path}
            onToggleUse={() => handleToggleUse(path)}
            onDelete={() => {}}
            onImageError={() => setPreviewErrors((current) => ({ ...current, [path]: '图片无法预览' }))}
          />
        ))}
        {currentStateFrames.map((path) => (
          <ImageTile
            key={`user-${path}`}
            path={path}
            source="user"
            src={toPreviewSrc(path)}
            enabled={!disabledFrames.has(path)}
            hasError={Boolean(previewErrors[path])}
            isLoading={previewLoading.has(path)}
            isDeleting={isDeleting === path}
            onToggleUse={() => handleToggleUse(path)}
            onDelete={() => handleDeleteImage(path)}
            onImageError={() => setPreviewErrors((current) => ({ ...current, [path]: '图片无法预览' }))}
          />
        ))}
        <button
          onClick={handleAddImages}
          className="flex aspect-square items-center justify-center rounded-[10px] border border-dashed border-border/70 bg-background/36 text-muted-foreground transition-all duration-200 hover:-translate-y-0.5 hover:border-border hover:bg-background/62 hover:text-foreground"
        >
          <Plus className="h-6 w-6" />
        </button>
      </div>

      {/* Current config info */}
      <p className="px-1 text-[11px] text-muted-foreground">
        {config.userAnimatedPath
          ? `当前使用：${config.userAnimatedPath}`
          : `当前使用 ${enabledCount} / ${allFrames.length} ${isGifScheme ? '个 GIF' : '张图片'}`}
      </p>

      {/* Reset All */}
      <div className="border-t border-border/45 pt-3">
        <Button variant="outline" size="sm" onClick={handleResetAll}>
          恢复全部默认
        </Button>
      </div>
    </div>
  );
}

function getFileExtension(path: string) {
  const cleanPath = path.split(/[?#]/)[0] ?? path;
  return cleanPath.split('.').pop()?.toLowerCase() ?? '';
}

function isAllowedStaticPetImagePath(path: string) {
  return ALLOWED_STATIC_IMAGE_EXTENSIONS.has(getFileExtension(path));
}

function isAllowedPetGifPath(path: string) {
  return ALLOWED_GIF_EXTENSIONS.has(getFileExtension(path));
}

async function loadPetPreviewDataUrl(path: string) {
  if (isBuiltinAsset(path)) {
    return getBuiltinAssetUrl(path);
  }
  return invoke<string>('read_pet_image_data_url', { filePath: path });
}

async function testApiConfig(config: ApiConfig): Promise<{ success: boolean; message: string; latency?: number }> {
  if (!config.apiKey) {
    return { success: false, message: '缺少 API Key，请重新保存配置。' };
  }
  const apiKey = await resolveStoredApiKey(config.apiKey);
  if (!apiKey.trim()) {
    return { success: false, message: 'API Key 为空。' };
  }

  try {
    return await invoke<{ success: boolean; message: string; latency?: number }>('test_ai_connection', {
      request: {
        provider: (config.providerId || config.provider).toLowerCase(),
        baseUrl: config.baseUrl,
        model: config.model,
        apiKey,
      },
    });
  } catch (e) {
    return { success: false, message: e instanceof Error ? e.message : String(e) };
  }
}

function AISection({
  settings, updateSetting, systemPrompt, setSystemPrompt,
  configs, onAdd, onEdit, onDelete, onSetDefault, onTest, testResults, testingConfigId,
  isModalOpen, setIsModalOpen, editingConfig,
}: {
  settings: import('./settingsStore').AppSettings;
  updateSetting: import('./settingsStore').SettingsState['updateSetting'];
  systemPrompt: string;
  setSystemPrompt: (v: string) => void;
  configs: ApiConfig[];
  onAdd: () => void;
  onEdit: (config: ApiConfig) => void;
  onDelete: (id: number, keyringRef: string | null) => Promise<void>;
  onSetDefault: (id: number) => Promise<void>;
  onTest: (config: ApiConfig) => Promise<void>;
  testResults: Record<number, { success: boolean; message: string; latency?: number }>;
  testingConfigId: number | null;
  isModalOpen: boolean;
  setIsModalOpen: (v: boolean) => void;
  editingConfig: ApiConfig | null;
}) {
  const [builtinUsage, setBuiltinUsage] = useState<{
    chat: Awaited<ReturnType<typeof getBuiltinUsageStats>>;
    voice: Awaited<ReturnType<typeof getBuiltinVoiceUsageStats>>;
  } | null>(null);

  useEffect(() => {
    let alive = true;
    async function loadUsage() {
      const [chat, voice] = await Promise.all([getBuiltinUsageStats(), getBuiltinVoiceUsageStats()]);
      if (alive) setBuiltinUsage({ chat, voice });
    }
    loadUsage().catch(() => {
      if (alive) setBuiltinUsage(null);
    });
    return () => { alive = false; };
  }, []);

  return (
    <>
      <SectionTitle>宠物身份</SectionTitle>
      <SettingRow label="宠物名字">
        <Input value={settings.petName} onChange={(e) => updateSetting('petName', e.target.value)} className="w-48" />
      </SettingRow>

      <Separator className="my-6" />
      <SectionTitle>内置额度</SectionTitle>
      <div className="border border-border rounded-lg p-3 mb-6 bg-muted/40">
        <div className="flex items-center justify-between mb-2">
          <div>
            <span className="font-medium text-[13px]">CloseAI 默认服务</span>
            <span className="text-[11px] text-muted-foreground ml-2">Key: 内置隐藏</span>
          </div>
          <span className="text-[11px] bg-secondary text-secondary-foreground px-2 py-1 rounded">本机额度</span>
        </div>
        <div className="grid gap-1 text-[11px] text-muted-foreground">
          <div>Chat: {BUILTIN_CLOSEAI_CONFIG.model}</div>
          <div>STT: {BUILTIN_STT_MODEL}</div>
          <div>TTS: {BUILTIN_TTS_MODEL}</div>
          <div>{BUILTIN_CLOSEAI_CONFIG.baseUrl}</div>
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          <UsageMeter
            label="Chat"
            value={builtinUsage?.chat.percent ?? 0}
            detail={`${formatCompactNumber(builtinUsage?.chat.used ?? 0)} / ${formatCompactNumber(builtinUsage?.chat.limit ?? 100000)} token`}
          />
          <UsageMeter
            label="STT"
            value={builtinUsage?.voice.stt.percent ?? 0}
            detail={`${formatDurationSeconds(builtinUsage?.voice.stt.used ?? 0)} / ${formatDurationSeconds(builtinUsage?.voice.stt.limit ?? 3600)}`}
          />
          <UsageMeter
            label="TTS"
            value={builtinUsage?.voice.tts.percent ?? 0}
            detail={`${formatCompactNumber(builtinUsage?.voice.tts.used ?? 0)} / ${formatCompactNumber(builtinUsage?.voice.tts.limit ?? 100000)} 字符`}
          />
        </div>
      </div>

      <SectionTitle>Chat 模型</SectionTitle>
      <SettingRow label="Chat 使用">
        <select
          className="bg-input border border-border rounded px-2 py-1 text-[13px]"
          value={settings.chatModelMode}
          onChange={(e) => updateSetting('chatModelMode', e.target.value as ModelMode)}
        >
          <option value="default">默认</option>
          <option value="custom">自定义</option>
        </select>
      </SettingRow>
      {settings.chatModelMode === 'custom' && (
        <div className="mb-4 rounded-md border border-border bg-muted/30 px-3 py-2 text-[11px] text-muted-foreground">
          Chat 自定义会使用下方 API 配置中标记为“默认”的模型；也可以在大聊天窗口中为单个面板临时选择其他模型。
        </div>
      )}

      <div className="flex items-center justify-between mb-4">
        <SectionTitle>Chat 自定义配置</SectionTitle>
        <Button size="sm" onClick={onAdd}>
          <Plus className="h-4 w-4 mr-1" />
          添加配置
        </Button>
      </div>

      <div className="space-y-3 mb-6">
        {configs.map((c) => {
          const testResult = testResults[c.id];
          const isTesting = testingConfigId === c.id;

          return (
            <div key={c.id} className="border border-border rounded-lg p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-[13px]">{getProviderName(c.providerId || c.provider)}</span>
                    {c.isDefault && (
                      <span className="text-[11px] bg-primary text-primary-foreground px-2 py-0.5 rounded shrink-0">默认</span>
                    )}
                  </div>
                  <div className="text-[11px] text-muted-foreground mb-1">
                    {c.providerId || c.provider} · {c.model}
                  </div>
                  <div className="text-[11px] text-muted-foreground truncate">{c.baseUrl}</div>
                  <div className="text-[11px] text-muted-foreground mt-1">{describeApiKey(c.apiKey)}</div>
                  {testResult && (
                    <div className={`text-[11px] mt-1 ${testResult.success ? 'text-green-600' : 'text-red-600'}`}>
                      {testResult.message}
                      {testResult.latency !== undefined && ` (${testResult.latency}ms)`}
                    </div>
                  )}
                </div>
                <div className="flex gap-1 shrink-0">
                  {!c.isDefault && (
                    <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => onSetDefault(c.id)}>
                      设为默认
                    </Button>
                  )}
                  <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => onTest(c)} disabled={isTesting}>
                    {isTesting ? <Loader2 className="h-3 w-3 animate-spin" /> : '测试'}
                  </Button>
                  <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => onEdit(c)}>
                    <Pencil className="h-3 w-3" />
                  </Button>
                  <Button variant="ghost" size="sm" className="h-7 px-2 text-destructive" onClick={() => onDelete(c.id, c.keyringRef)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
        {configs.length === 0 && (
          <div className="text-[13px] text-muted-foreground border border-border rounded-lg p-4">
            暂无 API 配置，点击"添加配置"按钮添加
          </div>
        )}
      </div>

      <Separator className="my-6" />
      <SectionTitle>System Prompt</SectionTitle>
      <Textarea value={systemPrompt} onChange={(e) => setSystemPrompt(e.target.value)} rows={6} className="font-mono text-[13px]" />
      <div className="flex gap-2 mt-3">
        <Button onClick={() => updateSystemPrompt(systemPrompt)}>保存</Button>
        <Button variant="outline" onClick={() => setSystemPrompt(DEFAULT_SYSTEM_PROMPT)}>重置为默认</Button>
      </div>

      <Separator className="my-6" />
      <SectionTitle>模型参数</SectionTitle>
      <SettingRow label="温度">
        <span className="text-[11px] text-muted-foreground w-8">{settings.temperature.toFixed(1)}</span>
        <Slider value={[settings.temperature]} onValueChange={([v]) => updateSetting('temperature', v)} min={0} max={2} step={0.1} className="w-32" />
      </SettingRow>
      <SettingRow label="最大 Token">
        <Input type="number" value={settings.maxTokens} onChange={(e) => updateSetting('maxTokens', Number(e.target.value))} className="w-24" />
      </SettingRow>
      <SettingRow label="流式输出">
        <Switch checked={settings.streamOutput} onCheckedChange={(v) => updateSetting('streamOutput', v)} />
      </SettingRow>

      <Separator className="my-6" />
      <SectionTitle>STT 模型</SectionTitle>
      <SettingRow label="STT 使用" hint="默认和自定义都会在失败时回退到系统输入">
        <select
          className="bg-input border border-border rounded px-2 py-1 text-[13px]"
          value={settings.voiceInputProvider}
          onChange={(e) => updateSetting('voiceInputProvider', e.target.value as VoiceProviderMode)}
        >
          <option value="cloud-auto">默认</option>
          <option value="user-cloud">自定义</option>
          <option value="system">系统输入</option>
        </select>
      </SettingRow>
      {settings.voiceInputProvider === 'user-cloud' && (
        <div className="mb-4 grid gap-3 rounded-md border border-border bg-muted/30 p-3">
          <SettingRow label="STT Base URL">
            <Input
              value={settings.customSttBaseUrl}
              onChange={(e) => updateSetting('customSttBaseUrl', e.target.value.trim())}
              className="w-full max-w-md"
              placeholder="https://api.example.com/v1"
            />
          </SettingRow>
          <SettingRow label="STT 模型">
            <Input
              value={settings.customSttModel}
              onChange={(e) => updateSetting('customSttModel', e.target.value.trim())}
              className="w-full max-w-md"
              placeholder="gpt-4o-mini-transcribe"
            />
          </SettingRow>
          <SettingRow label="STT API Key">
            <Input
              type="password"
              value={settings.customSttApiKey}
              onChange={(e) => updateSetting('customSttApiKey', e.target.value)}
              className="w-full max-w-md"
              placeholder="sk-..."
            />
          </SettingRow>
        </div>
      )}
      <SettingRow label="语音输入语言">
        <select className="bg-input border border-border rounded px-2 py-1 text-[13px]"
          value={settings.voiceInputLang} onChange={(e) => updateSetting('voiceInputLang', e.target.value)}>
          <option value="system">跟随系统</option>
          <option value="zh-CN">简体中文</option>
          <option value="en-US">英文</option>
        </select>
      </SettingRow>

      <Separator className="my-6" />
      <SectionTitle>TTS 模型</SectionTitle>
      <SettingRow label="语音输出">
        <Switch checked={settings.voiceOutput} onCheckedChange={(v) => updateSetting('voiceOutput', v)} />
      </SettingRow>
      <SettingRow label="TTS 使用" hint="默认和自定义都会在失败时回退到系统朗读">
        <select
          className="bg-input border border-border rounded px-2 py-1 text-[13px]"
          value={settings.voiceOutputProvider}
          onChange={(e) => updateSetting('voiceOutputProvider', e.target.value as VoiceProviderMode)}
        >
          <option value="cloud-auto">默认</option>
          <option value="user-cloud">自定义</option>
          <option value="system">系统朗读</option>
        </select>
      </SettingRow>
      {settings.voiceOutputProvider === 'user-cloud' && (
        <div className="mb-4 grid gap-3 rounded-md border border-border bg-muted/30 p-3">
          <SettingRow label="TTS Base URL">
            <Input
              value={settings.customTtsBaseUrl}
              onChange={(e) => updateSetting('customTtsBaseUrl', e.target.value.trim())}
              className="w-full max-w-md"
              placeholder="https://api.example.com/v1"
            />
          </SettingRow>
          <SettingRow label="TTS 模型">
            <Input
              value={settings.customTtsModel}
              onChange={(e) => updateSetting('customTtsModel', e.target.value.trim())}
              className="w-full max-w-md"
              placeholder="tts-1"
            />
          </SettingRow>
          <SettingRow label="TTS API Key">
            <Input
              type="password"
              value={settings.customTtsApiKey}
              onChange={(e) => updateSetting('customTtsApiKey', e.target.value)}
              className="w-full max-w-md"
              placeholder="sk-..."
            />
          </SettingRow>
        </div>
      )}

      <Separator className="my-6" />
      <SectionTitle>语音设置</SectionTitle>
      <SettingRow label="语音唤醒" hint="开启后，说出唤醒词即可唤醒灵宠对话">
        <Switch checked={settings.wakeWordEnabled} onCheckedChange={(v) => updateSetting('wakeWordEnabled', v)} />
      </SettingRow>
      {settings.wakeWordEnabled && (
        <SettingRow label="唤醒词">
          <Input
            value={settings.wakeWord}
            onChange={(e) => updateSetting('wakeWord', e.target.value.slice(0, 20))}
            className="w-48"
            maxLength={20}
          />
        </SettingRow>
      )}
      <SettingRow label="自动朗读 AI 回复">
        <Switch checked={settings.autoSpeak} onCheckedChange={(v) => updateSetting('autoSpeak', v)} />
      </SettingRow>
      <SettingRow label="朗读语速">
        <div className="flex items-center gap-3">
          <span className="w-12 text-right text-[11px] text-muted-foreground">{settings.speakRate.toFixed(1)}x</span>
          <Slider
            value={[settings.speakRate]}
            onValueChange={([v]) => updateSetting('speakRate', v)}
            min={0.5}
            max={2.0}
            step={0.1}
            className="w-32"
          />
        </div>
      </SettingRow>

      <ApiConfigModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} editingConfig={editingConfig} />
    </>
  );
}

function UsageMeter({ label, value, detail }: { label: string; value: number; detail: string }) {
  const percent = Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));
  return (
    <div className="rounded-md border border-border/70 bg-background/70 px-2.5 py-2">
      <div className="flex items-center justify-between gap-2 text-[11px]">
        <span className="font-medium">{label}</span>
        <span className="text-muted-foreground">{percent}%</span>
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-foreground/70" style={{ width: `${percent}%` }} />
      </div>
      <div className="mt-1.5 truncate text-[11px] text-muted-foreground">{detail}</div>
    </div>
  );
}

function formatCompactNumber(value: number) {
  return new Intl.NumberFormat('zh-CN', { maximumFractionDigits: 0 }).format(value);
}

function formatDurationSeconds(seconds: number) {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}min`;
  return `${Math.round(minutes / 60)}h`;
}

function ShortcutsSection({
  settings, updateSetting,
}: {
  settings: import('./settingsStore').AppSettings;
  updateSetting: import('./settingsStore').SettingsState['updateSetting'];
}) {
  return (
    <>
      <SectionTitle>快捷键</SectionTitle>
      <SettingRow label="全局唤起">
        <Input value={settings.globalShortcut} onChange={(e) => updateSetting('globalShortcut', e.target.value)} className="w-48" readOnly />
      </SettingRow>
      <SettingRow label="截图快捷键">
        <Input value={settings.screenshotShortcut} onChange={(e) => updateSetting('screenshotShortcut', e.target.value)} className="w-48" readOnly />
      </SettingRow>
    </>
  );
}

function HistorySection() {
  const [items, setItems] = useState<Array<{
    id: number;
    title: string | null;
    updatedAt: string;
    preview: string;
  }>>([]);
  const [selected, setSelected] = useState<{
    id: number;
    title: string | null;
    updatedAt: string;
    messages: Array<{ id: number; role: string; content: string; timestamp: string; imageUrl?: string; imageDataUrl?: string }>;
  } | null>(null);

  useEffect(() => {
    let alive = true;
    async function load() {
      const convos = await getConversations();
      const loaded = await Promise.all(convos.map(async (c) => {
        const msgs = await getMessages(c.id);
        const preview = msgs.map((m) => `${m.role}: ${m.image_path ? '[图片] ' : ''}${m.content}`).join('\n').slice(0, 240);
        return { id: c.id, title: c.title, updatedAt: c.updated_at, preview };
      }));
      if (alive) setItems(loaded);
    }
    load().catch(() => setItems([]));
    return () => { alive = false; };
  }, []);

  if (selected) {
    return (
      <>
        <div className="flex items-center justify-between gap-3 mb-4">
          <div>
            <SectionTitle>{selected.title || `对话 ${selected.id}`}</SectionTitle>
            <p className="text-[11px] text-muted-foreground">{selected.updatedAt}</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => setSelected(null)}>返回</Button>
        </div>
        <div className="space-y-3">
          {selected.messages.map((msg) => (
            <div key={msg.id} className="border border-border rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-medium text-muted-foreground">{msg.role}</span>
                <span className="text-[11px] text-muted-foreground">{msg.timestamp}</span>
              </div>
              {(msg.imageDataUrl || msg.imageUrl) && (
                <img
                  src={msg.imageDataUrl || msg.imageUrl}
                  alt=""
                  className="mb-2 max-h-64 rounded-md object-contain"
                />
              )}
              <div className="text-[13px] whitespace-pre-wrap leading-relaxed">{msg.content}</div>
            </div>
          ))}
        </div>
      </>
    );
  }

  const openConversation = async (item: { id: number; title: string | null; updatedAt: string }) => {
    const msgs = await getMessages(item.id);
    setSelected({
      id: item.id,
      title: item.title,
      updatedAt: item.updatedAt,
      messages: msgs.map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        timestamp: m.timestamp,
        ...historyMessageImageFields(m.image_path),
      })),
    });
  };

  return (
    <>
      <SectionTitle>历史对话</SectionTitle>
      <div className="space-y-3">
        {items.length === 0 && (
          <div className="text-[13px] text-muted-foreground border border-border rounded-lg p-4">
            暂无历史对话
          </div>
        )}
        {items.map((item) => (
          <button
            key={item.id}
            className="block w-full text-left border border-border rounded-lg p-3 transition-colors hover:bg-accent/50"
            onClick={() => openConversation(item)}
          >
            <div className="flex items-center justify-between gap-3 mb-2">
              <span className="text-[13px] font-medium truncate">{item.title || `对话 ${item.id}`}</span>
              <span className="text-[11px] text-muted-foreground shrink-0">{item.updatedAt}</span>
            </div>
            <p className="text-[11px] text-muted-foreground whitespace-pre-wrap line-clamp-4">
              {item.preview || '空对话'}
            </p>
          </button>
        ))}
      </div>
    </>
  );
}

function historyMessageImageFields(imagePath: string | null | undefined) {
  if (!imagePath) return {};
  if (imagePath.startsWith('data:image/')) return { imageDataUrl: imagePath };
  if (/[/\\]/.test(imagePath)) return { imageUrl: convertFileSrc(imagePath) };
  return {};
}

interface ApiConfigForm {
  id: number | null;
  providerId: string;
  baseUrl: string;
  model: string;
  apiKey: string;
  isDefault: boolean;
}

const EMPTY_FORM: ApiConfigForm = {
  id: null,
  providerId: '',
  baseUrl: '',
  model: '',
  apiKey: '',
  isDefault: false,
};

function defaultApiConfigForm(): ApiConfigForm {
  const provider = PROVIDER_PRESETS[0];
  return {
    ...EMPTY_FORM,
    providerId: provider.id,
    baseUrl: provider.baseUrl,
  };
}

function hasSavedApiKey(config: ApiConfig | null) {
  return Boolean(config?.apiKey?.trim());
}

function apiKeyForSave(value: string) {
  return value === MASKED_API_KEY ? '' : value;
}

function ApiConfigModal({ isOpen, onClose, editingConfig }: { isOpen: boolean; onClose: () => void; editingConfig: ApiConfig | null }) {
  const { addConfig, updateConfig } = useApiConfigStore();
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState<ApiConfigForm>(EMPTY_FORM);
  const [selectedProvider, setSelectedProvider] = useState(PROVIDER_PRESETS[0]);

  useEffect(() => {
    if (isOpen) {
      if (editingConfig) {
        const providerId = (editingConfig.providerId || editingConfig.provider) === 'zhipu'
          ? 'glm'
          : editingConfig.providerId || editingConfig.provider;
        const provider = PROVIDER_PRESETS.find(p => p.id === providerId)
          || PROVIDER_PRESETS.find(p => p.id === 'custom')
          || PROVIDER_PRESETS[0];
        setForm({
          id: editingConfig.id,
          providerId: provider.id,
          baseUrl: provider.id === 'custom' ? editingConfig.baseUrl : provider.baseUrl,
          model: editingConfig.model,
          apiKey: hasSavedApiKey(editingConfig) ? MASKED_API_KEY : '',
          isDefault: editingConfig.isDefault,
        });
        setSelectedProvider(provider);
      } else {
        setForm(defaultApiConfigForm());
        setSelectedProvider(PROVIDER_PRESETS[0]);
      }
    }
  }, [isOpen, editingConfig]);

  const handleSave = async () => {
    if (!form.providerId || !form.baseUrl || !form.model) {
      return;
    }
    const nextApiKey = apiKeyForSave(form.apiKey);
    const requiresApiKey = !hasSavedApiKey(editingConfig);
    if (requiresApiKey && !nextApiKey.trim()) {
      alert('请填写 API Key。');
      return;
    }

    setIsSaving(true);
    try {
      if (form.id) {
        await updateConfig(form.id, form.providerId, form.baseUrl, form.model, selectedProvider.name, form.providerId, nextApiKey || undefined);
      } else {
        await addConfig(form.providerId, form.baseUrl, form.model, nextApiKey, selectedProvider.name, form.providerId);
      }
      onClose();
    } catch (e) {
      alert(e instanceof Error ? e.message : String(e));
    } finally {
      setIsSaving(false);
    }
  };

  const handleProviderChange = (providerId: string) => {
    const provider = PROVIDER_PRESETS.find(p => p.id === providerId);
    if (provider) {
      setSelectedProvider(provider);
      setForm(prev => ({
        ...prev,
        providerId,
        baseUrl: provider.baseUrl,
        model: '',
      }));
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{editingConfig ? '编辑 API 配置' : '添加 API 配置'}</DialogTitle>
          <DialogDescription>
            配置你的 AI 模型 API Key。Key 只保存在本机数据库中，界面不会展示明文。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-[13px] font-medium">服务提供商</label>
            <select
              className="w-full bg-input border border-border rounded-md px-3 py-2 text-[13px]"
              value={form.providerId}
              onChange={(e) => handleProviderChange(e.target.value)}
            >
              {PROVIDER_PRESETS.map(provider => (
                <option key={provider.id} value={provider.id}>{provider.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-[13px] font-medium">Base URL</label>
            <Input
              readOnly={selectedProvider.id !== 'custom'}
              placeholder="https://api.example.com/v1"
              value={form.baseUrl}
              onChange={(e) => setForm({ ...form, baseUrl: e.target.value })}
              className={selectedProvider.id === 'custom' ? '' : 'bg-muted/50'}
            />
          </div>

          <div className="space-y-2">
            <label className="text-[13px] font-medium">模型名称</label>
            <Input
              placeholder="请填写模型名称，例如：gpt-4o-mini"
              value={form.model}
              onChange={(e) => setForm({ ...form, model: e.target.value.trim() })}
            />
          </div>

          <div className="space-y-2">
            <label className="text-[13px] font-medium">API Key</label>
            <Input
              type="password"
              placeholder={hasSavedApiKey(editingConfig) ? '已保存，留空则不修改' : selectedProvider.apiKeyHint}
              value={form.apiKey}
              onFocus={() => {
                if (form.apiKey === MASKED_API_KEY) {
                  setForm({ ...form, apiKey: '' });
                }
              }}
              onChange={(e) => setForm({ ...form, apiKey: e.target.value })}
            />
            <p className="text-[11px] text-muted-foreground">
              {editingConfig
                ? `${describeApiKey(editingConfig.apiKey)}。留空保存则不修改，重新粘贴会覆盖。`
                : '保存后会显示长度、尾号和指纹，方便确认测试时使用的是同一把 Key。'}
            </p>
          </div>

          {selectedProvider.docsUrl && (
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
              <span>获取 API Key：</span>
              <button
                type="button"
                className="flex items-center gap-1 text-primary hover:underline"
                onClick={() => invoke('open_external_url', { url: selectedProvider.docsUrl }).catch((e) => alert(String(e)))}
              >
                {selectedProvider.name}
                <ExternalLink className="h-3 w-3" />
              </button>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            取消
          </Button>
          <Button
            onClick={handleSave}
            disabled={
              isSaving
              || !form.providerId
              || !form.baseUrl
              || !form.model
              || (!hasSavedApiKey(editingConfig) && !apiKeyForSave(form.apiKey).trim())
            }
          >
            {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            {editingConfig ? '保存' : '添加'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PrivacySection() {
  return (
    <>
      <SectionTitle>隐私与数据</SectionTitle>
      <div className="space-y-3">
        <Button variant="destructive" size="sm" disabled>清除所有对话历史</Button>
        <br />
        <Button variant="destructive" size="sm" disabled>删除所有 API 配置</Button>
        <br />
        <Button variant="outline" size="sm" disabled>导出对话资料 (JSON)</Button>
      </div>
    </>
  );
}
