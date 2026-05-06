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
import { DEFAULT_MEDIA_CONFIG, isBuiltinAsset } from '@/features/pet/animations';
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { convertFileSrc } from '@tauri-apps/api/core';

const DEFAULT_PROMPT = `你是{pet_name}，一只温柔、机智、偶尔调皮的橘猫，住在用户的桌面上。你热爱陪伴主人工作，会用轻松幽默的语气聊天。你擅长编程、写作、分析问题，也会提醒主人注意休息和喝水。你的回答应该简洁有用，偶尔展现猫咪的可爱本性。`;

type SettingsSection = 'appearance' | 'pet' | 'behavior' | 'image' | 'ai' | 'voice' | 'shortcuts' | 'privacy';

const SECTIONS: { id: SettingsSection; label: string }[] = [
  { id: 'appearance', label: '外观与悬浮球' },
  { id: 'pet', label: '宠物身份' },
  { id: 'behavior', label: '灵宠行为' },
  { id: 'image', label: '形象自定义' },
  { id: 'ai', label: 'AI 与对话' },
  { id: 'voice', label: '语音' },
  { id: 'shortcuts', label: '快捷键' },
  { id: 'privacy', label: '隐私与数据' },
];

export function SettingsPanel() {
  const [activeSection, setActiveSection] = useState<SettingsSection>('appearance');
  const { settings, loaded, loadSettings, updateSetting } = useSettingsStore();
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
    <div className="flex flex-col gap-1">
      {SECTIONS.map((s) => (
        <button
          key={s.id}
          className={`text-left px-3 py-2 rounded-md text-sm transition-colors ${
            activeSection === s.id
              ? 'bg-accent text-accent-foreground font-medium'
              : 'hover:bg-accent/50'
          }`}
          onClick={() => setActiveSection(s.id)}
        >
          {s.label}
        </button>
      ))}
    </div>
  );

  return (
    <SettingsLayout sidebar={sidebar}>
      {activeSection === 'appearance' && (
        <AppearanceSection settings={settings} updateSetting={updateSetting} />
      )}
      {activeSection === 'pet' && (
        <PetIdentitySection settings={settings} updateSetting={updateSetting} />
      )}
      {activeSection === 'behavior' && (
        <BehaviorSection settings={settings} updateSetting={updateSetting} />
      )}
      {activeSection === 'image' && <ImageSection />}
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
      {activeSection === 'voice' && (
        <VoiceSection settings={settings} updateSetting={updateSetting} />
      )}
      {activeSection === 'shortcuts' && (
        <ShortcutsSection settings={settings} updateSetting={updateSetting} />
      )}
      {activeSection === 'privacy' && <PrivacySection />}
    </SettingsLayout>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-lg font-semibold mb-4">{children}</h2>;
}

function SettingRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-3">
      <span className="text-sm">{label}</span>
      <div className="flex items-center gap-2">{children}</div>
    </div>
  );
}

function AppearanceSection({
  settings,
  updateSetting,
}: {
  settings: import('./settingsStore').AppSettings;
  updateSetting: import('./settingsStore').SettingsState['updateSetting'];
}) {
  return (
    <>
      <SectionTitle>外观与悬浮球</SectionTitle>
      <SettingRow label="主题">
        <select
          className="bg-input border border-border rounded px-2 py-1 text-sm"
          value={settings.theme}
          onChange={(e) => updateSetting('theme', e.target.value as 'light' | 'dark' | 'system')}
        >
          <option value="system">跟随系统</option>
          <option value="light">浅色</option>
          <option value="dark">深色</option>
        </select>
      </SettingRow>
      <SettingRow label="灵宠透明度">
        <span className="text-xs text-muted-foreground w-8">{settings.petOpacity.toFixed(1)}</span>
        <Slider
          value={[settings.petOpacity]}
          onValueChange={([v]) => updateSetting('petOpacity', v)}
          min={0.6}
          max={1}
          step={0.05}
          className="w-32"
        />
      </SettingRow>
      <SettingRow label="灵宠大小">
        <span className="text-xs text-muted-foreground w-8">{settings.petScale.toFixed(1)}</span>
        <Slider
          value={[settings.petScale]}
          onValueChange={([v]) => updateSetting('petScale', v)}
          min={0.5}
          max={2}
          step={0.1}
          className="w-32"
        />
      </SettingRow>
      <SettingRow label="对话框宽度">
        <select
          className="bg-input border border-border rounded px-2 py-1 text-sm"
          value={settings.dialogWidth}
          onChange={(e) => updateSetting('dialogWidth', Number(e.target.value))}
        >
          <option value={320}>320px</option>
          <option value={360}>360px</option>
          <option value={420}>420px</option>
        </select>
      </SettingRow>
    </>
  );
}

