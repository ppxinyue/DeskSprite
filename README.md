<p align="center">
  <img src="public/assets/idle/png/idle.png" alt="cat15" width="180" />
</p>

<h1 align="center">cat15 猫十五</h1>

<p align="center">
  一只住在桌面上的 AI 灵宠，帮你聊天、专注、记录 Timeline，并在 Coding 时陪你工作。
</p>

<p align="center">
  An AI desktop companion for chat, focus, Timeline tracking, and coding workflows.
</p>

<p align="center">
  <img alt="Electron" src="https://img.shields.io/badge/Electron-39-47848f?style=flat-square&logo=electron&logoColor=white" />
  <img alt="React" src="https://img.shields.io/badge/React-19-61dafb?style=flat-square&logo=react&logoColor=111111" />
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-6-3178c6?style=flat-square&logo=typescript&logoColor=white" />
  <img alt="Local first" src="https://img.shields.io/badge/local--first-privacy-2f855a?style=flat-square" />
</p>

<p align="center">
  <a href="#中文">中文</a> · <a href="#english">English</a>
</p>

<p align="center">
  <img src="docs/timeline-mock.png" alt="cat15 Timeline mock preview" width="760" />
</p>

## 中文

cat15 猫十五是一个 Electron 桌面应用。它可以以灵宠或悬浮球的形式停在屏幕上，提供 AI 对话、专注提醒、Timeline 记录、Coding 模式和个人统计。它的设计目标是本地优先、低打扰、可定制，并尽量贴近 macOS 的轻量玻璃质感。

## 功能

### 个人

| 设置项 | 功能 | 技术方案 |
| --- | --- | --- |
| **个人档案** | 展示 Timeline、14 天专注、Top 软件、全天活跃度和分心内容排行。 | 本地数据库聚合 Timeline 与专注数据；`timelineView.ts` 负责跨日裁剪和统计展示。 |
| **对话历史** | 查看历史对话和 Coding 对话记录。 | 对话消息本地持久化；聊天窗口按 conversation id 加载历史上下文。 |

### 外观

| 设置项 | 功能 | 技术方案 |
| --- | --- | --- |
| **显示** | 切换 Pet / Orb、主题、透明度、大小、对话框宽度和始终置顶。 | Electron 透明无边框窗口 + React 状态；主题启动时预置 class，减少深色闪烁。 |
| **自定义形象** | 配置内置或用户上传的猫猫 PNG/GIF 资源。 | `DEFAULT_MEDIA_CONFIG` 管理各状态素材；GIF 模式不叠加额外动作效果。 |
| **灵宠动作** | 控制跳跃、摇摆、呼吸等轻量动作。 | `PetAvatar` 与 CSS animation 根据状态组合动画；Orb 模式改用代码动效。 |

### 专注与提醒

| 设置项 | 功能 | 技术方案 |
| --- | --- | --- |
| **休息提醒** | 定时提醒休息，并在灵宠下方显示倒计时。 | Renderer 计时状态驱动 Pet/Orb UI；背景透明度与灵宠透明度同步。 |
| **专注模式** | 记录专注时长并在分心时提醒。 | 前台 app、窗口标题和浏览器 URL 与规则匹配；命中后写入分心统计。 |
| **屏蔽列表** | 管理屏蔽软件和屏蔽关键词。 | app/title/url 统一归一化匹配；关键词命中后按具体内容聚合排行。 |
| **游戏识别** | 游戏运行时取消置顶并暂停 Timeline 刷新。 | 用户维护游戏关键词；命中后降低 topmost 行为，避免影响游戏性能。 |
| **音乐识别** | 只在音乐真正播放时记录后台音乐。 | Apple Music / Spotify 用 AppleScript；NeteaseMusic 用本地播放状态缓存和时效判断。 |

### AI

