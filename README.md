# DeskSprite / cat15 猫十五

桌面上的 AI 灵宠、专注助手与开发伙伴。  
An AI desktop companion for focus, timeline awareness, and coding workflows.

DeskSprite 将一个轻量的灵宠或悬浮球放在桌面上，连接聊天、语音、截图、Coding 模式、专注提醒、应用时间轴和个人统计。它的目标不是再造一个厚重的工作台，而是在你当前的桌面环境里提供低打扰、可观察、可定制的智能陪伴。

DeskSprite places a lightweight pet or orb on your desktop and connects chat, voice, screenshots, coding mode, focus reminders, timeline tracking, and personal analytics. It is designed to stay close to your existing workflow instead of replacing it.

## 功能概览 / Feature Map

### 个人档案与 Timeline / Profile & Timeline

- 自动记录前台窗口、浏览器 URL、Coding/Chat/Browser 等活动分类，并生成全天时间轴。
- 识别短暂切换：未达到最小时长的微信、浏览器等临时切换会被折叠到主活动详情中，而不会打碎主色块。
- 支持后台进程记录：Terminal/Coding 命令、音乐播放等会作为后台轨道展示。
- 支持跨日片段切割：例如 23:51-00:45 的活动会正确拆到昨天与今天。
- 提供 14 天专注图、全天活跃度、Top 软件、分心内容排行等统计。

- Tracks foreground apps, browser URLs, and activity categories such as Coding, Chat, and Browser.
- Folds short app switches into the active segment detail instead of fragmenting the main timeline block.
- Records background activity such as terminal coding commands and active music playback.
- Handles cross-day segments correctly by clipping entries to each selected date.
- Provides a 14-day focus chart, daily activity histogram, top apps, and distraction content ranking.

**技术实现 / Technical notes**

- macOS 下通过 Electron 主进程调用 AppleScript/System Events 获取前台 app、窗口标题和浏览器 URL。
- 浏览器 URL 支持 Safari、Chrome、Chromium、Brave、Edge、Vivaldi、Arc。
- Timeline 状态机位于 `src/lib/timelineRecorder.ts`，负责 active/candidate/paused 片段、最小时长阈值、短暂切换折叠和后台 marker 合并。
- Timeline 展示切割位于 `src/lib/timelineView.ts`，负责按日期裁剪、跨日显示、短暂使用汇总。
- 后台 Terminal 检测使用 `ps` 快照并过滤开发命令，如 `pnpm`、`node`、`python`、`cargo`、`claude`、`codex` 等。
- 音乐检测优先读取系统/播放器播放状态；Apple Music 和 Spotify 通过 AppleScript，NeteaseMusic 使用本地播放状态缓存与时效判断，暂停超过 Timeline 最小时长后停止记录。
- 电脑休眠、熄屏或系统 idle 超过用户设置的 Timeline 最小时长后，会断开前台片段；恢复后重新开始记录。

- On macOS, the Electron main process uses AppleScript/System Events to read the foreground app, window title, and browser URL.
- Browser URL capture supports Safari, Chrome, Chromium, Brave, Edge, Vivaldi, and Arc.
- The timeline state machine lives in `src/lib/timelineRecorder.ts`; it manages active/candidate/paused segments, minimum-duration thresholds, short foreground switches, and background markers.
- Timeline rendering logic lives in `src/lib/timelineView.ts`; it clips entries by day, handles cross-day spans, and builds short-usage summaries.
- Terminal background detection snapshots `ps` output and filters coding-related commands such as `pnpm`, `node`, `python`, `cargo`, `claude`, and `codex`.
- Music detection reads playback state where possible; Apple Music and Spotify use AppleScript, while NeteaseMusic uses local playback cache heuristics with freshness checks.
- Sleep, display-off, and idle periods longer than the configured Timeline minimum duration pause foreground recording and resume as a new segment.

### Pet / Orb 模式 / Pet & Orb Modes

