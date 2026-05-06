# DeskSprite P0 开发进度

## 总体状态
- 开始时间：2026-04-30
- 当前阶段：P0（集成调试 + 拖拽稳定性修复）
- 完成任务：11 / 11 (A-K) + 动画系统重构 + 四项修复
- 当前 Agent 分工：[Agent 1]
- 最新提交：fix: move chat into menu and add chat window

## 任务进度

### A. 项目初始化
- 状态：✅ 完成
- 开始时间：2026-04-30，完成时间：2026-05-01
- 子任务：
  - [x] A1: 创建 Tauri 2.0 + React TS 项目
  - [x] A2: 安装前端依赖
  - [x] A3: 配置 Tailwind + shadcn/ui
  - [x] A4: 添加 Rust 依赖
  - [x] A5: 配置 tauri.conf.json 权限
  - [x] A6: 配置动态 CSP 安全策略

### B. 数据库 + Keychain
- 状态：✅ 完成
- 开始时间：2026-05-01，完成时间：2026-05-01
- 子任务：
  - [x] B1: 初始化 SQLite 连接（tauri-plugin-sql migration）
  - [x] B2: 创建 migrations/0001_initial.sql（6 张表 + 默认 Prompt）
  - [x] B3: 实现 init_database（通过 plugin migration 自动建表）
  - [x] B4: 实现 keyring 封装命令（save/get/delete_api_key）
  - [x] B5: 前端 lib/db.ts 封装（全部 CRUD）
  - [x] B6: 前端 lib/keychain.ts 封装（含脱敏 maskKey）

### C. 窗口管理 + 系统托盘
- 状态：✅ 完成
- 开始时间：2026-05-01，完成时间：2026-05-01
- 子任务：
  - [x] C1: 实现 tray.rs 系统托盘
  - [x] C2: 创建宠物窗（transparent + always_on_top + skip_taskbar + decorations:false）
  - [x] C3: 创建设置窗（800x600，resizable）
  - [x] C4: 窗口间通信命令
  - [x] C5: 应用生命周期（仅托盘 Quit 退出）
  - [x] C6: 注册全局快捷键 Cmd+Shift+P

### D. UI 基础组件库
- 状态：✅ 完成
- 开始时间：2026-05-01，完成时间：2026-05-01
- 子任务：
  - [x] D1: 验证 shadcn/ui 12 个基础组件
  - [x] D2: 确认 TypeScript 类型正确
  - [x] D3: 确认 Tailwind 主题变量（亮暗双主题）
  - [x] D4: 创建 AppLayout + SettingsLayout

### E. 设置中心 + 跨窗口同步
- 状态：✅ 完成
- 开始时间：2026-05-01，完成时间：2026-05-01
- 子任务：
  - [x] E1: 实现 settingsStore.ts + apiConfigStore.ts
  - [x] E2: 构建设置页 UI
  - [x] E3: API 配置管理
  - [x] E4: System Prompt 编辑
  - [x] E5: 连接测试 Rust 命令
  - [x] E6: 跨窗口同步事件

### F. 灵宠动画系统
- 状态：✅ 完成
- 开始时间：2026-05-06，完成时间：2026-05-06
- 子任务：
  - [x] F1: 重构 animations.ts（3种状态 idle/thinking/sleeping + defaultAssets/userFrames/userAnimatedPath）
  - [x] F2: 重构 petStore.ts（PetMediaConfig）
  - [x] F3: 移除 yawn/happy/running 自动状态链，AI 完成后回 idle
  - [x] F4: 重写 PetAvatar.tsx（随机 PNG 切换 + 拖拽 + 单击切图 + 右键菜单）
  - [x] F5: App.tsx 启动恢复媒体配置
  - [x] F6: ChatDialog / HoverInputBar 使用 thinking → idle 状态流
  - [x] F7: ImageSection 3状态 PNG 序列上传
  - [x] F8: 添加 tauri-plugin-process 依赖
  - [x] F9: 拖拽结束后保留命中直到鼠标真正离开灵宠，修复第二次拖动穿透
  - [x] F10: 支持状态文件夹内多张 PNG 随机 1-5 分钟切换，点击灵宠主动切换一次
- 资产路径：`assets/{state}/*.png`（idle/thinking/sleeping）

### G. AI Service 层
- 状态：✅ 完成
- 开始时间：2026-05-01，完成时间：2026-05-01
- 子任务：
  - [x] G1: types.ts
  - [x] G2: systemPrompt.ts
  - [x] G3: aiService.ts（streamChat + 多 Provider）
  - [x] G4: SSE 解析
  - [x] G5: 错误分级