| 设置项 | 功能 | 技术方案 |
| --- | --- | --- |
| **内置额度** | 使用内置模型额度快速开始。 | 默认模型配置与用量在本地管理；自定义模型可覆盖默认路径。 |
| **Coding 模式** | 连接 Codex 和 Claude Code。 | Codex 使用 `app-server --listen stdio://` 的换行 JSON 协议；Claude Code 使用 `stream-json` CLI 输出。 |
| **Chat 模型** | 配置默认或自定义聊天模型。 | 支持 OpenAI-compatible Base URL、Model、API Key；API Key 通过本地存储/钥匙串辅助模块管理。 |
| **语音模型** | 配置 STT/TTS 模型。 | Web Audio 录音驱动实时波形；STT/TTS 请求通过 Electron IPC 发送给配置的模型服务。 |

### 通用

| 设置项 | 功能 | 技术方案 |
| --- | --- | --- |
| **基础** | 设置语言、开机启动和基础行为。 | 设置保存在本地 store；中文 / English 文案通过 i18n 映射。 |
| **Timeline** | 记录达到最小时长的前台窗口、浏览器网站和后台进程。 | macOS AppleScript/System Events 读取前台信息；`timelineRecorder.ts` 管理 active/candidate/paused 状态机。 |
| **快捷键** | 设置全局呼出、截图和发送消息快捷键。 | Electron 主进程注册快捷键；发送方式支持 Enter 或 Command/Ctrl+Enter。 |

## 配图

<p align="center">
  <img src="docs/avatar-resources.png" alt="cat15 built-in avatar resources" width="760" />
</p>

<p align="center">
  <img src="docs/orb-modes.gif" alt="cat15 orb modes" width="520" />
</p>

## 安装与运行

目前建议从源码运行，需要 Node.js 与 pnpm。

```bash
git clone https://github.com/ppxinyue/DeskSprite.git
cd DeskSprite
pnpm install
pnpm electron:dev
```

macOS 首次使用 Timeline、浏览器 URL、音乐状态或截图功能时，系统可能请求 Accessibility、Automation 或 Screen Recording 权限。

## 常用命令

```bash
pnpm electron:dev   # Vite + Electron 开发模式
pnpm build          # TypeScript + Vite 构建
pnpm electron:build # 构建桌面安装包
pnpm test           # Timeline 与启动生命周期测试
pnpm lint           # ESLint
```

## 技术栈

- Electron 39 + Electron Builder
- React 19 + TypeScript + Vite 8
- Tailwind CSS 4 + Radix UI + lucide-react
- Zustand 本地状态管理
- Node.js IPC、AppleScript、macOS System Events
- OpenAI-compatible Chat / STT / TTS 配置
- Codex app-server stdio 协议、Claude Code stream-json 协议

## 项目结构

```text
electron/
  main.cjs              主进程：窗口、Timeline、音乐/游戏识别、Coding IPC
  preload.cjs           Renderer 安全桥接层
src/
  App.tsx               桌面交互编排、Timeline 采样、窗口状态
  features/chat/        聊天 UI、图片/截图/语音输入
  features/pet/         Pet / Orb 渲染、动画和悬浮状态
  features/settings/    设置 UI、模型配置、语言与主题
  lib/timelineRecorder.ts Timeline 记录状态机
  lib/timelineView.ts     Timeline 展示、裁剪与聚合
  lib/db.ts               本地持久化
public/assets/          灵宠图片、GIF 与静态资源
docs/                   README 截图与开发文档
```

## 平台状态

- **macOS**：主要开发平台，Timeline、音乐状态、全屏悬浮和浏览器 URL 检测最完整。
- **Windows**：已有 Electron Builder 配置，深度桌面感知能力仍需要平台适配。

## English

cat15 is an Electron desktop app. It lives on your screen as either a pet or an orb and provides AI chat, focus reminders, Timeline tracking, coding mode, and personal analytics. It is designed to be local-first, low-interruption, customizable, and visually close to a lightweight macOS glass interface.

## Features

### Personal

| Setting | Feature | Technical approach |
| --- | --- | --- |
| **Profile** | Shows Timeline, 14-day focus, top apps, daily activity, and distraction ranking. | Local database aggregation; `timelineView.ts` handles cross-day clipping and display stats. |
| **Conversation History** | Opens previous chat and coding conversations. | Messages are persisted locally and restored by conversation id. |