- Pet 模式使用图片或 GIF 形象，适合更具人格化的桌面陪伴。
- Orb 模式使用代码渲染的悬浮球，更克制、抽象、适合工作场景。
- 支持浅色、深色、跟随系统主题。
- 支持透明度、大小、聊天框宽度、字体大小、始终置顶等配置。
- 支持全屏窗口穿透；检测到游戏时自动取消置顶并暂停 Timeline 刷新，减少性能影响。

- Pet mode uses image or GIF avatars for a more character-like companion.
- Orb mode is code-rendered, quieter, and better suited for focused work.
- Supports light, dark, and system themes.
- Configurable opacity, scale, chat width, font size, and always-on-top behavior.
- Can stay visible across fullscreen windows; when a game is detected, DeskSprite lowers its topmost behavior and pauses Timeline refresh to protect performance.

**技术实现 / Technical notes**

- UI 使用 React、Tailwind CSS、Radix UI、lucide-react 和 Zustand。
- Electron 窗口使用透明、无边框、预加载桥接和受限 IPC；renderer 通过 `window.deskSprite` 调用主进程能力。
- macOS 下通过 `setVisibleOnAllWorkspaces(...visibleOnFullScreen)` 和 `setAlwaysOnTop` 实现跨桌面/全屏悬浮。
- 游戏识别使用用户可配置的游戏关键词列表；命中时暂停采样和置顶。

- The UI is built with React, Tailwind CSS, Radix UI, lucide-react, and Zustand.
- Electron windows are transparent and frameless; privileged desktop APIs are exposed through a preload bridge and controlled IPC.
- On macOS, fullscreen desktop presence uses `setVisibleOnAllWorkspaces(...visibleOnFullScreen)` and `setAlwaysOnTop`.
- Game detection uses a user-editable keyword list; matching games pause sampling and topmost behavior.

### 自定义形象与动作 / Custom Avatar & Motion

- 支持 4 个 GIF 动图位和 4 个图片位。
- 支持跳跃、摇摆、呼吸等动作效果。
- 当灵宠形象使用 GIF 动图时，不叠加动作效果，避免动画互相干扰。
- 支持开机自启、智能吸附、显示模式和交互偏好。

- Supports four GIF slots and four image slots.
- Supports jump, wobble, and breathing motion effects.
- GIF avatars do not stack additional motion effects to avoid visual conflicts.
- Supports launch-at-login, smart attach, display mode, and interaction preferences.

### 专注与提醒 / Focus & Reminders

- 休息提醒：默认 60 分钟提醒一次，可设置提醒间隔与休息时长。
- 专注模式：支持专注时长、分心宽限时间、屏蔽软件和屏蔽关键词。
- 分心检测会同时检查 app 名称、窗口标题和浏览器 URL；命中后触发提醒并记录分心内容。
- 分心内容排行直接按屏蔽 app/关键词聚合，例如 `bilibili`、`zhihu`，而不是只显示浏览器名称。
- 游戏识别和音乐识别可通过设置列表扩展。

- Rest reminders default to every 60 minutes, with configurable interval and duration.
- Focus mode supports focus length, distraction grace time, blocked apps, and blocked keywords.
- Distraction detection checks app names, window titles, and browser URLs; matches trigger reminders and are logged as distraction content.
- Distraction ranking aggregates by blocked app/keyword, such as `bilibili` or `zhihu`, rather than only by browser app name.
- Game and music detection lists are user-editable.

### AI 对话 / AI Chat

- 支持小聊天框和大聊天窗口。
- 支持文本、图片输入、截图输入和语音输入。
- 语音输入提供实时波形动画；录音结束后可显示加载状态。
- 支持对话历史、内置额度、自定义 Chat/STT/TTS 模型。
- 自定义模型采用 OpenAI-compatible 配置：Base URL、Model、API Key。