### H. 悬浮对话框 + 对话持久化 + 语音
- 状态：✅ 完成
- 开始时间：2026-05-01，完成时间：2026-05-01
- 子任务：
  - [x] H1: chatStore.ts
  - [x] H2: ChatDialog.tsx（毛玻璃背景）
  - [x] H3: 消息气泡（Markdown + 流式光标）
  - [x] H4: 对接 aiService 流式对话
  - [x] H5: 对话持久化（SQLite）
  - [x] H6: 语音接口预留

### I. 截图选区 + VLM 调用
- 状态：✅ 完成
- 开始时间：2026-05-01，完成时间：2026-05-01
- 子任务：
  - [x] I1: Rust 截图命令（xcap）
  - [x] I2: 截图选区 UI
  - [x] I3: VLM vision 调用

### J. 智能附着引擎
- 状态：✅ 完成（代码保留，未接入）
- 备注：attachEngine.ts 保留，等待后续接入。

### K. 集成测试 + 打包
- 状态：🔄 进行中
- 子任务：
  - [x] K1: App.tsx 集成所有组件
  - [x] K2: 主题切换联动
  - [x] K3: pnpm build + cargo build 全部通过
  - [ ] K4: 首次运行测试（需人工验证）

---

## 修复记录

### R1. OS 层鼠标穿透（2026-05-06）
- 问题：全屏宠物窗拦截所有鼠标事件，桌面其他窗口卡死
- 修复：`window.rs` 创建后 `set_ignore_cursor_events(true)`，新增 `set_cursor_passthrough` Rust 命令
- 前端：PetAvatar `onMouseEnter` 关闭穿透，`onMouseLeave` 恢复穿透
- 文件：window.rs, lib.rs, capabilities/default.json, PetAvatar.tsx

### R2. 设置窗口不可点击（2026-05-06）
- 问题：设置窗口透明区域点击穿透到下层
- 修复：`index.css` 的 `body.has-background` 添加 `pointer-events: auto`
- 文件：index.css

### R3. 资产路径更新（2026-05-06）
- 问题：用户重命名了图片文件，代码引用路径需同步
- 修复：animations.ts 默认路径更新为 `assets/{state}/{state}.png`
- 文件：animations.ts

### R4. 穿透稳定性优化（2026-05-06）
- 问题：拖拽期间 onMouseLeave 触发导致穿透恢复，丢失鼠标
- 修复：onMouseLeave 检查 isDragging 状态，拖拽结束延迟 100ms 恢复穿透
- 文件：PetAvatar.tsx

### R5. 灰色背景残留（2026-05-06）
- 问题：状态切换时灵宠周围出现灰色背景（transform:scale 触发 GPU 合成层）
- 修复：`#root` 设透明，`petBounce` 改用 `translateY`，所有容器显式 `background: transparent`
- 文件：index.css, PetAvatar.tsx, App.tsx

### R6. 悬停浮出输入框（2026-05-06）
- 新功能：新建 `HoverInputBar.tsx`，鼠标悬停灵宠自动浮出半透明毛玻璃输入框
- 无 API Key 时显示提示 + 跳转设置链接
- 发送消息后自动展开 ChatDialog 历史记录
- App.tsx 宠物区域 hover 状态管理，300ms 延迟收起
- 文件：HoverInputBar.tsx（新建），App.tsx

### R7. 设置界面重组（2026-05-06）
- 8 section → 4 section：外观 / AI 对话 / 快捷键 / 隐私与数据
- 外观滑块走 draft/confirm 流程（点击"确认更改"才生效）
- 形象上传即时生效，不需确认
- SettingsLayout 视觉优化：侧边栏 DeskSprite 标题、间距、字体层级
- AI 对话 section 合并了：宠物名字 + API 配置 + System Prompt + 模型参数 + 语音
- 文件：SettingsPanel.tsx, SettingsLayout.tsx

### R8. 版本同步（2026-05-06）
- @tauri-apps/api 从 v2.10.1 升级到 v2.11.0，匹配 tauri crate v2.11.0
- 文件：package.json, pnpm-lock.yaml