function PetIdentitySection({
  settings,
  updateSetting,
}: {
  settings: import('./settingsStore').AppSettings;
  updateSetting: import('./settingsStore').SettingsState['updateSetting'];
}) {
  return (
    <>
      <SectionTitle>宠物身份</SectionTitle>
      <SettingRow label="宠物名字">
        <Input
          value={settings.petName}
          onChange={(e) => updateSetting('petName', e.target.value)}
          className="w-48"
        />
      </SettingRow>
    </>
  );
}

function BehaviorSection({
  settings,
  updateSetting,
}: {
  settings: import('./settingsStore').AppSettings;
  updateSetting: import('./settingsStore').SettingsState['updateSetting'];
}) {
  return (
    <>
      <SectionTitle>灵宠行为</SectionTitle>
      <SettingRow label="智能附着">
        <Switch
          checked={settings.smartAttach}
          onCheckedChange={(v) => updateSetting('smartAttach', v)}
        />
      </SettingRow>
      <SettingRow label="附着活跃度">
        <select
          className="bg-input border border-border rounded px-2 py-1 text-sm"
          value={settings.attachActivity}
          onChange={(e) => updateSetting('attachActivity', e.target.value as 'low' | 'medium' | 'high')}
        >
          <option value="low">低</option>
          <option value="medium">中</option>
          <option value="high">高</option>
        </select>
      </SettingRow>
      <SettingRow label="置顶">
        <Switch
          checked={settings.alwaysOnTop}
          onCheckedChange={(v) => updateSetting('alwaysOnTop', v)}
        />
      </SettingRow>
    </>
  );
}

const STATE_META: Record<PetState, { label: string; desc: string }> = {
  idle:     { label: '待机',   desc: '默认状态，无操作时显示' },
  yawn:     { label: '哈欠',   desc: '5分钟无交互后自动触发，结束后进入睡眠' },
  happy:    { label: '高兴',   desc: 'AI回复完成后触发，持续3秒' },
  sleeping: { label: '睡眠',   desc: '哈欠结束后进入，点击灵宠唤醒' },
  running:  { label: '奔跑',   desc: '拖拽灵宠时播放' },
  thinking: { label: '思考中', desc: '等待AI回复期间显示' },
};

function toPreviewSrc(path: string): string {
  if (isBuiltinAsset(path)) return path;
  return convertFileSrc(path);
}

