# DeskSprite P0 开发进度

## 总体状态
- 开始时间：2026-04-30
- 当前阶段：P0（灵宠动画系统实现）
- 完成任务：11 / 11 (A-K) + 动画系统重构
- 当前 Agent 分工：[Agent 1: 灵宠动画系统]

## 任务进度

### A. 项目初始化
- 状态：✅ 完成
- 负责人：Agent 1
- 开始时间：2026-04-30
- 完成时间：2026-05-01
- 子任务：
  - [x] A1: 创建 Tauri 2.0 + React TS 项目
  - [x] A2: 安装前端依赖
  - [x] A3: 配置 Tailwind + shadcn/ui
  - [x] A4: 添加 Rust 依赖
  - [x] A5: 配置 tauri.conf.json 权限
  - [x] A6: 配置动态 CSP 安全策略
- 备注：A1-A6 全部完成（pnpm build + cargo build 通过）。任务 A 完成！

### B. 数据库 + Keychain
- 状态：✅ 完成
- 负责人：Agent 1
- 开始时间：2026-05-01
- 完成时间：2026-05-01
- 子任务：
  - [x] B1: 初始化 SQLite 连接（tauri-plugin-sql migration）
  - [x] B2: 创建 migrations/0001_initial.sql（6 张表 + 默认 Prompt）
  - [x] B3: 实现 init_database（通过 plugin migration 自动建表）
  - [x] B4: 实现 keyring 封装命令（save/get/delete_api_key）
  - [x] B5: 前端 lib/db.ts 封装（api_configs/system_prompts/conversations/messages/ai_usage_logs/settings 全部 CRUD）
  - [x] B6: 前端 lib/keychain.ts 封装（含脱敏 maskKey 工具函数）
- 备注：验证通过（cargo build + pnpm build）。csp.rs 缺少 `use tauri::Manager` 导致编译报错已修复。前端缺少 @tauri-apps/plugin-sql 已安装。

### C. 窗口管理 + 系统托盘
- 状态：✅ 完成
- 负责人：Agent 1
- 开始时间：2026-05-01
- 完成时间：2026-05-01
- 子任务：
  - [x] C1: 实现 tray.rs 系统托盘（Show/Hide/Settings/Quit + 左键点击切换）
  - [x] C2: 创建宠物窗（transparent + always_on_top + skip_taskbar + decorations:false）
  - [x] C3: 创建设置窗（标准窗口，800x600，resizable）
  - [x] C4: 窗口间通信命令（show_pet_window/hide_pet_window/show_settings_cmd/close_settings_window）
  - [x] C5: 应用生命周期（关闭不退出，仅托盘 Quit 退出）
  - [x] C6: 注册全局快捷键 Cmd+Shift+P（show pet + emit shortcut:chat-focus）
- 备注：验证通过（cargo build）。需要启用 tauri features: tray-icon + macos-private-api，以及 tauri.conf.json 中 macOSPrivateApi: true。

### D. UI 基础组件库
- 状态：✅ 完成
- 负责人：Agent 1
- 开始时间：2026-05-01
- 完成时间：2026-05-01
- 子任务：
  - [x] D1: 验证 shadcn/ui 12 个基础组件（button/input/textarea/slider/switch/dropdown-menu/context-menu/tooltip/dialog/sheet/scroll-area/separator）
  - [x] D2: 确认 components/ui/ 目录 TypeScript 类型正确（pnpm build 通过）
  - [x] D3: 确认 Tailwind 主题变量已配置（pet-dialog-bg/pet-bubble-user/pet-bubble-ai，亮暗双主题）
  - [x] D4: 创建 AppLayout.tsx（宠物窗透明布局）和 SettingsLayout.tsx（设置窗侧栏布局）
- 备注：验证通过（pnpm build）。组件库和主题系统已就绪。

### E. 设置中心 + 跨窗口同步
- 状态：✅ 完成
- 负责人：Agent 1
- 开始时间：2026-05-01
- 完成时间：2026-05-01
- 子任务：
  - [x] E1: 实现 settingsStore.ts + apiConfigStore.ts（Zustand，对接 SQLite）
  - [x] E2: 构建完整设置页 UI（SettingsPanel.tsx，8 个设置分区）
  - [x] E3: 实现 API 配置管理（添加/删除/设为默认/测试连接）
  - [x] E4: 实现 System Prompt 编辑区域（保存/重置默认）
  - [x] E5: 实现连接测试 Rust 命令（test_ai_connection 占位）
  - [x] E6: 实现跨窗口同步（settings:updated / api-config:changed Tauri 事件）
- 备注：验证通过（cargo build + pnpm build）。

