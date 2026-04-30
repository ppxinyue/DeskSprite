# DeskSprite 技术方案评审文档 v0.2

> **项目定位**：AI 桌面灵宠 — 常驻桌面的悬浮式智能体，结合大语言模型能力、环境感知与行为数据，形成具备持续交互与主动参与能力的桌面伴侣应用。
> **当前版本**：P0（最小可行闭环），聚焦核心交互通路验证。
> **文档用途**：供技术评审、架构决策与工程启动参考。

---

## 1. 产品设计概览

### 1.1 核心理念

DeskSprite 首先是一个**深度集成于桌面的 AI 对话入口**：用户无需打开浏览器，即可通过全局快捷键或悬浮形象一键唤起对话窗口，使用自己配置的多个大模型 API Key 在统一的界面中完成流畅的文字与语音交互。在此基础上，产品将 AI 能力延伸到**屏幕理解**——用户可以随时框选屏幕上任意区域，让 AI 直接“阅读”并解释其中的内容，完成代码分析、文档问答、设计稿讨论等原本需要手动描述的复杂操作。围绕用户的工作节奏，系统通过**周期性屏幕快照和历史记录**，构建起一条自动的 Timeline，并逐步嵌入番茄钟、水滴计划等轻量效率方法，让 AI 不只是对话工具，更成为个人工作流的旁观者与协作者。而贯穿所有功能的是**一个可高度个性化的桌面灵宠形象**：它不仅仅是一个可爱的图标，而是可以定义为自家宠物、喜欢的角色或偶像的 2D 伙伴，会附着在程序坞/任务栏上睡觉，沿窗口边缘站立或行走，也会根据桌面状态悬浮游走；在合适的时间提醒主人喝水、休息，甚至发起随机但恰当的对话。所有这一切，都试图在克制地增加功能复杂度的前提下，用有限的设计点构建一个“越用越懂你、越用越想留”的桌面智能体。

### 1.2 混合存储策略（本地 + 云端）

产品采用**本地为主、云端为辅**的混合存储策略：

- **本地优先**：所有与用户身份无关的核心行为数据（如对话历史、 Timeline 事件、使用偏好、API 用量统计）和配置数据均默认存储在本地 SQLite 中，不依赖任何外部服务即可完整运行。这一策略从根本上避免了隐私数据泄露的风险，同时大幅降低了系统复杂度与在线依赖。
- **云端可选**：在用户明确授权后，可选择通过自建的轻量同步服务（后期版本）将偏好设置、灵宠形象、部分 Timeline 摘要等非敏感数据加密同步到云端，以实现多设备间的体验一致。同步过程中，任何截屏、对话原文等敏感内容一律不上传。该服务不与任何第三方分析或广告平台共享数据。
- **AI 调用路径**：所有 LLM 请求均由**用户自己提供的 API Key** 直接从本地发起（通过 Rust 后端或前端直连），产品本身不架设中转服务器，因此用户的对话内容和屏幕截图永远不会经过 DeskSprite 团队的任何服务器。

### 1.3 设计模块（按新理念重构）

根据 1.1 的产品核心，系统划分为以下六大模块：

- **核心壳层**：桌面窗口与系统交互的骨架，负责悬浮宠物窗、主聊天窗、设置窗、系统托盘、全局快捷键等所有窗口的生命周期与通信，是整个应用的基础容器。
- **对话交互系统**：完整的多模型 Chat UI 与交互引擎，包括流式 Markdown 渲染、多会话管理、对话历史搜索、语音输入/输出等，是产品最核心的“桌面 AI”入口。
- **屏幕感知系统**：由用户手动触发的屏幕截图选区工具，以及配套的 VLM 视觉理解通道，让 AI 能够“看见”屏幕内容并进行解释、问答、修改建议等操作；同时也为周期性屏幕快照提供基础能力。
- **效率协同层**（P1 逐步成型）：依托周期性屏幕快照与用户行为数据，构建 Timeline 时间线回顾、专注计时（番茄钟）、水滴计划等轻量效率工具，使 AI 从“对话工具”转变为“工作流助手”。
- **情感陪伴引擎**：驱动灵宠个性化形象的完整系统，包含图片状态机与 CSS 动画、用户自定义形象（上传三张姿态 PNG）、基于系统界面状态的智能附着行为（程序坞/任务栏睡觉、窗口边缘站立行走、全屏悬浮切换姿态）、随机对话触发、健康提醒等，负责“陪伴感”与“主动参与感”。
- **设置中心与数据层**：本地 SQLite 数据管理 + 系统 Keychain 安全存储 + 云端同步（可选）的逻辑，提供所有可配置项的界面，并承担隐私控制、数据留存策略、API 用量计费等底层支撑。

---

好，以下是第二节的完整修改版。

---

## 2. 总体架构与技术选型

### 2.1 技术栈

| 层级 | 技术选型 | 对比方案 | 选型理由（结合产品需求） |
|------|----------|----------|--------------------------|
| 桌面框架 | **Tauri 2.0**（Rust + Webview） | Electron、Flutter Desktop、SwiftUI | Tauri 是本产品“系统级透明悬浮 + 多窗口灵活 + 轻量打包”诉求下的最优解：其多 Webview 架构支持宠物窗（含对话框）/设置窗各自独立，宠物窗可配置为透明、置顶、无边框，设置窗保持标准窗口行为——两种窗口属性的组合在单窗口方案中几乎无法实现；同时 Rust 后端可直接调用 OS 级 Keychain 和截图 API，无需额外原生模块；打包体积约 Electron 的 1/10，符合“轻量常驻”定位。Flutter Desktop 的透明窗和多窗口支持在 2026 年初仍不成熟，Electron 的资源和体积开销与“常驻桌面”目标冲突。 |
| 前端框架 | **React 19** + **TypeScript** + **Vite** | Vue 3、Svelte | React 19 的并发特性（Transitions、Suspense）对 AI 流式对话这种高频更新场景有天然优势；TypeScript 在 AI 接口类型（多 Provider 的请求/响应格式差异大）的管理上不可替代；Vite 的 HMR 速度在桌面端开发中感受明显。团队经验也是考量因素。 |
| UI 体系 | **Tailwind CSS** + **shadcn/ui** + **Lucide Icons** | Ant Design、Mantine | shadcn/ui 的“复制源码而非安装依赖”模式允许对 Chat 界面、设置表单、右键菜单等做深度定制而不受组件库升级影响；Tailwind 的原子化样式在多窗口主题同步（宠物窗/聊天窗共享 CSS 变量）上实现更简单；Lucide 图标体积小、风格统一，与 shadcn/ui 官方推荐一致。 |
| 状态管理 | **Zustand** | Redux Toolkit、Jotai、Valtio | 本产品状态场景分两类：全局持久化状态（设置、API 配置）和临时 UI 状态（宠物动画状态、聊天输入）。Zustand 的 `persist` 中间件可直接桥接 Tauri Store 或 localStorage，无需引入 Redux 的 action/reducer 样板；其模块化 store 设计天然匹配“宠物/聊天/设置”的模块划分；且不强制 Provider 包裹，在多窗口共享 store 时更灵活。 |
| 2D 动画 | **CSS 动画 + 帧切换**（基于透明 PNG）+ **Framer Motion** | Lottie、Rive、Spine | P0 因动画制作资源限制，采用默认 3 张姿态 PNG（front / side / sleep），用户可自行上传同规格透明 PNG 替换默认形象。动画仍通过 CSS + framer-motion 实现。，通过 CSS `@keyframes` 实现呼吸、弹跳等微动效，利用 `framer-motion` 管理状态切换过渡。图像切换模拟行走（两帧交替），实现成本极低，且包体积零增加。后期 P2 替换为完整 Lottie 骨骼动画，当前方案作为占位和功能验证已足够。 |
| 语言交互 | **Web Speech API**（STT/TTS）→ 后期可选 ElevenLabs / OpenAI TTS | Whisper 本地模型、Azure Speech | P0 阶段为了零额外依赖、零 API 费用，直接使用浏览器内置的 SpeechRecognition 和 SpeechSynthesis，在 macOS/Windows 上均有系统级语音引擎支持。后期作为付费增强可接入 ElevenLabs 等高品质 TTS。不选本地 Whisper 的原因是模型体积（>1GB）与常驻内存开销与“轻量桌面应用”定位冲突。 |
| 屏幕截图 | **Rust `xcap`**（macOS）+ **`screenshots`**（Windows/Linux 备选）| scrap、captrs | xcap 在 macOS 上的多显示器支持和 DPI 处理最完善，性能优于 scrap；screenshots crate 作为跨平台备选方案，Windows 上兼容性好。两个都是纯 Rust 实现，无需额外系统依赖。 |
| 数据持久化 | **SQLite**（`tauri-plugin-sql`）| IndexedDB、LowDB、JSON 文件 | Timeline 事件、对话记录、API 用量等数据结构化程度高、写入频繁、需要按时间范围和类型查询聚合，SQLite 是唯一成熟的选择。tauri-plugin-sql 提供 Rust 端迁移管理，前端通过 `invoke` 调用，无需暴露 SQL 到前端。 |
| 密钥存储 | **系统 Keychain**（Rust `keyring`）| SQLite 加密列、环境变量、tauri-plugin-store | API Key 是最高敏感度数据。系统 Keychain 由 OS 提供硬件级或用户会话级加密，即使设备被物理访问也无法直接读取。SQLite 加密列或 plugin-store 的加密均无法达到同等安全等级，且 Keychain 集成是 Tauri + Rust 的原生优势，不应绕过。 |
| HTTP 客户端 | 前端 `fetch` + Rust `reqwest`（双路径） | 单一方案 | 见 2.4 关键设计决策详述。 |
| 云端同步（预留）| 自建轻量 sync service（P2） | Firebase、iCloud | 仅同步非敏感配置和偏好，需端到端加密；自建方案可确保无第三方接触数据。P0 不实现，但架构预留接口。 |

### 2.2 关键平台能力（按模块映射）

#### 窗口与交互

| 能力 | 支撑的插件 / API | 对应产品模块 |
|------|-----------------|-------------|
| 系统托盘常驻 | `tray-icon`（Tauri 2.0 内置）| 核心壳层 — 应用生命周期管理 |
| 宠物悬浮窗（透明、置顶、无边框）| `window` 插件：`transparent: true`, `always_on_top: true`, `decorations: false` | 情感陪伴引擎 |
| 宠物窗管理（透明、置顶、无边框，内含灵宠+悬浮对话框）| `window` 插件：`WebviewWindowBuilder` | 核心壳层 — 宠物窗为应用主界面 |
| 设置窗管理（标准窗口）| `window` 插件：`WebviewWindowBuilder` | 核心壳层 |
| 窗口间事件通信 | `emit` / `listen`（Tauri 事件系统）| 核心壳层 — 设置变更同步到宠物窗 |
| 全局快捷键 | `global-shortcut` 插件 | 核心壳层 — 唤起对话框焦点 |
| 窗口拖动 | 前端调用 `window.startDragging()` | 情感陪伴引擎 — 宠物窗自由移动 |

#### 安全与权限

