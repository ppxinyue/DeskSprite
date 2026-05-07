# DeskSprite P0 开发进度

## 总体状态
- 开始时间：2026-04-30
- 当前阶段：P0（集成调试 + 拖拽稳定性修复）
- 完成任务：11 / 11 (A-K) + 动画系统重构 + 对话/拖拽迭代修复
- 当前 Agent 分工：[Agent 1]
- 最新提交：待提交：redesign compact chat interface

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

### R15. 60% 窗口、二级历史菜单与 ChatGPT 风格大窗口（2026-05-06）
- 问题：设置窗口和大对话窗口默认尺寸仍偏小；右键菜单最近历史直接展开导致菜单容易被裁切；“打开大窗口”不应占用右键菜单；小对话窗缺少模型/图片/语音/放大快捷入口；灵宠切换 PNG 时偶发上一帧透明边缘残留。
- 修复：设置窗口和 chat 窗口按主屏工作区 60% 居中打开；右键菜单扩大命中窗口并把最近 3 条历史放到“历史对话”二级菜单；大窗口入口移到小对话窗顶部放大图标。
- 对话：大窗口改为 ChatGPT 风格基础布局，左侧历史和模型选择，右侧聊天主体，输入框固定在底部；小对话窗顶部增加模型、图片、语音、放大图形按钮。
- 外观：设置“外观”滑块拖动即写入并通过 `settings:updated` 同步宠物窗；切图时用固定透明绘制容器隔离当前 PNG，减少旧图透明框残留。
- 文件：window.rs, App.tsx, PetAvatar.tsx, ChatDialog.tsx, SettingsPanel.tsx

### R16. 80% 窗口、Canvas 灵宠渲染与多面板对话（2026-05-06）
- 问题：设置/大对话窗口仍可能从 80% 闪回小窗；灵宠 PNG 切换后旧形象边框残留；小窗聊天时灵宠自动切状态；大窗历史加载和多模型并排能力不完整；图片/语音按钮只是入口。
- 修复：App 初始 window label 直接读取 Tauri 当前窗口，避免 settings/chat 首帧误跑宠物窗缩放逻辑；设置窗和 chat 窗默认 80% 工作区居中，复用窗口时也重设尺寸。
- 渲染：PNG 灵宠改为 canvas 渲染，每次切图先清空透明画布再绘制新图，避免透明 WebView 合成层保留旧 `<img>` 边缘；小窗打开时暂停 1-5 分钟自动切图，只保留手动点击切换。
- 对话：小窗只保留干净输入框，图片/语音/放大按钮浮在灵宠右下角；小窗发送不再改变灵宠状态；大窗支持单窗口、横向、纵向、四宫格布局，最多 4 个独立面板，每个面板独立选择模型。
- 输入：图片输入完成为文件选择 + data URL 视觉消息；语音输入接入系统 Web Speech API，识别结果写入输入框；消息气泡可显示图片预览。
- 文件：window.rs, App.tsx, PetAvatar.tsx, ChatDialog.tsx, aiService.ts, types.ts, chatStore.ts, settingsStore.ts

### R17. 小对话窗 ChatGPT-like 视觉重设计（2026-05-06）
- 问题：小对话窗仍偏“卡片 + 灰底 + 装饰气泡”，不够像专业聊天工具；主题只有单浅色/单深色；输入框和消息间距不够克制。
- 修复：小窗容器最大宽度 720px，消息区 16px padding，消息间距 12px；用户消息右对齐、助手消息左对齐，80% 最大宽度、10px/14px padding、12px 圆角、14px 字体和 1.5 行高。
- 输入框：改为单层 10px 圆角边框，40px 基线高度，focus 使用 accent 边框和轻微阴影；去掉半透明磨砂、额外阴影和多余边框。
- 主题：新增浅色 A / 浅色 B / 深色 A / 深色 B 四套聊天色彩变量，设置页主题选择同步扩展。
- 细节：消息 fade-in 150ms，hover 轻微变亮，Markdown 代码块使用等宽字体，消息复制按钮 hover 显示；前端显示层过滤密集 emoji 和行首括号动作描述。
- 文件：ChatDialog.tsx, index.css, App.tsx, SettingsPanel.tsx, settingsStore.ts

