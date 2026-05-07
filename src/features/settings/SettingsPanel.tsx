import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, Loader2, Plus, Trash2, Pencil, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { SettingsLayout } from '@/components/layouts/SettingsLayout';
import { useSettingsStore, type PetMotionName, type PetMotionSettings } from '@/features/settings/settingsStore';
import { useApiConfigStore, type ApiConfig } from '@/features/settings/apiConfigStore';
import { usePetStore } from '@/features/pet/petStore';
import { BUILTIN_CLOSEAI_CONFIG } from '@/features/ai/defaultModel';
import { DEFAULT_SYSTEM_PROMPT, normalizeSystemPrompt } from '@/features/ai/systemPrompt';
import { PROVIDER_PRESETS, getProviderName } from '@/features/ai/providers';
import { getConversations, getMessages, getSystemPrompt, setSetting, updateSystemPrompt } from '@/lib/db';
import type { PetState } from '@/features/pet/animations';
import { ALL_PET_STATES, DEFAULT_MEDIA_CONFIG, STATE_META, isBuiltinAsset, type PetStateMediaConfig } from '@/features/pet/animations';
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { convertFileSrc } from '@tauri-apps/api/core';
import type { ReactNode } from 'react';

type SettingsSection = 'appearance' | 'ai' | 'history' | 'shortcuts' | 'privacy';