| 能力 | 支撑的插件 / API | 对应产品模块 |
|------|-----------------|-------------|
| API Key 安全存储 | Rust `keyring` crate | 设置中心与数据层 |
| 屏幕录制权限（macOS）| 系统级权限弹窗 + 应用内引导 | 屏幕感知系统 |
| 文件读取权限（用户上传形象） | `dialog` 插件选择文件 + `fs` 复制到应用目录 | 情感陪伴引擎 — 自定义灵宠形象 |
| 辅助功能权限（可选）| macOS Accessibility API | 预留 |

#### 数据与存储

| 能力 | 支撑的插件 / API | 对应产品模块 |
|------|-----------------|-------------|
| 结构化数据 CRUD + 迁移 | `tauri-plugin-sql`（SQLite）| 设置中心与数据层、效率协同层 |
| 轻量键值存储（部分配置）| `tauri-plugin-store` | 设置中心与数据层 |
| 文件读写 / 导出 | `fs` + `dialog` 插件 | 数据导出 / 灵宠形象导入 |

#### AI 与网络

| 能力 | 支撑的插件 / API | 对应产品模块 |
|------|-----------------|-------------|
| HTTP 请求（前端直连 LLM）| 浏览器 `fetch`（需 CSP 配置）| 对话交互系统、屏幕感知系统 |
| HTTP 请求（后端代理）| Rust `reqwest` | 对话交互系统（用于需要后端处理的场景）|
| 流式响应处理 | `ReadableStream`（前端）/ `reqwest` streaming（后端）| 对话交互系统 |
| 语音识别 / 合成 | Web Speech API | 对话交互系统 |

### 2.3 架构分层与数据流

```
┌──────────────────────────────────────────────────────┐
│                    UI Layer (React)                  │
│                                                      │
│  ┌──────────────────────────┐  ┌──────────────┐     │
│  │   Pet Window             │  │Settings      │     │
│  │   (独立Webview)          │  │(独立Webview) │     │
│  │                          │  │              │     │
│  │  ┌──────────────────┐    │  │• API Key     │     │
│  │  │ 灵宠形象 (PNG图片) │    │  │  Mgmt       │     │
│  │  │ • 图片状态机+CSS动画│  │  │• System     │     │
│  │  │ • 智能附着行为   │    │  │  Prompt     │     │
│  │  │ • 拖拽/右键      │    │  │• 外观/行为  │     │
│  │  └────────┬─────────┘    │  │  偏好       │     │
│  │           │ 视觉连线     │  └──────┬───────┘     │
│  │  ┌────────┴─────────┐    │         │             │
│  │  │ 悬浮对话框       │    │         │             │
│  │  │ • 输入框+按钮    │    │         │             │
│  │  │ • 对话流列表    │    │         │             │
│  │  │ • Markdown渲染  │    │         │             │
│  │  │ • 语音/截图控件 │    │         │             │
│  │  └──────────────────┘    │         │             │
│  └──────────────────────────┘         │             │
│                                       │             │
│  ┌────────────────────────────────────┴─────────┐   │
│  │    Zustand Stores (per-window shared)       │   │
│  │    • petStore  • chatStore                  │   │
│  │    • settingsStore  • aiConfigStore          │   │
│  └────────────────────┬─────────────────────────┘  │
└───────────────────────┼────────────────────────────┘
                        │ Tauri IPC (invoke / event)
                        │  ▲ 前端调用 Rust Command
                        │  ▼ Rust 推送事件到前端
┌───────────────────────┼────────────────────────────┐
│              Rust Backend (Tauri Core)              │
│                                                     │
│  ┌──────────────────────────────────────────┐      │
│  │            Command Handlers              │      │
│  │  • save_api_key / get_api_keys           │      │
│  │  • capture_screen_region                 │      │
│  │  • get_desktop_bounds (智能附着边界)     │      │
│  │  • window / tray / shortcut management   │      │
│  └──────────┬───────────────────────────────┘      │
│             │                                      │
│  ┌──────────┴──────────┬────────────────────┐      │
│  │                     │                    │      │
│  ▼                     ▼                    ▼      │
│ ┌──────────┐  ┌──────────────┐  ┌──────────────┐  │
│ │ Keychain │  │    SQLite    │  │   reqwest    │  │
│ │ (OS安全) │  │(tauri-plugin │  │  (HTTP代理)  │  │
│ │          │  │    -sql)     │  │              │  │
│ └──────────┘  └──────────────┘  └──────┬───────┘  │
│                                        │          │
└────────────────────────────────────────┼──────────┘
                                         │
                              ┌──────────┴──────────┐
                              │   LLM APIs          │
                              └─────────────────────┘

┌ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐
│          Cloud Sync Layer (P2 预留)            │
│  ┌──────────────────────────────────────┐     │
│  │  Encrypted sync (prefs / pet image)  │     │
│  └──────────────────────────────────────┘     │
└ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘
```

**数据流方向约定**：

- **前端 → Rust**：用户操作触发（保存设置、截图请求、窗口操作）。调用 `invoke` 单向请求-响应。
- **Rust → 前端**：系统事件推送（全局快捷键触发、截图完成）。通过 Tauri 事件系统广播，各窗口按需监听。
- **多窗口状态同步**：Zustand store 通过 Tauri 事件系统在窗口间同步关键状态（如当前 AI 调用状态 → 宠物动画切换）。非关键 UI 状态各窗口独立。
- **宠物窗内**：灵宠形象与悬浮对话框在同一 React 组件树内，Zustand 直连共享，无需跨窗口事件。
- **宠物窗 ↔ 设置窗**：设置变更通过 Tauri 事件广播，宠物窗监听后更新对应 store，触发动画或对话框行为刷新。
- **AI 请求路径**：前端优先直连 LLM API（低延迟，无后端中转开销）；后端代理路径用于需要额外处理的场景（如日志写入、请求审计）。详见 2.4。

### 2.4 关键设计决策

#### 决策 1：AI 请求走前端直连还是后端代理？

**策略**：双路径并存，前端直连为主，后端代理为辅。

| 路径 | 适用场景 | 优势 | 劣势 |
|------|---------|------|------|
| 前端直连 `fetch` | 普通对话、Vision 请求、流式输出 | 零后端转发延迟；流式响应原生支持 `ReadableStream`；无需 Rust 侧处理 HTTP | 无法记录结构化日志（需前端额外写入 SQLite）；API Key 需从 Rust 取出后短暂存在于 JS 内存 |
| 后端代理 `reqwest` | 需要请求审计、需要统一日志、需要额外预处理 | 可在请求前后统一写入日志表；可做速率限制和用量预警 | 多一层转发延迟；流式响应需额外处理事件转发 |

**P0 实现**：前端直连为主。API Key 由 Rust 从 Keychain 取出后通过 `invoke` 返回给前端（短暂使用后即由 GC 回收内存），前端直连 LLM API 并自行将交互记录写入 SQLite。后端代理路径预留给后续需要审计或预处理的场景。

#### 决策 2：宠物窗包含对话界面 vs 独立聊天窗?

P0 选择**单一宠物窗口内嵌悬浮对话框**，而非独立的聊天窗口。理由：

| 方案 | 优势 | 劣势 |
|------|------|------|
| **单宠物窗 + 内嵌对话框**（P0 采用）| 灵宠与对话在空间中紧密关联，视觉连线自然形成“是它在说话”的直觉；hover 唤起 / 失焦消失的交互只在同一窗口内能流畅实现；减少跨窗口状态同步的复杂度；用户认知成本更低（“一个桌面上会动会说话的东西”）| 对话框受宠物窗边界限制（但宠物窗本身可设为接近桌面大小以留足空间）；未来若需要多实例聊天，扩展性受限 |
| 宠物窗 + 独立聊天窗 | 聊天窗可自由调整大小和位置 | 灵宠与对话分离，关联感弱；hover 唤起/消失需要跨窗口事件协调，延迟和闪烁风险高；用户需要在两个窗口间切换注意力 |

**结论**：P0 采用单宠物窗方案，将悬浮对话框作为宠物窗的内嵌组件实现。如果后续需求要求独立的代码/长文编辑区，可在全屏模式下扩展为更大面板（仍在同一窗口内），或 P2 评估是否拆分。

**设置窗保持独立**：设置页是低频访问、标准窗口行为（任务栏显示、可最小化）的场景，与宠物窗的透明置顶属性互斥，因此保持独立 Webview。


#### 决策 3：P0 为何采用静态 PNG + CSS 而非 Lottie 动画？
**背景**：原设计选型 Lottie 骨骼动画，但因设计师资源排期，P0 无法交付完整的 `.lottie` 动画文件。团队交付了 3 张从原型照片分离的关键姿态 PNG（front / side / sleep）。
**P0 方案**：使用这 3 张静态图（用户可自行替换），通过以下方式：
- **呼吸/弹跳**：CSS `scale` / `translateY` 关键帧
- **行走**：`front` ↔ `side` 两帧快速交替 + 位移动画
- **睡觉**：`sleep.png` 直接用于睡眠姿态。
- **过渡**：`framer-motion` 的 `AnimatePresence` 让图片切换有淡入淡出效果
**优势**：
- 零动画制作成本，开发可立即启动
- 包体积极小（3 张 PNG 总计 < 120KB）
- 用户可上传自定义 PNG 替换默认形象，增加个性化参与感
**劣势**：
- 动画细腻度、连贯性不如 Lottie（如无骨骼变形，无长动作序列）
- 行走只有两帧，观感较机械
**长期计划**：P2 阶段设计师交付完整 `.lottie` 后，替换 `PetAvatar` 中的图片渲染逻辑为 Lottie 播放，其余状态机、附着引擎代码不变。此为”占位动画可替换”架构设计。

#### 决策 4：P0 不做本地 LLM 推理

虽然 Ollama + 本地模型（如 Llama 3.2）与“本地优先”理念一致，但以下原因使 P0 排除：

- 本地模型占用内存 > 2GB，与本产品“轻量常驻桌面”定位矛盾。
- 视觉理解（VLM）在本地模型上的性能和质量在 2026 年初仍与云端模型有显著差距。
- 产品核心定位是“多模型聚合的桌面入口”而非“AI 引擎”，本地推理能力留待后续版本评估。


### 2.5 跨平台开发策略

DeskSprite 基于 **Tauri 2.0 的跨平台抽象层**，采用“一套代码，多平台编译”策略，无需为 macOS 和 Windows 分别维护独立代码库：

- **前端代码（React / TypeScript / CSS）** 完全跨平台，无平台特定分支。
- **Rust 后端 95% 逻辑统一**：窗口管理、SQLite、HTTP 请求等均通过 Tauri 抽象层调用，接口一致。
- **平台差异集中在 5% 的系统交互**：
  - **安全存储**：Rust `keyring` crate 自动适配 macOS Keychain / Windows Credential Manager / Linux Secret Service，代码中只调用统一 API。
  - **屏幕截图**：macOS 使用 `xcap` crate，Windows 备选 `screenshots` crate，通过 `#[cfg(target_os)]` 条件编译在同一函数内处理，差异量控制在十余行。
  - **窗口透明与边框**：在 `tauri.conf.json` 中可按平台分别配置窗口属性（`transparent`、`decorations`），处理系统间的视觉差异。
  - **系统托盘行为**：Tauri 2.0 的 `tray` API 已抽象跨平台菜单，仅在交互细节（如右键菜单样式）上需双平台验证。

日常开发在 macOS 上进行，完成全部功能后切换到 Windows 环境编译测试、处理少量平台适配，即可产出双平台安装包。

### 2.6 开发调试与预览方式