### R18. 大对话窗口 ChatGPT-like 布局重构（2026-05-06）
- 问题：大对话窗口灰块和边框过多，视觉层级像后台工具；模型、布局、新建和多面板控件分散；历史列表卡片感偏重。
- 修复：大窗重构为 240px 侧边栏 + 48px 顶部 Header + 消息区 + 底部输入区；侧边栏使用纯文本历史列表和 hover 高亮，顶部固定“新建对话”。
- Header：左侧为当前激活面板的模型选择，右侧为 icon-only 布局切换和新增面板按钮；多面板仍保留每个面板独立 `modelId`，点击面板后 Header 控制该面板模型。
- 对话区：删除外层大灰容器，消息区使用 `max-width: 720px` 居中，面板之间只保留 1px 分隔线；输入区同样 720px 居中，图片上传/语音输入在左，发送按钮在右。
- 主题：新增 `--bg-primary`、`--bg-secondary`、`--text-primary`、`--border-color`、`--accent-color` CSS variables，并映射到现有四套聊天主题。
- 文件：ChatDialog.tsx, index.css

### R19. 黑白灰无气泡对话界面与三主题回收（2026-05-06）
- 问题：大小对话窗口仍有彩色主题和气泡包裹；大窗模型选择位置不符合“每个主对话窗口左上角”的预期；小窗输入区与历史之间仍有分隔线。
- 修复：主题设置回收为“跟随系统 / 浅色 / 深色”三种；聊天变量全部改为黑白灰，移除绿色/蓝色 accent；旧的浅色 B/深色 B 配置在加载时自动回退到跟随系统。
- 对话：大小窗消息统一改成无气泡文本流，user 右对齐、LLM 左对齐，减少消息垂直间距；图片预览和 Markdown 保留，复制按钮保留 hover 显示。
- 小窗：移除输入框与对话历史之间的横线，只保留输入框圆角容器。
- 大窗：模型选择回到每个对话面板左上角，使用 macOS 灰色按钮式 select；顶部不显示标题，仅保留布局切换和新增面板按钮；图片/语音图标间距收紧，语音录制状态改为灰阶脉冲。
- 文件：ChatDialog.tsx, index.css, App.tsx, SettingsPanel.tsx, settingsStore.ts

### R20. 默认 Prompt、全屏 Space 置顶与设置窗尺寸（2026-05-06）
- Prompt：默认 system prompt 改为极简灵宠人格；前端运行态会把旧内置默认 prompt 自动映射到新默认，避免老用户数据库中仍保留旧文案。
- 窗口：宠物窗创建和重新显示时同时设置 `always_on_top` 与 `visible_on_all_workspaces`，提升其他应用进入全屏 Space 后灵宠仍置顶可见的稳定性。
- 设置：设置窗口打开/复用时按主屏工作区 70% 居中；左侧目录从 224px 收窄到 192px，降低侧栏占比。
- 文件：systemPrompt.ts, SettingsPanel.tsx, 0001_initial.sql, window.rs, SettingsLayout.tsx

### R21. 大窗历史模型锁定、轻量气泡与原生全屏置顶（2026-05-06）
- 大窗：模型选择改为组合式触发器 + popover 菜单，触发器展示当前模型名称/描述/chevron，菜单行项支持 hover 与右侧 check；历史对话加载后只展示该会话模型，不再允许切换模型；左侧历史列表展示本地化系统时间和模型名。
- 历史：消息写入后同步刷新 `conversations.updated_at`，避免历史列表时间停留在创建时间。
- 布局：大聊天窗口放大后，消息主体和输入区使用全宽，不再被 720px 最大宽度限制。
- 气泡：大小对话窗口恢复轻量气泡；浅色主题为两种浅灰黑字，深色主题为两种深灰白字；小窗气泡占满宽度，大窗气泡保留 84% 最大宽度。
- 置顶：macOS 下宠物窗额外设置 `FullScreenAuxiliary`、`Stationary`、`IgnoresCycle` collection behavior，并提升到 `NSPopUpMenuWindowLevel`，用于覆盖其他应用全屏 Space。
- Prompt：默认 system prompt 更新为“电脑桌面灵宠 / 专家级翻译编程写作问答分析 / wechat 式 1-50 字”版本，并兼容前两版默认 prompt 自动映射。
- 文件：ChatDialog.tsx, index.css, db.ts, systemPrompt.ts, window.rs, Cargo.toml, Cargo.lock, 0001_initial.sql