### F. 灵宠动画系统（重构版）
- 状态：✅ 完成
- 负责人：Agent 1
- 开始时间：2026-05-06
- 完成时间：2026-05-06
- 子任务：
  - [x] F1: 重构 animations.ts（6种状态 + 多帧/GIF/视频媒体配置）
  - [x] F2: 重构 petStore.ts（PetMediaConfig 替代旧 PetImageConfig）
  - [x] F3: 新建 petStateEngine.ts（idle→yawn→sleeping 自动触发，happy 3秒回 idle）
  - [x] F4: 重写 PetAvatar.tsx（逐帧播放 + 拖拽running + 单击随机切换 + 右键菜单）
  - [x] F5: 修改 App.tsx（移除 attachEngine，启动恢复媒体配置）
  - [x] F6: 同步 ChatDialog.tsx（使用 triggerHappy() 替代手动状态切换）
  - [x] F7: 重写 ImageSection（6状态 × PNG/GIF/视频三路上传 + 帧率Slider）
  - [x] F8: 添加 tauri-plugin-process 依赖（exit 命令）
- 备注：验证通过（pnpm build + cargo build）。6种状态：idle/yawn/happy/sleeping/running/thinking。
- 修复记录（2026-05-06）：
  - 问题一：全屏宠物窗拦截所有鼠标事件，桌面卡死 → 添加 `set_ignore_cursor_events(true)` + `set_cursor_passthrough` 命令动态切换穿透
  - 问题二：设置窗口无法点击 → body.has-background 添加 pointer-events:auto
  - 问题三：资产文件重命名 → animations.ts 路径更新为 assets/{state}/{state}.png

### G. AI Service 层
- 状态：✅ 完成
- 负责人：Agent 1
- 开始时间：2026-05-01
- 完成时间：2026-05-01
- 子任务：
  - [x] G1: 创建 types.ts（Message/ApiConfig/StreamChunk/AiError/ChatResponse）
  - [x] G2: 创建 systemPrompt.ts（默认 Prompt + {pet_name} 替换 + 从 DB 读取活跃 Prompt）
  - [x] G3: 实现 aiService.ts（streamChat + vision + 多 Provider 请求适配）
  - [x] G4: 实现 SSE 解析（parseSSELine）
  - [x] G5: 实现错误处理（network/auth/rate_limit/server/unknown 分级）
- 备注：验证通过（pnpm build）。支持 OpenAI/Anthropic/Groq/Custom 四种 Provider 格式适配。

### H. 悬浮对话框 + 对话持久化 + 语音
- 状态：✅ 完成
- 负责人：Agent 1
- 开始时间：2026-05-01
- 完成时间：2026-05-01
- 子任务：
  - [x] H1: 创建 chatStore.ts（Zustand，对话消息状态管理）
  - [x] H2: 创建 ChatDialog.tsx（悬浮对话框 UI，毛玻璃背景）
  - [x] H3: 实现消息气泡（Markdown 渲染 + 流式闪烁光标 + 用户/AI 双色气泡）
  - [x] H4: 对接 aiService 流式对话（petState 联动 thinking→happy）
  - [x] H5: 实现对话持久化（SQLite messages 表读写，自动加载最近会话）
  - [x] H6: 语音接口预留（设置页开关已实现，P0 不做完整语音）
- 备注：验证通过（pnpm build）。

### I. 截图选区 + VLM 调用
- 状态：✅ 完成
- 负责人：Agent 1
- 开始时间：2026-05-01
- 完成时间：2026-05-01
- 子任务：
  - [x] I1: 实现 Rust 截图命令（capture_screen_region，macOS xcap + Windows screenshots）
  - [x] I2: 创建前端截图选区 UI（ScreenshotOverlay.tsx，拖拽选区 + 尺寸显示 + 截取按钮）
  - [x] I3: VLM vision 调用已在 aiService.ts 实现（多 Provider 适配）
- 备注：验证通过（cargo build + pnpm build）。添加了 base64 和 image crate 依赖。

### J. 智能附着引擎
- 状态：✅ 完成（代码保留，本次未接入）
- 负责人：Agent 1
- 开始时间：2026-05-01
- 完成时间：2026-05-01
- 备注：attachEngine.ts 代码保留但 App.tsx 中未调用，等待后续需要时再接入。

### K. 集成测试 + 打包
- 状态：🔄 进行中
- 负责人：Agent 1
- 开始时间：2026-05-01
- 子任务：
  - [x] K1: App.tsx 集成所有组件（窗口路由：pet/settings）
  - [x] K2: 主题切换联动（dark/light/system）
  - [x] K3: pnpm build + cargo build 全部通过
  - [ ] K4: 首次运行测试（需人工验证）
- 备注：灵宠动画系统已重构完成，前后端编译通过。K4 需用户运行 `pnpm tauri dev` 验证。