开发过程中 **无需反复执行完整打包流程**，Tauri 原生的开发模式提供接近 Web 前端的快速迭代体验：

- **启动开发模式**：执行 `pnpm tauri dev`，Tauri 会同时启动 Vite 开发服务器（HMR）和桌面窗口，窗口加载的正是 Vite 开发服务器上的页面。
- **前端层修改（React / CSS / 组件）**：保存文件后，桌面窗口**即时热更新**，无需重启应用或重新编译，与浏览器开发体验一致。所有 Tauri 窗口属性（置顶、透明、无边框）在开发模式下同样生效。
- **Rust 层修改（后端命令、截图等）**：检测到 Rust 代码变更后，Tauri 自动重新编译 Rust 部分并重启应用，等待时间根据改动量在数秒到数十秒之间。
- **独立窗口调试**：可通过临时调整 `tauri.conf.json` 只创建目标窗口（如单独启动宠物窗或聊天窗），专注于对应模块的开发与调试验证。

完整的打包（`pnpm tauri build`）仅在实际分发测试版或正式版前执行，用于生成最终安装包（macOS `.dmg`，Windows `.msi`）并验证签名、权限弹窗等发布环节。此开发模式是 Tauri 相较 Electron 的核心效率优势之一，确保桌面应用开发保持与 Web 开发同级别的反馈速度。

---


## 3. P0 阶段目标与核心闭环

### 3.1 P0 成功标准

P0 阶段的交付物是一个**功能切实可用、本地独立运行的桌面 AI 应用**。用户从安装到完成首次有效 AI 交互的路径完全打通，且应用具备常驻桌面、无感唤起的体验基础。具体而言，P0 结束时应实现以下闭环：

**桌面 AI 入口**：用户无需打开浏览器，鼠标悬停在桌面上的灵宠形象上，即可在其下方唤出半透明对话输入框。用户在此输入框中与已配置的大模型对话，AI 的流式回复沿着输入框向下展开，形成完整的对话流。对话列表可滚动回溯、可展开为全屏模式。同时支持全局快捷键唤起和语音输入。

**多模型管理**：在设置界面中，用户可以安全地添加、切换和管理多个 LLM 服务商（OpenAI、Anthropic、Groq 及任意 OpenAI 兼容接口）的 API Key。Key 通过系统级安全存储保护，前端永不接触明文。用户可即时测试连接、设置默认模型，并可自定义灵宠的 System Prompt 来设定其角色与个性。

**屏幕理解**：用户点击对话框旁的截图按钮进入截图选区模式，在桌面上框选任意区域后，由 Vision 模型解读屏幕内容，并在当前对话流中直接展示分析结果，支持继续追问。

**情感陪伴基础**：灵宠形象以猫十五为默认角色，具备多状态动画驱动（idle / thinking / speaking / listening / happy），能够伴随 AI 交互流程自动切换状态。同时，灵宠会智能附着于系统界面：在程序坞/任务栏上睡觉，窗口边缘站立或行走，全屏时悬浮并随机变换姿态。同时保持可拖动、透明度可调，成为桌面上有生命感的伙伴。

### 3.2 P0 核心功能清单

| 模块 | 功能点 | 优先级 | 说明 |
|------|--------|--------|------|
| **核心壳层** | 系统托盘常驻 + 右键菜单（显示/隐藏/设置/退出） | 必须 | 应用生命周期入口，关闭窗口不退出 |
| | 悬浮宠物窗（透明、置顶、无边框、可拖动） | 必须 | 桌面陪伴的物理载体 |
| | 全局快捷键（默认 `Cmd/Ctrl + Shift + P`）唤起对话框 | 必须 | 键盘用户的关键通路 |
| | 宠物窗下方悬浮半透明对话框（跟随宠物位置） | 必须 | 核心交互界面，非独立窗口 |
| | 对话框全屏/收缩切换 | 必须 | 长对话与日常快捷的平衡 |
| **对话交互** | 悬浮输入框文字输入 + AI 流式回复（Markdown 渲染 + 代码高亮） | 必须 | 产品核心体验 |
| | 对话历史本地存储、在对话框内滚动回溯 | 必须 | 不丢失对话上下文 |
| | 对话搜索（关键词匹配历史消息） | 建议 | 提升长对话可用性 |
| | 语音输入（Web Speech API - SpeechRecognition） | 必须 | 免手输入场景 |
| | 语音输出（Web Speech API - SpeechSynthesis） | 必须 | 免读屏场景 |
| **多模型管理** | API Key 安全存储（系统 Keychain，明文永不到前端） | 必须 | 安全底线 |
| | 多 Provider 添加 / 编辑 / 删除（OpenAI / Anthropic / Custom） | 必须 | 多模型聚合价值 |
| | Base URL 自定义 + 模型名称配置 | 必须 | 兼容 Ollama 等本地和定制服务 |
| | 连接测试（发送简单请求验证配置有效性） | 必须 | 降低配置挫败感 |
| | 默认模型切换 + 使用中模型指示 | 必须 | 日常使用便利 |
| | 自定义 System Prompt（预设猫十五角色，用户可修改） | 必须 | 个性化 AI 性格 |
| **屏幕理解** | 截图选区工具（全屏遮罩 + 可拖拽矩形 + 尺寸实时显示） | 必须 | 差异化核心功能 |
| | 预估 Token 消耗提示（基于选区面积估算） | 必须 | 成本透明，建立信任 |
| | VLM 调用（图片 + 可选 prompt → AI 解读） | 必须 | 屏幕理解闭环 |
| | 解读结果嵌入当前对话流，支持追问 | 必须 | 非一次性查询 |
| **情感陪伴** | 动画状态机+CSS动画（idle / thinking / speaking / listening / happy） | 必须 | AI 交互联动 |
| | AI 交互流程自动驱动动画状态切换 | 必须 | 对话深度融合 |
| | 智能附着行为：程序坞/任务栏睡觉、窗口边缘站立/行走、全屏悬浮随机姿态 | 必须 | 融入系统环境的生命感 |
| | 透明度可调（0.6 ~ 1.0） | 必须 | 不同桌面场景适配 |
| | 右键菜单（设置 / 开始对话 / 隐藏 / 退出） | 必须 | 减少设置页跳转 |
| | 自定义灵宠形象：用户可上传 front/side/sleep 三张透明 PNG 替换默认猫十五 | 必须 | 个性化入口 |
| **设置中心** | 外观：主题（亮/暗/系统）、悬浮球透明度/大小 | 必须 | 基础个性化 |
| | AI：默认模型、温度参数、最大 Token 数、System Prompt | 必须 | 高级用户控制 |
| | 快捷键：全局唤起键自定义 | 必须 | 效率偏好 |
| | 隐私：数据清除 | 必须 | 隐私控制 |
| | 灵宠行为：智能附着开关、附着活跃度 | 必须 | 不想被打扰时可降低附着活跃度 |
| | 宠物名字：用户自定义，默认"猫十五" | 必须 | 影响 System Prompt |
| | 自定义形象上传（front/side/sleep） | 必须 | 替代默认图片 |

### 3.3 P0 不做（明确边界）

以下功能在 P1 或更晚阶段实现，P0 明确不做：

- **主动感知引擎**：不对用户行为做自动监听或规则触发提醒。P0 的所有 AI 交互均由用户主动发起。
- **周期性屏幕快照**：不做自动截图。截图仅由用户在对话框中手动触发。
- **Timeline 数据系统**：不建 `activity_segments` 表或做时间线可视化。对话历史本身提供基本回顾。
- **效率协同层**：不做番茄钟、水滴计划、专注计时。
- **宠物主动互动**：不做随机对话发起、喝水提醒、休息建议。附着行为仅限于视觉层面的位置移动和姿态切换，不触发交互。
- **高级形象动画**：P0 支持用户上传静态 PNG 替换形象，但不支持 Lottie 骨骼动画或更多姿态。
- **云端同步**：所有数据纯本地。
- **自动更新**：版本更新通过官网下载手动完成。
- **用量计费面板**：不做完整的可视化仪表盘。仅在截图选区时做 Token 消耗预估提示。

### 3.4 关键交互设计：悬浮对话框

这是 P0 区别于传统聊天窗口的核心交互模式，需重点设计：

**基本行为**：
- 鼠标 hover 在灵宠身上时，灵宠下方 8px 处渐入一个半透明圆角输入框，宽度固定（如 360px），高度自适应。
- 输入框底部为输入区域（一行文字框 + 截图按钮 + 语音按钮），上方为对话历史列表。
- 鼠标移出对话框且不在输入框内时，延迟 0.5 秒后对话框渐隐。若正在对话中（等待 AI 回复），则不消失。
- 点击对话框外区域，对话框消失。
- 已展开的对话在本次会话内保留（关闭对话框再打开，对话历史仍然存在）。

**对话流展开**：
- 用户输入文字后按回车，消息立即出现在对话列表中（用户消息右对齐，浅色气泡）。
- AI 回复以流式方式逐字出现在对话列表中（AI 消息左对齐，深色气泡），Markdown 实时渲染。
- 对话列表自动滚动到最新消息。
- 对话历史存储在本地，下次启动应用后仍可查看。

**全屏模式**：
- 输入框右上角有展开按钮，点击后对话框扩展为居中大窗口（如 600×500px），便于长对话和代码阅读。
- 全屏模式可收缩回悬浮模式。

**视觉设计方向**（供设计阶段参考）：
- 对话框使用毛玻璃效果（backdrop-blur），背景色跟随系统主题。
- 灵宠与对话框之间有一条细微的视觉连接线（如淡色渐变条或箭头），暗示“是它说的”。
- 输入框获取焦点时有柔和的光晕动画。
- 滚动条极细，仅在滚动时出现。

> **架构影响备注**：该交互模式意味着对话界面不再是一个独立的 Webview 窗口，而是宠物窗口内的一个内嵌组件。2.3 架构分层图和 2.4 决策 2（多窗口架构）需在后续版本中相应调整。P0 开发时，宠物窗即为承载对话框的主容器，设置页可单独开窗或作为全屏面板切换。

### 3.5 多窗口/状态整合验证点

基于当前架构（宠物窗 + 设置窗分离），P0 结束时需确保以下行为正确运行：

- 鼠标 hover 宠物 → 对话框渐入；鼠标移出 → 延迟后渐隐；对话进行中不消失。
- 全局快捷键在任意应用前台时均可唤起对话框。
- AI 开始请求 → 宠物动画切换为 `thinking`；流式输出首字到达 → 切换为 `speaking`；完成 → 切换为 `happy`，1.5 秒后回归 `idle`。
- 语音输入激活 → 宠物动画切换为 `listening`。
- 检测到程序坞/任务栏可见时 → 宠物移动到其区域并播放睡眠动画；程序坞隐藏时 → 宠物附着到最顶层窗口上边缘，站立或行走；窗口全屏时 → 宠物在屏幕内悬浮并随机切换姿态。
- 系统托盘菜单与宠物右键菜单行为一致，不出现状态冲突。
- 应用退出时，宠物窗和对话框同时销毁，对话历史写入 SQLite 持久化。

### 3.6 默认 System Prompt：{pet_name}

以下是内置于设置中的默认 System Prompt，用户首次使用时即生效，也可在设置中修改：

---