### R22. 大窗标题清理与模型菜单减噪（2026-05-06）
- 窗口：chat 窗口原生标题置空，去掉窗口顶端 app bar 中的 “DeskSprite Chat”。
- 模型入口：触发器只显示当前模型名称和 chevron，不再显示描述小字；描述仅保留在浮层菜单行项里。
- 菜单：没有用户自定义 API 配置时，模型菜单只显示一个 `CloseAI · gpt-4o-mini`，避免“默认模型”和 CloseAI 重复。
- 文件：window.rs, ChatDialog.tsx

### R23. 大窗模型入口尺寸与历史模型标签（2026-05-06）
- 模型入口：可交互模型按钮高度从 36px 增到 40px，宽度收短为 220px，让入口更像 macOS 弹出按钮。
- 历史对话：历史会话中的模型不再使用控件外观，改为左上角 11px 白底小字展示，只作为只读会话元信息。
- 文件：ChatDialog.tsx

### R24. 小窗气泡内容自适应宽度（2026-05-06）
- 小对话窗口：气泡不再固定占满整行，改为随内容自适应宽度；最大宽度仍可达到整个对话窗口，长内容会正常换行。
- 文件：ChatDialog.tsx

### R25. 大窗历史打开稳定性与 Prompt 独立性规则（2026-05-06）
- 大窗历史：点击历史对话时重新读取会话元信息和消息，确保加载到有效面板，并强制切回单窗口显示该会话；同时清空输入、图片和 streaming 状态。
- Prompt：默认 system prompt 增加“独立灵宠，不讨好用户，不主动说陪伴/待命/有事直说/我来帮你”规则；前一版默认 prompt 会自动映射到新版。
- 文件：ChatDialog.tsx, systemPrompt.ts, 0001_initial.sql