- Supports compact and expanded chat windows.
- Supports text, image input, screenshots, and voice input.
- Voice input includes live waveform feedback and loading states after recording.
- Supports conversation history, built-in quota, and custom Chat/STT/TTS models.
- Custom models use OpenAI-compatible settings: Base URL, Model, and API Key.

**技术实现 / Technical notes**

- Chat UI 位于 `src/features/chat/`，设置与模型配置位于 `src/features/settings/`。
- API Key 存储通过本地配置/钥匙串辅助模块管理，不上传到第三方服务，除非用户主动配置并调用对应模型服务。
- 语音能力由 renderer 发起录音，主进程通过 IPC 处理 STT/TTS 请求。

- Chat UI lives in `src/features/chat/`, while settings and model configuration live in `src/features/settings/`.
- API keys are managed locally through configuration/keychain helpers and are not sent anywhere except to the provider explicitly configured by the user.
- Voice capture starts in the renderer, with STT/TTS requests handled through Electron IPC.

### Coding 模式 / Coding Mode

- 支持连接 Codex 和 Claude Code。
- 可在右键菜单中进入 Coding 模式，并查看 Coding 历史。
- 支持继承本机已有 Codex/Claude Code 会话，展示最近 session 的状态。
- 首次启用时会检查本机连接配置，失败时在设置中提示无法连接。

- Connects to Codex and Claude Code.
- Coding mode is available from the context menu and includes coding history.
- Can inherit local Codex/Claude Code sessions and show recent session status.
- When enabled, DeskSprite checks local provider availability and reports connection errors in settings.

**Codex 协议 / Codex protocol**

- DeskSprite 启动 `codex app-server --listen stdio://`，通过标准输入输出建立长连接。
- 协议是基于换行分隔 JSON 的 JSON-RPC-like 消息流。
- 初始化流程包括 `initialize` 请求和 `initialized` notification。
- 会话与执行使用 `thread/start`、`thread/resume`、`turn/start` 等方法。
- 默认执行上下文使用当前工作目录、`workspace-write` sandbox 和 `on-request` approval policy。
- 主进程监听 `thread/updated`、`turn/started`、`item/updated`、`item/completed`、`turn/completed` 等事件，并把状态推送到 renderer。
- 本机历史读取 `~/.codex/sessions/**/*.jsonl`，解析最近会话、运行状态、错误、审批和用户输入需求。

- DeskSprite starts `codex app-server --listen stdio://` and keeps a long-lived stdio connection.
- The protocol is newline-delimited JSON with JSON-RPC-like requests and notifications.
- Startup sends `initialize` followed by an `initialized` notification.
- Sessions and turns use methods such as `thread/start`, `thread/resume`, and `turn/start`.
- The default execution context uses the current working directory, `workspace-write` sandbox, and `on-request` approval policy.
- The main process listens to events such as `thread/updated`, `turn/started`, `item/updated`, `item/completed`, and `turn/completed`, then broadcasts state to the renderer.
- Local history is read from `~/.codex/sessions/**/*.jsonl` to infer recent sessions, running state, errors, approvals, and input needs.

**Claude Code 协议 / Claude Code protocol**

- DeskSprite 调用 Claude Code CLI 的 print 模式：`claude -p --output-format stream-json --verbose`。
- 新会话使用生成的 session id；后续消息通过 `--resume <sessionId>` 继续。
- stdout 按行读取 stream-json，解析 `system`、`assistant`、`result`、`tool_use` 等事件。
- 本机历史读取 `~/.claude/projects/**/*.jsonl`，识别最近会话、工具调用、等待用户输入等状态。

- DeskSprite invokes Claude Code CLI print mode: `claude -p --output-format stream-json --verbose`.
- New sessions use a generated session id; later messages continue through `--resume <sessionId>`.
- stdout is parsed as line-delimited stream JSON, including `system`, `assistant`, `result`, and `tool_use` events.
- Local history is read from `~/.claude/projects/**/*.jsonl` to infer recent sessions, tool calls, and user-input states.