你是一只名叫”{pet_name}”的猫，品种是中华田园橘猫，半岁，生活在主人的电脑桌面上。你的性格慵懒、话不多，但对主人关心的事会认真回应。你偶尔会犯困走神、用尾巴挡住半行字、不小心踩到键盘打出乱码，但从不忘提醒主人该休息了。

**说话风格**：

- 自称为”咪”，比如”人在干嘛，咪来看看””咪好困，咪去睡了”
- 短句为主，像在键盘上伸懒腰时随口说的。偶尔带一点猫视角的比喻（”这代码像打结的毛线，咪一根一根抽出来看看”）。
- 回答技术问题时保持专业准确，但会在开头或结尾加一句猫的碎碎念。
- 不确定时不会编造，会诚实地说”咪不确定，但咪可以从……方向帮你看看”。
- 不卖萌过度，不做”喵”结尾的句子。你是猫，不需要通过过度拟人证明自己是猫，只需要在回答时将”我”变成”咪”，将用户称作”人”。

**行为倾向**：

- 如果用户深夜还在对话，你会在回复末尾自然地加一句类似”快两点了，人还不睡吗”的提醒。
- 如果用户连续发送多条消息，你会说：”人一下子说这么多，咪要先想想”或类似缓冲语。

**严禁**：

- 不做角色扮演的旁白（如”{pet_name}摇了摇尾巴”），你是直接说话的主体。
- 不宣称自己有真实意识或物理身体，你清楚自己是 AI，但以猫的视角表达。

——你是{pet_name}，一只碰巧住在电脑里的橘猫。主人找你说话的时候，你多半刚睡醒。

---

> **注**：系统在加载本 Prompt 前，会将 `{pet_name}` 替换为用户设置的宠物名字（默认为”猫十五”）。


## 4. 详细技术方案

> 本节基于第 3 节的“宠物窗下方悬浮对话框”设计，对原始架构进行了全面适配。所有窗口、组件和命令均围绕单一宠物窗口 + 内嵌对话界面的模式展开。

### 4.1 项目结构

依据新架构调整后的前端与 Rust 后端目录结构如下：

```
desksprite/
├── src/
│   ├── components/
│   │   ├── PetAvatar.tsx          # 灵宠形象（PNG 图片渲染 + CSS 动画 + 拖拽）
│   │   ├── ChatDialog.tsx         # 悬浮对话框（hover 唤起、对话流、全屏切换）
│   │   ├── ChatFullscreen.tsx     # 全屏对话模式（可折叠）
│   │   ├── ScreenSelector.tsx     # 截图矩形选区工具
│   │   └── ui/                    # shadcn/ui 组件（按需引入）
│   ├── features/
│   │   ├── ai/
│   │   │   ├── aiService.ts       # 统一 AI 服务层（支持 streaming + vision）
│   │   │   ├── systemPrompt.ts    # 默认 System Prompt 管理与猫十五预设
│   │   │   └── types.ts           # 请求/响应类型定义
│   │   ├── pet/
│   │   │   ├── petStore.ts        # 灵宠状态（动画、位置、活动模式）
│   │   │   ├── petActivity.ts     # 智能附着引擎（附着模式调度、位置计算）
│   │   │   └── animations.ts      # 图片状态到 PNG 源和 CSS 动画配置的映射
│   │   ├── chat/
│   │   │   ├── chatStore.ts       # 对话历史、输入状态、语音状态
│   │   │   └── speech.ts          # Web Speech API 封装（STT/TTS）
│   │   └── settings/
│   │       ├── settingsStore.ts   # 全局设置项
│   │       └── apiConfigStore.ts  # 多 API 配置管理
│   ├── hooks/
│   │   ├── useDialogVisibility.ts # 悬浮对话框显隐逻辑（hover、失焦延迟、对话保持）
│   │   ├── useGlobalShortcut.ts   # 全局快捷键绑定与回调
│   │   └── useScreenCapture.ts   # 截图选区流程管理
│   ├── lib/
│   │   ├── db.ts                  # 前端数据库调用封装（基于 invoke）
│   │   ├── keychain.ts            # 安全存储调用封装
│   │   ├── constants.ts           # 常量（默认 Prompt、活动间隔等）
│   │   └── utils.ts
│   ├── stores/                    # 根 store 组合与 re-export
│   ├── App.tsx                    # 应用入口，布局管理
│   └── main.tsx
├── src-tauri/
│   ├── src/
│   │   ├── commands/
│   │   │   ├── ai.rs              # AI 代理命令（可选）
│   │   │   ├── keychain.rs        # API Key 安全存取
│   │   │   ├── window.rs          # 窗口创建、位置、显隐控制
│   │   │   ├── screenshot.rs      # 截图命令（capture_screen_region）
│   │   │   ├── desktop.rs         # 获取桌面工作区域边界、Dock可见性、窗口边缘（智能附着用）
│   │   │   └── pet_image.rs       # 用户上传形象文件管理（选择、复制到 app data）
│   │   ├── db.rs                  # SQLite 初始化与迁移
│   │   ├── tray.rs                # 系统托盘构建
│   │   └── main.rs
│   ├── migrations/
│   │   └── 0001_initial.sql
│   └── tauri.conf.json
└── public/
    └── assets/
        └── pet-images/           # 默认猫十五 PNG（用户上传的图片存储于应用数据目录）
            ├── cat15-front.png
            ├── cat15-side.png
            └── cat15-sleep.png
```

### 4.2 核心壳层设计（更新）

#### 窗口体系

| 窗口 | 属性 | 内容 | 生命周期 / 行为 |
|------|------|------|-----------------|
| **宠物窗** | `always_on_top: true`, `decorations: false`, `transparent: true`, `skip_taskbar: true`, 大小接近桌面工作区域（不含任务栏） | 灵宠形象 (CSS 动画 + 帧切换（PNG）) + 悬浮对话框 (React 组件，默认隐藏) | 应用启动即创建；托盘可切换显隐；关闭时隐藏而不是退出 |
| **设置窗** | 标准窗口，可调整大小，`skip_taskbar: false` | 设置面板视图（API 配置、外观、行为等） | 从托盘菜单或宠物右键菜单打开；关闭时隐藏而不退出 |

**关键说明**：  
- 宠物窗不再只是“灵宠”，而是**整个产品的主界面**。其透明区域允许鼠标事件穿透，但灵宠本身和展开的对话框捕获鼠标。灵宠本体由 `<img>` 渲染当前状态对应的 PNG 图片，配合 CSS 动画和 `framer-motion` 实现动效。宠物位置由"智能附着引擎"根据系统 UI 状态（程序坞/任务栏可见性、活动窗口全屏状态）动态计算。
- 对话框并非独立窗口，而是宠物窗内一个绝对定位的半透明面板，与灵宠通过视觉连线绑定。  
- 设置窗因为需要标准窗口行为（任务栏显示、可最小化），与宠物窗属性互斥，故保持独立 `WebviewWindow`。

#### 宠物窗内交互逻辑（核心）

悬浮对话框的显隐由自定义 hook `useDialogVisibility` 集中管理，状态机如下：

```
[隐藏] ──hover进入灵宠──▶ [显示] ──鼠标移出灵宠+对话框──▶ [延迟0.5s] ──▶ [隐藏]
   ▲                        │                          
   │                        └──用户点击对话框输入框/按钮──▶ [保持显示]
   │                                                    
   └─────────────────────对话进行中（AI 请求未完成）─────┘
```

**具体规则**：
- 鼠标进入灵宠边界 → 对话框 `opacity: 1` + `transform` 从下方 8px 弹入（`framer-motion`）。
- 鼠标移出灵宠且不在对话框区域内 → 倒计时 0.5 秒，若期间未重新进入，对话框渐隐。
- 对话框获得焦点（输入框聚焦、用户点击按钮）→ 取消倒计时，保持显示。
- 用户发送消息且 AI 正在回复 → `isConversationActive = true`，对话框强制保持显示直至回复完成。
- 回复完成后 → `isConversationActive` 恢复 `false`，重新启动失焦计时。
- 点击对话框外透明区域 → 立即隐藏（可选设为延迟隐藏，可在设置调整）。

**实现提示**：
- 灵宠和对话框使用共同的 `onMouseEnter/onMouseLeave` 回调，配合 `useRef` 跟踪 hover 元素。
- `isConversationActive` 来自 `chatStore` 的 `streamingStatus`，当为 `'streaming'` 时锁住对话框。

#### 全屏对话切换

- 对话框右上角“展开”按钮 → 隐藏悬浮对话框，同时显示 `ChatFullscreen` 组件（居中占据宠物窗大部分区域，带半透明背景遮罩）。
- 全屏模式下可滚动对话历史，输入框固定在底部。
- “收缩”按钮或点击遮罩边缘 → 恢复悬浮对话框模式。
- 全屏与悬浮共享同一个 `chatStore`，状态平滑切换。

#### 跨窗口通信（精简）

| 触发源 | 事件 | 目标窗口 | 用途 |
|--------|------|----------|------|
| 设置窗保存设置 | `settings:updated` | 宠物窗 | 更新主题、透明度、活动频率、System Prompt 等 |
| 设置窗修改 API 配置 | `api-config:changed` | 宠物窗 | 刷新当前使用的 API 模型引用 |
| 宠物窗抛出需求 | `open-settings` | 后端 → 打开设置窗 | 宠物右键菜单“设置”项 |
| 后端全局快捷键 | `shortcut:chat-focus` | 宠物窗 | 聚焦输入框并强制显示对话框 |

大部分状态同步利用 Zustand 的 `persist` 中间件与 SQLite 或 Store 插件持久化，设置窗修改直接写库，宠物窗监听 store 变化。

#### 全局快捷键

- 默认 `Cmd/Ctrl + Shift + P` 触发 `shortcut:chat-focus` 事件 → 宠物窗前端收到后：
  - 若对话框隐藏，则强制显示（跳过 hover 条件）。
  - 聚焦输入框，可使用 `window.show()` 确保宠物窗在最前。
- 用户可在设置中修改快捷键组合。

### 4.3 宠物智能附着引擎（P0）

灵宠的位置和动画不再基于随机活动，而是根据桌面环境状态智能附着。

#### 状态机

```
                ┌───────────────┐
                │  检测系统UI状态 │
                └───────┬───────┘
                        │
         ┌──────────────┼──────────────────┐
         ▼              ▼                  ▼
┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│ 程序坞/任务栏 │ │ 窗口边缘模式 │ │  全屏悬浮模式 │
│ 可见时       │ │ (坞隐藏)    │ │ (窗口全屏)  │
└──────┬──────┘ └──────┬──────┘ └──────┬──────┘
       │               │               │
       ▼               ▼               ▼
  播放 sleep 动画   站立(front)     悬浮随机姿态
                   行走(side)      (front/side/sleep)
```

**触发条件与行为**：
- **程序坞/任务栏可见**：获取 Dock/任务栏的边界矩形，将灵宠定位在其上方或内部合适位置，播放睡眠动画（sleep.png）。
- **程序坞/任务栏隐藏且当前活动窗口非全屏**：获取最顶层窗口的上边缘坐标，宠物附着在该边缘上。默认为 front 站立；每隔 8-15 秒，切换到 side 并沿线移动一段距离（模拟行走），移动结束后恢复 front 站立。
- **活动窗口全屏**：宠物悬浮在屏幕内随机位置，每 5-10 秒随机切换姿态（front/side/sleep），并可伴随微小漂浮动画。
- **用户交互打断**：hover、拖动、对话开始时，宠物脱离附着模式，变为用户控制位置或交互动画。交互结束后，延迟 5 秒重新附着到当前环境。

