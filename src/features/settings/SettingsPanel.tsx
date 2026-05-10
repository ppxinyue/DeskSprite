import { useCallback, useEffect, useRef, useState } from 'react';
import { BarChart3, Bell, Bot, BriefcaseBusiness, CalendarDays, Check, ChevronDown, ChevronLeft, ChevronRight, Clock3, ExternalLink, Gamepad2, Globe2, Loader2, MessageSquareText, Monitor, Music2, Palette, PawPrint, Pencil, Plus, Settings2, Terminal, Trash2, UserRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { SettingsLayout } from '@/components/layouts/SettingsLayout';
import { useSettingsStore, type AvatarRenderMode, type CodingProvider, type ModelMode, type PetMotionName, type PetMotionSettings, type VoiceProviderMode } from '@/features/settings/settingsStore';
import { useApiConfigStore, type ApiConfig } from '@/features/settings/apiConfigStore';
import { usePetStore } from '@/features/pet/petStore';
import { BUILTIN_CLOSEAI_CONFIG, getBuiltinUsageStats } from '@/features/ai/defaultModel';
import { DEFAULT_SYSTEM_PROMPT, ORB_SYSTEM_PROMPT, normalizeOrbSystemPrompt, normalizeSystemPrompt } from '@/features/ai/systemPrompt';
import { PROVIDER_PRESETS, getProviderName } from '@/features/ai/providers';
import { BUILTIN_STT_MODEL, BUILTIN_TTS_MODEL, getBuiltinVoiceUsageStats } from '@/features/voice/voiceService';
import { describeApiKey, resolveStoredApiKey } from '@/lib/apiKeyStorage';
import { getConversations, getFocusStatsDays, getMessages, getSetting, getSystemPrompt, getTimelineEntries, setSetting, updateSystemPrompt, type FocusStatsDay, type TimelineCategory, type TimelineEntry } from '@/lib/db';
import type { PetState } from '@/features/pet/animations';
import { ALL_PET_STATES, DEFAULT_MEDIA_CONFIG, STATE_META, getBuiltinAssetUrl, isBuiltinAsset, normalizePetMediaConfig, type PetStateMediaConfig } from '@/features/pet/animations';
import { convertFileSrc, invoke } from '@tauri-apps/api/core';
import { emit, listen } from '@tauri-apps/api/event';
import { open } from '@tauri-apps/plugin-dialog';
import type { ComponentProps, MouseEvent, ReactNode } from 'react';

type SettingsSection = 'profile' | 'appearance' | 'reminders' | 'ai' | 'history' | 'general';
const ALLOWED_STATIC_IMAGE_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'webp', 'bmp']);
const ALLOWED_GIF_EXTENSIONS = new Set(['gif']);
const MASKED_API_KEY = '••••••••';

const SECTIONS: { id: SettingsSection; label: string; icon: typeof Palette }[] = [
  { id: 'profile', label: '个人档案', icon: UserRound },
  { id: 'general', label: '通用', icon: Settings2 },
  { id: 'appearance', label: '外观', icon: Palette },
  { id: 'reminders', label: '提醒事项', icon: Bell },
  { id: 'ai', label: 'AI 对话', icon: Bot },
  { id: 'history', label: '对话历史', icon: Clock3 },
];