function ImageSection() {
  const { mediaConfig, setStateMediaConfig, resetMediaConfig } = usePetStore();

  const handleUploadPng = async (state: PetState) => {
    try {
      const result = await open({
        multiple: true,
        filters: [{ name: 'PNG图片', extensions: ['png'] }],
      });
      if (!result || result.length === 0) return;
      const paths = (Array.isArray(result) ? result : [result]).sort();
      const current = mediaConfig[state];
      const newConfig: PetStateMediaConfig = {
        frames: paths,
        frameInterval: current.frameInterval,
        animatedPath: null,
        animatedType: null,
      };
      setStateMediaConfig(state, newConfig);
      await setSetting(`petMedia_${state}`, JSON.stringify(newConfig));
    } catch (e) {
      console.error('PNG upload failed:', e);
    }
  };

  const handleUploadGif = async (state: PetState) => {
    try {
      const result = await open({
        multiple: false,
        filters: [{ name: 'GIF动图', extensions: ['gif'] }],
      });
      if (typeof result !== 'string') return;
      const current = mediaConfig[state];
      const newConfig: PetStateMediaConfig = {
        frames: current.frames,
        frameInterval: current.frameInterval,
        animatedPath: result,
        animatedType: 'gif',
      };
      setStateMediaConfig(state, newConfig);
      await setSetting(`petMedia_${state}`, JSON.stringify(newConfig));
    } catch (e) {
      console.error('GIF upload failed:', e);
    }
  };

  const handleUploadVideo = async (state: PetState) => {
    try {
      const result = await open({
        multiple: false,
        filters: [{ name: '短视频（建议5秒内）', extensions: ['mp4', 'webm'] }],
      });
      if (typeof result !== 'string') return;
      const current = mediaConfig[state];
      const newConfig: PetStateMediaConfig = {
        frames: current.frames,
        frameInterval: current.frameInterval,
        animatedPath: result,
        animatedType: 'video',
      };
      setStateMediaConfig(state, newConfig);
      await setSetting(`petMedia_${state}`, JSON.stringify(newConfig));
    } catch (e) {
      console.error('Video upload failed:', e);
    }
  };

  const handleClear = async (state: PetState) => {
    setStateMediaConfig(state, DEFAULT_MEDIA_CONFIG[state]);
    try { await setSetting(`petMedia_${state}`, JSON.stringify(DEFAULT_MEDIA_CONFIG[state])); } catch {}
  };

  const handleClearAll = async () => {
    resetMediaConfig();
    const states: PetState[] = ['idle', 'yawn', 'happy', 'sleeping', 'running', 'thinking'];
    for (const s of states) {
      try { await setSetting(`petMedia_${s}`, JSON.stringify(DEFAULT_MEDIA_CONFIG[s])); } catch {}
    }
  };

  const handleFrameInterval = async (state: PetState, ms: number) => {
    const current = mediaConfig[state];
    const newConfig = { ...current, frameInterval: ms };
    setStateMediaConfig(state, newConfig);
    await setSetting(`petMedia_${state}`, JSON.stringify(newConfig));
  };

  const allStates: PetState[] = ['idle', 'yawn', 'happy', 'sleeping', 'running', 'thinking'];

  return (
    <>
      <SectionTitle>形象自定义</SectionTitle>
      <p className="text-sm text-muted-foreground mb-4">
        为每个状态上传 PNG（支持多帧逐帧播放）、GIF 或短视频。
      </p>
      <div className="space-y-4">
        {allStates.map((state) => {
          const config = mediaConfig[state];
          const hasCustom = config !== DEFAULT_MEDIA_CONFIG[state];
          const isMultiFrame = config.frames.length > 1 && !config.animatedPath;
          const previewSrc = config.animatedPath
            ? toPreviewSrc(config.animatedPath)
            : config.frames.length > 0
              ? toPreviewSrc(config.frames[0])
              : null;

          return (
            <div key={state} className="border border-border rounded-lg p-3">
              <div className="flex items-start gap-3">
                {/* Preview */}
                <div className="w-16 h-16 flex items-center justify-center shrink-0">
                  {config.animatedType === 'video' ? (
                    <span className="text-2xl">🎬</span>
                  ) : previewSrc ? (
                    <img
                      src={previewSrc}
                      alt={state}
                      className="w-16 h-16 object-contain rounded border border-border"
                    />
                  ) : (
                    <span className="text-xs text-muted-foreground">无</span>
                  )}
                </div>
                {/* Info + controls */}
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm">{STATE_META[state].label}</div>
                  <div className="text-xs text-muted-foreground mb-2">{STATE_META[state].desc}</div>
                  {hasCustom && (
                    <div className="text-xs text-muted-foreground mb-2">
                      {config.animatedType === 'gif' ? 'GIF' : config.animatedType === 'video' ? '视频' : `${config.frames.length} 帧`}
                    </div>
                  )}
                  <div className="flex gap-2 flex-wrap">
                    <Button variant="outline" size="sm" onClick={() => handleUploadPng(state)}>
                      PNG
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleUploadGif(state)}>
                      GIF
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleUploadVideo(state)}>
                      视频
                    </Button>
                    {hasCustom && (
                      <Button variant="ghost" size="sm" onClick={() => handleClear(state)}>
                        清除
                      </Button>
                    )}
                  </div>
                  {isMultiFrame && (
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs text-muted-foreground shrink-0">帧率</span>
                      <Slider
                        value={[config.frameInterval]}
                        onValueChange={([v]) => handleFrameInterval(state, v)}
                        min={50}
                        max={500}
                        step={50}
                        className="w-32"
                      />
                      <span className="text-xs text-muted-foreground w-12">{config.frameInterval}ms</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <Separator className="my-4" />
      <Button variant="outline" size="sm" onClick={handleClearAll}>
        恢复默认
      </Button>
    </>
  );
}

function AISection({
  settings,
  updateSetting,
  systemPrompt,
  setSystemPrompt,
  configs,
  newConfig,
  setNewConfig,
  addConfig,
  removeConfig,
  setDefault,
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
      const result = await invoke<{ success: boolean; message: string; latency_ms: number }>(
        'test_ai_connection',
        { configId }
      );
      setTestResult((prev) => ({
        ...prev,
        [configId]: result.success
          ? `成功 (${result.latency_ms}ms)`
          : `失败: ${result.message}`,
      }));
    } catch (e) {
      setTestResult((prev) => ({ ...prev, [configId]: `错误: ${e}` }));
    }
  };

  const handleSavePrompt = async () => {
    await updateSystemPrompt(systemPrompt);
  };

  return (
    <>
      <SectionTitle>AI 配置</SectionTitle>

      {/* Existing configs */}
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
                <Button variant="ghost" size="sm" onClick={() => setDefault(c.id)}>
                  设为默认
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={() => handleTest(c.id)}>
                测试
              </Button>
              <Button variant="ghost" size="sm" onClick={() => removeConfig(c.id, c.keyringRef)}>
                删除
              </Button>
            </div>
          </div>
          <div className="text-xs text-muted-foreground">{c.baseUrl}</div>
          {testResult[c.id] && (
            <div className="text-xs mt-1">{testResult[c.id]}</div>
          )}
        </div>
      ))}

      <Separator className="my-4" />

      {/* Add new config */}
      <h3 className="text-sm font-medium mb-3">添加 API 配置</h3>
      <div className="space-y-3">
        <select
          className="w-full bg-input border border-border rounded px-3 py-2 text-sm"
          value={newConfig.provider}
          onChange={(e) => setNewConfig({ ...newConfig, provider: e.target.value })}
        >
          <option value="openai">OpenAI</option>
          <option value="anthropic">Anthropic</option>
          <option value="groq">Groq</option>
          <option value="custom">自定义</option>
        </select>
        <Input
          placeholder="Base URL (e.g. https://api.openai.com/v1)"
          value={newConfig.baseUrl}
          onChange={(e) => setNewConfig({ ...newConfig, baseUrl: e.target.value })}
        />
        <Input
          placeholder="Model (e.g. gpt-4o-mini)"
          value={newConfig.model}
          onChange={(e) => setNewConfig({ ...newConfig, model: e.target.value })}
        />
        <Input
          type="password"
          placeholder="API Key"
          value={newConfig.apiKey}
          onChange={(e) => setNewConfig({ ...newConfig, apiKey: e.target.value })}
        />
        <Button onClick={handleAdd} disabled={!newConfig.baseUrl || !newConfig.model || !newConfig.apiKey}>
          添加
        </Button>
      </div>

      <Separator className="my-6" />

      {/* System Prompt */}
      <SectionTitle>System Prompt</SectionTitle>
      <Textarea
        value={systemPrompt}
        onChange={(e) => setSystemPrompt(e.target.value)}
        rows={6}
        className="font-mono text-sm"
      />
      <div className="flex gap-2 mt-3">
        <Button onClick={handleSavePrompt}>保存</Button>
        <Button variant="outline" onClick={() => setSystemPrompt(DEFAULT_PROMPT)}>
          重置为默认
        </Button>
      </div>

      <Separator className="my-6" />

      {/* Model settings */}
      <SettingRow label="温度 (Temperature)">
        <span className="text-xs text-muted-foreground w-8">{settings.temperature.toFixed(1)}</span>
        <Slider
          value={[settings.temperature]}
          onValueChange={([v]) => updateSetting('temperature', v)}
          min={0}
          max={2}
          step={0.1}
          className="w-32"
        />
      </SettingRow>
      <SettingRow label="最大输出 Token">
        <Input
          type="number"
          value={settings.maxTokens}
          onChange={(e) => updateSetting('maxTokens', Number(e.target.value))}
          className="w-24"
        />
      </SettingRow>
      <SettingRow label="流式输出">
        <Switch
          checked={settings.streamOutput}
          onCheckedChange={(v) => updateSetting('streamOutput', v)}
        />
      </SettingRow>
    </>
  );
}