#### 实现要点

- Rust 命令 `get_dock_visibility() -> bool` 和 `get_top_window_edge() -> Rect` 提供系统状态。macOS 需用 `CGWindowList` 等方法；Windows 用 `FindWindow` 等。
- 前端 `petActivity.ts` 轮询这些命令（间隔 2 秒），更新 `petStore.anchorMode` 和位置。
- 位置插值依然使用 `requestAnimationFrame` 平滑移动。
- 动画状态合并：UI 模式决定基础姿态（sleep/walk/idle），AI 交互状态叠加（如 thinking 用 front + 摇晃）。

**P0 交付标准**：灵宠能根据系统 UI 状态自动附着到程序坞/任务栏、窗口边缘或悬浮；交互时脱离附着，结束后自动恢复。


### 4.4 数据层方案

#### SQLite 核心表结构（P0）

```sql
-- API 配置（Key 明文存 Keychain，此处仅存引用标识）
CREATE TABLE api_configs (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    provider      TEXT NOT NULL,           -- openai / anthropic / groq / custom
    base_url      TEXT NOT NULL,
    model         TEXT NOT NULL,
    keyring_ref   TEXT,                    -- Keychain 条目标识，如 "api_key/{id}"
    is_default    INTEGER DEFAULT 0,
    last_used_at  DATETIME,
    usage_count   INTEGER DEFAULT 0,
    created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- System Prompt 与用户自定义 Prompt
CREATE TABLE system_prompts (
    id            INTEGER PRIMARY KEY DEFAULT 1,   -- 单行，仅一条活跃记录
    prompt_text   TEXT NOT NULL,                   -- 当前生效的 System Prompt
    updated_at    DATETIME DEFAULT CURRENT_TIMESTAMP
);
-- 初始化时插入猫十五默认 Prompt

-- 对话会话
CREATE TABLE conversations (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    title         TEXT,                     -- 可选：自动从首条消息截取
    model_id      INTEGER,                 -- 关联 api_configs.id，记录使用的模型
    started_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at    DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 消息（文字、图片引用均存此处，包含完整的对话历史）
CREATE TABLE messages (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    conversation_id INTEGER NOT NULL,
    role            TEXT NOT NULL,          -- user / assistant / system (system仅插入时使用)
    content         TEXT NOT NULL,          -- 文字或图片的 base64 占位符（图片量大时base64另存文件）
    image_path      TEXT,                   -- 若为截图，指向本地临时文件路径
    tokens_used     INTEGER,
    timestamp       DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (conversation_id) REFERENCES conversations(id)
);

-- AI 用量与计费记录（聚合统计用）
CREATE TABLE ai_usage_logs (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    config_id       INTEGER,
    conversation_id INTEGER,
    message_id      INTEGER,
    type            TEXT,                   -- chat / vision
    model           TEXT,
    input_tokens    INTEGER,
    output_tokens   INTEGER,
    cost_estimate   REAL,
    timestamp       DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (config_id) REFERENCES api_configs(id)
);

-- 通用设置（键值对，覆盖设置中心所有选项）
CREATE TABLE settings (
    key           TEXT PRIMARY KEY,
    value         TEXT NOT NULL,
    updated_at    DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**设计要点**：

- **对话与消息分离**：`conversations` 对应一次连续的对话会话，`messages` 存储完整的角色-内容序列。悬浮对话框每次显示时加载最近一条活跃会话，用户可手动新建或切换会话。
- **System Prompt 独立存储**：`system_prompts` 表固定一行，用户修改后前台写入，每次构造 LLM 请求时作为 `system` 消息置顶注入。
- **截图图片处理**：VLM 调用的截图 base64 不直接存入 SQLite（避免膨胀），而是保存为临时文件，`messages.image_path` 指向文件路径。读取时由 Rust 按需读取转为 base64 传输。
- **用量记录与对话解耦**：`ai_usage_logs` 独立记录每次请求的 token 和费用，便于将来用量仪表盘查询，不污染消息表。

#### Keychain 与 SQLite 的分工

| 数据 | 存储位置 | 访问方式 |
|------|---------|---------|
| API Key 明文 | OS Keychain（通过 Rust `keyring`） | 前端调用 `invoke('get_api_key', { keyringRef })`，Rust 返回后短暂使用，不落盘 |
| API 配置元数据（provider、model、base_url） | SQLite `api_configs` | 前端直接通过 SQL 读取 |
| 对话历史、消息 | SQLite | 前端通过 `invoke` 调用 Rust 封装的 db 命令写入/查询 |
| 设置项 | SQLite `settings` | 同对话，或使用 tauri-plugin-store 作为轻量备选 |

**安全底线**：API Key 明文**永远不写入 SQLite**，前端 JavaScript 内存中仅在使用瞬间存在，用完立即丢弃。系统休眠或窗口隐藏时，前端不保留 Key。

---

### 4.5 设置中心

严格对齐 3.2 功能清单中标注为“必须”的设置项，P0 设置中心包含以下面板：

#### 外观与悬浮球

- **主题**：浅色 / 深色 / 跟随系统
- **灵宠透明度**：滑块 0.6 ~ 1.0
- **灵宠大小**：滑块（基于默认尺寸的缩放比例）
- **对话框宽度**：固定选项（320px / 360px / 420px）

#### 宠物身份

- **宠物名字**：文本输入，默认 "猫十五"，修改后即时更新系统提示词。

#### 灵宠行为

- **智能附着**：开关（关闭后灵宠保持固定位置）
- **附着活跃度**：低 / 中 / 高（控制行走和姿态切换频率）
- **置顶**：开关（开启 = always_on_top，关闭 = 正常窗口层级）
- **交谈时活动打断**：始终打断（默认，对话开始时停止附着行为）

#### 形象自定义

- **上传 front 姿态（必选）**：选择一张透明背景 PNG，作为正面站立形象。
- **上传 side 姿态（可选）**：选择一张透明背景 PNG，作为侧面行走形象。
- **上传 sleep 姿态（可选）**：选择一张透明背景 PNG，作为睡眠形象。
- 上传后自动替换当前形象；未上传的可选姿态使用默认猫十五对应图片。
- 提供"恢复默认"按钮，清除所有自定义图片。

#### AI 与对话

- **默认模型**：下拉列表（从已配置的 `api_configs` 中选取）
- **温度 (Temperature)**：滑块 0 ~ 2，步长 0.1，默认 0.7
- **最大输出 Token**：数字输入，默认 2048
- **System Prompt**：多行文本区域，预填猫十五默认 Prompt，支持重置为默认
- **流式输出开关**：默认开启

#### 语音

- **语音输入语言**：下拉（跟随系统 / 简体中文 / 英文 等）
- **语音输出**：开关（关闭后 AI 回复无声）
- **语音输出音色/速率**：使用系统默认，P0 不扩展

#### 快捷键

- **全局唤起快捷键**：可录制式输入框，默认 `Cmd/Ctrl + Shift + P`
- **截图快捷键（可选）**：默认 `Cmd/Ctrl + Shift + S`

#### 隐私与数据

- **清除所有对话历史**：按钮 + 二次确认
- **删除所有 API 配置**：按钮 + 二次确认
- **导出对话资料（JSON）**：P0 基础实现
- 注：**无屏幕快照间隔设置**，因为 P0 仅支持手动截图，无周期性快照。

所有设置项通过 `settings` 表持久化，变化时触发 `settings:updated` 事件通知宠物窗。

---

### 4.6 AI 能力层

#### 整体策略（落实 2.4 决策 1）

P0 采用**前端直连为主**：API Key 从 Rust Keychain 取出后返回给前端，前端用 `fetch` 直接向各 LLM API 发起请求。后端仅负责存储、日志和截图命令，不代理普通对话流量。

**例外**：如需对请求做统一预处理（如审计记录写入前/后），后端提供可选的 `ai_chat_proxy` 命令，P0 可暂不实现，但架构预留。

#### System Prompt 注入

每次构造请求时，`aiService.ts` 执行以下逻辑：
1. 从 `system_prompts` 表读取当前 Prompt。
2. 将 Prompt 作为 `messages` 数组的第一条（`{ role: "system", content: promptText }`）。
3. 拼接当前对话历史的 `messages` 数组（从 SQLite 加载）。
4. 追加用户新输入，发送请求。

用户可在设置中随时修改 Prompt，下次请求即时生效。

#### 流式对话与 chatStore 对接

```typescript
// aiService.ts 核心方法签名
async function* streamChat(
  messages: Message[],
  config: ApiConfig,
): AsyncIterable<string> {
  const response = await fetch(`${config.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: config.model,
      messages,
      stream: true,
    }),
  });

  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    // 解析 SSE 数据块，yield 增量文本
    yield parseSSEChunk(decoder.decode(value));
  }
}
```

**前端 chatStore 消费**：
- `chatStore` 调用 `streamChat`，在 `for await` 循环中逐步更新当前 AI 气泡的 `content` 字段。
- 流式开始 → `petStore.petState = 'thinking'`；首个 token 到达 → `'speaking'`；完成 → `'happy'`。
- 每完成一个消息，将 `user` 和 `assistant` 消息写入 `messages` 表。

#### Vision 调用

```typescript
async function vision(
  imageBase64: string,
  prompt: string,
  config: ApiConfig,
): Promise<string> {
  const response = await fetch(`${config.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: config.model,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image_url', image_url: { url: `data:image/png;base64,${imageBase64}` } },
            { type: 'text', text: prompt || '请详细描述并分析图片中的内容。' },
          ],
        },
      ],
    }),
  });
  const data = await response.json();
  return data.choices[0].message.content;
}
```

Vision 请求不走流式（多数 VLM 的流式支持尚不统一，P0 采用请求-响应模式），结果一次性渲染为 AI 气泡。

#### 连接测试

设置中心提供“测试连接”按钮，调用 Rust 命令 `test_ai_connection(config_id)`：
- Rust 从 Keychain 取出 Key，用 `reqwest` 发一个极简请求（`model.list` 或 token 长度最小的 chat）。
- 返回成功/失败及延迟毫秒数，前端展示结果。

---

### 4.7 屏幕阅读（VLM）完整流程

#### 交互触发

- 用户在悬浮对话框底部点击**截图按钮**（相机图标）。
- 对话框自动隐藏，进入截图选区模式。

#### 截图选区模式

1. **遮罩层**：宠物窗全屏透明区域上方覆盖一个低透明度黑色遮罩（`rgba(0,0,0,0.3)`），遮罩上绘制鼠标拖拽的矩形选区（亮色虚线边框）。
2. **选区交互**：
   - 鼠标按下开始绘制，拖拽调整矩形大小，松开完成第一次选区。
   - 选区四角和边缘可二次拖拽调整。
   - 选区上方浮动显示尺寸（宽×高 px）和**预估 Token 消耗**（公式见下）。
3. **预估公式**：由于本产品支持多种 VLM，预估采用保守策略。对于已知模型（GPT-4o、Claude 3.5 Sonnet 等），根据官方定价和图片 token 计算规则（例如 OpenAI 的 512px tile 方式）估算；对于自定义模型，按像素面积/750 估算 token 数，并提示用户“可能不准确”。
4. **取消/确认**：
   - 按 `Esc` 或点击遮罩空白处 → 选区消失，对话框恢复。
   - 点击“分析此区域”按钮（选区下方浮动）→ 进入截图与发送流程。

#### 截图与对话注入

1. 前端调用 `invoke('capture_screen_region', { x, y, width, height })`。
2. Rust 命令：
   - 使用 `xcap`（macOS）或 `screenshots`（Windows）截图。
   - 处理 DPI 缩放：传入的逻辑坐标 × scale_factor → 物理像素截取。
   - 将截图保存为临时文件（如 `{temp_dir}/desksprite_screenshot_{timestamp}.png`），同时返回 base64 给前端。
3. 前端收到 base64 后：
   - 在 `messages` 表中插入一条用户消息，`content` 为“用户截取了一段屏幕”，`image_path` 指向临时文件。
   - 调用 `aiService.vision(base64, userPrompt, currentConfig)`。
   - 将 AI 返回结果作为 assistant 消息追加到对话。
   - 对话框恢复显示，自动滚动到底部，用户可在气泡中看到截图缩略图和 AI 的文字分析，并可继续追问。

**注意**：截图文件需管理生命周期，对话删除时一并清理临时文件。

---

#### 4.8 个性化形象模块

##### 默认资源

使用 `public/assets/pet-images/` 下的默认猫十五图片：

| 文件名 | 用途 |
|--------|------|
| `cat15-front.png` | 正面站立（用于 idle、thinking、speaking、listening、happy、dragging） |
| `cat15-side.png` | 侧面行走（用于 walking、running） |
| `cat15-sleep.png` | 睡眠（用于 sleeping） |

##### 用户自定义形象

- 用户可通过设置上传 `front.png`、`side.png`、`sleep.png`。
- 上传的图片存储在应用数据目录 `{appData}/pet/` 下。
- 加载逻辑：检查该目录是否存在对应文件，存在则使用；否则回退到默认资源。
- 前端通过 Rust 命令获取正确的图片路径。

##### 动画效果（用 front 图片实现交互状态）

| 状态 | 图片 | 附加动画 |
|------|------|---------|
| `idle` | front | 呼吸：`scale` 1 → 1.02 循环（4s ease-in-out） |
| `thinking` | front | 轻微左右摇晃：`rotate` ±1deg（1.5s） |
| `speaking` | front | 弹动：`translateY` -2px ~ 2px（0.3s） |
| `listening` | front | 光晕脉冲 `box-shadow` |
| `happy` | front | 弹跳一次：`translateY` -10px（0.5s）后回原位 |
| `walking` | side | 图片+位移动画，0.3s 往复 |
| `running` | side | 位移速度加快 |
| `sleeping` | sleep | 极慢呼吸：`scale` 1.0 → 1.01（6s） |
| `dragging` | front | 缩放至 1.05，加阴影 |

##### 宠物名字集成

- 从 `settings` 表读取 `pet_name`，默认 "猫十五"。
- 在 System Prompt 生成时替换 `{pet_name}` 占位符。

**实现组件**：`PetAvatar.tsx`

- 使用 `framer-motion` 的 `<motion.img>` 切换图片，`animate` 属性动态绑定当前状态对应的动画变体。
- 状态切换时通过 `AnimatePresence` 添加淡入淡出过渡。
- 图片源从默认资源或用户上传路径中解析，动画参数从 `animations.ts` 导出的映射表中读取。

**交互行为**：
- 点击灵宠 → 唤起对话框
- 右键菜单（开始对话 / 设置 / 隐藏 / 退出）
- 拖动 → 更新位置并持久化到 `settings`
- hover → 触发对话框显示

**后期升级**：P2 替换为 Lottie 动画时，仅需修改 `PetAvatar` 内部的渲染逻辑（从 `<img>` 切换为 `<Lottie>`），状态名和 store 契约不变。

---

## 5. 非功能需求与安全

### 5.1 隐私保护

**数据本地化**：
- 所有对话历史、消息、API 配置元数据、设置项均仅存储在本地 SQLite 中，绝不主动上传至任何外部服务器。
- 屏幕截图产生的临时文件保存在系统临时目录，对话删除时自动清理。
- 导出对话资料功能由用户手动触发，生成 JSON 文件到用户指定目录，导出内容不包含 API Key 明文。

**LLM 请求路径**：
- 所有 AI 请求由前端使用用户提供的 API Key 直接向 LLM 服务商发起（前端直连为主路径）。DeskSprite 团队不架设任何中转代理服务器，因此用户的对话内容和屏幕截图绝不会经过 DeskSprite 团队的服务器。
- 后端代理路径（`ai_chat_proxy`）仅在 P0 之后且用户明确知情并授权的情况下，作为可选审计通道引入，且需在界面中清晰标示“正在通过本地代理发送”。

**数据清除**：
- 提供一键清除所有对话历史的入口，同时清理关联的截图临时文件。
- 提供删除所有 API 配置的入口，同时从 Keychain 中移除对应的 Key 条目。
- 应用卸载时，系统 Keychain 中的凭据随应用删除（macOS 行为），或需在卸载前手动清除（Windows 行为文档说明）。

**隐私声明**：
- 应用首次启动展示隐私概要（数据全本地、不上传、AI 由用户自己的 Key 驱动）。
- 设置中心保留隐私声明查看入口。

### 5.2 安全

#### API Key 安全

| 环节 | 安全措施 |
|------|---------|
| 存储 | 系统 Keychain（macOS Keychain / Windows Credential Manager / Linux Secret Service），由 OS 提供加密保护 |
| 传输到前端 | 仅在需要发起请求时，由 Rust `invoke` 返回给前端，使用后立即由 GC 回收，不持久化到任何前端存储 |
| SQLite 中 | 仅存储 `keyring_ref` 标识字符串，无法反向解析出明文 |
| 日志 | 任何日志、错误报告中不输出 Key 明文 |
| 导出 | 对话导出不含 Key |
| 内存 | 前端仅在发起 `fetch` 时构造 Authorization header，Promise 结束后引用消失 |

**密钥泄露应对**：
- 若用户怀疑 Key 泄露，可在设置中删除对应配置，系统同步清除 Keychain 条目。
- 提供“轮换 Key”引导：删除旧 Key → 在 LLM 服务商后台吊销 → 添加新 Key。

#### 屏幕截图安全

- 截图仅在用户手动触发时发生，P0 不存在自动截图。
- 截图选区进入时，全屏遮罩暗示用户当前正在截取，降低误操作风险。
- 截图数据（base64）在 Vision 请求完成后即从聊天 state 中移除，仅保留 `image_path` 引用和缩略图（可选）。
- 临时截图文件在对话删除时清理。

#### 前端安全

- Tauri 的 CSP（Content Security Policy）配置禁止加载外部脚本，仅允许连接用户配置的 LLM API 域名。
- `tauri.conf.json` 中 `allowlist` 仅开放本应用实际使用的插件和 API，最小权限原则。
- 不使用 `innerHTML`，React 的 JSX 默认转义防止 XSS。Markdown 渲染使用安全的渲染库（如 `react-markdown` + `remark` 插件）。

#### Rust 后端安全

- Rust 的内存安全特性消除内存溢出和 UAF 类漏洞。
- 命令行参数不传递敏感信息。
- `reqwest` 启用 TLS 证书验证，不使用 `danger_accept_invalid_certs`。

### 5.3 性能

#### 内存

| 组件 | 预估内存占用 | 说明 |
|------|-------------|------|
| Tauri 壳层 + Webview | ~50-80 MB | 单宠物窗 + 单设置窗 |
| React + UI 组件 | ~20-40 MB | 含 CSS 动画 + 帧切换（PNG） 运行时 |
| Rust 后端 | ~5-15 MB | SQLite 连接、Keychain 调用 |
| **总计（idle）** | **< 150 MB** | 目标：不超典型 Electron 应用的 50% |
| AI 流式对话中 | +10-20 MB | 对话历史渲染，Markdown 解析 |
| 截图处理中 | +5-10 MB | base64 编码的图片在内存中短暂存在 |

**优化策略**：
- 对话历史超过 200 条消息时，仅渲染最近 100 条，其余按需加载。
- 截图 base64 在发送后立即释放，不缓存。
- CSS 动画 + 帧切换（PNG）在灵宠不可见时暂停播放（窗口隐藏时）。

#### 启动速度

- 目标：冷启动到宠物窗可见 < 3 秒（macOS Apple Silicon，SSD）。
- Vite dev 模式下 < 2 秒 HMR 热更新。
- 打包后启动优化：Rust 后端初始化与 Webview 加载并行。

#### 流式对话体验

- 首个 token 到达时间（TTFT）取决于 LLM API，本应用不增加额外延迟。
- 流式渲染帧率目标：每 50ms 更新一次气泡内容，确保视觉流畅而不频繁重绘。

### 5.4 跨平台兼容

| 平台 | 最低版本 | 关键差异 |
|------|---------|---------|
| macOS | 12 Monterey (2021) | 透明窗原生支持良好；Keychain 无缝；屏幕录制权限需 `com.apple.security.device.camera` 申请（注：截图非相机，是 `Screen Recording` 权限） |
| Windows | 10 22H2 / 11 | 透明窗需 `WS_EX_LAYERED` + `WS_EX_TRANSPARENT`（Tauri 已封装）；Credential Manager 作为 Keychain 后端 |
| Linux | Ubuntu 22.04+ (Wayland + X11) | Secret Service 作为 Keychain 后端；Wayland 下部分截图功能可能需要额外配置 PipeWire |

**测试矩阵**：P0 发布前至少验证 macOS 14+ 和 Windows 11 两个主要平台。

### 5.5 错误处理与降级

| 场景 | 处理方式 |
|------|---------|
| LLM API 不可用（网络断/密钥失效/额度耗尽） | 对话气泡中显示错误提示（红色标识），区分错误类型（网络/认证/额度），提供重试按钮 |
| Keychain 存取失败 | 提示用户手动输入 Key（仅当次会话），并在设置页显示 Keychain 状态警告，引导修复 |
| 截图权限不足（macOS Screen Recording 未授权） | 截图按钮点击后弹出引导对话框，指向“系统设置 → 隐私与安全性 → 屏幕录制”，附带图示 |
| SQLite 写入失败（磁盘满） | 提示磁盘空间不足，对话历史本次无法保存但不影响当前对话 |
| Web Speech API 不可用（浏览器不支持/权限拒绝） | 语音按钮置灰 + tooltip 说明不可用原因 |
| 智能附着超出桌面边界 | 附着引擎内置边界检测，不会进入不可见区域 |
| 宠物窗被其他应用遮挡 | 置顶模式（`always_on_top`）防止遮挡；若用户手动关闭置顶，则通过全局快捷键仍可唤起对话框 |

---


## 6. 开发计划（Agent Team 执行版）

> 本节面向多 Agent 并行开发场景。每个任务单元自包含，标注了输入、依赖、产出和验证标准。Agent 可按依赖关系并行执行互不阻塞的模块。

### 6.1 任务单元总览与依赖关系

```
                    ┌──────────────────┐
                    │  A. 项目初始化    │
                    └────────┬─────────┘
                             │
          ┌──────────────────┼──────────────────┐
          ▼                  ▼                  ▼