### R9. 第二次拖拽鼠标穿透 + 三状态 PNG 随机切换（2026-05-06）
- 问题：第一次拖拽后 `PetAvatar` 在 mouseup 100ms 后强制恢复窗口穿透，鼠标仍停留在灵宠上时下一次 mousedown 会直接穿透到桌面。
- 修复：拖拽结束时检查指针是否仍在灵宠区域内；若仍在区域内保持命中，等 mouseleave 再恢复穿透。
- 状态调整：删除 running、yawn、happy，只保留 idle、thinking、sleeping；AI 回复完成直接回 idle。
- 图片调整：默认 idle/sleeping 可配置多张 PNG，用户上传多张 PNG 后随机间隔 1-5 分钟切换；点击灵宠会主动切换一次当前状态 PNG。
- 文件：animations.ts, PetAvatar.tsx, petStateEngine.ts, ChatDialog.tsx, HoverInputBar.tsx, SettingsPanel.tsx

### R10. 跨窗口返回后灵宠无法命中（2026-05-06）
- 问题：用户点击其他窗口后再回到灵宠，鼠标仍可能穿透灵宠，无法点击或拖动。
- 根因：全屏透明宠物窗一旦启用 OS 级 `set_ignore_cursor_events(true)`，鼠标从其他窗口回来时前端无法收到 hover 事件，也就无法重新关闭穿透。
- 修复：宠物窗从全屏透明穿透层改为小型透明置顶窗口，窗口默认保持可命中；拖动改用 Tauri `startDragging()` 移动整个窗口。
- 交互调整：聊天框只在鼠标 hover 灵宠区域时显示，鼠标离开后收起；右键菜单保留设置、隐藏、退出。
- 默认模型：无用户默认模型时使用内置 CloseAI 兼容模型，本地记录 100000 token 估算额度，超额后提示配置自己的 API Key。
- 文件：window.rs, App.tsx, PetAvatar.tsx, defaultModel.ts, ChatDialog.tsx, HoverInputBar.tsx

### R11. 小型宠物窗启动在屏幕外（2026-05-06）
- 问题：灵宠完全不显示。
- 修复：宠物窗初始位置改为固定可见坐标 `(100, 120)`，创建后显式 show + always_on_top。
- 文件：window.rs

### R12. Hover 对话框裁切、滚动与历史详情（2026-05-06）
- 问题：对话框居中挂在灵宠下方导致左侧被小窗口裁切；消息区滚动不稳定；历史对话只能看摘要。
- 修复：宠物窗口内布局改为宠物居中 + 对话框正常文档流占满可用宽度；消息区使用原生 overflow-y-auto，最大高度等于设置宽度；输入框自动增高。
- 主题：补充 AI 气泡文字颜色变量，跟随亮暗主题。
- 历史：设置页新增历史对话详情视图，可点击会话查看完整本地消息。
- 交互：宠物窗启用 accept_first_mouse，减少未聚焦窗口首次 hover/点击被系统吃掉的问题。
- 文件：App.tsx, ChatDialog.tsx, SettingsPanel.tsx, settingsStore.ts, index.css, window.rs, PetAvatar.tsx

### R13. 拖拽/点击分离、hover 不跳动与对话模式（2026-05-06）
- 问题：拖拽后仍可能触发切换形象；hover 展开对话框时灵宠随容器宽度变化而跳动；发送后没有即时回复占位；右键菜单在小窗中闪烁。
- 修复：拖拽改为手动移动窗口并记录移动阈值，只有非拖拽单击才切换 PNG；hover 容器改为左上固定布局，灵宠位置不随对话框宽度变化。
- 对话：顶部新增“新对话 / 历史对话”，每次 hover 默认新对话；发送后立即插入 `...` 助手占位并流式更新。
- 右键：替换 Radix ContextMenu 为自绘轻量菜单，跟随主题半透明，点击其他区域/滚动/失焦自动关闭。
- 主题：浅色主题 AI 回复气泡改为半透明深灰，深色主题使用黑色。
- 文件：PetAvatar.tsx, App.tsx, ChatDialog.tsx, index.css

### R14. 右键对话入口、大聊天窗口与外观实时设置（2026-05-06）
- 问题：hover 弹对话条造成闪烁疲劳；手动拖拽窗口卡顿；右键新对话/历史入口不稳定；设置外观还需要确认。
- 修复：hover 不再弹对话；右键菜单新增“新对话 / 历史对话 / 最近3条 / 打开大窗口”；拖拽回到 Tauri 原生 startDragging；外观设置滑动即实时写入。
- 窗口：灵宠默认出现在屏幕右下角；设置窗口默认增大到 1040×760；新增独立 chat 窗口。
- 大聊天：独立窗口支持模型选择，列出默认模型、内置 CloseAI 和用户配置模型。
- 文件：window.rs, lib.rs, capabilities/default.json, App.tsx, PetAvatar.tsx, ChatDialog.tsx, petStore.ts, SettingsPanel.tsx, SettingsLayout.tsx, defaultModel.ts