### R26. 设置外观精简、透明度联动与 idle Dock 图标（2026-05-06）
- 设置外观：删除“调整灵宠的显示效果，修改会实时生效。”描述文字；主题选择改为与大窗模型选择一致的触发器 + popover 风格。
- 滑块：对话框宽度默认值改为 300，范围改为 200-600；透明度、大小、对话框宽度三个滑块的数值列、起点和终点统一对齐。
- 窗口：设置窗口默认宽度从 70% 收窄到 62%，高度仍为 70%。
- 透明度：`petOpacity` 同时作用到灵宠和小对话窗口，大聊天窗口不受影响。
- 图标：使用 `public/assets/idle/idle.png` 重新生成 Tauri bundle 图标，包括 macOS Dock 使用的 `icon.icns`。
- 文件：SettingsPanel.tsx, settingsStore.ts, App.tsx, ChatDialog.tsx, window.rs, src-tauri/icons/*

### R27. 小窗工具按钮透明度联动（2026-05-06）
- 透明度：灵宠右下角的图片、语音、放大 3 个悬浮按钮也接入 `petOpacity`，与灵宠和小对话框同步变化。
- 文件：App.tsx

### R28. 灵宠动作设置与切图同步（2026-05-06）
- 设置：外观页新增“灵宠动作”，支持 `petJump`、`petWobble`、`petBreathe` 三个动作的独立开关、幅度和速度倍率，修改实时写入设置。
- 同步：`PetAvatar` 在自动 1-5 分钟切图和非拖拽点击切图时，会同时从已开启动作中随机选择一个动作；只开启一个动作时保持该动作，全部关闭时灵宠静止。
- 动画：CSS keyframes 改为读取运行时 CSS 变量，跳动幅度使用 px，摇摆幅度使用 deg，呼吸幅度使用百分比缩放；默认启用轻微 `petJump` 以延续原来的上下浮动观感。
- 文件：settingsStore.ts, SettingsPanel.tsx, App.tsx, PetAvatar.tsx, index.css

### R29. 移除灵宠可见白色命中背景（2026-05-06）
- 问题：灵宠外层交互容器使用 `rgba(255,255,255,0.001)` 作为命中层，在透明 WebView 合成后会显出明显白色矩形。
- 修复：移除白色 alpha 背景，外层容器只保留透明 DOM 命中区域；灵宠视觉仍由 canvas/video 单独渲染。
- 文件：PetAvatar.tsx

### R30. 清理灵宠透明合成框线与首帧残留（2026-05-06）
- 问题：灵宠背后仍有半透明框线；动作时框线不跟随宠物移动，切换形象后还可能保留首张 PNG 的边缘轮廓。
- 排查：内置 PNG 的 alpha 会触及图片边缘；同时 `PetAvatar` 外层的 `overflow/isolation/contain` 会让透明窗口生成稳定裁剪/合成层，canvas 复用也可能让 WebView 保留旧纹理边界。
- 修复：移除外层裁剪/隔离/contain 合成层；canvas 按 `src` key 强制重建；绘制前彻底 `clearRect`；绘制时给宠物留 2px 透明内边距，并裁掉源 PNG 最外侧约 0.4% 的边缘像素，避免资产边缘被缩放成可见框线；Tauri 宠物窗显式关闭系统阴影。
- 文件：PetAvatar.tsx, window.rs

### R31. 对话时暂停灵宠动画（2026-05-07）
- 行为：小对话窗打开期间，灵宠暂停所有动作动画；自动 1-5 分钟切图继续停用，手动点击只切换形象不切换动作。
- 视频：如果用户配置了视频类形象，对话窗打开时同步 `pause()`，关闭后恢复播放。
- 文件：PetAvatar.tsx

### R32. 小对话窗显式展开/收起（2026-05-07）
- 行为：灵宠右侧新增常驻箭头按钮，收起时显示展开箭头，展开时显示收起箭头。
- 失焦：移除宠物窗口失焦自动关闭小对话窗逻辑；对话和回复会持续显示/进行，直到用户点击收起按钮。
- 展开：点击展开时默认加载最近一条历史对话；没有历史时新建对话。小对话框默认宽度保持 300px。
- 文件：App.tsx

### R33. 小窗工具条、大窗接续与屏幕边界约束（2026-05-07）
- 工具条：展开/收起、图片、语音、放大 4 个按钮并排放在灵宠右下侧；小窗收起时只显示展开按钮，后 3 个按钮默认隐藏。
- 视觉：4 个按钮默认半透明、低饱和，鼠标 hover 后恢复完整透明度和文字颜色。
- 大窗：点击放大时先记录当前小窗会话 id，再收起小窗并打开大聊天窗口；新建大窗通过 handoff id 初始加载当前会话，已打开大窗通过 `chat:open-conversation` 事件切换到该会话。
- 边界：宠物窗口拖动/尺寸变化后会被夹回当前屏幕工作区并保留 16px 间距；小对话框会根据工作区宽度自动收窄，避免在屏幕边缘被裁切。
- 文件：App.tsx, ChatDialog.tsx

### R34. LLM 输出前 Terminal 占位动效（2026-05-07）
- 占位：LLM 第一段 token 返回前，不再显示三个点；改为 CLI 风格 `$` prompt + 闪烁方块光标。
- 实现：新增 `components/loading-ui/terminal.tsx`，prompt 和光标继承当前文字颜色；闪烁速度通过 `--duration` CSS 变量控制。
- 文件：ChatDialog.tsx, terminal.tsx, index.css

### R35. 灵宠拖拽与小窗展开布局防抖（2026-05-07）
- 拖拽：移除拖动过程中的连续贴边修正，改为用户移动停止后再做一次安全边界收尾；程序自身 `setPosition/setSize` 触发的 moved 事件会被跳过，避免反馈循环造成抖动。
- 锚定：小对话窗展开/收起时以灵宠当前屏幕坐标为锚点，按屏幕剩余空间自动选择对话框在灵宠上/下、左/右侧的位置；对话框宽度和高度按工作区动态收窄，避免角落展开时裁切。
- 动画：原生拖拽期间暂停 `petJump/petWobble/petBreathe`，避免窗口移动和宠物自身动画叠加成视觉抖动。
- 职责：`PetAvatar` 不再直接修改 Tauri 窗口尺寸；窗口尺寸、位置、边界收口统一由 `PetWindow` 管理。
- 文件：App.tsx, PetAvatar.tsx

### R36. 灵宠硬边界拖拽、右键菜单防裁切与 PulseDot 占位（2026-05-07）
- 拖拽：宠物拖动改为受控 pointer 拖拽，不再调用系统原生 `startDragging()`；拖动过程中每一帧都按当前屏幕工作区 clamp，灵宠本体不能被拖出桌面后再跳回。
- 右键：菜单打开时通知外层窗口预留右键菜单和历史二级菜单空间；菜单位置按窗口可见区域 clamp，历史二级菜单在右侧空间不足时自动向左展开。
- 菜单：移除右键菜单中的“退出”选项，保留新对话、历史对话、设置、隐藏。
- 占位：LLM 回复前的占位从 Terminal prompt 改为 `PulseDot`，显示 `Generating` + 单个呼吸点。
- 文件：App.tsx, PetAvatar.tsx, ChatDialog.tsx, pulse-dot.tsx, index.css

### R37. 小窗无闪烁挂载、硬边界收尾与字号设置（2026-05-07）
- 闪烁：小对话窗打开时先完成透明窗口 resize/reposition，再挂载对话框和后 3 个工具图标，避免中间帧把旧布局暴露出来；拖拽产生的 moved 事件会被吞掉，松手后不再触发二次贴边校正。
- 拖拽：拖动结束后延长受控移动事件的 suppress 窗口，去掉边缘处的轻微回弹，边界表现更接近“墙”。
- 小窗：4 个悬浮图标从 32px 缩到 28px，图标从 16px 缩到 14px；小窗气泡、输入框、列表间距和字号整体收紧。
- 设置：外观页新增“对话字号”滑块，默认 13px，范围 11-15px，实时控制小对话窗口文字字号。
- 位置：小对话框优先放在灵宠下方；底部空间不足时改放左右侧，不再放在灵宠上方。
- 占位：PulseDot 顺序调整为“点 + Generating...”，并继承当前对话字号。
- 文件：App.tsx, ChatDialog.tsx, SettingsPanel.tsx, settingsStore.ts, pulse-dot.tsx, index.css

### R38. 内置默认模型切换为 gpt-4o-mini（2026-05-07）
- 默认模型：内置 CloseAI 兼容配置的模型名从 `qwen3.5-flash` 改为 `gpt-4o-mini`；大窗模型菜单、小窗调用和设置页展示都会读取同一常量同步更新。
- 文件：defaultModel.ts, PROGRESS.md

### R39. 小窗展开几何顺序与对话时动作保持（2026-05-07）
- 小窗：展开小对话窗时，先完成原生透明窗口尺寸/位置更新，再提交 React 内部 `petLeft/petTop` 布局，减少旧窗口坐标和新布局坐标不同步造成的灵宠跳动。
- 顺序：窗口展开时改为先 resize、再 move、最后 apply layout，避免 `Promise.all` 等待 resize 时让已移动窗口和旧内部布局同时暴露。
- 动作：小窗对话打开时不再暂停灵宠 `petJump/petWobble/petBreathe` 运动状态；仅拖拽期间暂停动作，松手后恢复。
- 文件：App.tsx, PetAvatar.tsx

### R40. 小对话窗拆分为独立透明窗口（2026-05-07）
- 架构：新增 `compact-chat` 透明窗口承载小对话框，灵宠窗口只保留灵宠本体和 4 个右侧工具按钮；打开/关闭小窗不再 resize 或重排灵宠窗口。
- 定位：小对话窗根据灵宠当前屏幕坐标独立定位，优先在灵宠下方，底部空间不足时放左右侧，并在拖拽时跟随移动。
- 交互：图片、语音按钮改为通过 Tauri event 转发给 `compact-chat` 窗口；小窗会把当前会话 id 回传给灵宠窗口，用于“放大”时接续同一会话。
- 窗口：新增 `show_compact_chat_window`、`position_compact_chat_window`、`hide_compact_chat_window` 命令，并把 `compact-chat` 加入窗口 capabilities。
- 文件：App.tsx, ChatDialog.tsx, window.rs, lib.rs, default.json

### R41. 收起小窗不再牵动灵宠与工具栏硬边界（2026-05-07）
- 稳定性：收起小对话窗只隐藏独立 `compact-chat` 窗口，不再触发灵宠窗口 layout 重新计算，避免边缘场景下灵宠向上跳动。
- 工具栏：灵宠窗口折叠宽度固定预留 4 个右侧工具按钮的空间，展开小窗后图片、语音、放大按钮不会被透明窗口边界裁掉。
- 边界：受控拖拽的硬边界改为按整个灵宠窗口计算，而不是只按宠物图片计算；拖到屏幕边缘时会被”墙”挡住，右侧按钮区域也保持在工作区内。
- 文件：App.tsx

### R42. 系统级置顶穿越全屏应用（2026-05-07）
- 窗口层级：macOS 宠物窗使用 `NSScreenSaverWindowLevel` (1000)，可穿越全屏 Space 和全屏游戏/视频。
- 集合行为：设置 `CanJoinAllSpaces`、`FullScreenAuxiliary`、`Stationary`、`IgnoresCycle` 让灵宠加入全屏 Space。
- 后台守卫：新增 `start_topmost_guard` 命令，每 2 秒重新断言窗口 `orderFrontRegardless`，防止系统层级重置。
- 生命周期：宠物窗创建/显示时自动置顶，隐藏时调用 `unpin_pet_from_fullscreen` 重置层级。
- 设置开关：外观页新增”始终置顶显示 (穿越全屏)”切换，关闭时禁用置顶功能。
- 命令：新增 `pin_pet_above_fullscreen_cmd`、`unpin_pet_from_fullscreen_cmd`、`start_topmost_guard`、`stop_topmost_guard`。
- 文件：window.rs, lib.rs, App.tsx, SettingsPanel.tsx, settingsStore.ts

### R43. 语音输入、唤醒词检测和 TTS 朗读（2026-05-07）
- 功能：实现完整的语音功能，包括麦克风语音输入、后台唤醒词检测和 AI 回复朗读。
- 语音输入：点击麦克风按钮请求麦克风权限，使用 Web Speech API (webkitSpeechRecognition) 进行语音识别，支持实时结果显示和语音语言设置。
- 唤醒词检测：宠物窗后台监听语音，检测到唤醒词后播放提示音并打开对话窗口，支持自动预填充唤醒词后的文本。
- TTS 朗读：AI 消息气泡右侧新增朗读按钮，点击使用 Web Speech Synthesis API 朗读消息内容，支持暂停/继续和语速调节。
- 自动朗读：设置页新增”自动朗读 AI 回复”开关，开启后 AI 回复完成时自动朗读，支持 0.5-2.0 倍语速调节。
- 设置：新增唤醒词开关、自定义唤醒词（默认”你好灵宠”）、自动朗读开关、朗读语速滑块。
- 命令：新增 `focus_compact_chat_input` 命令用于唤醒后聚焦输入框。
- 文件：ChatDialog.tsx, App.tsx, SettingsPanel.tsx, settingsStore.ts, window.rs, lib.rs

### R45. 多模型 API 配置管理（2026-05-07）
- 功能：新增完整的多提供商 API 配置管理系统，支持 11 个 AI 提供商预设和自定义配置。
- 提供商：OpenAI、Anthropic (Claude)、Google Gemini、Grok (xAI)、DeepSeek、Kimi (月之暗面)、智谱 GLM、腾讯混元、MiniMax、通义千问 (Qwen)、自定义。
- 数据库：新增 `name` 和 `provider_id` 字段到 `api_configs` 表，支持用户自定义配置名称和提供商 ID。
- 界面：设置页 AI 对话 section 重写，新增添加/编辑/删除/设为默认/测试连接功能。

### R44. 多格式图片上传与管理（2026-05-07）
- 功能：新增完整的灵宠形象管理系统，支持多格式图片上传、管理和渲染。
- 格式支持：PNG、JPEG、GIF、WebP、BMP、SVG 等常见图片格式，上传时自动转换为 PNG 格式存储。
- 存储：用户上传的图片保存在 `appLocalDataDir/assets/{state}/` 目录，按状态（待机/思考/睡眠）分别存储。
- Rust 命令：新增 `import_pet_image`、`delete_pet_image`、`list_pet_images` 三个命令用于图片管理。
- 界面：设置页"外观" section 重写，新增状态切换标签页、4 列图片网格预览、添加/删除图片功能。
- 渲染：PetAvatar 组件优先使用用户上传图片，无自定义时回退到内置默认资源；启动时自动加载用户图片列表。
- 文件：images.rs, mod.rs, lib.rs, petStore.ts, PetAvatar.tsx, SettingsPanel.tsx, animations.ts
- 模态框：新增 `ApiConfigModal` 组件，支持从 11 个提供商预设选择、自动填充 Base URL 和模型列表、测试连接按钮。
- 存储：API Key 继续存储在系统钥匙串中，数据库仅存储 keyring 引用；编辑配置时留空 API Key 则不修改现有 Key。
- 模型选择：大聊天窗口模型选择显示格式为"{配置名称} · 模型名"，优先显示用户自定义配置名，否则显示提供商名称。
- 测试连接：完善 Rust `test_ai_connection` 命令，从钥匙串读取 API Key 并验证格式。
- 文件：providers.ts（新增）、apiConfigStore.ts、SettingsPanel.tsx、ChatDialog.tsx、aiService.ts、0002_add_config_name_and_provider.sql（新增）、lib.rs、ai.rs