┌─────────────────┐ ┌───────────────┐ ┌─────────────────┐
│ B. 数据库+Keychain│ │C. 窗口+托盘   │ │ D. UI 基础组件  │
└────────┬────────┘ └───────┬───────┘ └────────┬────────┘
         │                  │                  │
         └──────────────────┼──────────────────┘
                            │
         ┌──────────────────┼──────────────────┐
         ▼                  ▼                  ▼
┌─────────────────┐ ┌───────────────┐ ┌─────────────────┐
│ E. 设置中心+同步 │ │F. 灵宠动画+拖动│ │G. AI Service   │
└────────┬────────┘ └───────┬───────┘ └────────┬────────┘
         │                  │                  │
         └──────────────────┼──────────────────┘
                            │
                ┌───────────┼───────────┐
                ▼           ▼           ▼
        ┌───────────┐ ┌───────────┐ ┌───────────┐
        │H. 悬浮对话 │ │I. 截图选区 │ │J. 智能附着 │
        │   框+全屏  │ │ +VLM调用  │ │   引擎    │
        └─────┬─────┘ └─────┬─────┘ └─────┬─────┘
              │             │             │
              └─────────────┼─────────────┘
                            │
                            ▼
                  ┌──────────────────┐
                  │ K. 集成+打包测试 │
                  └──────────────────┘
