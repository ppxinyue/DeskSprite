import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { SettingsLayout } from '@/components/layouts/SettingsLayout';
import { useSettingsStore, type PetMotionName, type PetMotionSettings } from '@/features/settings/settingsStore';
import { useApiConfigStore, type ApiConfig } from '@/features/settings/apiConfigStore';
import { usePetStore } from '@/features/pet/petStore';
import { BUILTIN_CLOSEAI_CONFIG } from '@/features/ai/defaultModel';
import { DEFAULT_SYSTEM_PROMPT, normalizeSystemPrompt } from '@/features/ai/systemPrompt';
import { getConversations, getMessages, getSystemPrompt, updateSystemPrompt, setSetting } from '@/lib/db';
import { maskKey } from '@/lib/keychain';
import type { PetState, PetStateMediaConfig } from '@/features/pet/animations';
import { DEFAULT_MEDIA_CONFIG, ALL_PET_STATES, STATE_META } from '@/features/pet/animations';
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
  const { configs, loadConfigs, addConfig, removeConfig, setDefault } = useApiConfigStore();
  const [systemPrompt, setSystemPrompt] = useState(DEFAULT_SYSTEM_PROMPT);
  const [newConfig, setNewConfig] = useState({ provider: 'openai', baseUrl: '', model: '', apiKey: '' });

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
          newConfig={newConfig}
          setNewConfig={setNewConfig}
          addConfig={addConfig}
          removeConfig={removeConfig}
          setDefault={setDefault}
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

function AppearanceRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[120px_minmax(280px,420px)] items-center py-3 border-b border-border/40 last:border-0">
      <span className="text-sm text-foreground">{label}</span>
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
    theme: settings.theme,
    petMotions: settings.petMotions,
  });

  const update = <K extends keyof typeof draft>(k: K, v: typeof draft[K]) => {
    setDraft((d) => ({ ...d, [k]: v }));
    updateSettings({ [k]: v }).catch(() => {});
  };

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
      <AppearanceRow label="灵宠动作">
        <PetMotionControls
          value={draft.petMotions}
          onChange={(petMotions) => update('petMotions', petMotions)}
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
  const mediaConfig = usePetStore((s) => s.mediaConfig);
  const { setStateMediaConfig, resetMediaConfig } = usePetStore();

  const handleUploadPng = async (state: PetState) => {
    const result = await open({
      multiple: true,
      filters: [{ name: 'PNG序列', extensions: ['png'] }],
    });
    if (!result || result.length === 0) return;
    const frames = (Array.isArray(result) ? result : [result]).sort();
    const newConfig: PetStateMediaConfig = {
      ...mediaConfig[state], userFrames: frames, userAnimatedPath: null, userAnimatedType: null,
    };
    setStateMediaConfig(state, newConfig);
    await setSetting(`petMedia_${state}`, JSON.stringify(newConfig));
  };

  const handleClear = async (state: PetState) => {
    setStateMediaConfig(state, DEFAULT_MEDIA_CONFIG[state]);
    await setSetting(`petMedia_${state}`, JSON.stringify(DEFAULT_MEDIA_CONFIG[state]));
  };

  const handleResetAll = async () => {
    resetMediaConfig();
    for (const state of ALL_PET_STATES) {
      await setSetting(`petMedia_${state}`, JSON.stringify(DEFAULT_MEDIA_CONFIG[state]));
    }
  };

  return (
    <div className="space-y-4">
      {ALL_PET_STATES.map((state) => {
        const cfg = mediaConfig[state];
        const meta = STATE_META[state];

        const previewSrc = cfg.userAnimatedPath
          ? convertFileSrc(cfg.userAnimatedPath)
          : cfg.userFrames.length > 0
            ? convertFileSrc(cfg.userFrames[0])
            : cfg.defaultAssets[0];

        let configDesc = '内置默认';
        if (cfg.userAnimatedPath) {
          const name = cfg.userAnimatedPath.split('/').pop() ?? '';
          configDesc = `文件：${name}`;
        } else if (cfg.userFrames.length > 0) {
          configDesc = `${cfg.userFrames.length}张 · 随机1-5分钟切换`;
        } else if (cfg.defaultAssets.length > 1) {
          configDesc = `${cfg.defaultAssets.length}张内置 · 随机1-5分钟切换`;
        }

        return (
          <div key={state} className="border border-border rounded-lg p-3">
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 rounded border border-border overflow-hidden flex items-center justify-center bg-muted flex-shrink-0">
                {previewSrc ? (
                  <img src={previewSrc} alt={meta.label} className="w-full h-full object-contain" />
                ) : (
                  <span className="text-lg">PNG</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="font-medium text-sm">{meta.label}</span>
                  <span className="text-xs text-muted-foreground">{configDesc}</span>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => handleUploadPng(state)}>PNG</Button>
                  {(cfg.userFrames.length > 0 || cfg.userAnimatedPath) && (
                    <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => handleClear(state)}>清除</Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })}
      <Button variant="outline" size="sm" onClick={handleResetAll}>恢复全部默认</Button>
    </div>
  );
}

function AISection({
  settings, updateSetting, systemPrompt, setSystemPrompt,
  configs, newConfig, setNewConfig, addConfig, removeConfig, setDefault,
}: {
  settings: import('./settingsStore').AppSettings;
  updateSetting: import('./settingsStore').SettingsState['updateSetting'];
  systemPrompt: string;
  setSystemPrompt: (v: string) => void;
  configs: ApiConfig[];
  newConfig: { provider: string; baseUrl: string; model: string; apiKey: string };
  setNewConfig: (v: { provider: string; baseUrl: string; model: string; apiKey: string }) => void;
  addConfig: (provider: string, baseUrl: string, model: string, apiKey: string) => Promise<void>;
  removeConfig: (id: number, keyringRef: string | null) => Promise<void>;
  setDefault: (id: number) => Promise<void>;
}) {
  const [testResult, setTestResult] = useState<Record<number, string>>({});

  const handleAdd = async () => {
    if (!newConfig.baseUrl || !newConfig.model || !newConfig.apiKey) return;
    await addConfig(newConfig.provider, newConfig.baseUrl, newConfig.model, newConfig.apiKey);
    setNewConfig({ provider: 'openai', baseUrl: '', model: '', apiKey: '' });
  };

  const handleTest = async (configId: number) => {
    setTestResult((prev) => ({ ...prev, [configId]: '测试中...' }));
    try {
      const result = await invoke<{ success: boolean; message: string; latency_ms: number }>('test_ai_connection', { configId });
      setTestResult((prev) => ({ ...prev, [configId]: result.success ? `成功 (${result.latency_ms}ms)` : `失败: ${result.message}` }));
    } catch (e) {
      setTestResult((prev) => ({ ...prev, [configId]: `错误: ${e}` }));
    }
  };

  return (
    <>
      <SectionTitle>宠物身份</SectionTitle>
      <SettingRow label="宠物名字">
        <Input value={settings.petName} onChange={(e) => updateSetting('petName', e.target.value)} className="w-48" />
      </SettingRow>

      <Separator className="my-6" />
      <SectionTitle>AI 配置</SectionTitle>

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

      {configs.map((c) => (
        <div key={c.id} className="border border-border rounded-lg p-3 mb-3">
          <div className="flex items-center justify-between mb-2">
            <div>
              <span className="font-medium text-sm">{c.provider}</span>
              <span className="text-xs text-muted-foreground ml-2">
                {c.model} · Key: {c.keyringRef ? maskKey(c.keyringRef) : '未设置'}
              </span>
            </div>
            <div className="flex gap-2">
              {c.isDefault ? (
                <span className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded">默认</span>
              ) : (
                <Button variant="ghost" size="sm" onClick={() => setDefault(c.id)}>设为默认</Button>
              )}
              <Button variant="ghost" size="sm" onClick={() => handleTest(c.id)}>测试</Button>
              <Button variant="ghost" size="sm" onClick={() => removeConfig(c.id, c.keyringRef)}>删除</Button>
            </div>
          </div>
          <div className="text-xs text-muted-foreground">{c.baseUrl}</div>
          {testResult[c.id] && <div className="text-xs mt-1">{testResult[c.id]}</div>}
        </div>
      ))}

      <Separator className="my-4" />
      <h3 className="text-sm font-medium mb-3">添加 API 配置</h3>
      <div className="space-y-3">
        <select className="w-full bg-input border border-border rounded px-3 py-2 text-sm"
          value={newConfig.provider} onChange={(e) => setNewConfig({ ...newConfig, provider: e.target.value })}>
          <option value="openai">OpenAI</option>
          <option value="anthropic">Anthropic</option>
          <option value="groq">Groq</option>
          <option value="custom">自定义</option>
        </select>
        <Input placeholder="Base URL" value={newConfig.baseUrl} onChange={(e) => setNewConfig({ ...newConfig, baseUrl: e.target.value })} />
        <Input placeholder="Model" value={newConfig.model} onChange={(e) => setNewConfig({ ...newConfig, model: e.target.value })} />
        <Input type="password" placeholder="API Key" value={newConfig.apiKey} onChange={(e) => setNewConfig({ ...newConfig, apiKey: e.target.value })} />
        <Button onClick={handleAdd} disabled={!newConfig.baseUrl || !newConfig.model || !newConfig.apiKey}>添加</Button>
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
    messages: Array<{ id: number; role: string; content: string; timestamp: string }>;
  } | null>(null);

  useEffect(() => {
    let alive = true;
    async function load() {
      const convos = await getConversations();
      const loaded = await Promise.all(convos.map(async (c) => {
        const msgs = await getMessages(c.id);
        const preview = msgs.map((m) => `${m.role}: ${m.content}`).join('\n').slice(0, 240);
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