const SECTIONS: { id: SettingsSection; label: string }[] = [
  { id: 'appearance', label: '外观' },
  { id: 'ai', label: 'AI 对话' },
  { id: 'history', label: '历史对话' },
  { id: 'shortcuts', label: '快捷键' },
  { id: 'privacy', label: '隐私与数据' },
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
      {SECTIONS.map((s) => (
        <button
          key={s.id}
          className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            activeSection === s.id
              ? 'bg-background/80 text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground hover:bg-background/45'
          }`}
          onClick={() => setActiveSection(s.id)}
        >
          {s.label}
        </button>
      ))}
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
          onTest={async (id) => {
            setTestingConfigId(id);
            try {
              const result = await invoke<{ success: boolean; message: string; latency_ms: number }>('test_ai_connection', { configId: id });
              setTestResults(prev => ({ ...prev, [id]: { success: result.success, message: result.message, latency: result.latency_ms } }));
            } catch (e) {
              setTestResults(prev => ({ ...prev, [id]: { success: false, message: String(e) } }));
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
  return <h2 className="text-base font-semibold text-foreground mb-1">{children}</h2>;
}

function SectionDesc({ children }: { children: ReactNode }) {
  return <p className="text-sm text-muted-foreground mb-5">{children}</p>;
}

function SettingRow({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-border/40 last:border-0">
      <div>
        <span className="text-sm text-foreground">{label}</span>
        {hint && <p className="text-xs text-muted-foreground mt-0.5">{hint}</p>}
      </div>
      <div className="flex items-center gap-2 ml-4 shrink-0">{children}</div>
    </div>
  );
}

function AppearanceRow({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[120px_minmax(280px,420px)] items-center py-3 border-b border-border/40 last:border-0">
      <div>
        <span className="text-sm text-foreground">{label}</span>
        {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
      </div>
      <div className="min-w-0">{children}</div>
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
      <SectionTitle>外观设置</SectionTitle>

      <AppearanceRow label="主题">
        <ThemeSelect
          value={draft.theme}
          onChange={(theme) => update('theme', theme)}
        />
      </AppearanceRow>
      <AppearanceRow label="灵宠透明度">
        <div className="flex items-center gap-3">
          <span className="w-12 text-right text-xs text-muted-foreground">{draft.petOpacity.toFixed(1)}</span>
          <Slider
            value={[draft.petOpacity]}
            onValueChange={([v]) => update('petOpacity', v)}
            min={0.6} max={1} step={0.05} className="w-48"
          />
        </div>
      </AppearanceRow>
      <AppearanceRow label="灵宠大小">
        <div className="flex items-center gap-3">
          <span className="w-12 text-right text-xs text-muted-foreground">{draft.petScale.toFixed(1)}</span>
          <Slider
            value={[draft.petScale]}
            onValueChange={([v]) => update('petScale', v)}
            min={0.5} max={2} step={0.1} className="w-48"
          />
        </div>
      </AppearanceRow>
      <AppearanceRow label="对话框宽度">
        <div className="flex items-center gap-3">
          <span className="w-12 text-right text-xs text-muted-foreground">{draft.dialogWidth}px</span>
          <Slider
            value={[draft.dialogWidth]}
            onValueChange={([v]) => update('dialogWidth', v)}
            min={200} max={600} step={10} className="w-48"
          />
        </div>
      </AppearanceRow>
      <AppearanceRow label="对话字号">
        <div className="flex items-center gap-3">
          <span className="w-12 text-right text-xs text-muted-foreground">{draft.compactChatFontSize}px</span>
          <Slider
            value={[draft.compactChatFontSize]}
            onValueChange={([v]) => update('compactChatFontSize', v)}
            min={11} max={15} step={1} className="w-48"
          />
        </div>
      </AppearanceRow>
      <AppearanceRow label="灵宠动作">
        <PetMotionControls
          value={draft.petMotions}
          onChange={(petMotions) => update('petMotions', petMotions)}
        />
      </AppearanceRow>
      <AppearanceRow label="始终置顶显示" hint="穿越全屏应用">
        <Switch
          checked={draft.alwaysOnTop}
          onCheckedChange={(v) => update('alwaysOnTop', v)}
        />
      </AppearanceRow>

      <Separator className="my-6" />
      <SectionTitle>形象自定义</SectionTitle>
      <SectionDesc>为每种状态上传一组 PNG，系统会随机间隔 1-5 分钟切换，上传立即生效。</SectionDesc>
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
    <div className="w-[360px] space-y-3">
      {PET_MOTION_OPTIONS.map((option) => {
        const motion = value[option.id];
        return (
          <div key={option.id} className="rounded-[10px] border border-border/60 bg-background px-3 py-2.5">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[13px] leading-[1.35] text-foreground">{option.title}</div>
                <div className="text-[11px] leading-[1.35] text-muted-foreground">{option.desc}</div>
              </div>
              <Switch
                checked={motion.enabled}
                onCheckedChange={(enabled) => updateMotion(option.id, { enabled })}
                aria-label={`${option.title}动作`}
              />
            </div>
            <div className={`mt-2.5 space-y-2 ${motion.enabled ? '' : 'opacity-45'}`}>
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
      <p className="text-[11px] leading-[1.5] text-muted-foreground">
        开启多个动作时，灵宠会在每次形象切换时随机选择其中一个动作。
      </p>
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
        className="flex h-10 w-full items-center justify-between gap-2 rounded-[10px] bg-[color-mix(in_srgb,var(--color-muted)_82%,var(--color-background))] px-3 text-left text-[13px] text-foreground outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/20"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="truncate">{current.title}</span>
        <ChevronDown className={`h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div
          className="absolute left-0 top-11 z-50 w-[260px] overflow-hidden rounded-[14px] bg-background py-1.5 shadow-[0_10px_34px_rgba(0,0,0,0.16)] ring-1 ring-border/75 dark:shadow-[0_14px_38px_rgba(0,0,0,0.42)]"
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
                className={`flex min-h-11 w-full items-center gap-3 px-3.5 py-2 text-left transition-colors hover:bg-muted ${
                  selected ? 'bg-muted/80' : ''
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

function ImageSection() {
  const { userFrames, loadUserFrames, addUserFrame, removeUserFrame, setStateMediaConfig, resetMediaConfig } = usePetStore();
  const [selectedState, setSelectedState] = useState<PetState>('idle');
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const mediaConfig = usePetStore((s) => s.mediaConfig);

  useEffect(() => {
    loadUserFrames();
  }, [loadUserFrames]);

  const persistMediaConfig = async (state: PetState, nextConfig: PetStateMediaConfig) => {
    setStateMediaConfig(state, nextConfig);
    await setSetting(`petMedia_${state}`, JSON.stringify(nextConfig));
  };

  const handleAddImages = async () => {
    const result = await open({
      multiple: true,
      filters: [
        { name: '常见图片格式', extensions: ['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp'] }
      ],
    });
    if (!result || result.length === 0) return;
    const files = Array.isArray(result) ? result : [result];
    const { invoke } = await import('@tauri-apps/api/core');
    for (const file of files) {
      try {
        const importedPath = await invoke<string>('import_pet_image', {
          srcPath: file,
          state: selectedState,
        });
        addUserFrame(selectedState, importedPath);
        const nextConfig = {
          ...mediaConfig[selectedState],
          disabledFrames: (mediaConfig[selectedState].disabledFrames ?? []).filter((p) => p !== importedPath),
        };
        await persistMediaConfig(selectedState, nextConfig);
      } catch (e) {
        console.error('Failed to import image:', e);
        alert(e instanceof Error ? e.message : String(e));
      }
    }
  };

  const handleDeleteImage = async (path: string) => {
    setIsDeleting(path);
    const confirmed = confirm('确定要删除这张图片吗？');
    if (confirmed) {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        await invoke('delete_pet_image', { filePath: path });
        removeUserFrame(selectedState, path);
        const nextConfig = {
          ...mediaConfig[selectedState],
          disabledFrames: (mediaConfig[selectedState].disabledFrames ?? []).filter((p) => p !== path),
        };
        await persistMediaConfig(selectedState, nextConfig);
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
        for (const path of userFrames[state]) {
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
    }
  };

  const currentStateFrames = userFrames[selectedState] || [];
  const config = mediaConfig[selectedState];
  const defaultFrames = config.defaultAssets;
  const allFrames = [...defaultFrames, ...currentStateFrames];
  const disabledFrames = new Set(config.disabledFrames ?? []);
  const enabledCount = allFrames.filter((path) => !disabledFrames.has(path)).length;
  const toPreviewSrc = (path: string) => (isBuiltinAsset(path) ? `/${path}` : convertFileSrc(path));

  const handleToggleUse = async (path: string) => {
    const disabled = new Set(config.disabledFrames ?? []);
    const isEnabled = !disabled.has(path);
    if (isEnabled && enabledCount <= 1) {
      alert('至少需要保留一张正在使用的灵宠图片。');
      return;
    }
    if (isEnabled) disabled.add(path);
    else disabled.delete(path);
    await persistMediaConfig(selectedState, {
      ...config,
      disabledFrames: Array.from(disabled),
    });
  };

  const ImageTile = ({ path, source }: { path: string; source: 'default' | 'user' }) => {
    const enabled = !disabledFrames.has(path);
    return (
      <div
        key={`${source}-${path}`}
        className={`relative group aspect-square rounded-lg overflow-hidden border ${
          enabled ? 'border-border/70 bg-muted/20' : 'border-border/40 bg-muted/10 opacity-70'
        }`}
      >
        <img
          src={toPreviewSrc(path)}
          alt=""
          className="h-full w-full object-contain p-2"
          draggable={false}
        />
        <span className="absolute left-1.5 top-1.5 rounded bg-background/85 px-1.5 py-0.5 text-[10px] text-muted-foreground shadow-sm">
          {source === 'default' ? '默认' : '上传'}
        </span>
        <div className="absolute inset-x-1.5 bottom-1.5 z-20 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            onClick={() => handleToggleUse(path)}
            className="min-w-0 flex-1 rounded-md bg-background/90 px-2 py-1 text-[11px] text-foreground shadow-sm hover:bg-background"
          >
            {enabled ? '不使用' : '使用'}
          </button>
          <button
            onClick={() => source === 'user' && handleDeleteImage(path)}
            disabled={source === 'default' || isDeleting === path}
            className="flex h-7 w-7 items-center justify-center rounded-md bg-background/90 text-destructive shadow-sm hover:bg-background disabled:cursor-not-allowed disabled:text-muted-foreground disabled:opacity-55"
            title={source === 'default' ? '系统默认图片不可删除' : '删除'}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
        {!enabled && (
          <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-background/45 text-xs text-muted-foreground">
            未使用
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* State Tabs */}
      <div className="flex gap-2 border-b border-border/60">
        {ALL_PET_STATES.map((state) => {
          const meta = STATE_META[state];
          const isActive = selectedState === state;
          const count = userFrames[state]?.length ?? 0;
          const defaultCount = mediaConfig[state].defaultAssets.length;
          return (
            <button
              key={state}
              className={`px-4 py-2 text-sm font-medium transition-colors relative ${
                isActive
                  ? 'text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              onClick={() => setSelectedState(state)}
            >
              {meta.label}
              <span className="ml-1.5 text-xs text-muted-foreground">({defaultCount + count})</span>
              {isActive && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-foreground" />
              )}
            </button>
          );
        })}
      </div>

      {/* Image Grid */}
      <div className="grid grid-cols-4 gap-3">
        {defaultFrames.map((path) => <ImageTile key={`default-${path}`} path={path} source="default" />)}
        {currentStateFrames.map((path) => <ImageTile key={`user-${path}`} path={path} source="user" />)}
        <button
          onClick={handleAddImages}
          className="aspect-square rounded-lg border-2 border-dashed border-border/60 hover:border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
        >
          <Plus className="h-6 w-6" />
        </button>
      </div>

      {/* Current config info */}
      <p className="text-xs text-muted-foreground">
        {config.userAnimatedPath
          ? `当前使用：${config.userAnimatedPath}`
          : `当前使用 ${enabledCount} / ${allFrames.length} 张图片`}
      </p>

      {/* Reset All */}
      <div className="pt-2 border-t border-border/40">
        <Button variant="outline" size="sm" onClick={handleResetAll}>
          恢复全部默认
        </Button>
      </div>
    </div>
  );
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
  onTest: (id: number) => Promise<void>;
  testResults: Record<number, { success: boolean; message: string; latency?: number }>;
  testingConfigId: number | null;
  isModalOpen: boolean;
  setIsModalOpen: (v: boolean) => void;
  editingConfig: ApiConfig | null;
}) {
  return (
    <>
      <SectionTitle>宠物身份</SectionTitle>
      <SettingRow label="宠物名字">
        <Input value={settings.petName} onChange={(e) => updateSetting('petName', e.target.value)} className="w-48" />
      </SettingRow>

      <Separator className="my-6" />
      <div className="flex items-center justify-between mb-4">
        <SectionTitle>API 配置</SectionTitle>
        <Button size="sm" onClick={onAdd}>
          <Plus className="h-4 w-4 mr-1" />
          添加配置
        </Button>
      </div>

      <div className="border border-border rounded-lg p-3 mb-3 bg-muted/40">
        <div className="flex items-center justify-between mb-2">
          <div>
            <span className="font-medium text-sm">CloseAI</span>
            <span className="text-xs text-muted-foreground ml-2">
              {BUILTIN_CLOSEAI_CONFIG.model} · Key: 内置隐藏
            </span>
          </div>
          <span className="text-xs bg-secondary text-secondary-foreground px-2 py-1 rounded">内置默认</span>
        </div>
        <div className="text-xs text-muted-foreground">{BUILTIN_CLOSEAI_CONFIG.baseUrl}</div>
        <div className="text-xs text-muted-foreground mt-1">未配置自有默认模型时自动使用，额度 100000 token。</div>
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
                    <span className="font-medium text-sm">{c.name || getProviderName(c.providerId || c.provider)}</span>
                    {c.isDefault && (
                      <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded shrink-0">默认</span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground mb-1">
                    {c.providerId || c.provider} · {c.model}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">{c.baseUrl}</div>
                  {testResult && (
                    <div className={`text-xs mt-1 ${testResult.success ? 'text-green-600' : 'text-red-600'}`}>
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
                  <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => onTest(c.id)} disabled={isTesting}>
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
          <div className="text-sm text-muted-foreground border border-border rounded-lg p-4">
            暂无 API 配置，点击"添加配置"按钮添加
          </div>
        )}
      </div>

      <Separator className="my-6" />
      <SectionTitle>System Prompt</SectionTitle>
      <Textarea value={systemPrompt} onChange={(e) => setSystemPrompt(e.target.value)} rows={6} className="font-mono text-sm" />
      <div className="flex gap-2 mt-3">
        <Button onClick={() => updateSystemPrompt(systemPrompt)}>保存</Button>
        <Button variant="outline" onClick={() => setSystemPrompt(DEFAULT_SYSTEM_PROMPT)}>重置为默认</Button>
      </div>

      <Separator className="my-6" />
      <SectionTitle>模型参数</SectionTitle>
      <SettingRow label="温度">
        <span className="text-xs text-muted-foreground w-8">{settings.temperature.toFixed(1)}</span>
        <Slider value={[settings.temperature]} onValueChange={([v]) => updateSetting('temperature', v)} min={0} max={2} step={0.1} className="w-32" />
      </SettingRow>
      <SettingRow label="最大 Token">
        <Input type="number" value={settings.maxTokens} onChange={(e) => updateSetting('maxTokens', Number(e.target.value))} className="w-24" />
      </SettingRow>
      <SettingRow label="流式输出">
        <Switch checked={settings.streamOutput} onCheckedChange={(v) => updateSetting('streamOutput', v)} />
      </SettingRow>

      <Separator className="my-6" />
      <SectionTitle>语音</SectionTitle>
      <SettingRow label="语音输入语言">
        <select className="bg-input border border-border rounded px-2 py-1 text-sm"
          value={settings.voiceInputLang} onChange={(e) => updateSetting('voiceInputLang', e.target.value)}>
          <option value="system">跟随系统</option>
          <option value="zh-CN">简体中文</option>
          <option value="en-US">英文</option>
        </select>
      </SettingRow>
      <SettingRow label="语音输出">
        <Switch checked={settings.voiceOutput} onCheckedChange={(v) => updateSetting('voiceOutput', v)} />
      </SettingRow>

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
          <span className="w-12 text-right text-xs text-muted-foreground">{settings.speakRate.toFixed(1)}x</span>
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
            <p className="text-xs text-muted-foreground">{selected.updatedAt}</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => setSelected(null)}>返回</Button>
        </div>
        <div className="space-y-3">
          {selected.messages.map((msg) => (
            <div key={msg.id} className="border border-border rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-muted-foreground">{msg.role}</span>
                <span className="text-xs text-muted-foreground">{msg.timestamp}</span>
              </div>
              {(msg.imageDataUrl || msg.imageUrl) && (
                <img
                  src={msg.imageDataUrl || msg.imageUrl}
                  alt=""
                  className="mb-2 max-h-64 rounded-md object-contain"
                />
              )}
              <div className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</div>
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
      <SectionDesc>本地保存的对话记录。</SectionDesc>
      <div className="space-y-3">
        {items.length === 0 && (
          <div className="text-sm text-muted-foreground border border-border rounded-lg p-4">
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
              <span className="text-sm font-medium truncate">{item.title || `对话 ${item.id}`}</span>
              <span className="text-xs text-muted-foreground shrink-0">{item.updatedAt}</span>
            </div>
            <p className="text-xs text-muted-foreground whitespace-pre-wrap line-clamp-4">
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
  name: string;
  baseUrl: string;
  model: string;
  apiKey: string;
  isDefault: boolean;
}

const EMPTY_FORM: ApiConfigForm = {
  id: null,
  providerId: '',
  name: '',
  baseUrl: '',
  model: '',
  apiKey: '',
  isDefault: false,
};

function ApiConfigModal({ isOpen, onClose, editingConfig }: { isOpen: boolean; onClose: () => void; editingConfig: ApiConfig | null }) {
  const { addConfig, updateConfig } = useApiConfigStore();
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState<ApiConfigForm>(EMPTY_FORM);
  const [selectedProvider, setSelectedProvider] = useState(PROVIDER_PRESETS[0]);

  useEffect(() => {
    if (isOpen) {
      if (editingConfig) {
        setForm({
          id: editingConfig.id,
          providerId: editingConfig.providerId || editingConfig.provider,
          name: editingConfig.name || `${editingConfig.provider} · ${editingConfig.model}`,
          baseUrl: editingConfig.baseUrl,
          model: editingConfig.model,
          apiKey: '',
          isDefault: editingConfig.isDefault,
        });
        const provider = PROVIDER_PRESETS.find(p => p.id === (editingConfig.providerId || editingConfig.provider)) || PROVIDER_PRESETS[0];
        setSelectedProvider(provider);
      } else {
        setForm(EMPTY_FORM);
        setSelectedProvider(PROVIDER_PRESETS[0]);
      }
    }
  }, [isOpen, editingConfig]);

  const handleSave = async () => {
    if (!form.providerId || !form.baseUrl || !form.model) {
      return;
    }

    setIsSaving(true);
    try {
      if (form.id) {
        await updateConfig(form.id, form.providerId, form.baseUrl, form.model, form.name, form.providerId, form.apiKey || undefined);
      } else {
        await addConfig(form.providerId, form.baseUrl, form.model, form.apiKey, form.name, form.providerId);
      }
      onClose();
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
        baseUrl: provider.id === 'custom' ? prev.baseUrl : provider.baseUrl,
        model: provider.models[0] || '',
      }));
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{editingConfig ? '编辑 API 配置' : '添加 API 配置'}</DialogTitle>
          <DialogDescription>
            配置你的 AI 模型 API Key。Key 将安全存储在系统钥匙串中。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">服务提供商</label>
            <select
              className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm"
              value={form.providerId}
              onChange={(e) => handleProviderChange(e.target.value)}
            >
              {PROVIDER_PRESETS.map(provider => (
                <option key={provider.id} value={provider.id}>{provider.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">配置名称</label>
            <Input
              placeholder="例如：我的 GPT-4o"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Base URL</label>
            <Input
              placeholder="https://api.example.com/v1"
              value={form.baseUrl}
              onChange={(e) => setForm({ ...form, baseUrl: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">模型</label>
            {selectedProvider.id === 'custom' || selectedProvider.models.length === 0 ? (
              <Input
                placeholder="例如：gpt-4o"
                value={form.model}
                onChange={(e) => setForm({ ...form, model: e.target.value })}
              />
            ) : (
              <select
                className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm"
                value={form.model}
                onChange={(e) => setForm({ ...form, model: e.target.value })}
              >
                {selectedProvider.models.map(model => (
                  <option key={model} value={model}>{model}</option>
                ))}
              </select>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">API Key</label>
            <Input
              type="password"
              placeholder={selectedProvider.apiKeyHint}
              value={form.apiKey}
              onChange={(e) => setForm({ ...form, apiKey: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">
              {editingConfig ? '留空则不修改现有 API Key' : 'API Key 将加密存储在系统钥匙串中'}
            </p>
          </div>

          {selectedProvider.docsUrl && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>获取 API Key：</span>
              <a
                href={selectedProvider.docsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-primary hover:underline"
              >
                {selectedProvider.name}
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            取消
          </Button>
          <Button onClick={handleSave} disabled={isSaving || !form.providerId || !form.baseUrl || !form.model || (!form.apiKey && !editingConfig)}>
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
