import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { SettingsLayout } from '@/components/layouts/SettingsLayout';
import { useSettingsStore } from '@/features/settings/settingsStore';
import { useApiConfigStore, type ApiConfig } from '@/features/settings/apiConfigStore';
import { usePetStore } from '@/features/pet/petStore';
import { getSystemPrompt, updateSystemPrompt, setSetting } from '@/lib/db';
import { maskKey } from '@/lib/keychain';
import type { PetState, PetStateMediaConfig } from '@/features/pet/animations';
import { DEFAULT_MEDIA_CONFIG, ALL_PET_STATES, STATE_META } from '@/features/pet/animations';
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { convertFileSrc } from '@tauri-apps/api/core';
import type { ReactNode } from 'react';

const DEFAULT_PROMPT = `你是{pet_name}，一只温柔、机智、偶尔调皮的橘猫，住在用户的桌面上。你热爱陪伴主人工作，会用轻松幽默的语气聊天。你擅长编程、写作、分析问题，也会提醒主人注意休息和喝水。你的回答应该简洁有用，偶尔展现猫咪的可爱本性。`;

type SettingsSection = 'appearance' | 'ai' | 'shortcuts' | 'privacy';

const SECTIONS: { id: SettingsSection; label: string }[] = [
  { id: 'appearance', label: '外观' },
  { id: 'ai', label: 'AI 对话' },
  { id: 'shortcuts', label: '快捷键' },
  { id: 'privacy', label: '隐私与数据' },
];