### Appearance

| Setting | Feature | Technical approach |
| --- | --- | --- |
| **Display** | Switches Pet / Orb, theme, opacity, scale, chat width, and always-on-top behavior. | Transparent frameless Electron window + React state; startup pre-paints theme classes to avoid flashing. |
| **Custom Avatar** | Configures built-in or user-uploaded cat PNG/GIF assets. | `DEFAULT_MEDIA_CONFIG` manages state assets; GIF mode does not stack extra motion effects. |
| **Pet Motion** | Controls jump, wobble, and breathing effects. | `PetAvatar` and CSS animations compose motion by state; Orb uses code-rendered motion instead. |

### Focus & Reminders

| Setting | Feature | Technical approach |
| --- | --- | --- |
| **Rest Reminder** | Reminds you to rest and shows a countdown under the pet. | Renderer timers drive Pet/Orb UI; countdown background follows pet opacity. |
| **Focus Mode** | Records focus time and warns on distractions. | Foreground app, window title, and browser URL are matched against focus rules. |
| **Blocked List** | Manages blocked apps and keywords. | app/title/url are normalized before matching; keyword hits are ranked by concrete content. |
| **Game Detection** | Lowers topmost behavior and pauses Timeline refresh while gaming. | User-maintained game keywords protect game performance. |
| **Music Detection** | Records background music only when playback is active. | Apple Music / Spotify use AppleScript; NeteaseMusic uses local playback cache freshness checks. |

### AI

| Setting | Feature | Technical approach |
| --- | --- | --- |
| **Built-in Quota** | Starts quickly with the built-in model quota. | Default model config and usage are managed locally; custom providers can override the path. |
| **Coding Mode** | Connects to Codex and Claude Code. | Codex uses `app-server --listen stdio://`; Claude Code uses CLI `stream-json`. |
| **Chat Model** | Configures default or custom chat models. | Supports OpenAI-compatible Base URL, Model, and API Key through local/keychain-backed storage. |
| **Voice Model** | Configures STT/TTS models. | Web Audio drives live recording waveform; STT/TTS calls are sent through Electron IPC. |

### General

| Setting | Feature | Technical approach |
| --- | --- | --- |
| **Basics** | Sets language, launch behavior, and basic preferences. | Settings live in the local store; Chinese / English copy is mapped through i18n. |
| **Timeline** | Tracks foreground windows, browser sites, and background processes after the minimum duration. | macOS AppleScript/System Events provide foreground snapshots; `timelineRecorder.ts` manages the state machine. |
| **Shortcuts** | Configures global open, screenshot, and send-message shortcuts. | Electron main process registers shortcuts; send mode supports Enter or Command/Ctrl+Enter. |

## Preview

<p align="center">
  <img src="docs/timeline-mock.png" alt="cat15 Timeline mock preview" width="760" />
</p>

<p align="center">
  <img src="docs/avatar-resources.png" alt="cat15 built-in avatar resources" width="760" />
</p>

<p align="center">
  <img src="docs/orb-modes.gif" alt="cat15 orb modes" width="520" />
</p>

## Install from source

Node.js and pnpm are required.

```bash
git clone https://github.com/ppxinyue/DeskSprite.git
cd DeskSprite
pnpm install
pnpm electron:dev
```

On macOS, Timeline tracking, browser URL capture, music state, and screenshots may ask for Accessibility, Automation, or Screen Recording permissions.

## Commands

```bash
pnpm electron:dev   # Vite + Electron dev mode
pnpm build          # TypeScript + Vite build
pnpm electron:build # desktop package build
pnpm test           # Timeline and startup lifecycle tests
pnpm lint           # ESLint
```

## Stack

- Electron 39 + Electron Builder
- React 19 + TypeScript + Vite 8
- Tailwind CSS 4 + Radix UI + lucide-react
- Zustand for local state
- Node.js IPC, AppleScript, macOS System Events
- OpenAI-compatible Chat / STT / TTS configuration
- Codex app-server stdio protocol, Claude Code stream-json protocol

## License

License not specified yet.