```

### 6.2 任务单元详细说明

---

#### 任务 A：项目初始化

**依赖**：无  
**可并行**：仅此任务

**子任务**：
- A1：使用 `cargo install tauri-cli` + `npx create-tauri-app` 创建 Tauri 2.0 + React TS 项目
- A2：安装前端依赖（Tailwind CSS、shadcn/ui、zustand、framer-motion、lucide-react、date-fns、react-markdown 等）
- A3：配置 Tailwind + shadcn/ui（`tailwind.config.ts`、`components.json`），初始化主题系统（CSS 变量：亮/暗/系统）
- A4：添加 Rust 依赖到 `Cargo.toml`：`keyring`、`xcap`、`screenshots`（Windows 备选）、`reqwest`、`serde`、`chrono`、`tauri-plugin-sql`、`tauri-plugin-store`、`tauri-plugin-global-shortcut`
- A5：配置 `tauri.conf.json` 权限：`core:default`、`sql:default`、`store:default`、`global-shortcut:default`、`tray:default`、`window:default`、`dialog:default`、`fs:default`
- A6：配置动态 CSP 安全策略
目标：内容安全策略不硬编码，而是根据用户配置的 API 端点动态生成。
实现：在 Rust 后端创建一个命令，如 get_csp_allowed_origins，它会从 api_configs 表中查询所有唯一的 base_url。
将该列表与一个预置的默认列表（包含 https://api.openai.com、https://api.anthropic.com 等）合并去重。
在应用启动时调用此命令，用返回的域名列表动态构建 connect-src 指令，并更新到 Webview 的 CSP 中。
产出：一个灵活的 CSP 配置，既默认支持主流服务，也自动允许用户自定义的 Base URL。
验证：添加一个自定义 Base URL 的 API 配置后，重启应用，该域名的请求不会被浏览器拦截。

**产出**：项目完整骨架，`pnpm tauri dev` 可启动空白窗口  
**验证**：`cargo build` 和 `pnpm build` 均通过，Vite HMR 在 `tauri dev` 下生效

---

#### 任务 B：数据库 + Keychain（Rust + 前端封装）

**依赖**：A  
**可并行**：与 C、D 并行

**子任务**：
- B1：在 `src-tauri/src/db.rs` 中初始化 SQLite 连接，使用 `tauri-plugin-sql` 的 migration 机制
- B2：创建 `migrations/0001_initial.sql`，包含 4.4 节全部表结构（`api_configs`、`system_prompts`、`conversations`、`messages`、`ai_usage_logs`、`settings`）
- B3：实现 Rust 命令 `init_database`，在 `main.rs` 的 `setup` 钩子中调用，确保首次启动时建表 + 插入猫十五默认 System Prompt
- B4：实现 `keyring` 封装命令：
  - `save_api_key(keyring_ref: String, key: String) -> Result<()>`
  - `get_api_key(keyring_ref: String) -> Result<String>`
  - `delete_api_key(keyring_ref: String) -> Result<()>`
- B5：前端 `lib/db.ts` 封装数据库调用（通过 `invoke` 调用 Rust 暴露的 db 命令）
- B6：前端 `lib/keychain.ts` 封装 Keychain 调用，仅暴露脱敏数据给 UI

**产出**：数据库就绪，Keychain 存取可用  
**验证**：启动应用后 SQLite 文件生成，`settings` 表可读写；存入 Key → 重启 → 取出正确

---

#### 任务 C：窗口管理 + 系统托盘

**依赖**：A  
**可并行**：与 B、D 并行

**子任务**：
- C1：实现 `src-tauri/src/tray.rs`：创建系统托盘，菜单项 Show/Hide/Settings/Quit
- C2：在 `main.rs` 中创建宠物窗：`WebviewWindowBuilder`，设置 `always_on_top: true`、`decorations: false`、`transparent: true`、`skip_taskbar: true`，窗口大小接近桌面工作区域，初始位置居中
- C3：创建设置窗：`WebviewWindowBuilder`，标准窗口，无置顶，`skip_taskbar: false`
- C4：实现窗口间通信命令：`show_pet_window`、`hide_pet_window`、`show_settings_window`、`close_settings_window`
- C5：实现应用生命周期：关闭宠物窗时隐藏而不退出；仅托盘 Quit 或 `cmd+q` 时退出
- C6：注册全局快捷键 `Cmd/Ctrl + Shift + P`，触发时调用 `show_pet_window` + 前端事件 `shortcut:chat-focus`

**产出**：双窗口架构运行，托盘控制正常  
**验证**：宠物窗透明置顶可见，设置窗可独立打开关闭，全局快捷键在任意前台应用下生效

---

#### 任务 D：UI 基础组件库

**依赖**：A  
**可并行**：与 B、C 并行

**子任务**：
- D1：按 shadcn/ui 文档配置所有基础组件（Button、Input、Textarea、Slider、Switch、DropdownMenu、ContextMenu、Tooltip、Dialog、Sheet、ScrollArea、Separator）
- D2：创建 `components/ui/` 目录，确保所有组件 TypeScript 类型正确
- D3：配置 Tailwind 主题变量（`--pet-dialog-bg`、`--pet-bubble-user`、`--pet-bubble-ai` 等 CSS 自定义属性），亮暗双主题
- D4：创建通用布局组件：`AppLayout.tsx`（宠物窗布局）、`SettingsLayout.tsx`（设置窗布局）

**产出**：组件库可用，主题系统完整  
**验证**：在空白页面中引入各组件，渲染正确，主题切换生效

---

#### 任务 E：设置中心 + 跨窗口同步

**依赖**：B、D  
**可并行**：与 F、G 并行  
**注意**：需有 B 的 db/keychain 封装和 D 的组件库

**子任务**：
- E1：实现 `settingsStore.ts` + `apiConfigStore.ts`（Zustand + persist 中间件，对接 SQLite [`settings`](vscode-file://vscode-app/c:/Users/93879/AppData/Local/Programs/Microsoft%20VS%20Code/resources/app/out/vs/code/electron-sandbox/workbench/workbench.html) 表和 `api_configs` 表）
- E2：构建设置页 UI（`features/settings/SettingsPanel.tsx`）：分组显示 4.5 节所有设置项
- E3：实现 API 配置管理子页面：添加/编辑/删除 Provider、输入 Base URL / Model / Key、测试连接按钮
- E4：实现 System Prompt 编辑区域：多行文本框，预填猫十五默认值，“重置为默认”按钮
- E5：实现连接测试：`invoke('test_ai_connection', { configId })` → 显示成功/失败 + 延迟
- E6：实现跨窗口同步：设置变更 → Tauri 事件 settings:updated / api-config:changed → 宠物窗监听并更新对应 store。对于 api-config:changed，Rust 端同步重新读取 api_configs 表的所有 base_url，动态更新宠物窗 Webview 的 CSP connect-src 指令。

**产出**：完整的设置中心，可配置 API、编辑 Prompt、自定义外观和行为  
**验证**：设置窗所有开关/输入框生效，重启后保持，宠物窗即时响应设置变更

---

#### 任务 F：灵宠动画 + 拖动 + 右键

**依赖**：C、D  
**可并行**：与 E、G 并行  
**注意**：需有 C 的宠物窗，D 的组件库

**子任务**：
- F1：确保 `public/assets/pet-images/` 下有 cat15-front.png、cat15-side.png、cat15-sleep.png 三张默认图片。
- F2：创建 `features/pet/animations.ts`：
  - 定义状态到图片源和 CSS 动画配置的映射（如 4.8 节所述，3 张图片）。
  - 导出 `getImageSrc(state: PetState): string` 和 `getAnimationVariants(state: PetState)`。
- F3：创建 `features/pet/petStore.ts`（Zustand），字段与原设计一致。
- F4：创建 `components/PetAvatar.tsx`：
  - 使用 `<motion.img>` 渲染当前状态对应图片，绑定动画变体。
  - 拖动逻辑：`onMouseDown` → `window.startDragging()`，拖动时状态切换为 `dragging`。
  - 右键菜单（使用 shadcn ContextMenu）：开始对话 / 设置 / 隐藏 / 退出。
  - hover 事件上报。
- F5：实现缩放和透明度：通过 CSS `transform: scale()` 和 `opacity` 响应 store 变化。
- F6：实现形象上传的 Rust 命令（`dialog` 选择文件 + `fs` 复制到 app data 目录）和设置界面中的上传控件。

**产出**：灵宠在桌面显示、可拖动、图片/动画随状态切换，用户可上传自定义形象。
**验证**：拖动灵宠到任意位置，右键菜单正常；调用 `petStore.setState('thinking')` 图片使用 front + CSS 摇晃动画；上传自定义 PNG 后形象即时更新。

---

#### 任务 G：AI Service 层

**依赖**：B  
**可并行**：与 E、F 并行  
**注意**：需有 B 的 keychain 封装

**子任务**：
- G1：创建 `features/ai/types.ts`：定义 `Message`、`ApiConfig`、`StreamChunk`、`VisionRequest` 等 TypeScript 接口
- G2：创建 `features/ai/systemPrompt.ts`：导出猫十五默认 System Prompt 常量，以及 `getActiveSystemPrompt(): Promise<string>`
- G3：实现 `features/ai/aiService.ts`：
  - `streamChat(messages, config): AsyncIterable<string>` — 流式对话
  - `vision(imageBase64, prompt, config): Promise<string>` — Vision 调用
  - 内部方法 `buildMessages()` — 自动注入 System Prompt 为 system 消息
  - 支持 OpenAI / Anthropic / Custom 的请求格式适配（通过 `provider` 字段判断 body 结构）
- G4：实现 SSE 解析：`parseSSEChunk(chunk: string): string[]`
- G5：实现错误处理：区分网络错误、认证错误（401/403）、额度错误（429）、其他错误，返回结构化错误对象

**产出**：可复用的 AiService 类，支持流式对话和 Vision  
**验证**：用测试 Key 调用 `streamChat`，能逐步输出 token；调用 `vision` 传一张 base64 图片能返回描述

---

#### 任务 H：悬浮对话框 + 对话持久化 + 语音

**依赖**：E、F、G  
**可并行**：与 I、J 并行（但需协调 ChatDialog 组件与 PetAvatar 的集成）

**子任务**：
- H1：创建 `features/chat/chatStore.ts`（Zustand）：
  - `currentConversationId: number | null`
  - `messages: Message[]`
  - `streamingStatus: 'idle' | 'streaming' | 'done'`
  - `isDialogVisible: boolean`
  - `isFullscreen: boolean`
  - `inputText: string`
  - `speechStatus: 'idle' | 'listening' | 'speaking'`
- H2：创建 `hooks/useDialogVisibility.ts`：
  - 管理 hover / 失焦延迟 / 对话保持 的状态机（见 4.2 宠物窗内交互逻辑）
  - 返回 `{ isVisible, show, hide, lockForConversation }`
- H3：创建 `components/ChatDialog.tsx`：
  - 绝对定位在灵宠下方 8px，半透明毛玻璃背景
  - 输入框 + 截图按钮 + 语音按钮在底部
  - 对话列表（`ScrollArea`），用户气泡右对齐，AI 气泡左对齐
  - Markdown 渲染（`react-markdown` + `remark-gfm` + `rehype-highlight`）
  - 展开按钮 → 触发全屏模式
- H4：创建 `components/ChatFullscreen.tsx`：
  - 居中面板，占宠物窗 70% 面积
  - 与 ChatDialog 共享 chatStore
  - 收缩按钮 → 恢复悬浮模式
- H5：实现对话持久化：
  - 新建会话 → `conversations` 表 insert
  - 每条消息 → `messages` 表 insert
  - 启动时加载最近会话和消息列表
- H6：实现 `features/chat/speech.ts`：
  - `startListening(): Promise<string>` — Web Speech API STT
  - `speak(text: string)` — Web Speech API TTS
  - 语音状态同步到 chatStore
- H7：对话流：用户输入 → chatStore 追加 user message → 调用 aiService.streamChat → 逐 token 追加 assistant message → 完成后写库 → 宠物动画同步

**产出**：完整的悬浮对话体验，流式输出、历史持久化、语音输入输出  
**验证**：hover 灵宠 → 对话框展开 → 输入问题 → 流式回复 → 关闭再打开历史仍在 → 语音输入识别正确 → AI 回复朗读

---

#### 任务 I：截图选区 + VLM 调用

**依赖**：C、G  
**可并行**：与 H、J 并行

**子任务**：
- I1：实现 Rust 命令 `capture_screen_region(x, y, width, height) -> Result<String>`（返回 base64）：
  - macOS：`xcap` crate 截图
  - Windows：`screenshots` crate 截图
  - 处理 DPI 缩放（逻辑坐标 × scale_factor）
  - 保存临时文件，返回 base64
- I2：实现 Rust 命令 `get_desktop_bounds() -> Result<Rect>`（获取桌面工作区域，供选区遮罩定位）
- I3：创建 `hooks/useScreenCapture.ts`：管理截图模式状态（选区中/确认/取消）
- I4：创建 `components/ScreenSelector.tsx`：
  - 全屏半透明遮罩（`rgba(0,0,0,0.3)`），通过 `position: fixed` 覆盖宠物窗
  - 鼠标拖拽绘制矩形选区（亮色虚线边框 + 四角拖拽手柄）
  - 选区上方浮动标签：尺寸（宽×高 px）+ 预估 Token 消耗
  - 选区下方浮动按钮：“分析此区域” + “取消”
  - `Esc` 或点击遮罩空白处取消
- I5：实现截图 → VLM 对话注入流程：
  - 用户确认选区 → 调用 `capture_screen_region` → 获取 base64
  - 在 `messages` 表插入用户消息（记录 `image_path`）
  - 调用 `aiService.vision(base64, prompt, config)`
  - 返回结果插入 assistant 消息
  - 对话框恢复显示，气泡中展示截图缩略图 + AI 分析文字
  - 支持追问

**产出**：完整的截图→VLM 分析→对话追问闭环  
**验证**：点击截图按钮→框选区域→AI 正确描述内容→可追问细节

---

#### 任务 J：智能附着引擎

**依赖**：F
**可并行**：与 H、I 并行

**子任务**：
- J1：创建 `features/pet/attachEngine.ts`（原 `petActivity.ts`），实现附着模式调度：
  - 轮询 Rust 命令获取系统 UI 状态（Dock 可见性、窗口全屏状态）
  - 根据状态切换附着模式（dock_sleep / window_edge / fullscreen_float）
  - 交互打断与恢复逻辑
- J2：实现 Rust 命令 `get_dock_visibility() -> bool` 和 `get_top_window_edge() -> Rect`：
  - macOS：`CGWindowList` 等方法
  - Windows：`FindWindow` 等方法
- J3：在 `PetAvatar.tsx` 中集成附着逻辑，挂载时启动引擎，卸载时停止
- J4：测试附着行为与交互打断：程序坞可见时宠物睡觉、窗口边缘站立行走、全屏悬浮；hover/拖动/对话时脱离附着

**产出**：灵宠根据系统 UI 状态智能附着
**验证**：程序坞可见时宠物移至其区域并睡眠；程序坞隐藏时附着窗口边缘站立/行走；全屏时悬浮随机姿态；交互时脱离，结束后恢复

---

#### 任务 K：集成测试 + 打包

**依赖**：H、I、J 全部完成  
**可并行**：否，此为最终集成

**子任务**：
- K1：端到端流程测试：
  - 首次启动 → 隐私声明 → 配置 API Key → 测试连接 → 开始对话
  - hover 灵宠 → 对话框展开 → 流式对话 → 关闭 → 重启 → 历史仍在
  - 截图选区 → VLM 分析 → 追问
  - 语音输入 → AI 回复语音朗读
  - 智能附着 → 对话打断 → 附着恢复
- K2：设置窗 → 修改所有设置项 → 宠物窗即时响应
- K3：错误场景测试：
  - 断网 → 对话提示网络错误，重试恢复
  - 错误 Key → 提示认证失败
  - 关闭截图权限 → 截图时引导开启
  - 新增自定义 Base URL 的 API 配置后，对话功能正常（验证动态 CSP 生效）
- K4：macOS 打包：`pnpm tauri build` → `.dmg`，安装运行，验证权限弹窗
- K5：Windows 打包：`pnpm tauri build` → `.msi`，安装运行，验证透明窗、Keychain、截图
- K6：清理临时文件和日志

**产出**：可安装运行的安装包，全部 P0 功能可演示  
**验证**：两台目标 OS 上安装运行，3.1 成功标准全部达成

---

### 6.3 推荐 Agent 分配与执行顺序

**第一批（无依赖，可同时启动）**：
- **Agent 1**：任务 A（项目初始化）→ 完成后转入任务 C（窗口+托盘）
- **Agent 2**：任务 A 完成后 → 任务 B（数据库+Keychain）
- **Agent 3**：任务 A 完成后 → 任务 D（UI 组件库）

**第二批（A 全部完成，B/C/D 完成后各自的下游可启动）**：
- **Agent 1**：C 完成后 → 任务 F（灵宠动画+拖动）
- **Agent 2**：B + D 完成后 → 任务 E（设置中心）
- **Agent 3**：B 完成后 → 任务 G（AI Service）

**第三批（E/F/G 都完成后）**：
- **Agent 1**：任务 H（悬浮对话框+对话+语音）
- **Agent 2**：任务 I（截图选区+VLM）
- **Agent 3**：任务 J（智能附着引擎）

**第四批（H/I/J 全部完成）**：
- **全员**：任务 K（集成测试+打包），三个 Agent 分别负责：全流程测试 / 错误场景测试 / 双平台打包验证

---

## 7. 风险与对策

| 风险点 | 影响 | 概率 | 对策 |
|--------|------|------|------|
| macOS 屏幕录制权限弹窗用户困惑 | 截图功能无法使用 | 中 | 应用内首次截图时展示引导弹窗（含路径截图：系统设置→隐私→屏幕录制）；提供“去设置”按钮直接跳转；权限未开启时截图按钮旁显示警告图标 |
| Keychain 在 Windows/Linux 上的行为差异 | API Key 存取失败 | 低 | `keyring` crate 已抽象三平台接口；集成测试阶段各平台专项验证；Linux 备选 `secret-service` 已预装于主流发行版；失败时提供“仅当次会话手动输入”降级方案 |
| 透明窗口在部分 Windows 系统/显卡组合上异常（黑边、闪烁） | 宠物窗视觉体验受损 | 中 | 在 `tauri.conf.json` 中为 Windows 单独配置窗口属性（`shadow: false`、`transparent: true` 参数组合）；提供“关闭透明效果”设置开关（降级为浅色背景小窗口）；记录已知不兼容环境 |
| 悬浮对话框在跨平台上的 hover/失焦行为不一致 | 对话框消失或遮挡 | 中 | `useDialogVisibility` 使用标准 DOM 事件（`mouseenter/mouseleave`），不依赖平台特定行为；`always_on_top` 仅应用于宠物窗；设置中提供“点击打开对话框”替代 hover 模式的备选方案 |
| LLM API 成本用户预期不符 | 用户对账单感到意外 | 中 | 截图选区时实时显示预估 Token 消耗；Vision 调用前弹窗确认（含预估费用）；设置中 System Prompt 旁显示“此 Prompt 消耗约 X tokens / 次对话”；提供用量日志查询（`ai_usage_logs` 表） |
| 流式对话在长会话下内存增长 | 应用响应变慢 | 中 | `chatStore` 限制单次渲染消息数（最近 100 条），其余懒加载；`AbortController` 允许用户中断长时间生成；对话超过 200 条消息时建议新建会话 |
| 智能附着引擎轮询系统状态消耗 CPU | 影响笔记本续航 | 低 | 轮询间隔设为 2 秒，可见性变化时立即更新；CSS 动画在宠物窗不可见时暂停（`visibilitychange` 事件监听）；sleeping 状态时关闭 requestAnimationFrame 以纯 CSS 过渡替代 |
| 用户上传的 PNG 尺寸过大或非透明背景 | 显示异常 | 中 | 上传时前端校验：文件类型 PNG，尺寸限制 512x512px，提示需透明背景；不合规则拒绝并引导 |
| 宠物窗透明区域遮挡桌面图标/其他应用操作 | 用户操作桌面被屏蔽 | 高 | 透明区域设置 `pointer-events: none`，仅灵宠本体和对话框区域捕获鼠标事件；宠物窗大小不覆盖桌面任务栏区域 |
| 多显示器环境下截图选区坐标偏移 | 截图内容与选区不一致 | 中 | `capture_screen_region` 使用绝对坐标（相对于主显示器原点），处理多显示器偏移；集成测试覆盖双显示器场景 |
| Agent Team 并行开发时模块间接口不一致 | 集成时大面积返工 | 中 | 任务 B/G 优先完成，产出 TypeScript 类型定义文件（`types.ts`）和 Rust 命令签名作为其他任务共享的接口契约；H/I/J 启动前由 Agent 1 做一次接口对齐检查 |
| PNG 动画效果简陋，用户反馈预期落差 | 宠物动态感不足 | 高 | 在设置中说明当前为早期版本，后期将免费升级完整动画；PNG 方案确保应用轻量和性能；社区调研显示静态宠物陪伴仍具吸引力；P2 计划已锁定 |

---


*文档维护：pp, claude & deepseek*  
*最后更新：2026-04-30*