export function SettingsPanel() {
  const [activeSection, setActiveSection] = useState<SettingsSection>('appearance');
  const { settings, loaded, loadSettings, updateSetting, updateSettings } = useSettingsStore();
  const { configs, loadConfigs, addConfig, removeConfig, setDefault } = useApiConfigStore();
  const [systemPrompt, setSystemPrompt] = useState(DEFAULT_PROMPT);
  const [newConfig, setNewConfig] = useState({ provider: 'openai', baseUrl: '', model: '', apiKey: '' });

  useEffect(() => {
    loadSettings();
    loadConfigs();
    getSystemPrompt().then(setSystemPrompt);
  }, []);

  if (!loaded) return <div className="p-6">加载中...</div>;

  const sidebar = (
    <>
      {SECTIONS.map((s) => (
        <button
          key={s.id}
          className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            activeSection === s.id
              ? 'bg-accent text-accent-foreground'
              : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
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
  });
  const [dirty, setDirty] = useState(false);

  const update = <K extends keyof typeof draft>(k: K, v: typeof draft[K]) => {
    setDraft((d) => ({ ...d, [k]: v }));
    setDirty(true);
  };

  const handleConfirm = async () => {
    await updateSettings(draft);
    setDirty(false);
  };

  return (
    <>
      <SectionTitle>外观设置</SectionTitle>
      <SectionDesc>调整灵宠的显示效果，确认后生效。</SectionDesc>

      <SettingRow label="主题">
        <select
          className="bg-input border border-border rounded px-2 py-1 text-sm"
          value={draft.theme}
          onChange={(e) => update('theme', e.target.value as 'light' | 'dark' | 'system')}
        >
          <option value="system">跟随系统</option>
          <option value="light">浅色</option>
          <option value="dark">深色</option>
        </select>
      </SettingRow>
      <SettingRow label="灵宠透明度">
        <span className="text-xs text-muted-foreground w-8">{draft.petOpacity.toFixed(1)}</span>
        <Slider
          value={[draft.petOpacity]}
          onValueChange={([v]) => update('petOpacity', v)}
          min={0.6} max={1} step={0.05} className="w-32"
        />
      </SettingRow>
      <SettingRow label="灵宠大小">
        <span className="text-xs text-muted-foreground w-8">{draft.petScale.toFixed(1)}</span>
        <Slider
          value={[draft.petScale]}
          onValueChange={([v]) => update('petScale', v)}
          min={0.5} max={2} step={0.1} className="w-32"
        />
      </SettingRow>
      <SettingRow label="对话框宽度">
        <select
          className="bg-input border border-border rounded px-2 py-1 text-sm"
          value={draft.dialogWidth}
          onChange={(e) => update('dialogWidth', Number(e.target.value))}
        >
          <option value={320}>320px</option>
          <option value={360}>360px</option>
          <option value={420}>420px</option>
        </select>
      </SettingRow>

      <Separator className="my-6" />
      <SectionTitle>形象自定义</SectionTitle>
      <SectionDesc>为每种状态上传自定义图片或动画，上传立即生效。</SectionDesc>
      <ImageSection />

      <div className="mt-8 flex justify-end">
        <Button onClick={handleConfirm} disabled={!dirty}>确认更改</Button>
      </div>
    </>
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

  const handleUploadGif = async (state: PetState) => {
    const result = await open({ multiple: false, filters: [{ name: 'GIF动图', extensions: ['gif'] }] });
    if (typeof result !== 'string') return;
    const newConfig: PetStateMediaConfig = {
      ...mediaConfig[state], userAnimatedPath: result, userAnimatedType: 'gif',
    };
    setStateMediaConfig(state, newConfig);
    await setSetting(`petMedia_${state}`, JSON.stringify(newConfig));
  };

  const handleUploadVideo = async (state: PetState) => {
    const result = await open({ multiple: false, filters: [{ name: '短视频（建议5秒内）', extensions: ['mp4', 'webm'] }] });
    if (typeof result !== 'string') return;
    const newConfig: PetStateMediaConfig = {
      ...mediaConfig[state], userAnimatedPath: result, userAnimatedType: 'video',
    };
    setStateMediaConfig(state, newConfig);
    await setSetting(`petMedia_${state}`, JSON.stringify(newConfig));
  };

  const handleUpdateFrameInterval = async (state: PetState, ms: number) => {
    const newConfig = { ...mediaConfig[state], frameInterval: ms };
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

        let previewSrc: string | null = null;
        if (cfg.userAnimatedPath && cfg.userAnimatedType !== 'video') {
          previewSrc = convertFileSrc(cfg.userAnimatedPath);
        } else if (cfg.userFrames.length > 0) {
          previewSrc = convertFileSrc(cfg.userFrames[0]);
        } else {
          previewSrc = cfg.defaultAsset;
        }

        let configDesc = '内置默认';
        if (cfg.userAnimatedPath) {
          const name = cfg.userAnimatedPath.split('/').pop() ?? '';
          configDesc = cfg.userAnimatedType === 'video' ? `视频：${name}` : `GIF：${name}`;
        } else if (cfg.userFrames.length > 0) {
          configDesc = `${cfg.userFrames.length}帧 · ${cfg.frameInterval}ms`;
        }

        return (
          <div key={state} className="border border-border rounded-lg p-3">
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 rounded border border-border overflow-hidden flex items-center justify-center bg-muted flex-shrink-0">
                {cfg.userAnimatedType === 'video' ? (
                  <span className="text-lg">🎬</span>
                ) : previewSrc ? (
                  <img src={previewSrc} alt={meta.label} className="w-full h-full object-contain" />
                ) : (
                  <span className="text-lg">🐾</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="font-medium text-sm">{meta.label}</span>
                  <span className="text-xs text-muted-foreground">{configDesc}</span>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => handleUploadPng(state)}>PNG</Button>
                  <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => handleUploadGif(state)}>GIF</Button>
                  <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => handleUploadVideo(state)}>视频</Button>
                  {(cfg.userFrames.length > 0 || cfg.userAnimatedPath) && (
                    <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => handleClear(state)}>清除</Button>
                  )}
                </div>
                {cfg.userFrames.length > 1 && !cfg.userAnimatedPath && (
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs text-muted-foreground">帧率</span>
                    <Slider value={[cfg.frameInterval]} onValueChange={([v]) => handleUpdateFrameInterval(state, v)}
                      min={50} max={500} step={50} className="w-24" />
                    <span className="text-xs text-muted-foreground">{cfg.frameInterval}ms</span>
                  </div>
                )}
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
        <Button variant="outline" onClick={() => setSystemPrompt(DEFAULT_PROMPT)}>重置为默认</Button>
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