export function SettingsPanel() {
  const [activeSection, setActiveSection] = useState<SettingsSection>('profile');
  const { settings, loaded, loadSettings, updateSetting, updateSettings } = useSettingsStore();
  const { configs, loadConfigs, removeConfig, setDefault } = useApiConfigStore();
  const [systemPrompt, setSystemPrompt] = useState(DEFAULT_SYSTEM_PROMPT);
  const [orbSystemPrompt, setOrbSystemPrompt] = useState(ORB_SYSTEM_PROMPT);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<any>(null);
  const [testingConfigId, setTestingConfigId] = useState<number | null>(null);
  const [testResults, setTestResults] = useState<Record<number, { success: boolean; message: string; latency?: number }>>({});

  useEffect(() => {
    loadSettings();
    loadConfigs();
    getSystemPrompt().then((prompt) => setSystemPrompt(normalizeSystemPrompt(prompt)));
    getSetting('orbSystemPrompt').then((prompt) => setOrbSystemPrompt(normalizeOrbSystemPrompt(prompt)));
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
      {activeSection === 'profile' && <ProfileSection />}
      {activeSection === 'appearance' && (
        <AppearanceSection settings={settings} updateSettings={updateSettings} />
      )}
      {activeSection === 'reminders' && (
        <RemindersSection settings={settings} updateSettings={updateSettings} />
      )}
      {activeSection === 'ai' && (
        <AISection
          settings={settings}
          updateSetting={updateSetting}
          updateSettings={updateSettings}
          systemPrompt={systemPrompt}
          setSystemPrompt={setSystemPrompt}
          orbSystemPrompt={orbSystemPrompt}
          setOrbSystemPrompt={setOrbSystemPrompt}
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
      {activeSection === 'history' && <HistorySection />}
      {activeSection === 'general' && (
        <GeneralSection settings={settings} updateSetting={updateSetting} />
      )}
    </SettingsLayout>
  );
}

function SectionTitle({ children, muted = false }: { children: ReactNode; muted?: boolean }) {
  return (
    <h2 className={`mb-2 text-[18px] font-semibold tracking-[-0.018em] ${muted ? 'text-muted-foreground/55' : 'text-foreground'}`}>
      {children}
    </h2>
  );
}

function SettingRow({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="flex min-h-[48px] items-center justify-between gap-3 border-b border-[#e6e8eb] px-3.5 py-2.5 last:border-0 dark:border-white/10">
      <div className="min-w-0">
        <span className="text-[13px] font-medium leading-5 text-foreground">{label}</span>
        {hint && <p className="mt-0.5 max-w-[420px] text-[11px] leading-4 text-muted-foreground">{hint}</p>}
      </div>
      <div className="flex shrink-0 items-center gap-2">{children}</div>
    </div>
  );
}

function AppearanceRow({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="flex min-h-[48px] items-center justify-between gap-3 border-b border-[#e6e8eb] px-3.5 py-2.5 last:border-0 dark:border-white/10">
      <div className="min-w-0">
        <span className="text-[13px] font-medium leading-5 text-foreground">{label}</span>
        {hint && <p className="mt-0.5 text-[11px] leading-4 text-muted-foreground">{hint}</p>}
      </div>
      <div className="min-w-0 shrink-0">{children}</div>
    </div>
  );
}

function SettingsGroup({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`mb-4 overflow-hidden rounded-[12px] border border-[#dfe3e6] bg-[#fbfcfd]/72 shadow-[0_1px_0_rgba(255,255,255,0.64)_inset,0_8px_22px_rgba(52,64,84,0.045)] backdrop-blur-[24px] dark:border-white/10 dark:bg-white/[0.045] ${className}`}>
      {children}
    </div>
  );
}

function EditableInput({
  value,
  onChange,
  className,
  type = 'text',
  ...props
}: Omit<ComponentProps<typeof Input>, 'value' | 'onChange'> & {
  value: string | number;
  onChange: (value: string) => void;
}) {
  const [editing, setEditing] = useState(false);

  return (
    <div className="flex min-w-0 items-center gap-2">
      <Input
        {...props}
        type={type}
        value={value}
        readOnly={!editing}
        onChange={(event) => onChange(event.target.value)}
        className={className}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-8 shrink-0 px-2.5 text-[12px]"
        onClick={() => setEditing((next) => !next)}
      >
        {editing ? '完成' : '修改'}
      </Button>
    </div>
  );
}

function EditableTextarea({
  value,
  onChange,
  className,
  editing: controlledEditing,
  onEditingChange,
  hideEditButton = false,
  ...props
}: Omit<ComponentProps<typeof Textarea>, 'value' | 'onChange'> & {
  value: string;
  onChange: (value: string) => void;
  editing?: boolean;
  onEditingChange?: (editing: boolean) => void;
  hideEditButton?: boolean;
}) {
  const [internalEditing, setInternalEditing] = useState(false);
  const editing = controlledEditing ?? internalEditing;
  const setEditing = onEditingChange ?? setInternalEditing;

  return (
    <div className="grid gap-2">
      <Textarea
        {...props}
        value={value}
        readOnly={!editing}
        onChange={(event) => onChange(event.target.value)}
        className={className}
      />
      {!hideEditButton && (
        <div className="flex justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 px-2.5 text-[12px]"
            onClick={() => setEditing(!editing)}
          >
            {editing ? '完成' : '修改'}
          </Button>
        </div>
      )}
    </div>
  );
}

function RuleTokenEditor({
  value,
  onChange,
  addLabel,
}: {
  value: string[];
  onChange: (value: string[]) => void;
  addLabel: string;
}) {
  const items = value.length > 0 ? value : [''];

  const updateItem = (index: number, nextValue: string) => {
    const pieces = nextValue.split(/[\n,，]/).map((item) => item.trim()).filter(Boolean);
    if (pieces.length > 1) {
      onChange([...items.slice(0, index), ...pieces, ...items.slice(index + 1)]);
      return;
    }
    onChange(items.map((item, itemIndex) => itemIndex === index ? nextValue : item));
  };

  const deleteItem = (index: number) => {
    const next = items.filter((_, itemIndex) => itemIndex !== index);
    onChange(next.length > 0 ? next : ['']);
  };

  const addItem = () => {
    if (items.some((item) => item.trim() === '')) return;
    onChange([...items, '']);
  };

  return (
    <div className="flex min-h-[86px] flex-wrap content-start gap-2 rounded-[14px] border border-input/75 bg-[var(--surface-raised)] p-2.5 shadow-[0_1px_0_rgba(255,255,255,0.68)_inset,0_8px_22px_rgba(52,64,84,0.045)]">
      {items.map((item, index) => {
        const empty = item.trim() === '';
        return (
          <div
            key={`rule-token-${index}`}
            className="group flex h-8 items-center rounded-[9px] border border-[var(--glass-border)] bg-white/44 shadow-[0_1px_0_rgba(255,255,255,0.66)_inset] transition-colors focus-within:border-ring/55 focus-within:bg-[var(--glass-bg-strong)] dark:bg-white/[0.055]"
          >
            <input
              value={item}
              autoFocus={empty}
              placeholder={addLabel}
              onChange={(event) => updateItem(index, event.target.value)}
              onBlur={() => {
                const cleaned = items.map((entry, itemIndex) => itemIndex === index ? entry.trim() : entry).filter(Boolean);
                onChange(cleaned.length > 0 ? cleaned : ['']);
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  addItem();
                }
                if (event.key === 'Backspace' && item === '' && items.length > 1) {
                  event.preventDefault();
                  deleteItem(index);
                }
              }}
              className="h-full min-w-[72px] max-w-[180px] bg-transparent px-3 text-[13px] leading-5 text-foreground outline-none placeholder:text-muted-foreground/70"
              style={{ width: `${Math.max(6, Math.min(18, item.length + 2))}ch` }}
            />
            <button
              type="button"
              className="mr-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-[7px] text-[14px] leading-none text-muted-foreground transition hover:bg-white/70 hover:text-foreground dark:hover:bg-white/10"
              onClick={() => deleteItem(index)}
              aria-label={`删除 ${item || addLabel}`}
            >
              ×
            </button>
          </div>
        );
      })}
      <button
        type="button"
        className="flex h-8 w-8 items-center justify-center rounded-[9px] border border-dashed border-[#b8c0c6] bg-white/28 text-muted-foreground transition hover:border-[#2f8fff]/55 hover:bg-white/58 hover:text-[#2f8fff] dark:border-white/18 dark:bg-white/[0.035] dark:hover:bg-white/10"
        onClick={addItem}
        aria-label={addLabel}
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
}

function CollapsedUnavailableSection({ title, reason }: { title: string; reason: string }) {
  return (
    <div className="quiet-card mb-6 overflow-hidden rounded-[9px]">
      <button
        type="button"
        disabled
        className="flex h-11 w-full cursor-not-allowed items-center justify-between gap-3 px-4 text-left"
        aria-expanded={false}
      >
        <div className="min-w-0">
          <div className="text-[13px] font-medium text-muted-foreground">{title}</div>
          <div className="mt-0.5 text-[11px] text-muted-foreground/70">{reason}</div>
        </div>
        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground/55" />
      </button>
    </div>
  );
}

function CollapsedUnavailableRow({ title, reason }: { title: string; reason: string }) {
  return (
    <button
      type="button"
      disabled
      className="flex min-h-[56px] w-full cursor-not-allowed items-center justify-between gap-4 border-b border-[#e6e8eb] px-4 py-3 text-left last:border-0 dark:border-white/10"
      aria-expanded={false}
    >
      <div className="min-w-0">
        <div className="text-[13px] font-medium leading-5 text-muted-foreground">{title}</div>
        <div className="mt-1 text-[11px] leading-5 text-muted-foreground/70">{reason}</div>
      </div>
      <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground/55" />
    </button>
  );
}

function ProfileSection() {
  const [selectedDate, setSelectedDate] = useState(() => getLocalDateKey());
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(() => getMonthKey(getLocalDateKey()));
  const [stats, setStats] = useState<FocusStatsDay[]>([]);
  const [timelineEntries, setTimelineEntries] = useState<TimelineEntry[]>([]);
  const [selectedTimelineId, setSelectedTimelineId] = useState<number | null>(null);
  const calendarRef = useRef<HTMLDivElement>(null);
  const statsScrollRef = useRef<HTMLDivElement>(null);

  const loadProfileData = useCallback(() => {
    Promise.all([
      getFocusStatsDays(365, getLocalDateKey()),
      getTimelineEntries(selectedDate),
    ])
      .then(([nextStats, nextTimeline]) => {
        const displayTimeline = nextTimeline.length > 0
          ? nextTimeline
          : selectedDate === shiftDateKey(getLocalDateKey(), -1)
            ? createMockTimelineEntries(selectedDate)
            : [];
        setStats(nextStats);
        setTimelineEntries(displayTimeline);
        setSelectedTimelineId((id) => displayTimeline.some((entry) => entry.id === id) ? id : displayTimeline.at(-1)?.id ?? null);
      })
      .catch(() => {
        setStats([]);
        setTimelineEntries([]);
      });
  }, [selectedDate]);

  useEffect(() => {
    loadProfileData();
    const timer = window.setInterval(loadProfileData, 30_000);
    return () => window.clearInterval(timer);
  }, [loadProfileData]);

  useEffect(() => {
    setCalendarMonth(getMonthKey(selectedDate));
  }, [selectedDate]);

  useEffect(() => {
    const node = statsScrollRef.current;
    if (!node) return;
    const selectedNode = node.querySelector<HTMLElement>(`[data-focus-date="${selectedDate}"]`);
    if (!selectedNode) return;
    const target = selectedNode.offsetLeft - node.clientWidth / 2 + selectedNode.clientWidth / 2;
    node.scrollLeft = Math.max(0, target);
  }, [selectedDate, stats]);

  useEffect(() => {
    if (!calendarOpen) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (!calendarRef.current?.contains(event.target as Node)) setCalendarOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setCalendarOpen(false);
    };
    window.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [calendarOpen]);

  useEffect(() => {
    const unlisten = listen<{ date?: string }>('profile:data-updated', ({ payload }) => {
      if (!payload?.date || payload.date === selectedDate) loadProfileData();
    });
    return () => { unlisten.then((fn) => fn()); };
  }, [loadProfileData, selectedDate]);

  const selectedStats = stats.find((day) => day.date === selectedDate) ?? stats[stats.length - 1] ?? { date: selectedDate, focusMs: 0, focusSessions: 0, distractions: 0, codingMs: 0, distractionApps: {} };
  const focusWindowStart = shiftDateKey(selectedDate, -13);
  const focusWindowStats = stats.filter((day) => day.date >= focusWindowStart && day.date <= selectedDate);
  const maxFocusMs = Math.max(1, ...stats.map((day) => day.focusMs));
  const totalFocusMs = focusWindowStats.reduce((sum, day) => sum + day.focusMs, 0);
  const totalSessions = focusWindowStats.reduce((sum, day) => sum + day.focusSessions, 0);
  const totalDistractions = focusWindowStats.reduce((sum, day) => sum + day.distractions, 0);
  const todayKey = getLocalDateKey();

  return (
    <>
      <div className="mb-5 flex items-center justify-between gap-3">
        <h1 className="text-[18px] font-semibold leading-tight tracking-[-0.018em] text-foreground">个人档案</h1>
        <div ref={calendarRef} className="relative flex items-center gap-1.5 rounded-[9px] border border-border/60 bg-transparent p-1">
          <button
            type="button"
            className="flex h-7 w-7 items-center justify-center rounded-[7px] text-muted-foreground transition-colors hover:bg-background/70 hover:text-foreground"
            onClick={() => {
              setSelectedDate((date) => {
                const next = shiftDateKey(date, -1);
                return next;
              });
            }}
            aria-label="前一天"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            className="flex min-w-[128px] items-center justify-center gap-1.5 rounded-[7px] px-2 text-[12px] font-medium text-foreground transition-colors hover:bg-background/70"
            onClick={() => setCalendarOpen((open) => !open)}
            aria-haspopup="dialog"
            aria-expanded={calendarOpen}
          >
            <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
            {formatDateHeading(selectedDate)}
          </button>
          <button
            type="button"
            className="flex h-7 w-7 items-center justify-center rounded-[7px] text-muted-foreground transition-colors hover:bg-background/70 hover:text-foreground disabled:opacity-35"
            onClick={() => {
              setSelectedDate((date) => {
                const next = shiftDateKey(date, 1);
                return next;
              });
            }}
            disabled={selectedDate >= todayKey}
            aria-label="后一天"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
          {calendarOpen && (
            <ProfileCalendar
              month={calendarMonth}
              selectedDate={selectedDate}
              todayKey={todayKey}
              onMonthChange={setCalendarMonth}
              onSelect={(date) => {
                setSelectedDate(date);
                setCalendarOpen(false);
              }}
            />
          )}
        </div>
      </div>

      <TimelineSection
        date={selectedDate}
        entries={timelineEntries}
        selectedId={selectedTimelineId}
        onSelect={setSelectedTimelineId}
      />

      <div className="mb-4 rounded-[14px] border border-[#dfe3e6] bg-[#fbfcfd] p-3 dark:border-white/10 dark:bg-white/[0.035]">
        <div className="grid divide-y divide-[#e6e8eb] dark:divide-white/10 sm:grid-cols-4 sm:divide-x sm:divide-y-0">
          <ProfileMetric label="专注时长" value={formatFocusDuration(selectedStats.focusMs)} />
          <ProfileMetric label="专注次数" value={`${selectedStats.focusSessions} 次`} />
          <ProfileMetric label="分心次数" value={`${selectedStats.distractions} 次`} />
          <ProfileMetric label="Coding 模式时长" value={formatFocusDuration(selectedStats.codingMs ?? 0)} />
        </div>
      </div>

      <SettingsGroup className="px-4 py-4">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-[13px] font-semibold text-foreground">
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
              14 天专注
            </div>
            <div className="mt-1 text-[11px] text-muted-foreground">
              {formatDateHeading(focusWindowStart)} - {formatDateHeading(selectedDate)} · 共 {formatFocusDuration(totalFocusMs)} · {totalSessions} 次专注 · {totalDistractions} 次分心
            </div>
          </div>
          <div className="hidden text-[11px] text-[#8b8d98] dark:text-white/42 sm:block">
            横向滑动查看历史
          </div>
        </div>

        <div ref={statsScrollRef} className="overflow-x-auto border-b border-[#e6e8eb] pb-2 [scrollbar-width:thin] dark:border-white/10">
          <div className="flex min-w-max items-end gap-1.5 rounded-[12px] border border-[#dfe3e6] bg-[#f7f8f9] px-2 py-2 dark:border-white/10 dark:bg-white/[0.035]">
            {stats.map((day) => {
              const height = Math.max(day.focusMs > 0 ? 8 : 2, (day.focusMs / maxFocusMs) * 72);
              const selected = day.date === selectedDate;
              return (
                <button
                  key={day.date}
                  data-focus-date={day.date}
                  type="button"
                  className={`group flex min-w-[46px] flex-col items-center justify-end rounded-[8px] px-1.5 pb-1 pt-2 transition-colors ${
                    selected ? 'bg-white shadow-sm dark:bg-white/9' : 'hover:bg-white/55 dark:hover:bg-white/7'
                  }`}
                  onClick={() => {
                    setSelectedDate(day.date);
                  }}
                  title={`${formatDateHeading(day.date)} · ${formatFocusDuration(day.focusMs)} · ${day.focusSessions} 次 · 分心 ${day.distractions} 次`}
                >
                  <span className="flex h-[76px] w-full items-end justify-center">
                    <span
                      className={`w-5 rounded-t-[5px] transition-all duration-200 ${
                        selected ? 'bg-[#697177] dark:bg-white/58' : 'bg-[#b8c0c6] group-hover:bg-[#8b8d98] dark:bg-white/18 dark:group-hover:bg-white/34'
                      }`}
                      style={{ height }}
                    />
                  </span>
                  <span className={`mt-1 text-[9px] leading-none ${selected ? 'text-[#3a3d40] dark:text-white/82' : 'text-[#8b8d98] dark:text-white/42'}`}>
                    {formatChartDateLabel(day.date)}
                  </span>
                  <span className={`mt-0.5 text-[8px] leading-none ${selected ? 'text-[#697177] dark:text-white/58' : 'text-[#a0a6ad] dark:text-white/30'}`}>
                    {formatWeekdayShort(day.date)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-3 grid gap-0 overflow-hidden rounded-[12px] border border-[#dfe3e6] bg-[#fbfcfd] dark:border-white/10 dark:bg-white/[0.035] sm:grid-cols-3">
          <MiniMetric label="平均每日专注" value={formatFocusDuration(totalFocusMs / Math.max(1, focusWindowStats.length))} />
          <MiniMetric label="最高单日专注" value={formatFocusDuration(Math.max(0, ...focusWindowStats.map((day) => day.focusMs)))} />
          <MiniMetric label="平均分心次数" value={`${(totalDistractions / Math.max(1, focusWindowStats.length)).toFixed(1)} 次`} />
        </div>
      </SettingsGroup>

      <DistractionAppsPanel apps={selectedStats.distractionApps ?? {}} />
    </>
  );
}

function ProfileMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-3 py-2.5">
      <div className="text-[11px] font-medium text-[#687076] dark:text-white/56">{label}</div>
      <div className="mt-1 text-[17px] font-semibold tracking-[-0.015em] text-[#1c2024] dark:text-white/88">{value}</div>
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-b border-[#e6e8eb] px-3 py-2 last:border-b-0 dark:border-white/10 sm:border-b-0 sm:border-r sm:last:border-r-0">
      <div className="text-[11px] text-[#687076] dark:text-white/56">{label}</div>
      <div className="mt-0.5 text-[13px] font-semibold text-[#1c2024] dark:text-white/82">{value}</div>
    </div>
  );
}

function DistractionAppsPanel({ apps }: { apps: Record<string, { count: number; durationMs: number }> }) {
  const items = Object.entries(apps)
    .map(([appName, value]) => ({ appName, ...value }))
    .sort((a, b) => b.count - a.count || b.durationMs - a.durationMs)
    .slice(0, 6);
  const maxCount = Math.max(1, ...items.map((item) => item.count));
  return (
    <SettingsGroup className="px-4 py-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-[13px] font-semibold text-foreground">
          <Monitor className="h-4 w-4 text-muted-foreground" />
          分心软件排行
        </div>
        {items.length > 0 && (
          <div className="text-[11px] text-[#687076] dark:text-white/56">
            {items.reduce((sum, item) => sum + item.count, 0)} 次 · {formatTimelineDuration(items.reduce((sum, item) => sum + item.durationMs, 0))}
          </div>
        )}
      </div>

      <div className="overflow-hidden rounded-[14px] border border-[#dfe3e6] bg-[#fbfcfd] dark:border-white/10 dark:bg-white/[0.035]">
        {items.length === 0 ? (
          <div className="px-3 py-5 text-center text-[12px] text-[#687076] dark:text-white/56">
            这一天还没有记录到分心软件
          </div>
        ) : items.map((item, index) => (
          <div key={item.appName} className="grid grid-cols-[28px_minmax(82px,1fr)_minmax(120px,1.4fr)_86px] items-center gap-3 border-b border-[#e6e8eb] px-3 py-2.5 text-[11px] last:border-b-0 dark:border-white/10">
            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[#eef0f2] text-[10px] font-semibold text-[#687076] dark:bg-white/8 dark:text-white/58">
              {index + 1}
            </div>
            <div className="min-w-0">
              <div className="truncate text-[12px] font-semibold text-[#1c2024] dark:text-white/84">{item.appName}</div>
              <div className="mt-0.5 text-[10px] text-[#8b8d98] dark:text-white/42">累计 {formatTimelineDuration(item.durationMs)}</div>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-[#eceef0] dark:bg-white/8">
              <div
                className="h-full rounded-full bg-[#ff5f57]/72"
                style={{ width: `${Math.max(6, (item.count / maxCount) * 100)}%` }}
              />
            </div>
            <div className="text-right text-[12px] font-semibold text-[#3a3d40] dark:text-white/76">
              {item.count} 次
            </div>
          </div>
        ))}
      </div>
    </SettingsGroup>
  );
}

const TIMELINE_CATEGORY_META: Record<TimelineCategory, {
  label: string;
  color: string;
  fill: string;
  soft: string;
  Icon: typeof Monitor;
}> = {
  coding: { label: 'Coding', color: '#0090ff', fill: '#9ed0ff', soft: 'rgba(0,144,255,0.12)', Icon: Terminal },
  chat: { label: 'Chat', color: '#218358', fill: '#a8ddb8', soft: 'rgba(33,131,88,0.11)', Icon: MessageSquareText },
  browser: { label: '浏览器', color: '#697177', fill: '#d0d4d9', soft: 'rgba(105,113,119,0.12)', Icon: Globe2 },
  office: { label: '办公', color: '#ad5700', fill: '#f2c36b', soft: 'rgba(173,87,0,0.11)', Icon: BriefcaseBusiness },
  entertainment: { label: '娱乐', color: '#cd1d8d', fill: '#f5b4df', soft: 'rgba(205,29,141,0.11)', Icon: Gamepad2 },
  other: { label: '其他', color: '#60646c', fill: '#c5c7d0', soft: 'rgba(96,100,108,0.11)', Icon: Monitor },
};

function TimelineSection({
  date,
  entries,
  selectedId,
  onSelect,
}: {
  date: string;
  entries: TimelineEntry[];
  selectedId: number | null;
  onSelect: (id: number | null) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [backgroundDetail, setBackgroundDetail] = useState<BackgroundMarkerWithTime[] | null>(null);
  const [hoverCard, setHoverCard] = useState<TimelineHoverCard | null>(null);
  const isMockPreview = entries.some((entry) => entry.id < 0);
  const timelineBlocks = getTimelineBlocks(entries);
  const selectedBlock = timelineBlocks.find((block) => block.entries.some((entry) => entry.id === selectedId)) ?? timelineBlocks.at(-1) ?? null;
  const selected = selectedBlock?.entries[0] ?? null;
  const selectedGroup = selectedBlock?.entries ?? [];
  const animationPlayedRef = useRef(false);
  const visibleCategories = (Object.keys(TIMELINE_CATEGORY_META) as TimelineCategory[])
    .filter((category) => entries.some((entry) => entry.category === category));
  const topApps = getTopTimelineApps(entries);
  const hourlyCounts = getHourlyTaskCounts(entries);
  const maxHourlyCount = Math.max(1, ...hourlyCounts.map((item) => item.count));
  const totalMs = entries.reduce((sum, entry) => sum + getTimelineDurationMs(entry), 0);
  const backgroundMarkers = entries.flatMap((entry) => entry.backgroundMarkers.map((marker) => ({
    ...marker,
    entryId: entry.id,
    startedAt: marker.startedAt ?? entry.startedAt,
    endedAt: marker.endedAt ?? entry.endedAt,
  })));
  const musicMarkers = backgroundMarkers.filter((marker) => marker.type === 'music');
  const terminalMarkers = backgroundMarkers.filter((marker) => marker.type === 'terminal');

  useEffect(() => {
    const node = scrollRef.current;
    if (!node) return;
    if (animationPlayedRef.current) return;
    const progress = date === getLocalDateKey()
      ? getTimelineDayProgress(new Date().toISOString())
      : selected
        ? getTimelineDayProgress(selected.endedAt)
        : 0;
    const animateIntoView = () => {
      animationPlayedRef.current = true;
      node.scrollLeft = 0;
      window.requestAnimationFrame(() => {
        const target = Math.max(0, progress * node.scrollWidth - node.clientWidth / 2);
        node.scrollTo({ left: target, behavior: 'smooth' });
      });
    };
    const observer = new IntersectionObserver((items) => {
      if (items.some((item) => item.isIntersecting)) {
        observer.disconnect();
        animateIntoView();
      }
    }, { threshold: 0.45 });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <SettingsGroup className="mt-4 px-4 py-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-[13px] font-semibold text-foreground">
            <Clock3 className="h-4 w-4 text-muted-foreground" />
            Timeline
            {isMockPreview && (
              <span className="rounded-full border border-[#dfe3e6] bg-white px-1.5 py-0.5 text-[10px] font-medium text-[#687076] dark:border-white/10 dark:bg-white/5 dark:text-white/60">
                昨日示例
              </span>
            )}
          </div>
          <div className="mt-1 text-[11px] text-muted-foreground">
            记录达到最小时长的前台窗口，浏览器会尽量保留当前网站
          </div>
        </div>
        <div className="text-right text-[11px] text-muted-foreground">
          {entries.length} 段 · {formatTimelineDuration(totalMs)}
        </div>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-2">
        {visibleCategories.map((category) => {
          const meta = TIMELINE_CATEGORY_META[category];
          const Icon = meta.Icon;
          return (
            <div key={category} className="flex items-center gap-1.5 text-[11px] font-medium text-[#687076] dark:text-white/62">
              <span className="flex h-4 w-4 items-center justify-center rounded-[5px]" style={{ backgroundColor: meta.soft }}>
                <Icon className="h-3 w-3" style={{ color: meta.color }} />
              </span>
              {meta.label}
            </div>
          );
        })}
      </div>

      <div ref={scrollRef} className="overflow-x-auto pb-2">
        <div className="min-w-[960px]">
          <div className="rounded-[16px] border border-[#dfe3e6] bg-[#f7f8f9] p-4 shadow-[0_1px_0_rgba(255,255,255,0.76)_inset] dark:border-white/10 dark:bg-white/[0.035]">
            <div className="relative h-[74px]">
              {Array.from({ length: 13 }, (_, index) => index * 2).map((hour) => (
                <div
                  key={hour}
                  className="absolute top-0 h-[66px] border-l border-[#e6e8eb] text-[10px] text-[#8b8d98] dark:border-white/7"
                  style={{ left: `${(hour / 24) * 100}%` }}
                >
                  <span className="ml-1">{String(hour).padStart(2, '0')}:00</span>
                </div>
              ))}

              <div className="absolute inset-x-0 top-7 h-12 overflow-hidden rounded-[15px] border border-[#dde1e4] bg-[#edf0f2] shadow-[0_1px_0_rgba(255,255,255,0.9)_inset,0_10px_24px_rgba(28,32,36,0.04)] dark:border-white/10 dark:bg-white/8">
                {entries.length === 0 ? (
                  <div className="flex h-full items-center justify-center text-[12px] text-muted-foreground">
                    暂无足够长的焦点窗口记录
                  </div>
                ) : timelineBlocks.map((block) => (
                  <TimelineSegment
                    key={block.id}
                    block={block}
                    entries={entries}
                    selected={selectedBlock?.id === block.id}
                    onSelect={() => onSelect(block.entries[0]?.id ?? null)}
                    onHover={(event, card) => setHoverCard(positionTimelineHoverCard(event, card))}
                    onLeave={() => setHoverCard(null)}
                  />
                ))}
              </div>
            </div>

            {(musicMarkers.length > 0 || terminalMarkers.length > 0) && (
              <div className="mt-2 space-y-1.5 rounded-[10px] bg-white/24 px-2.5 py-2 dark:bg-white/[0.018]">
                {musicMarkers.length > 0 && (
                  <BackgroundTimelineTrack
                    label="music"
                    icon="music"
                    markers={musicMarkers}
                    onInspect={(marker) => setBackgroundDetail(getRelatedBackgroundMarkers(musicMarkers, marker))}
                    onHover={(event, card) => setHoverCard(positionTimelineHoverCard(event, card))}
                    onLeave={() => setHoverCard(null)}
                  />
                )}
                {terminalMarkers.length > 0 && (
                  <BackgroundTimelineTrack
                    label="terminal"
                    icon="terminal"
                    markers={terminalMarkers}
                    onInspect={(marker) => setBackgroundDetail(getRelatedBackgroundMarkers(terminalMarkers, marker))}
                    onHover={(event, card) => setHoverCard(positionTimelineHoverCard(event, card))}
                    onLeave={() => setHoverCard(null)}
                  />
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {selected && (
        <div className="mt-3 rounded-[14px] border border-[#dfe3e6] bg-[#fbfcfd] p-3 dark:border-white/10 dark:bg-white/[0.035]">
          <div className="mb-2 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-[13px] font-semibold text-foreground">
                {(() => {
                  const Icon = TIMELINE_CATEGORY_META[selected.category].Icon;
                  return <Icon className="h-4 w-4" style={{ color: TIMELINE_CATEGORY_META[selected.category].color }} />;
                })()}
                <span className="truncate">{selected.appName}</span>
                {selected.domain && <span className="rounded-full bg-[#eef0f2] px-2 py-0.5 text-[10px] text-[#687076] dark:bg-white/10 dark:text-white/60">{selected.domain}</span>}
              </div>
              <div className="mt-1 line-clamp-2 text-[12px] leading-5 text-muted-foreground">{selected.windowTitle || '无窗口标题'}</div>
              {selected.url && <div className="mt-1 truncate text-[11px] text-[#687076]">{selected.url}</div>}
            </div>
            <div className="shrink-0 text-right text-[11px] text-muted-foreground">
              <div>{formatTimelineClock(selectedGroup[0]?.startedAt ?? selected.startedAt)} - {formatTimelineClock(selectedGroup.at(-1)?.endedAt ?? selected.endedAt)}</div>
              <div className="mt-0.5 font-medium text-foreground">{formatTimelineDuration(selectedGroup.reduce((sum, entry) => sum + getTimelineDurationMs(entry), 0))}</div>
            </div>
          </div>
          <div className="space-y-1.5 border-t border-[#e6e8eb] pt-2 dark:border-white/10">
            {selectedGroup.map((entry) => (
              <button
                key={`detail-${entry.id}`}
                type="button"
                className={`flex w-full items-start justify-between gap-3 rounded-[9px] px-2 py-1.5 text-left transition-colors ${
                  entry.id === selected.id ? 'bg-[#eef0f2] dark:bg-white/8' : 'hover:bg-[#f1f3f5] dark:hover:bg-white/5'
                }`}
                onClick={() => onSelect(entry.id)}
              >
                <div className="min-w-0">
                  <div className="truncate text-[12px] font-medium text-[#3a3d40] dark:text-white/76">{entry.domain || entry.appName}</div>
                  <div className="mt-0.5 line-clamp-2 text-[11px] leading-4 text-[#687076] dark:text-white/54">{entry.windowTitle || entry.url || '无标题活动'}</div>
                </div>
                <div className="shrink-0 text-right text-[10px] leading-4 text-[#8b8d98]">
                  <div>{formatTimelineClock(entry.startedAt)}</div>
                  <div>{formatTimelineDuration(getTimelineDurationMs(entry))}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {backgroundDetail && backgroundDetail.length > 0 && (
        <div className="mt-3 rounded-[14px] border border-[#dfe3e6] bg-[#fbfcfd] p-3 dark:border-white/10 dark:bg-white/[0.035]">
          <div className="mb-2 flex items-center justify-between gap-3">
            <div className="text-[12px] font-semibold text-foreground">后台详情</div>
            <button type="button" className="text-[11px] text-muted-foreground hover:text-foreground" onClick={() => setBackgroundDetail(null)}>收起</button>
          </div>
          <div className="space-y-1.5">
            {backgroundDetail.map((marker, index) => {
              const detail = marker.detail ? `${marker.name} · ${marker.detail}` : marker.name;
              return (
                <div key={`${marker.type}-${marker.startedAt}-${index}`} className="flex items-start justify-between gap-3 rounded-[9px] bg-[#eef0f2]/70 px-2 py-1.5 text-[11px] dark:bg-white/7">
                  <div className="min-w-0 truncate font-medium text-[#3a3d40] dark:text-white/76">{detail}</div>
                  <div className="shrink-0 text-[#8b8d98]">{formatTimelineClock(marker.startedAt)} - {formatTimelineClock(marker.endedAt)}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="mt-3 grid gap-3 rounded-[14px] border border-[#dfe3e6] bg-[#fbfcfd] p-3 dark:border-white/10 dark:bg-white/[0.035] md:grid-cols-[1fr_1.2fr]">
        <div>
          <div className="mb-2 text-[12px] font-semibold text-foreground">Top 软件</div>
          <div className="space-y-2">
            {(topApps.length > 0 ? topApps : [{ appName: '暂无', durationMs: 0 }]).map((item, index) => (
              <div key={`${item.appName}-${index}`} className="grid grid-cols-[72px_minmax(0,1fr)_82px] items-center gap-2 text-[11px]">
                <div className="truncate font-medium text-[#3a3d40] dark:text-white/74">{item.appName}</div>
                <div className="h-2 overflow-hidden rounded-full bg-[#eceef0] dark:bg-white/8">
                  <div
                    className="h-full rounded-full bg-[#8b8d98]"
                    style={{ width: `${topApps[0]?.durationMs ? Math.max(4, (item.durationMs / topApps[0].durationMs) * 100) : 0}%` }}
                  />
                </div>
                <div className="whitespace-nowrap text-left text-[#687076]">{item.durationMs ? formatTimelineDuration(item.durationMs) : '-'}</div>
              </div>
            ))}
          </div>
        </div>
        <div>
          <div className="mb-2 text-[12px] font-semibold text-foreground">全天活跃度</div>
          <div className="rounded-[10px] bg-[#f8f9fa] px-2 pb-2 pt-3 dark:bg-white/[0.035]">
            <div className="flex h-14 items-end gap-1.5">
              {hourlyCounts.map((item) => (
                <div key={`bar-${item.hour}`} className="group flex min-w-0 flex-1 items-end">
                  <div
                    className="w-full rounded-t-[5px] bg-[#c1c8cd] transition-colors group-hover:bg-[#8b8d98]"
                    style={{ height: `${Math.max(item.count > 0 ? 8 : 2, (item.count / maxHourlyCount) * 48)}px` }}
                    title={`${String(item.hour).padStart(2, '0')}:00 · ${item.count} 个 task`}
                  />
                </div>
              ))}
            </div>
            <div className="mt-1.5 flex gap-1.5">
              {hourlyCounts.map((item) => (
                <div key={`label-${item.hour}`} className="min-w-0 flex-1 text-center text-[9px] leading-none text-[#8b8d98]">
                  {item.hour % 2 === 0 ? item.hour : ''}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      {hoverCard && <TimelineHoverCardView card={hoverCard} />}
    </SettingsGroup>
  );
}

type TimelineHoverCard = {
  x: number;
  y: number;
  eyebrow: string;
  title: string;
  body: string;
  time?: string;
};

type TimelineBlock = {
  id: string;
  appName: string;
  category: TimelineCategory;
  startedAt: string;
  endedAt: string;
  entries: TimelineEntry[];
};

function TimelineSegment({
  block,
  entries,
  selected,
  onSelect,
  onHover,
  onLeave,
}: {
  block: TimelineBlock;
  entries: TimelineEntry[];
  selected: boolean;
  onSelect: () => void;
  onHover: (event: MouseEvent<HTMLElement>, card: Omit<TimelineHoverCard, 'x' | 'y'>) => void;
  onLeave: () => void;
}) {
  const meta = TIMELINE_CATEGORY_META[block.category];
  const left = `${getTimelineDayProgress(block.startedAt) * 100}%`;
  const width = `${Math.max(0.35, ((new Date(block.endedAt).getTime() - new Date(block.startedAt).getTime()) / 86_400_000) * 100)}%`;
  const topContent = getTopTimelineContent(entries, block.appName);
  return (
    <button
      type="button"
      className={`group absolute inset-y-0 overflow-visible transition-[filter,opacity] duration-150 ${
        selected ? 'z-10 brightness-[0.92]' : 'hover:z-20 hover:brightness-[0.96]'
      }`}
      style={{
        left,
        width,
        backgroundColor: meta.fill,
        boxShadow: selected
          ? `inset 0 0 0 1px ${meta.color}, inset 0 1px 0 rgba(255,255,255,0.75)`
          : 'inset 1px 0 0 rgba(255,255,255,0.55), inset -1px 0 0 rgba(255,255,255,0.45)',
      }}
      onClick={onSelect}
      onMouseEnter={(event) => onHover(event, {
        eyebrow: TIMELINE_CATEGORY_META[block.category].label,
        title: block.appName,
        body: topContent,
        time: `${formatTimelineClock(block.startedAt)} - ${formatTimelineClock(block.endedAt)}`,
      })}
      onMouseMove={(event) => onHover(event, {
        eyebrow: TIMELINE_CATEGORY_META[block.category].label,
        title: block.appName,
        body: topContent,
        time: `${formatTimelineClock(block.startedAt)} - ${formatTimelineClock(block.endedAt)}`,
      })}
      onMouseLeave={onLeave}
    >
    </button>
  );
}

type BackgroundMarkerWithTime = TimelineEntry['backgroundMarkers'][number] & {
  entryId: number;
  startedAt: string;
  endedAt: string;
};

function BackgroundTimelineTrack({
  label,
  icon,
  markers,
  onInspect,
  onHover,
  onLeave,
}: {
  label: string;
  icon: 'music' | 'terminal';
  markers: BackgroundMarkerWithTime[];
  onInspect: (marker: BackgroundMarkerWithTime) => void;
  onHover: (event: MouseEvent<HTMLElement>, card: Omit<TimelineHoverCard, 'x' | 'y'>) => void;
  onLeave: () => void;
}) {
  const Icon = icon === 'music' ? Music2 : Terminal;
  return (
    <div className="group/track relative h-7 overflow-visible rounded-[8px] bg-[#eef0f2]/32 dark:bg-white/[0.035]">
      <div className="pointer-events-none sticky left-1.5 z-20 flex h-full w-fit items-center">
        <span className="flex items-center gap-1 rounded-[6px] bg-[#f7f8f9]/92 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-[0.04em] text-[#8b8d98] shadow-[8px_0_14px_rgba(247,248,249,0.92)] dark:bg-[#171719]/92 dark:text-white/42 dark:shadow-[8px_0_14px_rgba(23,23,25,0.92)]">
          <Icon className="h-3 w-3" />
          {label}
        </span>
      </div>
      {markers.map((marker, index) => (
        <BackgroundTimelineMarker
          key={`${marker.entryId}-${marker.type}-${marker.name}-${marker.startedAt}-${index}`}
          marker={marker}
          compactLabel={label}
          onInspect={onInspect}
          onHover={onHover}
          onLeave={onLeave}
        />
      ))}
    </div>
  );
}

function BackgroundTimelineMarker({
  marker,
  compactLabel,
  onInspect,
  onHover,
  onLeave,
}: {
  marker: BackgroundMarkerWithTime;
  compactLabel: string;
  onInspect: (marker: BackgroundMarkerWithTime) => void;
  onHover: (event: MouseEvent<HTMLElement>, card: Omit<TimelineHoverCard, 'x' | 'y'>) => void;
  onLeave: () => void;
}) {
  const left = `${getTimelineDayProgress(marker.startedAt) * 100}%`;
  const width = `${Math.max(1.2, ((new Date(marker.endedAt).getTime() - new Date(marker.startedAt).getTime()) / 86_400_000) * 100)}%`;
  const detail = marker.detail ? `${marker.name} · ${marker.detail}` : marker.name;
  return (
    <button
      type="button"
      className="group/marker absolute top-1/2 h-3.5 -translate-y-1/2"
      style={{ left, width }}
      onClick={() => onInspect(marker)}
      onMouseEnter={(event) => onHover(event, {
        eyebrow: compactLabel,
        title: detail,
        body: '',
        time: `${formatTimelineClock(marker.startedAt)} - ${formatTimelineClock(marker.endedAt)}`,
      })}
      onMouseMove={(event) => onHover(event, {
        eyebrow: compactLabel,
        title: detail,
        body: '',
        time: `${formatTimelineClock(marker.startedAt)} - ${formatTimelineClock(marker.endedAt)}`,
      })}
      onMouseLeave={onLeave}
    >
      <div className="absolute left-0 right-0 top-1/2 h-px -translate-y-1/2 bg-[#8b8d98]/36" />
      <div className="relative h-full min-w-[18px] rounded-full bg-[#8b8d98]/18 ring-1 ring-[#8b8d98]/16 transition-colors group-hover/marker:bg-[#8b8d98]/28 dark:ring-white/10" />
    </button>
  );
}

function positionTimelineHoverCard(event: MouseEvent<HTMLElement>, card: Omit<TimelineHoverCard, 'x' | 'y'>): TimelineHoverCard {
  const width = 300;
  const x = Math.min(window.innerWidth - width - 12, Math.max(12, event.clientX + 14));
  const y = Math.min(window.innerHeight - 132, Math.max(12, event.clientY - 86));
  return { ...card, x, y };
}

function TimelineHoverCardView({ card }: { card: TimelineHoverCard }) {
  return (
    <div
      className="pointer-events-none fixed z-[9999] w-[300px] rounded-[14px] border border-[#dfe3e6] bg-white p-3 text-left text-[11px] leading-4 text-[#687076] shadow-[0_18px_54px_rgba(28,32,36,0.20)] dark:border-white/10 dark:bg-[#1c1c1f] dark:text-white/70"
      style={{ left: card.x, top: card.y }}
    >
      <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8b8d98]">{card.eyebrow}</div>
      <div className="text-[13px] font-semibold text-[#1c2024] dark:text-white">{card.title}</div>
      {card.body && <div className="mt-1 line-clamp-3">{card.body}</div>}
      {card.time && <div className="mt-2 text-[11px] text-[#8b8d98]">{card.time}</div>}
    </div>
  );
}

function createMockTimelineEntries(dateKey: string): TimelineEntry[] {
  const at = (time: string) => new Date(`${dateKey}T${time}:00`).toISOString();
  const item = (
    id: number,
    startedAt: string,
    endedAt: string,
    appName: string,
    windowTitle: string,
    category: TimelineCategory,
    url: string | null = null,
    backgroundMarkers: TimelineEntry['backgroundMarkers'] = [],
  ): TimelineEntry => {
    let domain: string | null = null;
    if (url) {
      try {
        domain = new URL(url).hostname.replace(/^www\./, '');
      } catch {
        domain = null;
      }
    }
    return {
      id,
      date: dateKey,
      startedAt: at(startedAt),
      endedAt: at(endedAt),
      appName,
      windowTitle,
      url,
      domain,
      category,
      backgroundMarkers,
    };
  };

  return [
    item(-1, '09:08', '09:44', 'Arc', 'Radix UI Colors - Usage · Browser', 'browser', 'https://www.radix-ui.com/colors/docs/palette-composition/composing-a-palette', [
      { type: 'music', name: 'Music', detail: 'Nujabes - Aruarian Dance', startedAt: at('09:12'), endedAt: at('09:16') },
      { type: 'music', name: 'Music', detail: 'Uyama Hiroto - Waltz for Life Will Born', startedAt: at('09:16'), endedAt: at('09:20') },
      { type: 'music', name: 'Music', detail: 'Haruka Nakamura - Lamp', startedAt: at('09:20'), endedAt: at('09:24') },
      { type: 'music', name: 'Music', detail: 'Nujabes - Feather', startedAt: at('09:24'), endedAt: at('09:27') },
      { type: 'terminal', name: 'Terminal', detail: 'pnpm electron:dev', startedAt: at('09:45'), endedAt: at('12:45') },
    ]),
    item(-2, '09:45', '10:28', 'Cursor', 'DeskSprite · SettingsPanel.tsx', 'coding'),
    item(-3, '10:31', '10:52', 'WeChat', 'WeChat', 'chat'),
    item(-4, '11:02', '11:38', 'Terminal', 'codex-electron-rewrite · pnpm build', 'coding'),
    item(-5, '13:16', '13:34', 'Safari', 'Apple Human Interface Guidelines', 'browser', 'https://developer.apple.com/design/human-interface-guidelines/'),
    item(-6, '13:34', '13:51', 'Safari', 'Radix UI Colors - Palette composition', 'browser', 'https://www.radix-ui.com/colors/docs/palette-composition/composing-a-palette'),
    item(-7, '13:51', '14:02', 'Safari', 'Transitions.dev - Number pop-in', 'browser', 'https://www.transitions.dev/docs/number-pop-in'),
    item(-8, '14:05', '14:42', 'Keynote', 'DeskSprite Timeline UI Review.key', 'office'),
    item(-9, '15:03', '15:37', 'Slack', 'Slack - design-system', 'chat', null, [
      { type: 'music', name: 'Spotify', detail: 'Tycho - Awake', startedAt: at('15:03'), endedAt: at('15:21') },
      { type: 'music', name: 'Spotify', detail: 'Bonobo - Cirrus', startedAt: at('15:21'), endedAt: at('15:39') },
      { type: 'music', name: 'Spotify', detail: 'Four Tet - Two Thousand and Seventeen', startedAt: at('15:39'), endedAt: at('15:54') },
      { type: 'music', name: 'Spotify', detail: 'Kiasmos - Looped', startedAt: at('15:54'), endedAt: at('16:05') },
    ]),
    item(-10, '16:12', '16:54', 'Arc', 'YouTube - tiny desk concert', 'entertainment', 'https://www.youtube.com/watch?v=mock-preview'),
    item(-11, '17:10', '18:08', 'Visual Studio Code', 'timeline-renderer.tsx - DeskSprite', 'coding'),
  ];
}

function ProfileCalendar({
  month,
  selectedDate,
  todayKey,
  onMonthChange,
  onSelect,
}: {
  month: string;
  selectedDate: string;
  todayKey: string;
  onMonthChange: (month: string) => void;
  onSelect: (date: string) => void;
}) {
  const days = getCalendarMonthDays(month);
  const canGoNext = shiftMonthKey(month, 1) <= getMonthKey(todayKey);
  return (
    <div
      className="glass-panel-strong absolute right-0 top-10 z-50 w-[268px] rounded-[11px] p-3 shadow-[0_18px_46px_rgba(42,38,31,0.16)]"
      role="dialog"
      aria-label="选择统计日期"
      onPointerDown={(event) => event.stopPropagation()}
    >
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          className="flex h-7 w-7 items-center justify-center rounded-[7px] text-muted-foreground transition-colors hover:bg-background/70 hover:text-foreground"
          onClick={() => onMonthChange(shiftMonthKey(month, -1))}
          aria-label="上个月"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </button>
        <div className="text-[13px] font-semibold text-foreground">{formatMonthHeading(month)}</div>
        <button
          type="button"
          className="flex h-7 w-7 items-center justify-center rounded-[7px] text-muted-foreground transition-colors hover:bg-background/70 hover:text-foreground disabled:opacity-35"
          onClick={() => onMonthChange(shiftMonthKey(month, 1))}
          disabled={!canGoNext}
          aria-label="下个月"
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="mb-1 grid grid-cols-7 text-center text-[10px] font-medium text-muted-foreground">
        {['日', '一', '二', '三', '四', '五', '六'].map((day) => (
          <div key={day} className="py-1">{day}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {days.map((day, index) => {
          const disabled = day.outsideMonth || day.date > todayKey;
          const selected = day.date === selectedDate;
          const today = day.date === todayKey;
          return (
            <button
              key={`${day.date}-${index}`}
              type="button"
              disabled={disabled}
              className={`flex h-8 items-center justify-center rounded-[8px] text-[12px] transition-all ${
                selected
                  ? 'bg-[#2f8fff] text-white shadow-none'
                  : today
                    ? 'border border-border/70 text-foreground hover:bg-background/70'
                    : 'text-foreground hover:bg-background/70'
              } ${day.outsideMonth ? 'text-muted-foreground/45' : ''} disabled:pointer-events-none disabled:opacity-30`}
              onClick={() => onSelect(day.date)}
            >
              {Number(day.date.slice(-2))}
            </button>
          );
        })}
      </div>
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
    avatarRenderMode: settings.avatarRenderMode,
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
  const orbMode = draft.avatarRenderMode === 'orb';

  // Sync draft with settings when they change externally
  useEffect(() => {
    setDraft({
      petOpacity: settings.petOpacity,
      petScale: settings.petScale,
      avatarRenderMode: settings.avatarRenderMode,
      dialogWidth: settings.dialogWidth,
      compactChatFontSize: settings.compactChatFontSize,
      theme: settings.theme,
      petMotions: settings.petMotions,
      alwaysOnTop: settings.alwaysOnTop,
    });
  }, [settings.petOpacity, settings.petScale, settings.avatarRenderMode, settings.dialogWidth, settings.compactChatFontSize, settings.theme, settings.petMotions, settings.alwaysOnTop]);

  return (
    <>
      <div className="mb-5">
        <h1 className="text-[18px] font-semibold leading-tight tracking-[-0.018em] text-foreground">外观设置</h1>
      </div>

      <SettingsGroup>
        <AppearanceRow label="形象模式">
          <AvatarModeSelect
            value={draft.avatarRenderMode}
            onChange={(avatarRenderMode) => update('avatarRenderMode', avatarRenderMode)}
          />
        </AppearanceRow>
      </SettingsGroup>

      <SettingsGroup>
        <AppearanceRow label="主题">
          <ThemeSelect
            value={draft.theme}
            onChange={(theme) => update('theme', theme)}
          />
        </AppearanceRow>
        <AppearanceRow label="灵宠/悬浮球透明度">
          <div className="flex max-w-[320px] items-center gap-3">
            <span className="w-12 text-right text-[11px] text-muted-foreground">{draft.petOpacity.toFixed(1)}</span>
            <Slider
              value={[draft.petOpacity]}
              onValueChange={([v]) => update('petOpacity', v)}
              min={0.6} max={1} step={0.05} className="w-52"
            />
          </div>
        </AppearanceRow>
        <AppearanceRow label="灵宠/悬浮球大小">
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

      {orbMode ? (
        <CollapsedUnavailableSection title="自定义形象" reason="Orb 模式由程序绘制，图片与 GIF 设置已收起" />
      ) : (
        <>
          <SectionTitle>自定义形象</SectionTitle>
          <ImageSection />
        </>
      )}

      {orbMode ? (
        <CollapsedUnavailableSection title="灵宠动作" reason="Orb 模式使用代码动效，不需要图片动作参数" />
      ) : (
        <>
          <SectionTitle>灵宠动作</SectionTitle>
          <SettingsGroup>
            <div className="px-4 py-4">
              <p className="mb-3 text-[12px] leading-relaxed text-muted-foreground">
                灵宠形象使用 GIF 动图时，不叠加动作效果
              </p>
              <PetMotionControls
                value={draft.petMotions}
                onChange={(petMotions) => update('petMotions', petMotions)}
              />
            </div>
          </SettingsGroup>
        </>
      )}

    </>
  );
}

function RemindersSection({
  settings,
  updateSettings,
}: {
  settings: import('./settingsStore').AppSettings;
  updateSettings: import('./settingsStore').SettingsState['updateSettings'];
}) {
  const [draft, setDraft] = useState({
    restReminderEnabled: settings.restReminderEnabled,
    restReminderIntervalMinutes: settings.restReminderIntervalMinutes,
    restDurationSeconds: settings.restDurationSeconds,
    focusDurationMinutes: settings.focusDurationMinutes,
    distractionDetectionEnabled: settings.distractionDetectionEnabled,
    distractionGraceSeconds: settings.distractionGraceSeconds,
    distractionBlockedApps: settings.distractionBlockedApps,
    distractionBlockedKeywords: settings.distractionBlockedKeywords,
  });
  const [saving, setSaving] = useState(false);
  const [savedPulse, setSavedPulse] = useState(false);

  useEffect(() => {
    setDraft({
      restReminderEnabled: settings.restReminderEnabled,
      restReminderIntervalMinutes: settings.restReminderIntervalMinutes,
      restDurationSeconds: settings.restDurationSeconds,
      focusDurationMinutes: settings.focusDurationMinutes,
      distractionDetectionEnabled: settings.distractionDetectionEnabled,
      distractionGraceSeconds: settings.distractionGraceSeconds,
      distractionBlockedApps: settings.distractionBlockedApps,
      distractionBlockedKeywords: settings.distractionBlockedKeywords,
    });
  }, [
    settings.restReminderEnabled,
    settings.restReminderIntervalMinutes,
    settings.restDurationSeconds,
    settings.focusDurationMinutes,
    settings.distractionDetectionEnabled,
    settings.distractionGraceSeconds,
    settings.distractionBlockedApps,
    settings.distractionBlockedKeywords,
  ]);

  const update = <K extends keyof typeof draft>(k: K, v: typeof draft[K]) => {
    setDraft((d) => ({ ...d, [k]: v }));
    setSavedPulse(false);
  };

  const dirty =
    draft.restReminderEnabled !== settings.restReminderEnabled ||
    draft.restReminderIntervalMinutes !== settings.restReminderIntervalMinutes ||
    draft.restDurationSeconds !== settings.restDurationSeconds ||
    draft.focusDurationMinutes !== settings.focusDurationMinutes ||
    draft.distractionDetectionEnabled !== settings.distractionDetectionEnabled ||
    draft.distractionGraceSeconds !== settings.distractionGraceSeconds ||
    cleanRuleList(draft.distractionBlockedApps).join('\n') !== cleanRuleList(settings.distractionBlockedApps).join('\n') ||
    cleanRuleList(draft.distractionBlockedKeywords).join('\n') !== cleanRuleList(settings.distractionBlockedKeywords).join('\n');

  const handleApply = async () => {
    setSaving(true);
    try {
      const cleanedDraft = {
        ...draft,
        distractionBlockedApps: cleanRuleList(draft.distractionBlockedApps),
        distractionBlockedKeywords: cleanRuleList(draft.distractionBlockedKeywords),
      };
      await updateSettings(cleanedDraft);
      setDraft(cleanedDraft);
      await emit('reminders:settings-applied', cleanedDraft);
      setSavedPulse(true);
      window.setTimeout(() => setSavedPulse(false), 1200);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <SectionTitle>休息提醒</SectionTitle>
      <SettingsGroup>
        <AppearanceRow label="休息喝水提醒">
          <Switch
            checked={draft.restReminderEnabled}
            onCheckedChange={(v) => update('restReminderEnabled', v)}
          />
        </AppearanceRow>
        <AppearanceRow label="提醒间隔">
          <div className="flex max-w-[320px] items-center gap-3">
            <span className="w-12 text-right text-[11px] text-muted-foreground">{draft.restReminderIntervalMinutes}min</span>
            <Slider
              value={[draft.restReminderIntervalMinutes]}
              onValueChange={([v]) => update('restReminderIntervalMinutes', v)}
              min={1} max={120} step={1} className="w-52"
            />
          </div>
        </AppearanceRow>
        <AppearanceRow label="休息时长">
          <div className="flex max-w-[320px] items-center gap-3">
            <span className="w-12 text-right text-[11px] text-muted-foreground">{Math.round(draft.restDurationSeconds / 60)}min</span>
            <Slider
              value={[draft.restDurationSeconds]}
              onValueChange={([v]) => update('restDurationSeconds', v)}
              min={60} max={7200} step={60} className="w-52"
            />
          </div>
        </AppearanceRow>
      </SettingsGroup>

      <SectionTitle>专注模式</SectionTitle>
      <SettingsGroup>
        <AppearanceRow label="专注时长">
          <div className="flex max-w-[320px] items-center gap-3">
            <span className="w-12 text-right text-[11px] text-muted-foreground">{draft.focusDurationMinutes}min</span>
            <Slider
              value={[draft.focusDurationMinutes]}
              onValueChange={([v]) => update('focusDurationMinutes', v)}
              min={1} max={120} step={1} className="w-52"
            />
          </div>
        </AppearanceRow>
        <AppearanceRow label="分心检测">
          <Switch
            checked={draft.distractionDetectionEnabled}
            onCheckedChange={(v) => update('distractionDetectionEnabled', v)}
          />
        </AppearanceRow>
        <AppearanceRow label="检测宽限期">
          <div className="flex max-w-[320px] items-center gap-3">
            <span className="w-12 text-right text-[11px] text-muted-foreground">{draft.distractionGraceSeconds}s</span>
            <Slider
              value={[draft.distractionGraceSeconds]}
              onValueChange={([v]) => update('distractionGraceSeconds', v)}
              min={0} max={60} step={1} className="w-52"
            />
          </div>
        </AppearanceRow>
        <div className="grid gap-3 px-4 py-4">
          <div>
            <div className="mb-1.5 text-[13px] font-medium text-foreground">屏蔽应用</div>
            <RuleTokenEditor
              value={draft.distractionBlockedApps}
              onChange={(value) => update('distractionBlockedApps', value)}
              addLabel="添加应用"
            />
          </div>
          <div>
            <div className="mb-1.5 text-[13px] font-medium text-foreground">屏蔽关键词</div>
            <RuleTokenEditor
              value={draft.distractionBlockedKeywords}
              onChange={(value) => update('distractionBlockedKeywords', value)}
              addLabel="添加关键词"
            />
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-border/45 py-3">
          {savedPulse && <span className="text-[11px] text-muted-foreground">已应用，前端计时已刷新</span>}
          <Button
            size="sm"
            onClick={handleApply}
            disabled={!dirty || saving}
            className="h-8 rounded-[9px] px-3 text-[12px]"
          >
            {saving ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Check className="mr-1.5 h-3.5 w-3.5" />}
            确认
          </Button>
        </div>
      </SettingsGroup>
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

function cleanRuleList(value: string[]): string[] {
  return value.map((item) => item.trim()).filter(Boolean);
}

function getLocalDateKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getMonthKey(dateKey: string): string {
  return dateKey.slice(0, 7);
}

function shiftMonthKey(monthKey: string, offset: number): string {
  const date = new Date(`${monthKey}-01T00:00:00`);
  date.setMonth(date.getMonth() + offset);
  return getMonthKey(getLocalDateKey(date));
}

function shiftDateKey(dateKey: string, offset: number): string {
  const date = new Date(`${dateKey}T00:00:00`);
  date.setDate(date.getDate() + offset);
  return getLocalDateKey(date);
}

function getCalendarMonthDays(monthKey: string): Array<{ date: string; outsideMonth: boolean }> {
  const first = new Date(`${monthKey}-01T00:00:00`);
  const start = new Date(first);
  start.setDate(first.getDate() - first.getDay());
  return Array.from({ length: 42 }, (_, index) => {
    const day = new Date(start);
    day.setDate(start.getDate() + index);
    const date = getLocalDateKey(day);
    return { date, outsideMonth: getMonthKey(date) !== monthKey };
  });
}

function formatDateHeading(dateKey: string): string {
  const date = new Date(`${dateKey}T00:00:00`);
  const today = getLocalDateKey();
  if (dateKey === today) return '今天';
  if (dateKey === shiftDateKey(today, -1)) return '昨天';
  return date.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' });
}

function formatMonthHeading(monthKey: string): string {
  return new Date(`${monthKey}-01T00:00:00`).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long' });
}

function formatWeekdayShort(dateKey: string): string {
  return new Date(`${dateKey}T00:00:00`).toLocaleDateString('zh-CN', { weekday: 'short' }).replace('周', '');
}

function formatChartDateLabel(dateKey: string): string {
  const [, month, day] = dateKey.split('-');
  return `${Number(month)}/${Number(day)}`;
}

function formatFocusDuration(ms: number): string {
  const minutes = Math.max(0, Math.round(ms / 60_000));
  if (minutes < 60) return `${minutes} 分钟`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest > 0 ? `${hours} 小时 ${rest} 分钟` : `${hours} 小时`;
}

function getTimelineDurationMs(entry: TimelineEntry): number {
  return Math.max(0, new Date(entry.endedAt).getTime() - new Date(entry.startedAt).getTime());
}

function getTimelineBlocks(entries: TimelineEntry[]): TimelineBlock[] {
  const sorted = entries.slice().sort((a, b) => a.startedAt.localeCompare(b.startedAt));
  const blocks: TimelineBlock[] = [];
  for (const entry of sorted) {
    const previous = blocks.at(-1);
    if (previous && previous.appName === entry.appName && previous.category === entry.category) {
      previous.entries.push(entry);
      previous.endedAt = entry.endedAt;
      continue;
    }
    blocks.push({
      id: `${entry.id}-${entry.appName}-${entry.startedAt}`,
      appName: entry.appName,
      category: entry.category,
      startedAt: entry.startedAt,
      endedAt: entry.endedAt,
      entries: [entry],
    });
  }
  return blocks;
}

function getRelatedBackgroundMarkers(markers: BackgroundMarkerWithTime[], selected: BackgroundMarkerWithTime): BackgroundMarkerWithTime[] {
  const selectedStart = new Date(selected.startedAt).getTime();
  const selectedEnd = new Date(selected.endedAt).getTime();
  return markers
    .filter((marker) => {
      const start = new Date(marker.startedAt).getTime();
      const end = new Date(marker.endedAt).getTime();
      return start < selectedEnd && end > selectedStart;
    })
    .sort((a, b) => a.startedAt.localeCompare(b.startedAt));
}

function getTimelineDayProgress(iso: string): number {
  const date = new Date(iso);
  return ((date.getHours() * 60 + date.getMinutes()) * 60 + date.getSeconds()) / 86_400;
}

function formatTimelineClock(iso: string): string {
  return new Date(iso).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false });
}

function formatTimelineDuration(ms: number): string {
  const minutes = Math.max(1, Math.round(ms / 60_000));
  if (minutes < 60) return `${minutes} 分钟`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest > 0 ? `${hours} 小时 ${rest} 分钟` : `${hours} 小时`;
}

function getTopTimelineApps(entries: TimelineEntry[]): Array<{ appName: string; durationMs: number }> {
  const durations = new Map<string, number>();
  for (const entry of entries) {
    durations.set(entry.appName, (durations.get(entry.appName) ?? 0) + getTimelineDurationMs(entry));
  }
  return Array.from(durations.entries())
    .map(([appName, durationMs]) => ({ appName, durationMs }))
    .sort((a, b) => b.durationMs - a.durationMs)
    .slice(0, 4);
}

function getTopTimelineContent(entries: TimelineEntry[], appName: string): string {
  const top = entries
    .filter((entry) => entry.appName === appName)
    .sort((a, b) => getTimelineDurationMs(b) - getTimelineDurationMs(a))[0];
  return top?.domain || top?.windowTitle || top?.url || '无标题活动';
}

function getHourlyTaskCounts(entries: TimelineEntry[]): Array<{ hour: number; count: number }> {
  return Array.from({ length: 24 }, (_, hour) => ({
    hour,
    count: entries.filter((entry) => {
      const start = new Date(entry.startedAt);
      const end = new Date(entry.endedAt);
      const hourStart = new Date(start);
      hourStart.setHours(hour, 0, 0, 0);
      const hourEnd = new Date(hourStart);
      hourEnd.setHours(hour + 1, 0, 0, 0);
      return start < hourEnd && end > hourStart;
    }).length,
  }));
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

function AvatarModeSelect({
  value,
  onChange,
}: {
  value: AvatarRenderMode;
  onChange: (mode: AvatarRenderMode) => void;
}) {
  const options: Array<{ id: AvatarRenderMode; label: string }> = [
    { id: 'pet', label: 'Pet' },
    { id: 'orb', label: 'Orb' },
  ];
  return (
    <div className="flex rounded-[9px] border border-border/60 bg-transparent p-1">
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          className={`h-8 rounded-[7px] px-3 text-[12px] font-medium transition-all ${
            value === option.id
              ? 'bg-background/78 text-foreground shadow-sm'
              : 'text-muted-foreground hover:bg-background/48 hover:text-foreground'
          }`}
          onClick={() => onChange(option.id)}
        >
          {option.label}
        </button>
      ))}
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
              className={`rounded-[9px] px-3 py-2 text-center transition-all duration-200 ${
                active
                  ? 'bg-background/78 text-foreground shadow-[0_1px_0_rgba(255,255,255,0.70)_inset,0_6px_16px_rgba(42,38,31,0.06)]'
                  : 'text-muted-foreground hover:bg-background/42 hover:text-foreground'
              }`}
              onClick={() => handleSchemeChange(option.id)}
            >
              <span className="block whitespace-nowrap text-[13px] font-medium">
                {option.label}
                <span className="text-[12px] font-normal text-muted-foreground">（{option.detail}）</span>
              </span>
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
  settings, updateSetting, systemPrompt, setSystemPrompt, orbSystemPrompt, setOrbSystemPrompt,
  updateSettings,
  configs, onAdd, onEdit, onDelete, onSetDefault, onTest, testResults, testingConfigId,
  isModalOpen, setIsModalOpen, editingConfig,
}: {
  settings: import('./settingsStore').AppSettings;
  updateSetting: import('./settingsStore').SettingsState['updateSetting'];
  updateSettings: import('./settingsStore').SettingsState['updateSettings'];
  systemPrompt: string;
  setSystemPrompt: (v: string) => void;
  orbSystemPrompt: string;
  setOrbSystemPrompt: (v: string) => void;
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
  const orbMode = settings.avatarRenderMode === 'orb';
  const displayedSystemPrompt = orbMode ? orbSystemPrompt : systemPrompt;
  const setDisplayedSystemPrompt = orbMode ? setOrbSystemPrompt : setSystemPrompt;
  const saveDisplayedSystemPrompt = async () => {
    if (orbMode) {
      await setSetting('orbSystemPrompt', JSON.stringify(orbSystemPrompt));
      return;
    }
    await updateSystemPrompt(systemPrompt);
  };
  const resetDisplayedSystemPrompt = () => {
    if (orbMode) {
      setOrbSystemPrompt(ORB_SYSTEM_PROMPT);
      return;
    }
    setSystemPrompt(DEFAULT_SYSTEM_PROMPT);
  };

  const [builtinUsage, setBuiltinUsage] = useState<{
    chat: Awaited<ReturnType<typeof getBuiltinUsageStats>>;
    voice: Awaited<ReturnType<typeof getBuiltinVoiceUsageStats>>;
  } | null>(null);
  const [codingCheck, setCodingCheck] = useState<Record<CodingProvider, { checking: boolean; error: string }>>({
    codex: { checking: false, error: '' },
    claude: { checking: false, error: '' },
  });
  const [systemPromptEditing, setSystemPromptEditing] = useState(false);
  const defaultConfig = configs.find((config) => config.isDefault) ?? configs[0] ?? null;

  const setCodingProviderEnabled = async (provider: CodingProvider, enabled: boolean) => {
    const otherProvider: CodingProvider = provider === 'claude' ? 'codex' : 'claude';
    const otherEnabled = otherProvider === 'claude' ? settings.codingClaudeEnabled : settings.codingCodexEnabled;
    setCodingCheck((prev) => ({ ...prev, [provider]: { checking: enabled, error: '' } }));

    if (enabled) {
      const result = await invoke<{ ok: boolean; message?: string }>('coding_check_provider_config', { provider }).catch((error) => ({
        ok: false,
        message: error instanceof Error ? error.message : String(error),
      }));
      if (!result.ok) {
        setCodingCheck((prev) => ({
          ...prev,
          [provider]: {
            checking: false,
            error: `无法连接到本机${provider === 'claude' ? 'Claude code' : 'Codex'}配置${result.message ? `：${result.message.replace(/^无法连接到本机(?:Codex|Claude code)配置：?/, '')}` : ''}`,
          },
        }));
        return;
      }
      if (provider === 'claude') await updateSetting('codingClaudeEnabled', true);
      else await updateSetting('codingCodexEnabled', true);
      setCodingCheck((prev) => ({ ...prev, [provider]: { checking: false, error: '' } }));
      return;
    }

    const updates: Partial<import('./settingsStore').AppSettings> = {};
    if (provider === 'claude') updates.codingClaudeEnabled = false;
    else updates.codingCodexEnabled = false;
    if (settings.codingProvider === provider) {
      if (otherEnabled) updates.codingProvider = otherProvider;
      else updates.codingModeEnabled = false;
    }
    await updateSettings(updates);
    setCodingCheck((prev) => ({ ...prev, [provider]: { checking: false, error: '' } }));
  };

  const applyVoiceConfig = async (target: 'stt' | 'tts', config: ApiConfig) => {
    const apiKey = config.apiKey?.trim();
    const partial: Partial<import('./settingsStore').AppSettings> = target === 'stt'
      ? {
          customSttBaseUrl: config.baseUrl,
          customSttModel: config.model,
          ...(apiKey ? { customSttApiKey: apiKey } : {}),
        }
      : {
          customTtsBaseUrl: config.baseUrl,
          customTtsModel: config.model,
          ...(apiKey ? { customTtsApiKey: apiKey } : {}),
        };
    await updateSettings(partial);
  };

  const isVoiceConfigActive = (target: 'stt' | 'tts', config: ApiConfig) => {
    return target === 'stt'
      ? settings.customSttBaseUrl === config.baseUrl && settings.customSttModel === config.model
      : settings.customTtsBaseUrl === config.baseUrl && settings.customTtsModel === config.model;
  };

  const renderApiConfigList = (target: 'chat' | 'stt' | 'tts') => (
    <div className="space-y-3 px-4 py-4">
      {configs.map((c) => {
        const testResult = testResults[c.id];
        const isTesting = testingConfigId === c.id;
        const activeVoiceConfig = target !== 'chat' && isVoiceConfigActive(target, c);
        return (
          <div key={`${target}-${c.id}`} className="rounded-lg border border-border p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex items-center gap-2">
                  <span className="font-medium text-[13px]">{getProviderName(c.providerId || c.provider)}</span>
                  {target === 'chat' && c.isDefault && (
                    <span className="shrink-0 rounded border border-[#2f8fff]/20 bg-[#eaf5ff] px-2 py-0.5 text-[11px] text-[#0b6bcb] shadow-none dark:bg-[#2f8fff]/18 dark:text-[#9ed0ff]">默认</span>
                  )}
                  {activeVoiceConfig && (
                    <span className="shrink-0 rounded border border-[#2f8fff]/20 bg-[#eaf5ff] px-2 py-0.5 text-[11px] text-[#0b6bcb] shadow-none dark:bg-[#2f8fff]/18 dark:text-[#9ed0ff]">使用中</span>
                  )}
                </div>
                <div className="mb-1 text-[11px] text-muted-foreground">Model: {c.model}</div>
                <div className="truncate text-[11px] text-muted-foreground">Base URL: {c.baseUrl}</div>
                <div className="mt-1 text-[11px] text-muted-foreground">API Key: {describeApiKey(c.apiKey)}</div>
                {testResult && (
                  <div className={`mt-1 text-[11px] ${testResult.success ? 'text-green-600' : 'text-red-600'}`}>
                    {testResult.message}
                    {testResult.latency !== undefined && ` (${testResult.latency}ms)`}
                  </div>
                )}
              </div>
              <div className="flex shrink-0 gap-1">
                {target === 'chat' && !c.isDefault && (
                  <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => onSetDefault(c.id)}>
                    设为默认
                  </Button>
                )}
                {target !== 'chat' && !activeVoiceConfig && (
                  <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => applyVoiceConfig(target, c)}>
                    使用此配置
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
        <div className="rounded-lg border border-border p-4 text-[13px] text-muted-foreground">
          暂无 API 配置，点击“添加 API Key”添加
        </div>
      )}
    </div>
  );

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
      <SectionTitle>内置额度</SectionTitle>
      <SettingsGroup>
        <div className="px-4 py-4">
          <div className="flex items-center justify-between mb-2">
            <div>
              <span className="font-medium text-[13px]">CloseAI 默认服务</span>
              <span className="text-[11px] text-muted-foreground ml-2">Key: 内置隐藏</span>
            </div>
            <span className="rounded bg-secondary px-2 py-1 text-[11px] text-secondary-foreground">本机额度</span>
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
      </SettingsGroup>

      <SectionTitle>Coding 模式</SectionTitle>
      <SettingsGroup>
        {([
          {
            provider: 'claude' as const,
            label: 'Claude Code',
            enabled: settings.codingClaudeEnabled,
            hint: '开启后，Coding 模式中显示 Claude Code 继承 session 和新 session 入口',
          },
          {
            provider: 'codex' as const,
            label: 'Codex',
            enabled: settings.codingCodexEnabled,
            hint: '开启后，Coding 模式中显示 Codex 继承 session 和新 session 入口',
          },
        ]).map((item) => (
          <SettingRow key={item.provider} label={item.label} hint={item.hint}>
            <div className="flex min-w-[180px] flex-col items-end gap-1">
              <Switch
                checked={item.enabled}
                disabled={codingCheck[item.provider].checking}
                onCheckedChange={(value) => setCodingProviderEnabled(item.provider, value)}
              />
              {codingCheck[item.provider].checking && (
                <span className="text-[11px] text-muted-foreground">正在测试连接...</span>
              )}
              {codingCheck[item.provider].error && (
                <span className="max-w-[260px] text-right text-[11px] leading-4 text-red-600">{codingCheck[item.provider].error}</span>
              )}
            </div>
          </SettingRow>
        ))}
      </SettingsGroup>

      <SectionTitle>Chat 模型</SectionTitle>
      <SettingsGroup>
        <SettingRow
          label="模型"
          hint={settings.chatModelMode === 'custom' && defaultConfig
            ? `自定义：${getProviderName(defaultConfig.providerId || defaultConfig.provider)} · ${defaultConfig.model}`
            : `默认：CloseAI · ${BUILTIN_CLOSEAI_CONFIG.model}`}
        >
          <div className="min-w-0 text-right">
            <select
              className="px-2.5 py-1"
              value={settings.chatModelMode}
              onChange={(e) => updateSetting('chatModelMode', e.target.value as ModelMode)}
            >
              <option value="default">默认</option>
              <option value="custom">自定义</option>
            </select>
          </div>
        </SettingRow>
        {settings.chatModelMode === 'custom' && (
          <>
            <div className="flex items-center justify-between gap-3 border-b border-[#e6e8eb] px-4 py-3 dark:border-white/10">
              <div>
                <div className="text-[13px] font-medium leading-5 text-foreground">自定义配置</div>
                <div className="mt-1 text-[11px] leading-5 text-muted-foreground">Base URL、Model、API Key；标记为默认的配置会用于 Chat</div>
              </div>
              <Button size="sm" onClick={onAdd}>
                <Plus className="mr-1 h-4 w-4" />
                添加 API Key
              </Button>
            </div>
            {renderApiConfigList('chat')}
          </>
        )}

        {orbMode ? (
          <div className="px-4">
            <CollapsedUnavailableRow title="宠物名字" reason="Orb 模式使用通用 AI 助手身份" />
          </div>
        ) : (
          <SettingRow label="宠物名字">
            <EditableInput
              value={settings.petName}
              onChange={(value) => updateSetting('petName', value)}
              className="w-48"
            />
          </SettingRow>
        )}
        <div className="px-4 py-4">
          <div className="mb-2 text-[13px] font-medium leading-5 text-foreground">System Prompt</div>
          {orbMode && (
            <div className="mb-2 text-[11px] leading-5 text-muted-foreground">
              Orb 模式使用独立的 AI 助手 Prompt，不会覆盖灵宠模式的设定。
            </div>
          )}
          <EditableTextarea
            value={displayedSystemPrompt}
            onChange={setDisplayedSystemPrompt}
            rows={6}
            className="font-mono"
            editing={systemPromptEditing}
            onEditingChange={setSystemPromptEditing}
            hideEditButton
          />
          <div className="mt-3 flex gap-2">
            <Button
              variant={systemPromptEditing ? 'default' : 'outline'}
              onClick={() => {
                if (!systemPromptEditing) {
                  setSystemPromptEditing(true);
                  return;
                }
                saveDisplayedSystemPrompt().then(() => setSystemPromptEditing(false));
              }}
            >
              {systemPromptEditing ? '保存' : '修改'}
            </Button>
            <Button variant="outline" onClick={resetDisplayedSystemPrompt}>重置为默认</Button>
          </div>
        </div>
      </SettingsGroup>

      <SectionTitle>语音模型</SectionTitle>
      <SettingsGroup>
        <SettingRow
          label="STT 模型"
          hint={settings.voiceInputProvider === 'user-cloud'
            ? `自定义：${settings.customSttModel || '未设置模型'}`
            : settings.voiceInputProvider === 'system'
              ? '系统输入'
              : `默认：CloseAI · ${BUILTIN_STT_MODEL}`}
        >
          <select
            className="px-2.5 py-1"
            value={settings.voiceInputProvider}
            onChange={(e) => updateSetting('voiceInputProvider', e.target.value as VoiceProviderMode)}
          >
            <option value="cloud-auto">默认</option>
            <option value="user-cloud">自定义</option>
            <option value="system">系统输入</option>
          </select>
        </SettingRow>
        {settings.voiceInputProvider === 'user-cloud' && (
          <div className="border-b border-[#e6e8eb] dark:border-white/10">
            <div className="flex items-center justify-between gap-3 px-4 py-3">
              <div>
                <div className="text-[13px] font-medium leading-5 text-foreground">STT 自定义配置</div>
                <div className="mt-1 text-[11px] leading-5 text-muted-foreground">Base URL、Model、API Key；选择“使用此配置”后用于语音输入</div>
              </div>
              <Button size="sm" onClick={onAdd}>
                <Plus className="mr-1 h-4 w-4" />
                添加 API Key
              </Button>
            </div>
            {renderApiConfigList('stt')}
          </div>
        )}
        <SettingRow label="语音输入语言">
          <select className="px-2.5 py-1" value={settings.voiceInputLang} onChange={(e) => updateSetting('voiceInputLang', e.target.value)}>
            <option value="system">跟随系统</option>
            <option value="zh-CN">简体中文</option>
            <option value="en-US">英文</option>
          </select>
        </SettingRow>
        <SettingRow
          label="TTS 模型"
          hint={settings.voiceOutputProvider === 'user-cloud'
            ? `自定义：${settings.customTtsModel || '未设置模型'}`
            : settings.voiceOutputProvider === 'system'
              ? '系统朗读'
              : `默认：CloseAI · ${BUILTIN_TTS_MODEL}`}
        >
          <select
            className="px-2.5 py-1"
            value={settings.voiceOutputProvider}
            onChange={(e) => updateSetting('voiceOutputProvider', e.target.value as VoiceProviderMode)}
          >
            <option value="cloud-auto">默认</option>
            <option value="user-cloud">自定义</option>
            <option value="system">系统朗读</option>
          </select>
        </SettingRow>
        {settings.voiceOutputProvider === 'user-cloud' && (
          <div className="border-b border-[#e6e8eb] dark:border-white/10">
            <div className="flex items-center justify-between gap-3 px-4 py-3">
              <div>
                <div className="text-[13px] font-medium leading-5 text-foreground">TTS 自定义配置</div>
                <div className="mt-1 text-[11px] leading-5 text-muted-foreground">Base URL、Model、API Key；选择“使用此配置”后用于语音输出</div>
              </div>
              <Button size="sm" onClick={onAdd}>
                <Plus className="mr-1 h-4 w-4" />
                添加 API Key
              </Button>
            </div>
            {renderApiConfigList('tts')}
          </div>
        )}
        <SettingRow label="语音输出">
          <Switch checked={settings.voiceOutput} onCheckedChange={(v) => updateSetting('voiceOutput', v)} />
        </SettingRow>
        <SettingRow label="语音唤醒" hint="开启后，说出唤醒词即可唤醒灵宠对话">
          <Switch checked={settings.wakeWordEnabled} onCheckedChange={(v) => updateSetting('wakeWordEnabled', v)} />
        </SettingRow>
        {settings.wakeWordEnabled && (
          <SettingRow label="唤醒词">
            <EditableInput value={settings.wakeWord} onChange={(value) => updateSetting('wakeWord', value.slice(0, 20))} className="w-48" maxLength={20} />
          </SettingRow>
        )}
        <SettingRow label="自动朗读 AI 回复">
          <Switch checked={settings.autoSpeak} onCheckedChange={(v) => updateSetting('autoSpeak', v)} />
        </SettingRow>
        <SettingRow label="朗读语速">
          <div className="flex items-center gap-3">
            <span className="w-12 text-right text-[11px] text-muted-foreground">{settings.speakRate.toFixed(1)}x</span>
            <Slider value={[settings.speakRate]} onValueChange={([v]) => updateSetting('speakRate', v)} min={0.5} max={2.0} step={0.1} className="w-32" />
          </div>
        </SettingRow>
      </SettingsGroup>

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
        <div className="h-full rounded-full bg-[#2f8fff]/78 shadow-none" style={{ width: `${percent}%` }} />
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

function GeneralSection({
  settings, updateSetting,
}: {
  settings: import('./settingsStore').AppSettings;
  updateSetting: import('./settingsStore').SettingsState['updateSetting'];
}) {
  useEffect(() => {
    invoke<boolean>('get_launch_at_login')
      .then((enabled) => {
        if (enabled !== settings.launchAtLogin) updateSetting('launchAtLogin', enabled).catch(() => {});
      })
      .catch(() => {});
  }, []);

  const updateLaunchAtLogin = async (enabled: boolean) => {
    await updateSetting('launchAtLogin', enabled);
    invoke('set_launch_at_login', { enabled }).catch((error) => console.warn('Failed to update login item:', error));
  };

  return (
    <>
      <SectionTitle>通用</SectionTitle>

      <SettingsGroup>
        <SettingRow label="开机自启" hint="登录 macOS 后自动启动 DeskSprite">
          <Switch checked={settings.launchAtLogin} onCheckedChange={updateLaunchAtLogin} />
        </SettingRow>
        <SettingRow label="Timeline 记录" hint="不开专注模式也会全程记录达到最小时长的前台窗口">
          <Switch checked={settings.timelineRecordingEnabled} onCheckedChange={(v) => updateSetting('timelineRecordingEnabled', v)} />
        </SettingRow>
        <SettingRow label="Timeline 最小时长" hint="短于该时长的快速切屏不会记录，也不会打断当前 app 时段">
          <div className="flex max-w-[260px] items-center gap-3">
            <span className="w-12 text-right text-[11px] text-muted-foreground">{settings.timelineMinSegmentMinutes}min</span>
            <Slider
              value={[settings.timelineMinSegmentMinutes]}
              onValueChange={([v]) => updateSetting('timelineMinSegmentMinutes', v)}
              min={1}
              max={20}
              step={1}
              className="w-40"
            />
          </div>
        </SettingRow>
        <SettingRow label="共享屏幕时隐藏灵宠" hint="默认开启，防止共享屏幕时灵宠进入画面">
          <Switch checked={settings.hidePetDuringScreenShare} onCheckedChange={(v) => updateSetting('hidePetDuringScreenShare', v)} />
        </SettingRow>
      </SettingsGroup>

      <SettingsGroup>
        <SettingRow label="全局唤起">
          <EditableInput value={settings.globalShortcut} onChange={(value) => updateSetting('globalShortcut', value)} className="w-48" />
        </SettingRow>
        <SettingRow label="截图快捷键">
          <EditableInput value={settings.screenshotShortcut} onChange={(value) => updateSetting('screenshotShortcut', value)} className="w-48" />
        </SettingRow>
      </SettingsGroup>

      <SettingsGroup>
        <div className="space-y-3 py-1">
          <Button variant="destructive" size="sm" disabled>清除所有对话历史</Button>
          <br />
          <Button variant="destructive" size="sm" disabled>删除所有 API 配置</Button>
          <br />
          <Button variant="outline" size="sm" disabled>导出对话资料 (JSON)</Button>
        </div>
      </SettingsGroup>
    </>
  );
}

function HistorySection() {
  const { settings, updateSetting } = useSettingsStore();
  const hasCodingHistoryEntry = settings.codingCodexEnabled || settings.codingClaudeEnabled;
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
      const loaded = await Promise.all(convos.filter((c) => !isCodingConversationTitle(c.title)).map(async (c) => {
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

  const openCodingHistory = async () => {
    const nextProvider = settings.codingProvider === 'claude'
      ? (settings.codingClaudeEnabled ? 'claude' : 'codex')
      : (settings.codingCodexEnabled ? 'codex' : 'claude');
    if ((nextProvider === 'codex' && !settings.codingCodexEnabled) || (nextProvider === 'claude' && !settings.codingClaudeEnabled)) return;
    if (nextProvider !== settings.codingProvider) await updateSetting('codingProvider', nextProvider);
    await updateSetting('codingModeEnabled', true);
    await invoke('show_chat_window').catch((error) => {
      console.warn('Failed to open coding history:', error);
    });
  };

  return (
    <>
      <div className="mb-4 flex items-center justify-between gap-3">
        <SectionTitle>对话历史</SectionTitle>
        {hasCodingHistoryEntry && (
          <button
            type="button"
            className="rounded-[8px] px-2 py-1 text-[12px] text-muted-foreground transition hover:bg-background/60 hover:text-foreground"
            onClick={openCodingHistory}
          >
            Coding 历史
          </button>
        )}
      </div>
      <div className="space-y-3">
        {items.length === 0 && (
          <div className="text-[13px] text-muted-foreground border border-border rounded-lg p-4">
            暂无对话历史
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

function isCodingConversationTitle(title: string | null | undefined) {
  return /^(Codex|Claude Code)(?::|\s+Coding\b|\b)/i.test((title || '').trim());
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
              className="w-full px-3 py-2"
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