function VoiceSection({
  settings,
  updateSetting,
}: {
  settings: import('./settingsStore').AppSettings;
  updateSetting: import('./settingsStore').SettingsState['updateSetting'];
}) {
  return (
    <>
      <SectionTitle>语音</SectionTitle>
      <SettingRow label="语音输入语言">
        <select
          className="bg-input border border-border rounded px-2 py-1 text-sm"
          value={settings.voiceInputLang}
          onChange={(e) => updateSetting('voiceInputLang', e.target.value)}
        >
          <option value="system">跟随系统</option>
          <option value="zh-CN">简体中文</option>
          <option value="en-US">英文</option>
        </select>
      </SettingRow>
      <SettingRow label="语音输出">
        <Switch
          checked={settings.voiceOutput}
          onCheckedChange={(v) => updateSetting('voiceOutput', v)}
        />
      </SettingRow>
    </>
  );
}

function ShortcutsSection({
  settings,
  updateSetting,
}: {
  settings: import('./settingsStore').AppSettings;
  updateSetting: import('./settingsStore').SettingsState['updateSetting'];
}) {
  return (
    <>
      <SectionTitle>快捷键</SectionTitle>
      <SettingRow label="全局唤起">
        <Input
          value={settings.globalShortcut}
          onChange={(e) => updateSetting('globalShortcut', e.target.value)}
          className="w-48"
          readOnly
        />
      </SettingRow>
      <SettingRow label="截图快捷键">
        <Input
          value={settings.screenshotShortcut}
          onChange={(e) => updateSetting('screenshotShortcut', e.target.value)}
          className="w-48"
          readOnly
        />
      </SettingRow>
    </>
  );
}

function PrivacySection() {
  return (
    <>
      <SectionTitle>隐私与数据</SectionTitle>
      <div className="space-y-3">
        <Button variant="destructive" size="sm" disabled>
          清除所有对话历史
        </Button>
        <br />
        <Button variant="destructive" size="sm" disabled>
          删除所有 API 配置
        </Button>
        <br />
        <Button variant="outline" size="sm" disabled>
          导出对话资料 (JSON)
        </Button>
      </div>
    </>
  );
}