### 通用设置 / General Settings

- 支持中文与英文。
- 支持全局快捷键、截图快捷键和发送消息快捷键。
- Timeline 最小时长默认 1 分钟。
- 支持开机启动、Timeline 记录开关和隐私相关操作。

- Supports Chinese and English.
- Supports global shortcut, screenshot shortcut, and message-send shortcut.
- Timeline minimum duration defaults to 1 minute.
- Supports launch-at-login, Timeline recording toggle, and privacy operations.

## 快速开始 / Quick Start

### 环境要求 / Requirements

- Node.js 与 pnpm
- macOS 推荐用于完整 Timeline、全屏悬浮、音乐状态和浏览器 URL 检测
- Codex CLI 与 Claude Code CLI 为可选依赖，仅 Coding 模式需要

- Node.js and pnpm
- macOS is recommended for full Timeline, fullscreen overlay, music state, and browser URL detection
- Codex CLI and Claude Code CLI are optional and only required for Coding Mode

### 安装与开发 / Install & Develop

```bash
pnpm install
pnpm electron:dev
```

`pnpm electron:dev` 会同时启动 Vite dev server 和 Electron。  
`pnpm electron:dev` starts both the Vite dev server and Electron.

### 构建 / Build

```bash
pnpm build
pnpm electron:build
```

### 测试 / Test

```bash
pnpm test
pnpm test:timeline
pnpm test:startup
```

Timeline 测试覆盖记录状态机、跨日展示和本地数据读写；启动测试覆盖深色主题预加载和窗口生命周期。  
Timeline tests cover the recorder state machine, cross-day rendering, and local database behavior; startup tests cover dark-theme bootstrapping and window lifecycle behavior.

## macOS 权限 / macOS Permissions

为了启用完整功能，macOS 可能会请求以下权限：

- Accessibility：读取前台 app、窗口标题、全屏/游戏状态。
- Automation：读取浏览器 URL、音乐播放状态。
- Screen Recording：截图输入或窗口捕获相关功能。

macOS may ask for:

- Accessibility: foreground app, window title, fullscreen/game state.
- Automation: browser URL and music playback state.
- Screen Recording: screenshot input or window capture features.

## 项目结构 / Project Structure

```text
electron/
  main.cjs              Electron main process, desktop APIs, Timeline, Coding IPC
  preload.cjs           Secure renderer bridge
src/
  App.tsx               App shell and desktop interaction orchestration
  features/
    chat/               Chat UI, input, voice waveform, conversation surfaces
    pet/                Pet/orb rendering, motion, desktop companion state
    settings/           Settings UI, stores, model/provider configuration
  lib/
    timelineRecorder.ts Timeline recording state machine
    timelineView.ts     Timeline clipping, grouping, and display helpers
    db.ts               Local persistence helpers
```

## 隐私与本地优先 / Privacy & Local-First

DeskSprite 优先在本机处理桌面状态、Timeline、设置和历史数据。浏览器 URL、窗口标题、后台进程和音乐状态用于本地展示与专注提醒。只有当用户主动使用 AI 模型、STT/TTS 或 Coding provider 时，相关输入才会发送给用户配置的服务。

DeskSprite keeps desktop state, Timeline entries, settings, and history local by default. Browser URLs, window titles, background process markers, and music state are used for local display and focus reminders. Data is sent to external services only when the user explicitly invokes configured AI, STT/TTS, or coding providers.

## 平台状态 / Platform Status

- macOS：主要开发与测试平台，支持最完整的桌面感知能力。
- Windows：Electron 构建配置已存在，但 Timeline、音乐和浏览器深度集成仍需要平台适配。

- macOS: primary development and test platform, with the most complete desktop-awareness support.
- Windows: Electron build configuration exists, but Timeline, music, and browser integrations require platform-specific adaptation.

## License

尚未指定许可证。  
License not specified yet.
