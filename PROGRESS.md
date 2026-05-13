# DeskSprite P0 开发进度

## 总体状态
- 开始时间：2026-04-30
- 当前阶段：P0（Electron 重构 + GIF 形象体系 + 桌面交互打磨）
- 完成任务：11 / 11 (A-K) + 动画系统重构 + Electron 重构 + 对话/拖拽迭代修复
- 当前 Agent 分工：[Agent 1]
- 最新提交：待提交：electron rewrite, GIF avatars, UI and window interaction fixes

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

### R46. 修复大对话窗口发送后白屏（2026-05-07）
- 崩溃：大窗消息列表渲染时 `StandaloneChatPanel` 读取了作用域外的 `settings.speakRate`，发送第一条消息后立即触发 React runtime error 并白屏；改为由工作区显式传入 `speakRate`。
- 构建：修复语音识别类型定义里的 `stop/onerror/resultIndex/isFinal` 问题，并清理设置页/API store/pet store 中导致 `tsc` 失败的未使用导入和无效 prop。
- 验证：`pnpm build`、`cargo check`、`git diff --check` 均通过；Rust 侧仅保留既有 CSP dead-code warning。
- 文件：ChatDialog.tsx, App.tsx, SettingsPanel.tsx, apiConfigStore.ts, petStore.ts

### R47. 语音权限、剪贴板图片与模型附件能力检查（2026-05-07）
- 语音：首次点击语音输入时显式调用 `navigator.mediaDevices.getUserMedia({ audio: true })` 触发系统麦克风授权，并在 macOS bundle 中加入麦克风和语音识别用途说明。
- 图片：大小对话窗口的输入框支持直接粘贴剪贴板图片，粘贴后复用现有图片预览 chip 和发送链路。
- 模型：发送带图片的消息前检查当前模型是否支持图片/文件输入；不支持时弹出提示并阻止发送，避免把不兼容请求发到文本模型。
- 文件：ChatDialog.tsx, Info.plist

### R48. 语音输入权限降级策略（2026-05-07）
- 修复：移除 `getUserMedia` 不存在时的硬失败；当前 WebView 不暴露媒体权限 API 时，仍继续直接启动系统 `SpeechRecognition`。
- 行为：只有 `getUserMedia` 存在且用户明确拒绝权限时，才提示允许麦克风；`SpeechRecognition.start()` 启动失败时给出单独的系统语音输入失败提示。
- 文件：ChatDialog.tsx

### R49. 语音按钮反馈与历史图片持久化（2026-05-07）
- 语音：点击语音输入后立即进入 listening 视觉反馈；如果当前 WebView 没有暴露系统语音识别接口，改为弹窗明确提示，避免按钮像没有反应。
- 图片：上传/粘贴图片发送时，把图片 dataURL 写入消息记录；历史会话加载时识别 dataURL 并恢复图片预览。
- 历史：设置-历史对话详情页也会显示消息图片，列表 preview 用 `[图片]` 标记含图消息。
- 文件：ChatDialog.tsx, SettingsPanel.tsx

### R50. 个性化形象默认图展示与本地图片渲染修复（2026-05-07）
- 设置：个性化形象网格现在同时显示系统内置默认灵宠图和用户自定义图，默认图带“默认”标签且不可删除。
- 渲染：启用 Tauri asset protocol，并在 CSP 中放行 `asset:` / `http://asset.localhost` 图片和媒体源，修复上传图片在设置页和灵宠前端无法显示的问题。
- 上传：形象上传和聊天图片选择都限制为常见位图格式 PNG/JPG/JPEG/WEBP/GIF/BMP；Rust 导入命令同步校验扩展名并返回清晰错误。
- 文件：SettingsPanel.tsx, ChatDialog.tsx, images.rs, tauri.conf.json, Cargo.toml, Cargo.lock

### R51. 修复启动时语音识别 TCC 闪退（2026-05-07）
- 崩溃：macOS 在未找到 `NSSpeechRecognitionUsageDescription` 的运行环境里触发系统语音识别权限请求时会直接 TCC abort；开发模式下唤醒词监听可能在应用启动后自动调用 `SpeechRecognition.start()`，导致软件快速闪退。
- 后端：新增 `can_start_speech_recognition` 命令，macOS 上只在当前可执行文件位于 `.app` bundle 且 `Info.plist` 同时包含麦克风和语音识别用途说明时允许启动系统语音识别。
- 前端：唤醒词后台监听和语音输入按钮都先调用安全检查；不安全时阻止启动并给出提示，避免启动路径或点击语音按钮触发系统级崩溃。
- 兼容：`Info.plist` 检查按字节匹配 key，兼容 XML 和二进制 plist。
- 验证：`pnpm build`、`cargo check` 通过；Rust 侧仅保留既有 CSP dead-code warning。
- 文件：desktop.rs, lib.rs, App.tsx, ChatDialog.tsx

### R52. 个性化形象预览和使用开关修复（2026-05-07）
- 预览：内置默认图统一使用 `/assets/...` 绝对资源路径，本地上传图继续使用 `convertFileSrc`，修复设置页默认图和上传图都显示为空占位的问题。
- 使用状态：为每个状态新增 `disabledFrames` 配置；默认图和上传图都可点击“使用/不使用”，灵宠随机切换时只从未禁用的图片中选择。
- 操作：上传图显示“使用/不使用”和“删除”；系统默认图显示“使用/不使用”，删除按钮置灰不可用。
- 安全：阻止用户把某个状态下最后一张可用图片也设为“不使用”，避免灵宠没有可渲染形象。
- 持久化：每次切换使用状态、删除上传图、恢复默认都会同步写入 `petMedia_{state}` 设置。
- 文件：SettingsPanel.tsx, animations.ts, PetAvatar.tsx

### R53. 上传形象 dataURL 预览兜底与小窗操作按钮布局（2026-05-07）
- 预览：新增 `read_pet_image_data_url` 命令，读取 app local data 中的宠物图片并返回 data URL，设置页上传图优先用 data URL 预览，彻底绕开 asset protocol 在窗口/CSP 下的解析差异。
- 渲染：灵宠本体加载上传图片时同样先读取 data URL，失败才回退 `convertFileSrc`，避免设置页能看到但前端本体仍空白。
- 安全：读取和删除上传图共用 canonical path 校验，只允许访问 `$APPLOCALDATA/assets/**` 下的宠物图片。
- 小窗：紧凑聊天窗口中朗读/复制按钮移动到气泡下方；大聊天窗口仍保持侧边 hover 按钮。
- 验证：`pnpm build`、`cargo check`、`git diff --check` 通过。
- 文件：images.rs, lib.rs, SettingsPanel.tsx, PetAvatar.tsx, ChatDialog.tsx

### R54. 小窗去除消息操作与图片上传前置校验（2026-05-07）
- 小窗：删除紧凑聊天窗口里的复制和朗读按钮，避免小聊天框视觉拥挤；大聊天窗口继续保留侧边复制/朗读按钮。
- 图标：大聊天窗口上传入口从回形针改为图片图标，并保留“上传图片”标签，避免误解为上传任意文件。
- 校验：聊天图片选择在读取前校验 MIME 和扩展名，只允许 PNG/JPG/JPEG/WEBP/GIF/BMP；不合法时立即提示。
- 设置：个性化形象上传在调用 Rust 导入命令前先过滤路径扩展名，若选中非图片文件会即时提醒并跳过。
- 验证：`pnpm build`、`cargo check`、`git diff --check` 通过。
- 文件：ChatDialog.tsx, SettingsPanel.tsx

### R55. 模型服务商预设和真实连接测试（2026-05-07）
- 服务商：模型配置改为固定使用 OpenAI、Anthropic、Google、Grok、DeepSeek、Kimi、GLM、Hunyuan、MiniMax、MiMo、Qwen 这 11 个 provider 及其指定 base_url。
- 模型名：移除预设模型下拉，模型名称全部由用户手动填写，避免列表过期或限制用户使用新模型。
- Base URL：选择服务商后自动填充并锁定 base_url；旧 `zhipu` 配置编辑时自动映射到 `glm`。
- 测试：每条 API 配置的“测试”按钮改为真实请求模型接口；OpenAI 兼容服务走 `/chat/completions`，Anthropic 走 `/messages`。
- 错误：测试失败时直接展示 HTTP 状态和服务商返回的错误消息，例如 API key 无效、model 不存在、权限不足等。
- 文件：providers.ts, SettingsPanel.tsx

### R56. API 配置自定义项与文档打开修复（2026-05-07）
- 自定义：模型配置重新保留“自定义”服务商；选择后可手动填写 Base URL，预设服务商仍自动填充并锁定 Base URL。
- 精简：删除新增/编辑 API 配置弹窗中的“配置名称”字段；设置列表和大聊天窗口模型标签只展示服务商名与模型名。
- 兼容：数据库中的 `name` 字段保留作历史兼容，但不再作为用户可编辑字段；编辑旧未知 provider 时按自定义配置处理并保留原 Base URL。
- 文档：获取 API Key 不再使用 WebView 内普通链接，改为调用 `open_external_url` 后端命令，用系统浏览器真正打开对应服务商文档页面。
- 文件：providers.ts, types.ts, SettingsPanel.tsx, ChatDialog.tsx, desktop.rs, lib.rs

### R57. API Key 保存与测试链路修复（2026-05-07）
- 保存：新增 API 配置时使用唯一 keyring 引用写入系统钥匙串，并把引用写入数据库。
- 编辑：只要用户重新填写 API Key，就生成新的简单格式 keyring 引用、覆盖保存 API Key，并把新引用同步写回数据库，避免继续复用坏引用。
- 留空：编辑已有配置且 API Key 留空时，只保留原引用，不在保存阶段读取钥匙串，避免因为旧 keychain 条目异常阻断用户修改模型参数。
- 测试：测试模型时如果钥匙串条目缺失，返回“重新填写并保存”的明确提示；重新填写保存会刷新引用。
- 文件：apiConfigStore.ts, db.ts, SettingsPanel.tsx

### R58. API Key 本地持久化兜底（2026-05-07）
- 存储：为 `api_configs` 增加本地 `api_key` 字段，保存时写入本地数据库隐藏值；系统 Keychain 仍尝试写入，但不再作为唯一可信来源。
- 读取：测试模型、默认模型解析、大小聊天窗口发起请求时，优先读取本地保存的 API Key，缺失时才回退到旧 `keyring_ref`。
- 编辑：已保存 API Key 的配置打开后显示 `••••••••` 点状占位，不展示明文；点击输入框可清空并重新粘贴新 key，留空保存则保留旧 key。
- 兼容：旧配置仍可通过 keyring 引用读取；重新填写一次 API Key 后会写入新的本地持久化字段。
- 文件：0003_add_api_key_to_configs.sql, lib.rs, apiKeyStorage.ts, db.ts, apiConfigStore.ts, SettingsPanel.tsx, defaultModel.ts, aiService.ts

### R59. 模型测试与聊天请求改走后端（2026-05-07）
- 测试：设置页模型测试不再由前端 WebView `fetch` 服务商地址，改为调用 Tauri `test_ai_connection`，由 Rust `reqwest` 发起真实请求。
- 错误：测试失败会返回真实 HTTP 状态和服务商错误内容，避免浏览器跨域层把问题折叠成 `TypeError`。
- 聊天：灵宠小窗、大聊天窗口和 Hover 输入都复用 `streamChat`，现在统一调用后端 `chat_completion`，自定义模型不再受 WebView CORS 限制。
- 兼容：OpenAI 兼容接口走 `/chat/completions`，Anthropic 走 `/messages`；图片消息在后端分别转换为各自格式。
- 文件：ai.rs, lib.rs, aiService.ts, SettingsPanel.tsx

### R60. 用户模型 API Key 读取逻辑收敛（2026-05-07）
- 简化：用户新增模型改为和内置默认模型一样，运行时直接使用配置对象里的 `apiKey`，不再回退读取 Keychain。
- 保存：新建模型时 `api_key` 字段原样保存用户填写的 key；编辑模型留空则保留原 key，重新填写则覆盖。
- 防护：加载旧数据时兼容解码历史 `local:v1:` 值，同时丢弃此前误存的“未找到 API Key”等内部错误文本，避免把错误提示当 token 发给服务商。
- 调用：测试模型、默认配置解析、大小聊天窗口都只从本地 `api_key` 得到 key，彻底避免错误态混入 Authorization header。
- 文件：apiKeyStorage.ts, apiConfigStore.ts, db.ts, SettingsPanel.tsx, defaultModel.ts, aiService.ts

### R61. CloseAI 预设与 token 归一化（2026-05-07）
- 服务商：在用户模型配置里新增 CloseAI provider，base_url 与内置默认模型保持一致：`https://api.openai-proxy.org/v1`。
- 防错：保存 API Key 时去掉用户可能粘贴的 `Bearer ` 前缀、外层引号和不可见空格。
- 后端：模型测试和聊天请求发出前再次归一化 token，避免第三方服务商收到 `Bearer Bearer ...` 或带引号 token。
- 目的：用户如果想复刻默认模型配置，可以直接选择 CloseAI，而不是误选 OpenAI 官方地址导致 `401 invalid token`。
- 文件：providers.ts, types.ts, apiConfigStore.ts, ai.rs

### R62. API Key 测试可观测性修复（2026-05-07）
- 诊断：模型测试失败时会同时返回请求 endpoint、Key 长度、尾号和短指纹，确认 `invalid token` 时到底用了哪一把本地保存的 Key，同时不暴露完整明文。
- 设置：API 配置列表直接展示 Key 的长度、尾号和指纹；编辑弹窗说明改为“本机数据库保存”，不再误写系统钥匙串。
- 归一化：保存、读取和后端请求前统一去掉 `Bearer `、外层引号、不可见字符和误粘贴的换行/空白。
- 目的：区分“base_url 已连通但服务商拒绝 token”和“应用没有读到用户刚保存的 token”这两类问题。
- 文件：apiKeyStorage.ts, apiConfigStore.ts, SettingsPanel.tsx, ai.rs

### R63. API Key / 模型测试排查复盘（2026-05-07）
- 复盘：新增 `docs/model-config-debugging.md`，集中记录从 Keychain 读取失败、错误文本混入 token、WebView `TypeError`、CloseAI provider 缺失，到最终通过安全摘要确认真实 key 的完整排查过程。
- 经验：用户配置模型和内置默认模型必须共享同一套 `base_url + model + api_key` 调用语义；凭证链路必须可观测但不能泄露明文。
- 排查法：以后遇到 `invalid token`，先看 endpoint、Key 长度、尾号和指纹，再判断是 base_url 错、保存读取错，还是服务商真实拒绝。
- 文件：docs/model-config-debugging.md, PROGRESS.md, ISSUES.md

### R64. 形象预览、全屏置顶与语音方案整理（2026-05-07）
- 预览：设置页个性化形象改为默认资源和上传资源都先加载为 data URL；失败时显示明确“图片无法预览”，避免只留下空占位框。
- 置顶：macOS pet/compact-chat 窗口增加更强的 fullscreen auxiliary/overlay 行为；topmost guard 周期性重申 window level、全 Space 可见和前置顺序；智能附着不再把全屏态灵宠挪到屏幕外隐藏。
- 语音：新增 `docs/voice-stt-tts-plan.md`，建议把 CloseAI STT/TTS 做成高级云端增强，免费额度内使用默认模型，超额或失败回退系统语音；默认 key 不写入文档或日志。
- 文件：SettingsPanel.tsx, attachEngine.ts, window.rs, voice-stt-tts-plan.md, PROGRESS.md, ISSUES.md

### R65. 内置云端 STT/TTS 与本机额度展示（2026-05-07）
- 语音输入：新增云端 STT 服务，点击语音按钮时默认走内置语音增强；录音通过 `MediaRecorder` 获取，后端调用 OpenAI-compatible `/audio/transcriptions`，失败或超额后回退系统语音识别。
- 语音输出：自动朗读和大窗朗读按钮优先调用内置云端 TTS `/audio/speech`，失败或超额后回退系统 `speechSynthesis`。
- 设置：`AI 对话` 增加语音输入方式、语音输出方式；支持系统、云端增强、用户默认模型 Key 三种模式。
- 额度：设置页展示内置 Chat/STT/TTS 的本机已用百分比；当前无账户系统，额度跟随设备独立记录。
- 后端：新增 `transcribe_audio`、`synthesize_speech` Tauri 命令，并为 `reqwest` 开启 multipart 支持。
- 验证：`pnpm build`、`cargo check --manifest-path src-tauri/Cargo.toml` 通过；`cargo check` 首次因沙箱网络限制失败，提升权限下载新增依赖后通过。
- 文件：Cargo.toml, Cargo.lock, ai.rs, lib.rs, defaultModel.ts, voiceService.ts, ChatDialog.tsx, SettingsPanel.tsx, settingsStore.ts, voice-stt-tts-plan.md

### R66. Chat/TTS/STT 模型配置拆分（2026-05-07）
- 默认 TTS：内置 TTS 模型从 `tts-1-hd` 切换为 `tts-1`，用于改善响应速度和听感稳定性。
- Chat：新增 `chatModelMode`，可在设置中选择默认 CloseAI Chat 或自定义 Chat；自定义 Chat 复用 API 配置中设为默认的模型。
- STT：设置页新增独立 STT 模型模块，支持默认、自定义、系统输入；自定义 STT 单独保存 Base URL、模型名和 API Key。
- TTS：设置页新增独立 TTS 模型模块，支持默认、自定义、系统朗读；自定义 TTS 单独保存 Base URL、模型名和 API Key。
- 调用：小窗、大窗和 Hover 输入都会按 Chat 模型模式选择默认或自定义；云端 STT/TTS 会按各自配置调用，失败仍回退系统能力。
- 验证：`pnpm build`、`cargo check --manifest-path src-tauri/Cargo.toml` 通过。
- 文件：settingsStore.ts, voiceService.ts, SettingsPanel.tsx, ChatDialog.tsx, HoverInputBar.tsx, voice-stt-tts-plan.md

### R67. Electron 重构、GIF 默认形象与桌面交互收尾（2026-05-09）
- Electron：新增 `electron/main.cjs`、`electron/preload.cjs` 和 Tauri API shim，前端继续复用现有 React/状态/数据库接口；`pnpm electron:dev` 固定使用 `127.0.0.1`，解决只启动 Vite、没有 Electron/Dock/任务栏进程的问题。
- 窗口：实现 pet、compact-chat、settings、chat 多窗口；pet/compact-chat 使用 macOS fullscreen Space 置顶策略和 topmost guard；settings/chat 顶部可拖拽区和内容留白按桌面应用体验调整。
- Dock/任务栏：根据当前灵宠形象更新 app 图标；为非正方形图片生成透明补边的正方形 Dock 图标，避免拉伸；GIF 形象下图标回退使用 PNG 默认图，保证 Dock/任务栏稳定显示。
- 交互：小聊天框和大聊天框互斥；小聊天框按内容动态高度增长，hover 框按聊天框尺寸计算；收起后不会被拖动、设置、窗口移动等副作用自动弹出；pet 右侧 chat button 只在小聊天未弹出时 hover 显示。
- 右键菜单：菜单默认收起历史二级菜单，hover 展开；点击外部关闭；靠近屏幕右侧时菜单出现在 pet 左侧；新增“退出”选项并调用 Electron `app.quit()`。
- 拖拽：拖动边界改为按可见 pet 图像计算，超限直接硬限制，不做回弹；拖动中避免重复 `setPosition` 造成边缘抖动。
- GIF 形象：新增 `mediaMode: gif | image`，默认使用 `public/assets/GIF/blink.GIF`；设置页提供 GIF / 图片两套入口，GIF 上传只接受 `.gif`，图片入口保留 PNG/JPG/JPEG/WEBP/BMP；GIF 渲染走 `<img>`，静态图片继续走 canvas。
- UI：设置、大聊天、小聊天和基础控件重做为更克制的黑白灰、轻磨砂、弱边界风格；滑块、输入框、按钮、菜单、对话布局和字号层级进行多轮收敛。
- 验证：`pnpm build` 多次通过；`pnpm electron:dev` 验证 Electron 能在 `127.0.0.1:5173` dev server 后正常启动。
- 文件：electron/main.cjs, electron/preload.cjs, package.json, vite.config.ts, src/App.tsx, src/electron-shims/*, src/features/pet/*, src/features/settings/SettingsPanel.tsx, src/features/chat/*, src/index.css

### R68. idle GIF 迁移兜底与提示按钮语义修复（2026-05-09）
- 修复：`idle` GIF 不显示时，优先怀疑旧 `petMedia_idle` 配置仍指向已删除的 `assets/GIF/blink.GIF` 或旧 `assets/idle/*.png`；现在配置归一化会过滤这些旧默认路径并回退到 `assets/idle/gif/*`、`assets/idle/png/*`。
- 交互：休息提醒和专注分心提示下方按钮从纯图标改成“图标 + 文字”，分别显示“休息 / 忽略”和“继续专注 / 结束”，减少猜测成本。
- 验证：待本次提交前执行 `pnpm build`。
- 文件：animations.ts, App.tsx, ISSUES.md, PROGRESS.md

### R69. 分心提示保持专注形象（2026-05-09）
- 修复：专注模式中检测到分心后，不再把灵宠切到休息形象；提示气泡出现时保持 `work` 专注形象，避免用户误以为专注流程已经进入休息阶段。
- 交互：用户点击“继续专注”仍保持 `work`，点击“结束”才回到 `idle`。
- 验证：`pnpm build` 通过。
- 文件：App.tsx, ISSUES.md, PROGRESS.md

### R70. 休息/喝水合并与中央放大休息展示（2026-05-09）
- 状态：`rest` 默认 GIF 池合并休息与喝水两张图，设置页不再单独展示 `drinking` 状态；旧 `drinking` 类型保留兼容，但休息倒计时统一使用 `rest`。
- 随机：宠物状态切换时会在可用素材中随机选择一张，因此每次休息会在休息/喝水图之间轮换。
- 展示：用户点击休息提示后，pet 窗口保存当前几何和布局，平滑放大并移动到屏幕中央，目标尺寸约占工作区 80%；休息结束后平滑缩回原位置，再回到待机。
- 防护：休息展示期间隐藏小聊天窗口、禁用 pet 拖拽和侧边 chat button，避免大尺寸展示和普通桌面交互互相抢布局。
- 验证：`pnpm build` 通过；`git diff --check` 通过。
- 文件：App.tsx, animations.ts, PetAvatar.tsx, ISSUES.md, PROGRESS.md

### R71. 专注状态菜单与提醒事项独立设置页（2026-05-09）
- 菜单：PetAvatar 新增 `focusActive` / `onFocusToggle`，右键菜单在专注中自动把“专注模式”切换为“退出专注”，点击同一入口即可结束专注并回到待机。
- 设置：左侧导航新增“提醒事项”，休息提醒、提醒间隔、专注时长、分心检测、检测宽限期和屏蔽规则从外观页迁出。
- 确认：提醒事项页改为草稿编辑，滑动条/开关/文本框不再即时保存；点击“确认”后才写入设置并显示“已应用，前端计时已刷新”。
- 刷新：pet 窗口监听设置变化；专注时长确认后，如果当前正在专注，会立即按新的时长重算倒计时。
- 验证：`pnpm build` 通过。
- 文件：App.tsx, PetAvatar.tsx, SettingsPanel.tsx, ISSUES.md, PROGRESS.md

### R72. 休息展示倒计时与提前结束按钮（2026-05-09）
- 控制：休息中央展示时，灵宠下方新增独立控制条，包含倒计时 pill 和“提前结束”按钮；专注倒计时仍保持原来的小字样式。
- 退出：点击“提前结束”会清空休息倒计时，复用休息结束恢复流程，先平滑缩回原位置，再切回待机。
- 布局：中央休息展示的底部预留空间从 24px 增加到 58px，避免倒计时和按钮被透明窗口裁切。
- 验证：`pnpm build` 通过。
- 文件：App.tsx, ISSUES.md, PROGRESS.md

### R73. 专注休息后自动进入下一轮（2026-05-09）
- 循环：专注倒计时结束后弹出的休息提示，现在会在用户确认休息时记录 `autoFocusAfterRest`；休息自然结束或提前结束后，会先恢复灵宠窗口，再自动开启下一轮专注。
- 区分：普通休息喝水提醒不设置该标记，完成后仍回到待机，避免日常提醒误触发专注循环。
- 防护：用户主动退出专注时会清除自动续专注标记，避免旧状态残留。
- 验证：`pnpm build` 通过。
- 文件：App.tsx, ISSUES.md, PROGRESS.md

### R74. 个人档案专注统计（2026-05-09）
- 统计：本地 storage 新增 `focusStats`，按自然日累计专注时长、专注次数和分心次数；专注自然结束或手动退出会记录一次专注，分心提示通过冷却判断后才记录一次分心。
- 展示：设置页新增左侧“个人档案”栏目，默认进入该页；右侧提供日期切换、当日三张概览卡、最近 14 天专注柱状图和平均/最高摘要。
- 逻辑：最近 14 天会自动补齐无数据日期，柱状图可点击切换具体日期，整体展示接近屏幕使用时间的按日浏览逻辑。
- 验证：`pnpm build` 通过。
- 文件：db.ts, App.tsx, SettingsPanel.tsx, ISSUES.md, PROGRESS.md

### R75. 喝水 GIF 合并进旧休息配置（2026-05-09）
- 修复：`rest` 默认配置已包含 `playing_clean_3.GIF` 和 `drinking_raw.GIF`，但用户本地旧 `petMedia_rest` 可能只保存休息图；现在归一化旧配置时会强制合并喝水 GIF。
- 效果：休息倒计时进入 `rest` 状态时，旧配置和新配置都会在休息/喝水两张 GIF 中随机轮换。
- 验证：`pnpm build` 通过。
- 文件：animations.ts, ISSUES.md, PROGRESS.md

### R76. 个人档案日历选择器（2026-05-09）
- 交互：个人档案右上角日期改为可点击控件，点击后展开月历弹层，可直接选择日期。
- 浏览：月历支持上/下月切换，点击外部或按 Esc 会关闭；未来日期禁用，避免查看不存在的统计。
- 联动：选择日期后关闭弹层，并刷新当日概览和最近 14 天趋势图。
- 验证：`pnpm build` 通过。
- 文件：SettingsPanel.tsx, ISSUES.md, PROGRESS.md

### R77. Orb 形象渲染模式（2026-05-09）
- 设置：新增 `avatarRenderMode: pet | orb`，外观设置中增加“形象模式”切换；默认仍为 Pet，避免改变现有用户体验。
- 渲染：PetAvatar 保留原 PNG/GIF 渲染分支；Orb 模式复用同一套拖拽、右键菜单、聊天按钮和窗口布局，只替换灵宠本体为 CSS/React 代码动效球体。
- 三态：idle 使用鼠标邻近字重变化，work 在 hover 时做字母翻牌，rest 自动慢旋转并让文字字重呼吸；状态 accent 色跟随 idle/work/rest 切换。
- 尺寸：Orb 常驻尺寸复用“灵宠大小”设置；休息放大仍复用屏幕 80% 展示逻辑，并针对 Orb 使用正圆几何计算。
- 验证：`pnpm build` 通过。
- 文件：settingsStore.ts, SettingsPanel.tsx, PetAvatar.tsx, App.tsx, index.css, ISSUES.md, PROGRESS.md

### R78. Orb 视觉材质与动效重做（2026-05-09）
- 材质：Orb 从高饱和彩色 glow 改为多层玻璃体，增加 ambient、glass、aura 层，使用低对比边缘折射、内阴影和细微状态色。
- 动效：常态呼吸放慢且幅度减弱；rest 自转改为更慢的 32s，文字呼吸更柔和；work hover 翻牌延长并降低机械跳变。
- 字体：文字字号下调、字距更稳，状态文本更像嵌在玻璃里的系统标记，而不是大号网页标题。
- 验证：`pnpm build` 通过。
- 文件：PetAvatar.tsx, index.css, ISSUES.md, PROGRESS.md

### R79. Orb 前端结构重做（2026-05-09）
- 结构：参考 `aura-ai-floating-orb` 的前端结构，将 Orb 重做为独立 stage：外圈仪表环、核心 shell、核心 glow、ambient/glass/ring/aura/noise 多层、状态文字层。
- 动效：引入 `framer-motion` 的 `motion` / `AnimatePresence`，核心球呼吸、hover scale、rest 自转和状态文字进出场由 motion 驱动，CSS 负责材质与文字细节。
- 体验：Orb 不再只是一个 CSS 球体，而是拥有外环慢速旋转、核心状态切换和更清晰的空间层级；仍只替换灵宠本体，不影响聊天、菜单、拖拽、专注和休息流程。
- 验证：`pnpm build` 通过。
- 文件：PetAvatar.tsx, index.css, ISSUES.md, PROGRESS.md

### R80. Orb 单球体视觉收敛（2026-05-09）
- 简化：删除外圈仪表环、内 ring、aura 和文字 hover/呼吸/翻牌动效，Orb 只保留一个球体轮廓和内部玻璃材质。
- 背景：Orb 根节点改为圆形裁切，去掉外溢环和大阴影导致的方形磨砂背景感。
- 文字：内部状态文字字号缩小到上一版约一半，字体栈改为 `Styrene B / Styrene A / Inter / system`，靠近 Claude 的英文字体气质。
- 验证：`pnpm build` 通过。
- 文件：PetAvatar.tsx, index.css, ISSUES.md, PROGRESS.md

### R81. Orb 内部流动与呼吸动效（2026-05-09）
- 呼吸：Orb 核心球体做自然呼吸缩放，节奏从单次弹性变成 5.6s 的轻微放缩循环。
- 流动：新增球体内部 `flow` 层，仍被圆形轮廓裁切；idle 状态颜色左右漂移，rest 状态颜色顺时针旋转流动，work 保持低强度斜向漂移。
- 约束：没有新增外部圆环或方形背景，所有视觉变化都发生在单个球体内部。
- 验证：`pnpm build` 通过。
- 文件：PetAvatar.tsx, index.css, ISSUES.md, PROGRESS.md

### R82. Orb 三态文字 3D Swap（2026-05-09）
- 动效：idle/work/rest 三种文字都增加 Letter 3D Swap 风格 hover 效果，每个字母有前后两个 3D 面。
- 触发：hover 到球体时按字母顺序 stagger 翻转，翻转后自动复位；动效只作用在文字层，不改变单球体结构。
- 验证：`pnpm build` 通过。
- 文件：PetAvatar.tsx, index.css, ISSUES.md, PROGRESS.md

### R83. Orb 呼吸与内部流动增强（2026-05-09）
- 呼吸：将 Orb shell 的循环缩放从轻微 1.8% 提高到约 4%，并加入轻微回落，让球体大小变化能被稳定感知。
- 流动：增强 `flow` 层的透明度、位移范围和速度；idle 左右流动更明显，rest 顺时针旋转更清晰，work 保留更克制的工作态漂移。
- 约束：仍只在单个球体内部做动效，没有增加外圈、背景卡片或额外装饰层。
- 验证：`pnpm build` 通过。
- 文件：PetAvatar.tsx, index.css, ISSUES.md, PROGRESS.md

### R84. Orb 文字呼吸动效（2026-05-09）
- 删除：移除 Orb 文字 hover 时的 Letter 3D Swap 翻牌结构和 CSS 动画，不再需要鼠标触发文字变化。
- 新增：每个状态字母默认持续执行 `fontVariationSettings` 呼吸动画，字重和倾斜从中间向两侧错开循环。
- 体验：文字动效从“hover 才发生的翻牌”改为“常驻柔和呼吸”，和球体本体的呼吸、内部流动更一致。
- 验证：`pnpm build` 通过。
- 文件：PetAvatar.tsx, index.css, ISSUES.md, PROGRESS.md

### R85. Orb 羽化边缘与自然能量体重做（2026-05-09）
- 边缘：移除 Orb shell 的硬边框，改用 radial mask 做由内到外的透明羽化，让外边缘自然过渡到桌面。
- 材质：重写球体内部渐变，加入柔和 edge bloom、conic 流光和更强的状态色能量层，整体更接近自然发光体而不是玻璃按钮。
- 呼吸：扩大 shell 循环缩放幅度并调整节奏，让呼吸在正常桌面视距下可见；hover 时保留轻微聚焦放大。
- 修复：修正 `orb-avatar__flow` 的 `inset: -24%` 被公共 selector 覆盖的问题，恢复内部流动层的真实运动范围。
- 验证：`pnpm build` 通过。
- 文件：PetAvatar.tsx, index.css, ISSUES.md, PROGRESS.md

### R86. Orb 轻量文字与粒子动效（2026-05-09）
- 文字：Orb 状态文字改为小写 `idle/work/rest`，字号比例从 9.5% 降到 7%，整体更轻。
- 色彩：降低状态色在 shell、flow、edge bloom 和文字中的混合比例，work/rest 不再过于浓烈。
- 粒子：新增 `orb-avatar__particles` 内部光尘层，使用多点 radial gradients 和慢速 drift 动画，在球体内部形成细小漂浮粒子。
- 验证：`pnpm build` 通过。
- 文件：PetAvatar.tsx, index.css, ISSUES.md, PROGRESS.md

### R87. Orb 液态金属球重做与 Rest 对齐（2026-05-09）
- 结构：删除 Orb 的 particles/glass/noise 三层和逐字 breathing 文字，保留 shell/glow/flow/text 四层，视觉主角回到球体本身。
- 材质：shell 改为液态金属球结构，使用主高光、右下反光、状态色核心和基底球面渐变；idle/work/rest 改为暖银/电光蓝/琥珀金。
- 动效：统一为 shell 主呼吸；idle 只做 glow 慢脉冲，work 做短周期横向能量扰动，rest 做 12s 慢旋转。
- 文字：Orb 文本使用 macOS 系统字体栈，整词渲染，不再拆字母；文字光影与左上主高光保持同一方向。
- 性能与状态：rest 放大展示时减少原生窗口 resize/move 调用；focus-complete 触发休息时显式保留 `autoFocusAfterRestRef`，休息结束后继续下一轮专注。
- 验证：`pnpm build` 通过。
- 文件：App.tsx, PetAvatar.tsx, index.css, ISSUES.md, PROGRESS.md

### R88. Orb 黑白灰彗星模式重做（2026-05-09）
- 视觉：完全移除液态金属材质，Orb 只保留一层黑色圆形边框，内部不再使用彩色渐变或额外装饰层。
- 动效：改用 canvas 粒子系统；idle 为单颗彗星在圆内弹跳并掉落尾粒，work 为中心彗星向四周喷散粒子，rest 为多颗彗星高速运动并互相碰撞。
- 交互：hover 时才显示英文小字；常态只看见黑白灰彗星和粒子。
- 性能：canvas DPR 在 rest presentation 下限制到 1.25，并设置粒子数量上限，避免大尺寸休息展示时重绘过重。
- 验证：`pnpm build` 通过。
- 文件：PetAvatar.tsx, index.css, ISSUES.md, PROGRESS.md

### R89. Orb 边框呼吸与星空粒子（2026-05-09）
- 边框：外层黑色圆圈增加 4.8s 的轻微呼吸缩放，让静态边界也有生命感。
- 粒子：把尾部粒子从长寿命拖尾点改为短寿命星尘，速度快速衰减，并绘制细小十字星芒与闪烁亮度。
- 观感：粒子不再沿彗星方向拖成“蝌蚪”，而是像星空里短暂闪现、扩散后消失的光点。
- 验证：`pnpm build` 通过。
- 文件：PetAvatar.tsx, index.css, ISSUES.md, PROGRESS.md

### R90. Orb 字母环与倒计时下落（2026-05-09）
- 方向：放弃粒子/彗星方案，Orb 改为纯字母动效系统，继续保持黑白灰和单层柔灰圆形边界。
- idle：`idle` 四个字母挂在大圆边缘缓慢环绕，并增加一个柔灰 satellite dot。
- work：`work` 四个字母按专注进度依次从上方落到底部堆叠，进度由 `focusStartedAt` / `focusEndAt` / `now` 同源计算，和倒计时同步。
- rest：重复的 `rest` 字母铺在圆圈外侧，整圈快速旋转；圆圈和边框都保留柔和透明呼吸。
- 验证：`pnpm build` 通过。
- 文件：App.tsx, PetAvatar.tsx, index.css, ISSUES.md, PROGRESS.md

### R91. Orb 参考效果复现增强（2026-05-09）
- idle：改为多条独立卫星轨道，每个字母在外圈轨道上错峰慢速绕行，首个轨道带柔灰 satellite dot。
- work：增加连续下落的 `work` 字母流，同时保留按专注进度堆叠到底部的确定性字母。
- rest：改为 16 条 `REST` 外圈轨道，每条带极淡分隔线，整组快速旋转。
- 质感：增加中心柔灰 nucleus 脉冲，边框、文字和背景全部使用低透明灰阶，接近用户提供 demo 的克制黑白灰气质。
- 验证：`pnpm build` 通过。
- 文件：PetAvatar.tsx, index.css, ISSUES.md, PROGRESS.md

### R92. Orb 三态交互语义强化（2026-05-09）
- idle：hover 时停止自由绕行，字母被弹性吸引到固定四象限，轨道半径收缩，表达“聚焦用户”。
- work：hover 时下落字母流进入 time-lapse 加速；底部堆叠字母增加微震动和触底回弹，强化重力沉积感。
- rest：高速旋转周期缩短并增加轻微 blur，hover 时立即停转并按 4x4 网格静态对齐，形成动静落差。
- 验证：`pnpm build` 通过。
- 文件：PetAvatar.tsx, index.css, ISSUES.md, PROGRESS.md

### R93. Orb 字母环动态回退与 Hover 保留（2026-05-09）
- 回退：按 `b16bc57 style: rebuild orb with letter rings` 的方向移除连续 work drop、16 轨 REST 叶片和中心 nucleus，恢复更克制的三态字母环。
- idle：恢复 `idle` 四字母整体卫星环绕和单个 satellite dot，hover 时收缩轨道并暂停旋转，保留“聚焦用户”的反馈。
- work：仅保留和专注进度同步的 `work` 四字母下落堆叠，继续保留底部微震动的 hover/工作态重量感。
- rest：恢复 28 个 `rest` 字母铺在外圈快速旋转，hover 时停转并排成低透明网格，保留当前动静反差。
- 验证：`pnpm build` 通过。
- 文件：PetAvatar.tsx, index.css, ISSUES.md, PROGRESS.md

### R94. Orb 灰度与字号可读性增强（2026-05-09）
- 字号：Orb 字母基础字号比例从 `size * 0.052` 提升到 `size * 0.062`，最小字号从 9px 提升到 10px。
- 灰度：外圈边框、idle/rest 字母、work 下落字母、hover 文本和 satellite dot 整体加深，提高桌面背景上的可读性。
- 克制：只提高对比度和尺寸，没有改变上一轮恢复的字母环动态与 hover 逻辑。
- 验证：`pnpm build` 通过。
- 文件：PetAvatar.tsx, index.css, ISSUES.md, PROGRESS.md

### R95. Orb 外圈大写与中心小写（2026-05-09）
- 外圈：idle/work/rest 的环绕、下落和旋转字母源统一改为大写，增强符号感和可读性。
- 中心：hover 时中央提示仍使用小写 `idle/work/rest`，和用户要求的内外层级区分保持一致。
- 验证：`pnpm build` 通过。
- 文件：PetAvatar.tsx, ISSUES.md, PROGRESS.md

### R96. Orb Idle 去除卫星点（2026-05-09）
- idle：删除外圈 satellite dot，IDLE 状态只保留四个大写字母环绕。
- 清理：移除对应的 dot 样式和 pulse keyframes，减少无用 CSS。
- 验证：`pnpm build` 通过。
- 文件：PetAvatar.tsx, index.css, ISSUES.md, PROGRESS.md

### R97. Orb 径向填充与 Hover 虚线边界（2026-05-09）
- 常态：移除 Orb 外部实线边框，shell 改为中心较深、向外逐渐透明的灰阶径向渐变填充。
- Hover：通过 `::after` 伪元素在 hover 时显示一圈低对比度虚线边界，常态下完全隐藏。
- 动效：保留原有呼吸、idle/work/rest 字母运动和 hover 文字逻辑，只调整容器材质。
- 验证：`pnpm build` 通过。
- 文件：index.css, ISSUES.md, PROGRESS.md

### R98. Orb 径向波浪扩散与 Hover 细实线（2026-05-09）
- 波浪：在 shell 上新增 `::before` 径向波纹层，使用重复径向渐变从中心向外缩放扩散。
- Hover：外部边界从虚线改为更窄、更浅的 0.8px 实线，常态仍隐藏。
- 约束：只调整容器视觉层，idle/work/rest 字母与状态逻辑保持不变。
- 验证：`pnpm build` 通过。
- 文件：index.css, ISSUES.md, PROGRESS.md

### R99. Orb Work 四角吸附倒计时（2026-05-09）
- Work：倒计时动效从“字母落到底部堆叠”改为 `W/O/R/K` 分别从四个边角旋转着被吸向中心。
- 顺序：继续用 `focusProgress * letters.length - index` 计算局部进度，保证字母按倒计时一个接一个被吸过去。
- 动效：每个字母由 TS 计算位移、旋转和缩放变量，CSS 负责平滑过渡；吸到中心后保留轻微亮度脉冲。
- 验证：`pnpm build` 通过。
- 文件：PetAvatar.tsx, index.css, ISSUES.md, PROGRESS.md

### R100. Orb Work 内核公转（2026-05-09）
- Work：为每个字母增加 orbit 容器，字母被吸入后落在内核附近的小轨道点上，而不是完全重叠到中心。
- 公转：orbit 容器以 16s 一圈缓慢旋转，四个字母错开相位围绕内核公转。
- 连续性：保留上一轮四角逐字吸附的倒计时进度映射，只改变吸附完成后的运动方式。
- 验证：`pnpm build` 通过。
- 文件：PetAvatar.tsx, index.css, ISSUES.md, PROGRESS.md

### R101. Orb Work 字母 90 度分隔（2026-05-09）
- Work：四个 orbit 容器改为固定 `0/90/180/270deg` 初始角度，确保 `W/O/R/K` 完全分开。
- 公转：移除负 delay 错相，改用 keyframes 从各自 `--orbit-angle` 开始同步旋转，保持互相间隔 90 度。
- 吸附：字母仍按倒计时逐个从四角吸入，最终落在同一半径轨道上。
- 验证：`pnpm build` 通过。
- 文件：PetAvatar.tsx, index.css, ISSUES.md, PROGRESS.md

### R102. Orb Work 内向波纹与稳定 90 度相位（2026-05-09）
- Work 波纹：为 work 状态单独使用 `orbRadialWaveIn`，让灰阶波纹从外向内收缩，匹配“被吸附到中心”的语义。
- Work 公转：移除 keyframes 中的角度变量插值，恢复同一轨道动画 + `-4s` 相位差，避免 90/270 度位置在浏览器插值中塌缩。
- 结果：`W/O/R/K` 吸附完成后应稳定分布在四象限，彼此相隔 90 度。
- 验证：`pnpm build` 通过。
- 文件：PetAvatar.tsx, index.css, ISSUES.md, PROGRESS.md

### R103. Orb Work 取消公转（2026-05-09）
- Work：删除字母 orbit 包裹层和公转 keyframes，四个字母不再绕内核旋转。
- 吸附：保留逐字从四角旋转吸入中心的倒计时动效，吸附目标回到中心点。
- 背景：保留 work 状态的内向波纹，继续表达中心吸附语义。
- 验证：`pnpm build` 通过。
- 文件：PetAvatar.tsx, index.css, ISSUES.md, PROGRESS.md

### R104. Orb Rest 展示防裁切（2026-05-09）
- Rest 展示：为 orb 模式新增 `ORB_REST_VISUAL_BLEED_RATIO`，休息放大时按外圈字母溢出范围预留窗口空间。
- 缩放：目标 scale 不再只按 orb 本体计算，而是按“本体 + 外圈视觉溢出”一起限制在屏幕 80% 内。
- 布局：rest 展示时 pet 顶部位置额外下移 bleed 空间，避免两侧和上下外圈字母被窗口边界裁掉。
- 验证：`pnpm build` 通过。
- 文件：App.tsx, ISSUES.md, PROGRESS.md

### R105. Orb Hover 完全不透明（2026-05-09）
- Hover：为 `.orb-avatar.is-hovering` 增加 `opacity: 1`，鼠标悬停时三种状态都完全不透明。
- 保留：非 hover 状态仍使用设置里的 `petOpacity`，不改变用户的常态透明度偏好。
- 验证：`pnpm build` 通过。
- 文件：index.css, ISSUES.md, PROGRESS.md

### R106. Orb 状态色波纹（2026-05-09）
- Idle：在灰阶基础上混入小聊天框背景 token 的暖灰/玻璃色，让待机态和聊天窗口气质一致。
- Work：波纹和核心渐变混入低透明浅蓝色，保持克制但增强专注态辨识度。
- Rest：波纹和核心渐变混入低透明浅粉色，休息态更柔和。
- 约束：状态色只叠在核心渐变和波纹层上，保留整体黑白灰基调。
- 验证：`pnpm build` 通过。
- 文件：index.css, ISSUES.md, PROGRESS.md

### R107. Orb 透明度绑定与天空蓝 Work（2026-05-09）
- 透明度：为 `.orb-avatar:not(.is-hovering)` 显式绑定 `--orb-opacity`，确保设置里的透明度参数控制 orb 常态透明度。
- Hover：保留上一轮 hover 时 `opacity: 1` 的交互规则。
- Work：将偏灰的浅蓝调为更清新明亮的浅天空蓝，并提高少量波纹亮度。
- 验证：`pnpm build` 通过。
- 文件：index.css, ISSUES.md, PROGRESS.md

### R108. Orb Hover 实心填充与亮色增强（2026-05-09）
- Hover：补充 `--orb-hover-fill` 并在 hover 时给 shell 加不透底的柔色填充，解决只改根 opacity 但材质仍半透明的问题。
- Work：天空蓝进一步提亮，改为更清澈的蓝青色核心和波纹。
- Rest：浅粉进一步提亮，休息态更轻盈明亮。
- 验证：`pnpm build` 通过。
- 文件：index.css, ISSUES.md, PROGRESS.md

### R109. Orb Work/Rest 奶白底与文字加深（2026-05-09）
- 底色：新增 orb base 色变量，idle 保持原灰阶/聊天框混色，work/rest 的背景底色改为奶白渐变。
- 配色：work/rest 的蓝色和粉色不再与原灰底混合，叠在奶白底上更干净。
- 文字：外圈字母、work 字母和 hover 中央文字整体加深，提高可读性。
- 验证：`pnpm build` 通过。
- 文件：index.css, ISSUES.md, PROGRESS.md

### R110. Orb Idle/Work Hover 保持半透明（2026-05-09）
- Hover：删除全局 `.orb-avatar.is-hovering` 的 `opacity: 1` 覆盖，idle/work 悬停时继续遵守设置透明度。
- 填充：不透底的 hover shell 填充从全状态收窄为只对 rest 生效。
- 保留：hover 放大、边界和中央文字交互仍对所有状态有效。
- 验证：`pnpm build` 通过。
- 文件：index.css, ISSUES.md, PROGRESS.md

### R111. Orb Work Vite 蓝配色（2026-05-09）
- Work：将状态核心、边缘和波纹色统一调整为接近用户参考图中的 Vite 亮蓝。
- 保留：work/rest 的奶白底逻辑不变，work hover 仍保持半透明。
- 验证：`pnpm build` 通过。
- 文件：index.css, ISSUES.md, PROGRESS.md

### R112. 休息提示与倒计时布局修复（2026-05-09）
- 提示框：休息/专注结束提示框根据当前 pet 窗口边界 clamp 水平位置，避免靠左时显示不全；箭头仍对准 pet 中心。
- 倒计时：休息状态下方倒计时从圆角块改为纯文本，并把字号放大到 48px。
- 提前结束：按钮放大约 3 倍，提升休息展示时的可点击性。
- 范围：pet 和 orb 模式共用 PetWindow 逻辑，因此两种模式同时生效。
- 验证：`pnpm build` 通过。
- 文件：App.tsx, ISSUES.md, PROGRESS.md

### R113. 休息倒计时尺寸与 Pop-in 动效（2026-05-09）
- 尺寸：休息倒计时从 48px 缩小到 24px，提前结束按钮从 33px 缩小到 17px 左右。
- 动效：新增 `AnimatedCountdown`，每秒倒计时变化时逐字符重新触发 Transitions.dev Number pop-in。
- CSS：加入 `t-digit-pop-in` keyframes、stagger 变量和 reduced-motion 兜底。
- 验证：`pnpm build` 通过。
- 文件：App.tsx, index.css, ISSUES.md, PROGRESS.md

### R114. 休息倒计时数字动效微调（2026-05-09）
- 动效：`AnimatedCountdown` 只给数字字符应用 pop-in，单位 `s` 等非数字字符保持静态。
- 尺寸：倒计时字号降为 18px，提前结束按钮字号降为 14px。
- 颜色：倒计时文本改为统一深灰 `#4d4a45`，避免接近纯黑。
- 验证：`pnpm build` 通过。
- 文件：App.tsx, index.css, ISSUES.md, PROGRESS.md

### R115. 删除休息倒计时 Pop-in 动效（2026-05-09）
- 动效：移除 `AnimatedCountdown` 逐字符 pop-in，休息倒计时恢复为稳定纯文本。
- CSS：删除 `t-digit-pop-in`、`.t-digit-group`、`.t-digit` 等专用动画样式。
- 保留：倒计时 18px、深灰色和提前结束按钮 14px 的视觉尺寸。
- 验证：`pnpm build` 通过。
- 文件：App.tsx, index.css, ISSUES.md, PROGRESS.md

### R116. Pet/Orb 设置文案与 Prompt 分流（2026-05-09）
- 外观：将灵宠透明度/大小文案扩展为灵宠/悬浮球，适配 pet 与 orb 两种形象模式。
- Orb 禁用项：orb 模式下灵宠动作、形象自定义整体灰化并禁用交互。
- AI 对话：orb 模式下宠物名字不可编辑，System Prompt 自动展示并使用 orb 专用 AI 助手 prompt。
- 开关：全局 Switch 选中态改为 Vite 蓝 `#2f8fff`。
- 验证：`pnpm build` 通过。
- 文件：SettingsPanel.tsx, systemPrompt.ts, switch.tsx, ISSUES.md, PROGRESS.md

### R117. Orb 设置收起态与独立 Prompt 编辑（2026-05-09）
- 外观：orb 模式下灵宠动作、形象自定义不再整块灰化，改为收起态卡片且不可展开。
- AI 对话：orb 模式下 System Prompt 改为可编辑，保存到独立 `orbSystemPrompt` 设置，不覆盖灵宠模式 prompt。
- 运行时：`getActiveSystemPrompt()` 在 orb 模式下读取用户保存的 orb prompt，没有保存时回退到默认 orb prompt。
- 验证：`pnpm build` 通过。
- 文件：SettingsPanel.tsx, systemPrompt.ts, ISSUES.md, PROGRESS.md

### R118. 外观模式与身份设置重组（2026-05-09）
- 外观：将 Pet/Orb 形象模式移动到外观页最上方，并独立成单独设置组。
- AI 对话：将宠物名字与 System Prompt 合并到同一个身份设置组。
- Orb：orb 模式下宠物名字改为收起态不可展开，System Prompt 保持可编辑。
- 验证：`pnpm build` 通过。
- 文件：SettingsPanel.tsx, ISSUES.md, PROGRESS.md

### R119. 专注结束忽略休息后继续下一轮（2026-05-09）
- 状态机：专注结束弹出的 `focus-complete` 休息提示，点击忽略后直接调用 `startFocus()`。
- 保留：普通休息提醒忽略仍回到 idle；分心提示忽略仍回到当前 work。
- 验证：`pnpm build` 通过。
- 文件：App.tsx, ISSUES.md, PROGRESS.md

### R120. 重新读取默认 Pet 素材（2026-05-09）
- 素材：纳入 `public/assets` 中更新后的默认形象资源，包含更新的 idle blink 和新增 rest GIF。
- 渲染：休息状态默认 GIF 池改为 `rest.GIF`、`idle_raw_1.GIF`、`drinking_raw.GIF`。
- 兼容：normalize 阶段清理旧的 `playing_clean_3.GIF` 引用，并自动补齐当前休息 GIF 池。
- 验证：`pnpm build` 通过。
- 文件：animations.ts, public/assets, ISSUES.md, PROGRESS.md

### R121. GIF 形象不叠加动作（2026-05-09）
- Pet 模式：动作样式只在静态图片 `img` 渲染路径上生成。
- GIF/视频：当前状态使用 GIF 动图或 video 时，不再叠加跳动、摇摆、呼吸等额外动作。
- 验证：`pnpm build` 通过。
- 文件：PetAvatar.tsx, ISSUES.md, PROGRESS.md

### R122. Pet Rest 保持原尺寸绕屏展示（2026-05-09）
- Pet 模式：休息状态不再把低分辨率图片/GIF 放大到屏幕中央，改为保持当前尺寸并绕屏幕工作区转一圈。
- Orb 模式：保留原来的放大到屏幕中央展示。
- 倒计时：Pet rest 时倒计时和提前结束按钮固定在屏幕底部居中，不跟随 pet 绕圈移动。
- 素材：同步当前 rest GIF 池，移除已删除的 `rest.GIF`，加入 `IMG_3448.GIF`、`IMG_3449.GIF`。
- 验证：`pnpm build` 通过。
- 文件：App.tsx, animations.ts, public/assets/rest/gif, ISSUES.md, PROGRESS.md

### R123. 全量纳入 public/assets 新素材（2026-05-09）
- 素材：重新扫描并纳入 `public/assets` 下新增/更新的运行素材，排除 `.DS_Store`。
- Rest：默认休息 GIF 池切换到当前目录里的 `IMG_3452.GIF` - `IMG_3458.GIF`，并保留 `idle_raw_1.GIF`、`drinking_raw.GIF`。
- 兼容：normalize 阶段清理已删除的 `IMG_3448.GIF`、`IMG_3449.GIF`、`rest.GIF`、`playing_clean_3.GIF` 引用。
- 验证：`pnpm build` 通过。
- 文件：animations.ts, public/assets, ISSUES.md, PROGRESS.md

### R124. 增加休息时长设置（2026-05-09）
- 设置：提醒事项页新增“休息时长”，默认 60s，支持 10-300s 调节。
- 状态机：进入 rest 时根据 `restDurationSeconds` 计算结束时间。
- 动效：Pet 模式绕屏一周的进度与休息时长同步，Orb 模式倒计时也使用同一设置。
- 验证：`pnpm build` 通过。
- 文件：App.tsx, SettingsPanel.tsx, settingsStore.ts, ISSUES.md, PROGRESS.md

### R125. Pet Rest 整组快速绕屏（2026-05-09）
- Pet 模式：rest 时图片、倒计时和提前结束按钮重新作为一个整体一起移动。
- 动效：绕屏速度改为固定 8 秒一圈，可在休息时长内连续转多圈。
- 布局：绕圈半径按整组高度计算，避免按钮贴近屏幕边缘。
- 验证：`pnpm build` 通过。
- 文件：App.tsx, ISSUES.md, PROGRESS.md

### R126. 休息时长范围改为 1-120 分钟（2026-05-09）
- 设置：休息时长滑块改为 1-120min，步进 1min。
- 存储：继续使用 `restDurationSeconds` 秒值，范围 clamp 为 60-7200 秒。
- 状态机：进入 rest 时最短按 60 秒计算，避免旧 10 秒配置继续生效。
- 验证：`pnpm build` 通过。
- 文件：App.tsx, SettingsPanel.tsx, settingsStore.ts, ISSUES.md, PROGRESS.md

### R127. Pet Rest 控制区固定顶部（2026-05-09）
- Pet 模式：rest 时倒计时和提前结束按钮从绕圈组中拆出，固定到屏幕顶部中央。
- 样式：控制区使用完全不透明背景色块，提升按钮可点击性和可读性。
- 动效：pet 图片继续快速绕屏，运动半径只按图片尺寸计算。
- 验证：`pnpm build` 通过。
- 文件：App.tsx, ISSUES.md, PROGRESS.md

### R128. Coding 模式接入 Codex（2026-05-09）
- 设置：AI 对话页新增 Coding 模式开关，默认关闭。
- 主进程：新增 Codex CLI 桥接，使用本机 Codex 执行用户输入，并通过 `coding:state` 推送状态和输出。
- 小聊天框：Coding 模式下切换为 Codex 输出面板，支持查看输出、清空记录、继续输入内容发送给 Codex。
- Pet 窗口：Coding 模式下右侧 chat 按钮始终显示，并按 mac 窗口按钮颜色显示状态：红色需要输入/授权，黄色正在工作，绿色完成。
- 验证：`git diff --check`、`pnpm build` 通过；构建仅保留既有 chunk 体积提示。
- 文件：App.tsx, main.cjs, SettingsPanel.tsx, settingsStore.ts, ISSUES.md, PROGRESS.md

### R129. Coding 模式入口补充（2026-05-09）
- 设置：将 Coding 模式从“模型参数”移动到 AI 对话页顶部，独立成更醒目的设置组。
- 右键菜单：灵宠右键菜单新增 Coding 模式开关，开启后显示“退出 Coding”，关闭时显示“Coding 模式”。
- 布局：同步右键菜单高度估算，避免新增菜单项后靠近屏幕边缘时定位不准。
- 验证：`git diff --check`、`pnpm build` 通过；构建仅保留既有 chunk 体积提示。
- 文件：App.tsx, PetAvatar.tsx, SettingsPanel.tsx, ISSUES.md, PROGRESS.md

### R130. Coding 连接错误提示修正（2026-05-09）
- 小聊天框：`coding_get_state` 失败时不再笼统显示“无法连接 Codex”，改为展示具体原因。
- 兼容：如果错误是 `Unknown command: coding_*`，明确提示需要重启应用或重新运行 `pnpm electron:dev`，因为 Electron 主进程新增 IPC 不会被前端热更新加载。
- 发送：向 Codex 发送消息失败时复用同一套错误解释，避免用户误判是 Codex 输出错误。
- 验证：`git diff --check`、`pnpm build` 通过；构建仅保留既有 chunk 体积提示。
- 文件：App.tsx, ISSUES.md, PROGRESS.md

### R131. Codex Exec 参数兼容修复（2026-05-09）
- 主进程：移除 `codex exec` 已不支持的 `--ask-for-approval on-request` 参数。
- 兼容：保留 `--json`、`--color never`、`--sandbox workspace-write`、`--cd` 和 prompt，匹配当前本机 Codex CLI help。
- 验证：`git diff --check`、`pnpm build` 通过；构建仅保留既有 chunk 体积提示。
- 文件：main.cjs, ISSUES.md, PROGRESS.md

### R132. Coding 工作状态与 stdin 修复（2026-05-09）
- 主进程：启动 Codex 前先把状态置为 working，再广播用户消息，避免发送瞬间仍显示绿色完成态。
- Codex CLI：spawn 时将 stdin 设为 ignore，避免 `codex exec` 读取额外 stdin 并卡在 `Reading additional input from stdin...`。
- 状态灯：stderr 中的普通 `input` 文案不再被误判为需要用户处理，只有 approval/permission/authorize/confirm/login 这类信号才切红。
- 验证：`git diff --check`、`pnpm build` 通过；构建仅保留既有 chunk 体积提示。
- 文件：main.cjs, ISSUES.md, PROGRESS.md

### R133. Coding 回复可见性与最终消息兜底（2026-05-09）
- 主进程：发送给 Codex 后立即向小聊天框推送“Codex 正在工作”的系统消息，避免长连接/重试期间看起来没有反馈。
- JSONL：单独识别 `turn.started`、`error` 重连事件和 `item.completed` 的 `agent_message`，把重连显示为状态，把最终回答显示为 Codex 回复。
- 兜底：为 `codex exec` 增加 `--output-last-message` 临时文件，进程结束时读取最终回复，避免 JSONL 解析遗漏导致小聊天框无回复。
- 清理：最终消息读取后删除临时输出文件。
- 验证：`git diff --check`、`pnpm build` 通过；构建仅保留既有 chunk 体积提示。
- 文件：main.cjs, ISSUES.md, PROGRESS.md

### R134. Coding 连接当前 Codex Thread（2026-05-09）
- 主进程：Coding 模式优先读取 `DESKSPRITE_CODEX_THREAD_ID` 或 `CODEX_THREAD_ID`，将小聊天框输入发送到当前 Codex thread。
- Codex CLI：从每次 `codex exec` 新建任务改为 `codex exec resume <threadId> --json --output-last-message -`，prompt 通过 stdin 写入。
- 语义：没有检测到当前 thread 时不再悄悄新开任务，而是明确红色提示需要从 Codex 环境启动应用或设置 thread id。
- UI：小聊天框空状态改为显示是否已连接当前 Codex 对话。
- 验证：`git diff --check`、`pnpm build` 通过；未向真实当前 Codex thread 发送测试消息，避免污染当前对话。
- 文件：main.cjs, App.tsx, ISSUES.md, PROGRESS.md

### R135. Coding 自动启动灵宠 Codex 会话（2026-05-09）
- 主进程：没有 `DESKSPRITE_CODEX_THREAD_ID` / `CODEX_THREAD_ID` 时，不再报错，而是自动使用 `codex exec ... -` 启动新的 Codex thread。
- 会话：监听 `thread.started` 并保存 thread id，后续消息自动走 `codex exec resume <threadId>`，实现灵宠自己的持续 Codex 对话。
- UI：空状态改为提示“输入第一条消息后会自动启动新的 Codex 对话”。
- 语义：如果 Electron 从 Codex 环境启动，可连接当前 Codex thread；如果从普通终端启动，则自动唤起并维护独立 Codex 会话。
- 验证：`git diff --check`、`pnpm build` 通过；构建仅保留既有 chunk 体积提示。
- 文件：main.cjs, App.tsx, ISSUES.md, PROGRESS.md

### R136. Coding 事件解析对齐 cc-connect（2026-05-09）
- 主进程：按 `cc-connect` 的 Codex session 模型调整 JSONL 处理，`agent_message` 先缓存，等 `turn.completed` 再作为最终回复输出。
- 降噪：`Reconnecting...` / `Falling back...` 不再刷进小聊天框，避免网络重试时消息噪声过大。
- 工具事件：遇到 command/function/tool item 时，先把暂存 agent 文本作为过程信息吐出，再显示简短工具状态。
- 兼容：支持 `item.text`、`item.content`、`output_text`、`summary` 等多种 Codex JSONL 文本字段。
- 验证：`git diff --check`、`pnpm build` 通过；构建仅保留既有 chunk 体积提示。
- 文件：main.cjs, ISSUES.md, PROGRESS.md

### R137. Coding 常驻 Codex app-server 后端（2026-05-09）
- 主进程：将 Coding 模式从每条消息启动 `codex exec` 改为启动一次 `codex app-server --listen stdio://`，后续通过 JSON-RPC 复用同一常驻连接。
- 会话：新增 `thread/start`、`thread/resume`、`turn/start` 流程，继续支持外部传入 thread id，也支持普通终端启动时自动创建灵宠自己的 Codex thread。
- 事件：解析 app-server 的 `item/agentMessage/delta`、`item/completed`、`turn/completed`、`thread/status/changed`，让状态灯在工作中保持黄色，完成后切绿色。
- 授权：遇到 app-server 主动发起的权限/审批 request 时切红，并在小聊天框提示当前请求类型。
- 验证：`node --check electron/main.cjs`、`git diff --check`、`pnpm build` 通过；构建仅保留既有 chunk 体积提示。
- 文件：main.cjs, ISSUES.md, PROGRESS.md

### R138. Coding 错误状态灯修复（2026-05-10）
- 主进程：app-server 发出 `error` / `guardianWarning` notification 时，立即清空 running 并将 Coding 状态切到 `needs-input`，让 chat button 变红。
- 状态机：`thread/status/changed(active)` 只在仍有运行中 turn 且未处于错误态时才允许切回 working，避免错误后被覆盖成黄色。
- 完成态：turn 完成时会检查当前 turn 是否曾收到 error，收到过则保持红色而不是误判为完成。
- 验证：`node --check electron/main.cjs`、`git diff --check`、`pnpm build` 通过；构建仅保留既有 chunk 体积提示。
- 文件：main.cjs, ISSUES.md, PROGRESS.md

### R139. Coding 错误详情完整展示（2026-05-10）
- 主进程：Codex app-server 的 error/warning notification 不再只显示 `error`，会展开 `message`、`error`、`detail`、`reason`、`cause`、`code` 等字段。
- 过程信息：`Reconnecting...`、`Falling back...`、`retrying sampling request...` 这类瞬时连接状态会作为 system 消息显示，而不是被过滤掉。
- 状态灯：瞬时 reconnect/retry 保持黄色工作态；真正 error/guardianWarning 才切红。
- stderr：从 app-server stderr 中筛出 reconnect、retry、error、permission 等关键行展示到小聊天框，方便定位慢或失败的真实原因。
- 验证：`node --check electron/main.cjs`、`git diff --check`、`pnpm build` 通过；构建仅保留既有 chunk 体积提示。
- 文件：main.cjs, ISSUES.md, PROGRESS.md

### R140. Coding 默认代理注入（2026-05-10）
- 主进程：新增 Codex 子进程环境构造，启动 app-server 时自动携带代理环境变量。
- 代理：优先尊重用户已有 `https_proxy` / `http_proxy` / `all_proxy` / 大写变量；未设置时默认使用 `http://127.0.0.1:6478` 和 `socks5://127.0.0.1:6478`。
- 目的：减少 Codex app-server 采样流因网络链路断开而反复 `Reconnecting...` 的情况。
- 验证：`node --check electron/main.cjs`、`git diff --check`、`pnpm build` 通过；构建仅保留既有 chunk 体积提示。
- 文件：main.cjs, ISSUES.md, PROGRESS.md

### R141. Coding 对话体验统一（2026-05-10）
- 历史：Coding 模式下和 Codex 的消息会写入现有历史对话存储，使用独立的 `Codex:` 会话标题并去重保存消息 id。
- 小窗：Coding 小对话框改用普通聊天的消息气泡和输入栏组件，去掉单独的 header/list 样式，使 UI 与普通 compact chat 保持一致。
- 大窗：Coding 模式下点击小窗放大按钮会打开大聊天窗口，并渲染同一套 Codex 对话视图。
- 交互：清空 Coding 对话时同步清理本地 Coding 历史会话绑定，下一轮重新创建历史会话。
- 验证：`pnpm exec tsc -b --pretty false`、`git diff --check`、`pnpm build` 通过；构建仅保留既有 chunk 体积提示。
- 文件：App.tsx, ChatDialog.tsx, ISSUES.md, PROGRESS.md

### R142. Coding 大窗口布局对齐普通聊天（2026-05-10）
- 大窗：Coding standalone 不再使用单栏专用面板，改为普通大聊天窗口同款左侧历史栏 + 右侧 quiet-card 会话区。
- 会话：左侧“新建对话”用于清空当前 Codex 会话并创建下一轮新历史会话，符合“作为一个新的会话”的语义。
- 历史：点击左侧历史记录可以在 Coding 大窗口内加载历史消息查看。
- 视觉：右侧消息区、面板边框、输入栏间距和普通大聊天窗口保持一致，只把模型控制位置替换为 Codex 状态标识。
- 验证：`pnpm exec tsc -b --pretty false`、`git diff --check`、`pnpm build` 通过；构建仅保留既有 chunk 体积提示。
- 文件：App.tsx, PROGRESS.md, ISSUES.md

### R143. Coding 继承当前 Codex Session（2026-05-10）
- 设置：新增 `codingSessionMode`，支持 `new` 和 `inherit` 两种 Coding session 模式。
- 右键菜单：Coding 模式改为二级菜单，可选择“继承当前 session”或“开启新 session”；已开启时仍可退出 Coding。
- 主进程：新增 `coding_get_inherited_state`，扫描最近 24 小时 `~/.codex/sessions` JSONL，聚合多个 Codex session 的红黄绿状态。
- 继承模式：红/绿状态显示带 session 前缀的最新 Codex 消息；所有 session 都没有红/绿输出时显示黄色工作中。
- 小窗：继承模式不显示输入框含义，只提示回到 Codex 中处理或继续输入。
- 验证：`pnpm exec tsc -b --pretty false`、`node --check electron/main.cjs`、`git diff --check`、`pnpm build` 通过；构建仅保留既有 chunk 体积提示。
- 文件：main.cjs, App.tsx, PetAvatar.tsx, settingsStore.ts, ISSUES.md, PROGRESS.md

### R144. 继承模式小窗 UI 对齐（2026-05-10）
- 小窗：继承模式继续使用普通 compact chat 的容器、消息区和 `MessageBubble` 气泡样式。
- 输入：继承模式下完全隐藏输入栏，避免 disabled composer 破坏普通聊天窗口视觉。
- 提示：保留底部红色小字，提醒用户回到 Codex 中处理或继续输入。
- 验证：`pnpm exec tsc -b --pretty false`、`git diff --check`、`pnpm build` 通过；构建仅保留既有 chunk 体积提示。
- 文件：App.tsx, ISSUES.md, PROGRESS.md

### R145. 继承 Session 通知与会话列表修复（2026-05-10）
- 主进程：继承模式扫描 Codex JSONL 时拆出 session 标题、状态、最新通知和 `ackKey`，并支持 `coding_ack_inherited_sessions` 确认已读。
- 清空：小窗和大窗的“清空”在继承模式下不再清真实 Codex session，而是确认当前红/绿通知，避免同一条消息反复弹回。
- 小窗：继承模式默认只展示最新一个未读/已完成 session 的回复；所有 session 都没有红绿通知时保持黄色工作中提示。
- 大窗：继承模式下把不同 Codex session 渲染成左侧不同会话项，右侧继续使用普通 chat 的 quiet-card、气泡和只读提示样式。
- 状态：聚合规则改为红色优先、绿色其次、无可通知输出时黄色，更贴近“Codex 离开后完成再通知”的使用场景。
- 验证：`pnpm exec tsc -b --pretty false`、`node --check electron/main.cjs`、`git diff --check`、`pnpm build` 通过；构建仅保留既有 chunk 体积提示。
- 文件：main.cjs, App.tsx, ISSUES.md, PROGRESS.md

### R146. 普通 Chat 与 Coding Chat 分离（2026-05-10）
- 打开路径：Coding 模式下点击 chat button 只打开 Coding 小窗，不再写入普通 compact chat 的会话 key。
- 退出：从右键菜单退出 Coding 时会先隐藏当前 Coding 小窗，下一次点击 chat button 重新按普通聊天逻辑打开。
- 普通会话：普通 chat 的“最近对话”和右键历史菜单过滤 `Codex` Coding 历史，避免退出 Coding 后误打开上一条 Codex 会话。
- 目标：普通 chat 保持用户上一次普通对话；Coding chat 使用自己的历史与状态，两套上下文互不污染。
- 验证：`pnpm exec tsc -b --pretty false`、`git diff --check`、`pnpm build` 通过；构建仅保留既有 chunk 体积提示。
- 文件：App.tsx, PetAvatar.tsx, ISSUES.md, PROGRESS.md

### R147. 继承 Codex 过程输出保持工作态（2026-05-10）
- 主进程：继承 session 的 JSONL 解析新增 final 输出判断，只把 `phase=final_answer`、`task_complete`、`last_agent_message` 等完整输出认作完成。
- 过程态：`agent_message` / assistant message 若只是 commentary 或没有 final phase，会更新为工作中活动时间，不再短暂切成绿色。
- 体验：Codex 规划、说明、执行工具期间 chat button 保持黄色；只有完整回复出现后才变绿色。
- 验证：`node --check electron/main.cjs`、`pnpm exec tsc -b --pretty false`、`git diff --check`、`pnpm build` 通过；构建仅保留既有 chunk 体积提示。
- 文件：main.cjs, ISSUES.md, PROGRESS.md

### R148. 继承通知清空后进入灰色空闲态（2026-05-10）
- 状态：Coding 状态新增 `idle`，用于表达继承模式下没有未读红/绿通知、也没有近期活跃 Codex 工作。
- 主进程：继承扫描只把 90 秒内仍有活动的 working session 聚合为黄色；清空绿色通知后若无新活动则返回灰色 idle。
- UI：chat button 和状态点支持 macOS 风格灰色，并把空状态文案改为“没有新的 Codex 通知”。
- 验证：`node --check electron/main.cjs`、`pnpm exec tsc -b --pretty false`、`git diff --check`、`pnpm build` 通过；构建仅保留既有 chunk 体积提示。
- 文件：main.cjs, App.tsx, ISSUES.md, PROGRESS.md

### R149. 继承 Coding 外壳一致性修复（2026-05-10）
- 拖动：宠物拖动时，Coding 继承小窗若处于可见状态，也走普通 compact chat 同一套重定位逻辑，避免小窗不跟随。
- 文案：继承模式大小聊天框底部红字统一改为“请回到 Codex 中回复或处理。”。
- 右键：Coding 已开启时菜单统一显示“退出 Coding 模式”，不再暴露“· 继承”后缀。
- 启动：pet 窗口等待设置加载完成后再渲染，避免 orb 模式启动时先闪出默认 pet。
- 验证：`pnpm exec tsc -b --pretty false`、`git diff --check`、`pnpm build` 通过；构建仅保留既有 chunk 体积提示。
- 文件：App.tsx, PetAvatar.tsx, ISSUES.md, PROGRESS.md

### R150. Coding 中间输出与小窗横向滚动修复（2026-05-10）
- 小窗：普通 chat / Coding chat 的消息容器和气泡补齐 `overflow-x-hidden`、`min-w-0` 和长词换行，避免底部出现无用横向滑动条。
- Markdown：代码块和 inline code 改为可换行，长 URL、长路径、长命令不会撑出小聊天窗口。
- 继承模式：非 final 的 `agent_message` / assistant message 仍保持黄色 working，但会作为工作态气泡显示在聊天框里。
- 完成态：完整 final 输出出现后，过程气泡被最终绿色消息替代，未查看的中间过程不会继续保留成绿色通知。
- 验证：`node --check electron/main.cjs`、`pnpm exec tsc -b --pretty false`、`git diff --check`、`pnpm build` 通过；构建仅保留既有 chunk 体积提示。
- 文件：main.cjs, App.tsx, ChatDialog.tsx, index.css, ISSUES.md, PROGRESS.md

### R151. 聊天纵向滚动不抢焦点（2026-05-10）
- 小窗：普通 chat 和 Coding chat 的消息区不再每次轮询/刷新都无条件滚到底部。
- 大窗：普通 standalone chat panel 也使用同一套贴底判断，避免用户向上查看历史时被新 render 拉回底部。
- 逻辑：新增 `stickToBottom` 标记，只有用户本来在底部附近时才自动跟随新消息；用户手动上滚后保持当前位置。
- 验证：`pnpm exec tsc -b --pretty false`、`git diff --check`、`pnpm build` 通过；构建仅保留既有 chunk 体积提示。
- 文件：App.tsx, ChatDialog.tsx, ISSUES.md, PROGRESS.md

### R152. Compact Chat 溢出与 Coding 过程气泡重修（2026-05-10）
- 主进程：`position_compact_chat_window` 只移动已有小窗，不再重设宽高，避免拖动后 compact UI 被压回默认高度。
- 横向滚动：普通/Coding 小窗根容器、滚动区、气泡、Markdown、表格和代码块继续收紧 `min-w-0` / `overflow-x-hidden` / 强制换行。
- Coding 继承：只把 `task_complete` / `last_agent_message` 当最终完成，`final_answer` 片段和普通 assistant message 不再触发绿色闪烁。
- 过程消息：继承 session 会保留最近 8 条中间 agent 输出，黄色状态下逐条显示为气泡；切到绿色时只保留最终输出。
- 验证：`node --check electron/main.cjs`、`pnpm exec tsc -b --pretty false`、`git diff --check`、`pnpm build` 通过；构建仅保留既有 chunk 体积提示。
- 文件：main.cjs, App.tsx, ChatDialog.tsx, index.css, ISSUES.md, PROGRESS.md

### R153. 继承 Coding 状态优先级修正（2026-05-10）
- 主进程：继承状态聚合改为红色需处理 > 黄色工作中 > 绿色完成 > 灰色空闲，避免旧完成通知压过当前 active working。
- 小窗：继承模式处于黄色时优先选择 working session 渲染，因此 `progressMessages` 会实际显示为一串过程气泡。
- 结果：agent 工作中即使已有旧的 green/done 输出，也不会把 chat button 或小窗内容抢成绿色。
- 验证：`node --check electron/main.cjs`、`pnpm exec tsc -b --pretty false`、`git diff --check`、`pnpm build` 通过；构建仅保留既有 chunk 体积提示。
- 文件：main.cjs, App.tsx, ISSUES.md, PROGRESS.md

### R154. Coding 过程气泡去重（2026-05-10）
- 主进程：继承 session 解析过程消息时按归一化文本去重，避免同一条中间输出同时来自 `event_msg` 和 `response_item` 时显示两遍。
- 行为：重复过程消息只更新时间，不新增气泡；不同过程消息仍按出现顺序保留最近 8 条。
- 验证：`node --check electron/main.cjs`、`pnpm exec tsc -b --pretty false`、`git diff --check`、`pnpm build` 通过；构建仅保留既有 chunk 体积提示。
- 文件：main.cjs, ISSUES.md, PROGRESS.md

### R155. Coding 窗口气泡与菜单宽度调整（2026-05-10）
- 清空：移除 Coding 小窗悬浮清空按钮、Coding 大窗右上清空按钮，以及继承模式左侧“清空通知”入口。
- 大窗：`MessageBubble` 支持强制气泡样式，Coding 大聊天窗口中的 agent 回复按小窗一样逐条显示为不透明气泡。
- 菜单：右键菜单宽度从 112px 增加到 136px，并禁止“退出 Coding 模式”换行。
- 验证：`pnpm exec tsc -b --pretty false`、`git diff --check`、`pnpm build` 通过；构建仅保留既有 chunk 体积提示；确认旧清空文案和 112px 菜单宽度无残留。
- 文件：App.tsx, PetAvatar.tsx, ChatDialog.tsx, ISSUES.md, PROGRESS.md

### R156. Coding 模式接入 Claude Code（2026-05-10）
- 设置：Coding 模式新增工具选择，可在 Codex 与 Claude Code 间切换；选择 Claude Code 时自动使用继承 session 模式。
- 右键菜单：Coding 模式入口会按当前工具显示继承 Claude Code / Codex session 的入口，退出文案保持统一。
- 主进程：新增 `~/.claude/projects/**/*.jsonl` 扫描器，解析 Claude Code 的 assistant / tool_use / AskUserQuestion / end_turn 记录，映射为红黄绿状态和过程气泡。
- 前端：小窗、大窗、状态提示、空态和错误信息复用同一套 Coding UI，并按工具名显示 Codex 或 Claude Code。
- 验证：`node --check electron/main.cjs`、`pnpm exec tsc -b --pretty false`、`git diff --check`、`pnpm build` 通过；构建仅保留既有 chunk 体积提示。
- 文件：main.cjs, App.tsx, PetAvatar.tsx, SettingsPanel.tsx, settingsStore.ts, ISSUES.md, PROGRESS.md

### R157. 右键菜单增加 Claude Code 入口（2026-05-10）
- 右键菜单：Coding 模式二级菜单改为 Codex / Claude Code 分组，Codex 保留“继承当前 session / 开启新 session”，Claude Code 增加“继承当前 session”。
- 状态切换：从右键菜单选择 Claude Code 时同步写入 `codingProvider: claude` 与 `codingSessionMode: inherit`，不再依赖设置页预先选择工具。
- 视觉：Coding 二级菜单略微加宽，避免 Claude Code 分组和入口显得拥挤。
- 验证：`node --check electron/main.cjs`、`pnpm exec tsc -b --pretty false`、`git diff --check`、`pnpm build` 通过；构建仅保留既有 chunk 体积提示。
- 文件：App.tsx, PetAvatar.tsx, ISSUES.md, PROGRESS.md

### R158. Claude Code 支持开启新 session（2026-05-10）
- 右键菜单：Claude Code 分组新增“开启新 session”，可直接从灵宠右键菜单启动 Claude Code 新会话。
- 前端：Claude Code 不再强制继承模式；`codingProvider=claude` 且 `codingSessionMode=new` 时使用新 session 状态源，并允许在 Coding chat 中输入。
- 状态刷新：Claude Code 新 session 使用 provider 专属轮询读取，避免被旧 Codex app-server 的 `coding:state` 事件串线覆盖。
- 主进程：新增 `coding_get_claude_state` 与 Claude Code `-p --output-format stream-json --verbose` 子进程链路，解析 stdout JSON 流并映射到现有红黄绿状态。
- 发送：`coding_send_message` 根据 provider 分发到 Codex app-server 或 Claude Code CLI；Claude Code 新 session 使用同一套代理环境变量。
- 验证：`node --check electron/main.cjs`、`pnpm exec tsc -b --pretty false`、`git diff --check`、`pnpm build` 通过；构建仅保留既有 chunk 体积提示。
- 文件：main.cjs, App.tsx, PetAvatar.tsx, SettingsPanel.tsx, ISSUES.md, PROGRESS.md

### R159. Claude Code Chat 布局与右键二级菜单修正（2026-05-10）
- Compact chat：Coding/Claude Code 消息区增加更硬的 `max-width`、`overflow-x-hidden` 与 `overflow-wrap:anywhere`，避免长路径、长命令、JSON 片段撑出横向滚动。
- 大聊天框：Coding standalone 消息区同步使用同一套强制换行约束，保持和普通 chat 的气泡布局一致。
- 右键菜单：修正菜单实际宽度常量，二级菜单宽度增至 190px；窗口预留高度提升到 312px，避免 Coding / Claude Code 二级菜单被裁切。
- 验证：`node --check electron/main.cjs`、`pnpm exec tsc -b --pretty false`、`git diff --check`、`pnpm build` 通过；构建仅保留既有 chunk 体积提示。
- 文件：App.tsx, PetAvatar.tsx, ChatDialog.tsx, ISSUES.md, PROGRESS.md

### R160. Claude Code 连续新会话与 Coding 大窗工具切换（2026-05-10）
- Claude Code：新 session 生成并复用同一个 `--session-id`，后续消息接着同一段 Claude Code 对话继续，不再每次当成独立会话。
- 状态文案：只在第一条 Claude Code 新 session 消息前显示启动提示，后续发送不再反复插入“正在启动新回合”系统气泡。
- Coding 大窗：顶部新增 Codex / Claude Code 切换按钮，可在同一个大聊天框里查看和使用两个工具的当前对话。
- 历史隔离：Coding 历史会话 key 与 saved message key 按 provider 分离，Codex 与 Claude Code 的新 session 记录互不串线。
- 验证：`node --check electron/main.cjs`、`pnpm exec tsc -b --pretty false`、`git diff --check`、`pnpm build` 通过；构建仅保留既有 chunk 体积提示。
- 文件：main.cjs, App.tsx, ISSUES.md, PROGRESS.md

### R161. Claude Code New Session 小窗实时布局对齐（2026-05-10）
- 状态事件：Codex / Claude Code 的 `coding:state` 广播增加 provider 标记，前端可安全订阅实时状态，只应用当前 provider 的消息。
- 高度：Claude Code new session 不再只依赖 2.5s 轮询刷新，小窗能在新气泡到达时立即重算高度；切换 provider / session mode 时重置 compact 高度缓存。
- 横向约束：Coding compact 根容器和 Composer 表单补齐 `max-w-full`、`min-w-0`、`overflow-hidden`，输入栏和气泡统一不能撑出横向滚动。
- 验证：`node --check electron/main.cjs`、`pnpm exec tsc -b --pretty false`、`git diff --check`、`pnpm build` 通过；构建仅保留既有 chunk 体积提示。
- 文件：main.cjs, App.tsx, ChatDialog.tsx, ISSUES.md, PROGRESS.md

### R162. Coding 大窗去除重复工具标题（2026-05-10）
- 大聊天框：右侧顶部已有当前工具名和 Codex / Claude Code 切换按钮，移除聊天卡片内部重复的工具标签栏。
- 布局：消息区直接从卡片顶部开始，避免同一屏出现两个 Codex / Claude Code 文案。
- 验证：`pnpm exec tsc -b --pretty false`、`git diff --check`、`pnpm build` 通过；构建仅保留既有 chunk 体积提示。
- 文件：App.tsx, ISSUES.md, PROGRESS.md

### R163. Claude Code 启动提示只显示一次（2026-05-10）
- 主进程：Claude Code new session 的“是否已启动”改为独立布尔状态，不再依赖 `messages.length` 判断。
- 行为：同一个 Claude Code new session 中，只有首次发送会插入“正在启动 Claude Code 新 session。”；后续发送继续复用同一个 `--session-id`，不再因消息数组刷新误判为新会话。
- 清空：只有显式新建/清空 Claude Code coding 会话时才重置启动状态和 session id。
- 验证：`node --check electron/main.cjs`、`pnpm exec tsc -b --pretty false`、`git diff --check`、`pnpm build` 通过；构建仅保留既有 chunk 体积提示。
- 文件：main.cjs, ISSUES.md, PROGRESS.md

### R164. 右键二级菜单容错与启动位置修正（2026-05-10）
- 右键菜单：历史对话与 Coding 模式二级菜单之间增加透明三角过渡区，鼠标从主选项移向二级菜单时不会因短暂离开 hover 区而收起。
- 启动位置：Electron 初始 pet 窗口高度从 220 调整到 300，并按 40px 安全边距计算右下初始坐标，首次显示时就贴合前端 collapsed 布局。
- 结果：减少刚启动时 pet/orb 先出现在右下越界位置、随后被布局逻辑拉回的视觉回弹。
- 验证：`node --check electron/main.cjs`、`pnpm exec tsc -b --pretty false`、`git diff --check`、`pnpm build` 通过；构建仅保留既有 chunk 体积提示。
- 文件：main.cjs, PetAvatar.tsx, ISSUES.md, PROGRESS.md

### R165. Claude Code New Session 续聊改用 Resume（2026-05-10）
- 主进程：Claude Code new session 首条消息仍用 `--session-id` 创建固定会话，后续消息改用 `--resume <sessionId>` 继续会话。
- 修复：避免第二条消息再次用 `--session-id` 抢占同一个 Claude Code session，触发 “Session ID ... is already in use”。
- 验证：`node --check electron/main.cjs`、`pnpm exec tsc -b --pretty false`、`git diff --check`、`pnpm build` 通过；构建仅保留既有 chunk 体积提示。
- 文件：main.cjs, ISSUES.md, PROGRESS.md

### R166. 右键菜单操作区分割线（2026-05-10）
- 右键菜单：在专注模式 / Coding 模式功能区与设置 / 隐藏 / 退出操作区之间增加分割线。
- 验证：`pnpm exec tsc -b --pretty false`、`git diff --check`、`pnpm build` 通过；构建仅保留既有 chunk 体积提示。
- 文件：PetAvatar.tsx, ISSUES.md, PROGRESS.md

### R167. Coding 大窗汇总 New 与继承会话（2026-05-10）
- 大聊天框：左侧栏在当前工具下同时显示当前 new session、继承 session 列表和 new session 历史，不再受全局 `codingSessionMode` 限制。
- 继承 session：主进程继承状态新增 `allSessions`，大窗可展示最近继承会话；小窗继续使用原 `sessions` 做红黄绿通知，不受影响。
- 交互：选择继承 session 时隐藏输入框并提示回到对应工具处理；选择历史或当前 new session 时恢复普通 Coding chat 样式。
- 历史：Codex / Claude Code 仍按 provider 分离显示，顶部 provider 切换后左侧列表同步切换。
- 验证：`node --check electron/main.cjs`、`pnpm exec tsc -b --pretty false`、`git diff --check`、`pnpm build` 通过；构建仅保留既有 chunk 体积提示。
- 文件：main.cjs, App.tsx, ISSUES.md, PROGRESS.md

### R168. 历史对话区分普通 Chat 与 Coding（2026-05-10）
- 设置页：历史对话默认过滤 Codex / Claude Code Coding 会话，只展示普通 chat 历史。
- 设置页入口：历史对话右上角新增低调的“Coding 历史”入口，点击后开启 Coding 模式并直接打开 Coding 大聊天窗口。
- Coding 大窗：移除左上角“新建对话”，在“新 session 历史”列表底部新增低调的“新建 session”入口。
- 验证：`pnpm exec tsc -b --pretty false`、`git diff --check`、`pnpm build` 通过；构建仅保留既有 chunk 体积提示。
- 文件：App.tsx, SettingsPanel.tsx, ISSUES.md, PROGRESS.md

### R169. 小聊天框边缘展开位置修正（2026-05-10）
- Compact chat：重写边缘展开几何选择，不再只在原始位置附近 clamp，而是同时计算下方、上方、左右和屏幕内居中候选位置。
- 边缘容错：当灵宠靠近屏幕边缘导致附近空间不足时，小聊天框会直接移动到完整可容纳的位置，避免横向 overflow 和内容被压窄。
- 高度策略：候选位置会按安全工作区、最小高度和期望高度打分，优先选择完整显示且高度损失最少的位置。
- 验证：`pnpm exec tsc -b --pretty false`、`git diff --check`、`pnpm build` 通过；构建仅保留既有 chunk 体积提示。
- 文件：App.tsx, ISSUES.md, PROGRESS.md

### R170. 自动记录焦点 Timeline（2026-05-10）
- 启动：Electron ready 阶段默认开启 macOS 登录项，让 DeskSprite 随系统启动。
- 采集：主进程新增 timeline active window 快照，读取前台 app、窗口标题、浏览器当前 URL，并附带 Music / Spotify / Terminal / iTerm2 等轻量后台标记。
- 记录：pet 主窗口每 3 秒采样一次，前台窗口稳定超过 8 秒后写入本地 timeline，并持续更新当前段的结束时间。
- 存储：本地 storage 增加 `timelineEntries`，按天保存 app、标题、URL、域名、分类和后台标记；老数据自动补齐新字段。
- 展示：个人档案新增横向 Timeline，可左右滑动，hover / 点击时间段查看详情，并展示后台标记和 Top3 软件统计卡片。
- 风格：Timeline 采用 Apple / Radix 风格的低对比浅灰、细边框、柔和色块和基础分类图标。
- 验证：`node --check electron/main.cjs`、`pnpm exec tsc -b --pretty false`、`git diff --check`、`pnpm build` 通过；构建仅保留既有 chunk 体积提示。
- 文件：main.cjs, App.tsx, db.ts, SettingsPanel.tsx, ISSUES.md, PROGRESS.md

### R171. Timeline 与开机自启迁入通用设置（2026-05-10）
- 设置结构：将快捷键、隐私与数据合并进新的“通用”左侧目录项，减少设置页分散入口。
- Timeline：新增“Timeline 记录”开关，默认开启；不开专注模式也会全程记录，关闭后 pet 主窗口停止采样。
- 开机自启：新增“开机自启”开关，默认开启，并通过 Electron `setLoginItemSettings` 实时同步 macOS 登录项状态。
- 兼容：旧主进程尚未重启时，如果前端调用不到 `read_timeline_active_window`，会停止本轮采样，避免持续刷 Unknown command。
- 验证：`node --check electron/main.cjs`、`pnpm exec tsc -b --pretty false`、`git diff --check`、`pnpm build` 通过；构建仅保留既有 chunk 体积提示。
- 文件：main.cjs, App.tsx, SettingsPanel.tsx, settingsStore.ts, ISSUES.md, PROGRESS.md

### R172. 个人档案昨日 Timeline Mock 预览（2026-05-10）
- 个人档案：默认打开昨天，便于直接查看 timeline 样式。
- Mock：如果昨天没有真实 timeline 记录，则展示一组只存在于设置 UI 状态中的示例数据，不写入本地数据库。
- 示例覆盖：浏览器、Coding、Chat、办公、娱乐和其他分类，并包含音乐、终端等并行后台标记。
- 标识：Timeline 标题旁增加“昨日示例”小标签，区分 mock 和真实记录。
- 验证：`pnpm exec tsc -b --pretty false`、`git diff --check`、`pnpm build` 通过；构建仅保留既有 chunk 体积提示。
- 文件：SettingsPanel.tsx, ISSUES.md, PROGRESS.md

### R173. Timeline UI 整体化重构（2026-05-10）
- 主 Timeline：从白底上的独立小圆角块改为一条连续大圆角时间带，按任务时间段直接分段填色。
- 图例：分类图标和颜色移到时间轴上方统一说明，主时间带内部不再放图标，避免短任务挤压变形。
- 后台标记：音乐、终端等并行后台进程改为时间轴下方的范围线标注，直接对齐主时间轴时间段。
- 详情：点击某段后，详情区按同一 app / 分类的连续活动组列出完整时间顺序，浏览器连续访问多个网站时可逐条查看。
- Hover：主时间带 hover 只展示软件名和该软件耗时 Top1 内容，不再展示时间段和时长。
- 统计：Top3 软件改成横向柱状图，新增全天各小时活跃度柱状图，合并成一个整体 Apple / Radix 风格统计面板。
- 验证：`pnpm exec tsc -b --pretty false`、`git diff --check`、`pnpm build` 通过；构建仅保留既有 chunk 体积提示。
- 文件：SettingsPanel.tsx, ISSUES.md, PROGRESS.md

### R174. Timeline 默认今日与打开滚动动效（2026-05-10）
- 个人档案：默认日期改回今天，避免真实采样写入今天后页面仍停留在昨天 mock。
- Timeline：每次打开 / 切换日期时，横向时间轴先从 0 点开始，再平滑滚动到当前时刻居中；历史日期则滚到当前选中活动附近。
- 顶部卡片：个人档案顶部新增第 4 张“Coding 模式时长”卡片，当前按 timeline 中 `coding` 分类累计展示。
- 验证：`pnpm exec tsc -b --pretty false`、`git diff --check`、`pnpm build` 通过；构建仅保留既有 chunk 体积提示。
- 文件：SettingsPanel.tsx, ISSUES.md, PROGRESS.md

### R175. Timeline 视觉与后台轨道细化（2026-05-10）
- 主 Timeline：分段色块改用更柔和的 Radix 色阶渐变和轻内描边，降低色块厚重感，整体更接近 Apple 风格。
- 滚动动效：时间轴自动滚动只在组件首次进入视口时触发一次，点击色块不再触发从 0 点重新滑动。
- 后台进程：并行后台从绝对定位小标签重做为清晰轨道，左侧显示进程、中央用时间范围胶囊对齐全天时间、右侧显示时间。
- Mock 边界：示例数据严格只使用 app 名、窗口标题、浏览器 URL；聊天 app 不再 mock 具体聊天内容，VSCode 只展示窗口标题里的文件/项目名。
- 验证：`pnpm exec tsc -b --pretty false`、`git diff --check`、`pnpm build` 通过；构建仅保留既有 chunk 体积提示。
- 文件：SettingsPanel.tsx, ISSUES.md, PROGRESS.md

### R176. 个人档案实时刷新链路修复（2026-05-10）
- Timeline：采样写入后广播 `profile:data-updated`，设置页收到当天更新后立即重新加载，不再只依赖 30 秒轮询。
- 兼容：如果主进程还没重启导致 `read_timeline_active_window` 不可用，采样会降级使用既有 `check_distraction` 前台窗口接口，至少记录 app 名和窗口标题。
- 专注统计：专注/分心写入后同步广播更新事件，个人档案可即时刷新；专注时长仍按专注结束结算。
- Coding 时长：新增 `codingMs` 日统计，Coding 模式开启期间每 15 秒增量落库，个人档案第 4 张卡片改为读取真实 Coding 模式时长。
- 验证：`pnpm exec tsc -b --pretty false`、`git diff --check`、`pnpm build` 通过；构建仅保留既有 chunk 体积提示。
- 文件：App.tsx, db.ts, SettingsPanel.tsx, ISSUES.md, PROGRESS.md

### R177. 个人档案布局与 Timeline 轻量化（2026-05-10）
- 设置窗口：左侧栏和主内容最大宽度收窄，减少打开设置时内容横向显示不全的概率。
- 最近 14 天：专注柱状图增加横向滚动容器，窄窗口下不再挤压柱体。
- Timeline：主时间段填充去掉渐变，改为纯色柔和色块。
- 并行后台：后台轨道视觉减轻，Music 只标注 `music`，Terminal 保留进程内容和时间范围。
- 验证：`pnpm exec tsc -b --pretty false`、`git diff --check`、`pnpm build` 通过；构建仅保留既有 chunk 体积提示。
- 文件：SettingsLayout.tsx, SettingsPanel.tsx, ISSUES.md, PROGRESS.md

### R178. 专注与 Coding 时长按分钟落库（2026-05-10）
- 专注时长：专注模式开启期间每 1 分钟增量写入一次个人档案，结束时补齐最后不足 1 分钟的尾段。
- 进度隔离：新增独立的专注统计起点 ref，周期落库不会影响专注倒计时和动画进度。
- Coding 时长：Coding 模式开启期间从每 15 秒落库调整为每 1 分钟落库，关闭时同样补齐尾段。
- 验证：`pnpm exec tsc -b --pretty false`、`git diff --check` 通过；完整构建见 R179。
- 文件：App.tsx, ISSUES.md, PROGRESS.md

### R179. 全屏游戏与屏幕共享可见性策略（2026-05-10）
- 全屏游戏：主进程新增前台上下文检测，识别游戏类全屏 app 时临时抑制 screen-saver 级置顶，避免灵宠穿透全屏游戏。
- 置顶守卫：新增 `topmostSuppressed` 状态，抑制期间 topmost guard 不再把 pet / compact chat 拉回最上层。
- 屏幕共享：通用设置新增“共享屏幕时隐藏灵宠”，默认开启；检测到共享屏幕时自动隐藏灵宠，结束后只恢复由系统自动隐藏的那一次。
- 设置：新增 `hidePetDuringScreenShare` 配置项，用户可手动关闭自动隐藏。
- 验证：`node --check electron/main.cjs`、`pnpm exec tsc -b --pretty false`、`git diff --check`、`pnpm build` 通过；构建仅保留既有 chunk 体积提示。
- 文件：main.cjs, App.tsx, settingsStore.ts, SettingsPanel.tsx, ISSUES.md, PROGRESS.md

### R180. 并行后台改为横向 Timeline 标注（2026-05-10）
- Timeline：并行后台不再用纵向列表展示，改为和主 timeline 共用同一时间轴的横向标注轨道。
- 视觉：后台轨道保持轻量低对比，使用细线和小胶囊表达后台进程持续时间。
- 内容：music 仍只显示 `music`，terminal 继续显示进程内容，并通过 title 保留时间范围。
- 验证：`pnpm exec tsc -b --pretty false`、`git diff --check`、`pnpm build` 通过；构建仅保留既有 chunk 体积提示。
- 文件：SettingsPanel.tsx, ISSUES.md, PROGRESS.md

### R181. 最近 14 天滑动与 Timeline 采样稳定性修复（2026-05-10）
- 最近 14 天：专注柱状图增加左右滑动按钮、scroll snap 和更宽的横向内容宽度，窄窗口下可明确左右浏览。
- Timeline 采样：只允许 pet 主窗口负责采样，避免设置/聊天窗口打开时参与写入导致记录源混乱。
- 稳定键：采样段不再依赖完整窗口标题；浏览器优先按 URL，其他 app 按应用名合并，避免 Codex/编辑器标题频繁变化导致每段不足 8 秒被丢弃。
- 权限：主进程新增 Accessibility 权限检查命令，timeline 采样首次运行时会触发 macOS 辅助功能授权提示，避免权限缺失时静默空白。
- 并行后台：改成固定两条横向轨道，第一行 music、第二行 terminal；没有数据的轨道自动隐藏，hover 到片段时才展示歌曲列表/终端命令详情。
- Mock：昨日示例调整为连续 3 小时 `pnpm electron:dev` 终端后台，以及 15 分钟、62 分钟两段 music 后台。
- 验证：`node --check electron/main.cjs`、`pnpm exec tsc -b --pretty false`、`git diff --check`、`pnpm build` 通过；构建仅保留既有 chunk 体积提示。
- 文件：main.cjs, App.tsx, SettingsPanel.tsx, ISSUES.md, PROGRESS.md

### R182. Timeline 时长阈值、聚合与分心软件统计（2026-05-10）
- 设置窗口：默认打开尺寸增大，减少内容横向显示不全。
- 最近 14 天：左右按钮改为按 14 天日期窗口翻动，可一直向前查看历史，并向后翻到今天为止。
- Timeline：冷启空态文案改为“暂无足够长的焦点窗口记录”；新增 1-20min 最小时长设置，默认 1min。
- 采样：新增候选窗口逻辑，短切屏不会落库，也不会打断当前 app 的完整时段。
- 展示：主 timeline 按连续同 app / 分类聚拢成完整色块，具体窗口标题、URL 作为详情列表展示。
- 后台：hover 只保留自定义白色气泡，点击后台片段可展开该时间段内的音乐/终端详情；mock 改为 3 小时终端和两段音乐、多首歌。
- 分心统计：专注模式记录分心 app、次数和估算时长，并在个人档案中列出。
- 验证：`node --check electron/main.cjs`、`pnpm exec tsc -b --pretty false`、`git diff --check`、`pnpm build` 通过；构建仅保留既有 chunk 体积提示。
- 文件：main.cjs, App.tsx, db.ts, settingsStore.ts, SettingsPanel.tsx, ISSUES.md, PROGRESS.md

### R183. Timeline 采集链路实时 Debug 日志（2026-05-10）
- Debug：主进程新增 `timeline_debug_log` 命令，统一将 timeline 采集状态打印到启动应用的 terminal。
- 采样日志：`read_timeline_active_window` 每次 osascript 成功/失败都会打印前台 app、窗口标题、URL 或错误。
- 状态日志：renderer 采样器会打印 accessibility 权限、sample key、active start、candidate start/hold/confirm/discard、persist skip/ok/null 和 stop。
- 排查目标：用于确认今天 timeline 为空到底是权限失败、采样为空、未达到最小时长、candidate 未确认，还是 upsert 未落库。
- 当前真实方案：每 3 秒采样；同 app/URL 维持 active；不同 app/URL 先进入 candidate；candidate 连续达到设置的最小时长才确认切换；短切屏被丢弃且不打断 active。
- 验证：`node --check electron/main.cjs`、`pnpm exec tsc -b --pretty false`、`git diff --check`、`pnpm build` 通过；构建仅保留既有 chunk 体积提示。
- 文件：main.cjs, App.tsx, ISSUES.md, PROGRESS.md

### R184. Timeline AppleScript 采样脚本修复（2026-05-10）
- 根因：前台窗口主采样脚本混入了浏览器、Music、Spotify 的应用字典语句，AppleScript 会在编译阶段解析所有分支，导致 `active tab of front window` / `player state` 报语法错误，整次采样失败。
- 修复：主采样脚本改为只使用 System Events 采 app/window/后台进程存在性；浏览器 URL 和音乐播放信息拆成独立小脚本，按实际 app 单独调用，失败不会影响前台窗口记录。
- 日志：保留 `browser-url:error`、`music:error`，但前台 app/window 采样可继续成功。
- 验证：主采样脚本已通过 `/usr/bin/osacompile` 编译；`node --check electron/main.cjs`、`pnpm exec tsc -b --pretty false`、`git diff --check`、`pnpm build` 通过；构建仅保留既有 chunk 体积提示。
- 文件：main.cjs, ISSUES.md, PROGRESS.md

### R185. Timeline 状态机单元测试（2026-05-10）
- 重构：将 timeline active/candidate/persist 状态机抽到 `src/lib/timelineRecorder.ts`，App 运行时和测试共用同一套逻辑。
- 测试入口：新增 `pnpm test:timeline`，使用 Node 内置 `node:test`，不新增测试依赖。
- 覆盖场景：Codex 长任务中短切 WeChat 不打断；新 app 达到最小时长后确认切换；浏览器 URL 路径作为稳定 key；后台音乐/终端 marker 随前台记录保存；错误/低于阈值不落库。
- 前端推送：测试 harness 模拟 persist 成功后推送 `profile:data-updated`，确保落库路径可触发前端刷新。
- 验证：`pnpm test:timeline`、`node --check electron/main.cjs`、`pnpm exec tsc -b --pretty false`、`git diff --check`、`pnpm build` 通过；构建仅保留既有 chunk 体积提示。
- 文件：App.tsx, timelineRecorder.ts, timelineRecorder.test.ts, package.json, tsconfig.app.json, ISSUES.md, PROGRESS.md

### R186. Timeline 脚本失败降级与错误日志增强（2026-05-10）
- 降级：完整 timeline AppleScript 失败时自动调用简单 `readActiveWindow()`，至少记录前台 app/window，不再因为 URL/后台增强采集失败导致整条 timeline 为空。
- 日志：`readTimelineActiveWindow` 和 `readActiveWindow` 现在优先打印 stderr，避免只看到 `Command failed: /usr/bin/osascript -e` 这种无效错误。
- 行为：如果降级成功，日志会出现 `timeline-script:fallback`，后续仍进入正常 `sample` / `active:start` / `persist:ok` 状态机。
- 验证：`node --check electron/main.cjs`、`pnpm exec tsc -b --pretty false`、`pnpm test:timeline`、`git diff --check`、`pnpm build` 通过；构建仅保留既有 chunk 体积提示。
- 文件：main.cjs, ISSUES.md, PROGRESS.md

### R187. Timeline 忽略自身窗口并稳定采样器生命周期（2026-05-10）
- 根因：启动时 Electron / DeskSprite 自己可能先成为 active，导致真实 Codex 窗口被放入 candidate；同时 App effect 依赖整个 `settings` 对象，设置同步时会 stop/start，重置采样状态。
- 修复：TimelineRecorder 过滤 DeskSprite / PawPal / Electron 自身窗口，不让它们进入 active/candidate。
- 生命周期：App 中新增 `settingsRef`，fallback 分心检测读取 ref，timeline effect 依赖收窄到 `timelineRecordingEnabled` 和 `timelineMinSegmentMinutes`，避免普通设置更新重启采样器。
- 测试：新增 “Electron foreground ignored” 单测，覆盖启动自身窗口不抢占 active 的场景。
- 验证：`pnpm test:timeline`、`node --check electron/main.cjs`、`pnpm exec tsc -b --pretty false`、`git diff --check`、`pnpm build` 通过；构建仅保留既有 chunk 体积提示。
- 文件：App.tsx, timelineRecorder.ts, timelineRecorder.test.ts, ISSUES.md, PROGRESS.md

### R188. Timeline 增强采集拆分与后台音乐修复（2026-05-10）
- 根因：前台 timeline 已通过简单 fallback 正常落库，但失败的增强 AppleScript 每次都会丢弃 URL 和后台 marker，因此后台音乐不会显示在 timeline 上。
- 修复：`readTimelineActiveWindow` 不再调用失败的大脚本，改为简单前台窗口、浏览器 URL、后台进程三条独立采集链路。
- 后台：新增独立后台进程扫描，Terminal / iTerm2 尽量读取窗口标题，Music / Spotify 读取正在播放曲目，NeteaseMusic 以 `music / playing` 轻量 marker 记录。
- 分类：将 `NeteaseMusic` 归入 entertainment，避免网易云前台使用时落入 other。
- 日志：采样成功统一打印 `timeline:sample ... background=N`，不再刷 `timeline-script:error`。
- 验证：`node --check electron/main.cjs`、`pnpm test:timeline`、`pnpm exec tsc -b --pretty false`、`git diff --check`、`pnpm build` 通过；构建仅保留既有 chunk 体积提示。
- 文件：main.cjs, db.ts, ISSUES.md, PROGRESS.md

### R189. Timeline 后台进程快照修复（2026-05-10）
- 根因：后台扫描用 `repeat with proc in every application process` 遍历 System Events 动态进程列表，进程列表变化时会出现 “invalid index”。
- 修复：改为一次性读取 `name of every application process` 快照，再用 linefeed join 成文本，避免遍历期间索引失效。
- 验证：`node --check electron/main.cjs`、`pnpm test:timeline`、`pnpm exec tsc -b --pretty false`、`git diff --check`、`pnpm build` 通过；构建仅保留既有 chunk 体积提示。
- 文件：main.cjs, ISSUES.md, PROGRESS.md

### R190. Timeline Debug 日志降噪（2026-05-10）
- 浏览器 URL：Edge / Chromium 刚切前台时短暂拿不到 active tab 不再打印 error，后续采样成功后仍会正常带 URL 落库。
- 主进程：去掉每 3 秒 `timeline:sample` 成功日志，只保留真正错误。
- Renderer：过滤高频 `sample`、`candidate:hold`、低于阈值的 `persist:skip`；`persist:ok` 只在首次落库和每 60 秒摘要打印一次。
- 保留日志：start、accessibility、active start、candidate start/confirm/discard、首个 persist ok、周期性 persist ok、真实错误。
- 验证：`node --check electron/main.cjs`、`pnpm test:timeline`、`pnpm exec tsc -b --pretty false`、`git diff --check`、`pnpm build` 通过；构建仅保留既有 chunk 体积提示。
- 文件：main.cjs, App.tsx, ISSUES.md, PROGRESS.md

### R191. 休眠暂停计时与 Timeline 视图修复（2026-05-10）
- 系统活动：主进程新增 `read_system_activity_state`，基于 Electron powerMonitor 判断 idle / locked / inactive。
- 计时暂停：屏幕熄灭、锁屏或休眠超过 1 分钟后，专注时长和 Coding 模式时长先 flush 当前片段再暂停；恢复后从恢复时刻继续累计。
- 专注倒计时：休眠/熄屏恢复后自动顺延专注结束时间，避免用户离开期间直接完成专注。
- Timeline：系统 inactive 时暂停前台 task 采样，后台 music / terminal marker 继续延展到暂停前的 entry。
- 视图：主 timeline 时间戳改为每 2 小时一个标签；主 task / 后台 tooltip 增加可展示空间；顶部分类图例移出横向滚动区；后台 music / terminal 标签改为 sticky 固定在左侧。
- 测试：新增 timeline 暂停前台但延展后台 marker 的单元测试。
- 验证：`node --check electron/main.cjs`、`pnpm test:timeline`、`pnpm exec tsc -b --pretty false`、`git diff --check`、`pnpm build` 通过；构建仅保留既有 chunk 体积提示。
- 文件：main.cjs, App.tsx, timelineRecorder.ts, timelineRecorder.test.ts, SettingsPanel.tsx, ISSUES.md, PROGRESS.md

### R192. 7 天专注图与 Timeline Hover 浮层（2026-05-10）
- 专注图：个人档案的“最近 14 天”改为“7 天专注”，默认显示最近 7 天。
- 日期窗口：左右按钮每次翻动 7 天；日历选择日期后，图表直接跳到以该日期为结束日的 7 天窗口。
- Timeline：移除为 hover 卡片预留的大块上下空白，主条带恢复紧凑排版。
- Hover：主 task 和后台进程的 hover 详情改为 fixed 浮层覆盖显示，不再依赖轨道内部空间，避免被滚动容器或圆角条带裁切。
- 验证：`node --check electron/main.cjs`、`pnpm test:timeline`、`pnpm exec tsc -b --pretty false`、`git diff --check`、`pnpm build` 通过；构建仅保留既有 chunk 体积提示。
- 文件：SettingsPanel.tsx, ISSUES.md, PROGRESS.md

### R193. 全天活跃度坐标轴对齐（2026-05-10）
- 修复：全天活跃度柱状图拆成 bar 层和 x 轴 label 层，所有 bar 从同一底线开始。
- 坐标：x 轴标签从 0/6/12/18 改为每 2 小时一个标签，并下移到柱图下方独立显示。
- 验证：`node --check electron/main.cjs`、`pnpm test:timeline`、`pnpm exec tsc -b --pretty false`、`git diff --check`、`pnpm build` 通过；构建仅保留既有 chunk 体积提示。
- 文件：SettingsPanel.tsx, ISSUES.md, PROGRESS.md

### R194. 个人档案统计区 Apple/Radix 化（2026-05-10）
- 统计：顶部四个统计卡片改为一个整体分组容器，使用低对比边框、浅灰底和分隔线，和 timeline 面板风格统一。
- 7 天图：专注图改为浅灰底、低对比边框、统一柱形与独立日期标签行，不再像单独网页图表。
- 摘要：平均每日专注、最高单日专注、平均分心次数合并为一个整体分组，取消漂浮小卡片感。
- 验证：`node --check electron/main.cjs`、`pnpm test:timeline`、`pnpm exec tsc -b --pretty false`、`git diff --check`、`pnpm build` 通过；构建仅保留既有 chunk 体积提示。
- 文件：SettingsPanel.tsx, ISSUES.md, PROGRESS.md

### R195. 分心软件排行卡片（2026-05-10）
- 分心统计：个人档案新增明确的“分心软件排行”卡片，按次数排序展示软件名、次数和累计分心时长。
- 视觉：排行卡片使用和 timeline 一致的 Apple/Radix 低对比容器、分隔线、灰色比例条和红色强调条。
- 空态：没有分心数据时仍显示卡片空态，避免页面布局跳变。
- 验证：`node --check electron/main.cjs`、`pnpm test:timeline`、`pnpm exec tsc -b --pretty false`、`git diff --check`、`pnpm build` 通过；构建仅保留既有 chunk 体积提示。
- 文件：SettingsPanel.tsx, ISSUES.md, PROGRESS.md

### R196. 个人档案顺序与 7 天专注横滑（2026-05-10）
- 顺序：个人档案中 Timeline 移到最上方，专注统计和分心统计整体放到下方。
- 7 天专注：移除左右翻页按钮，改为横向 overflow 时间带；默认滚到当前选中日期，用户可直接滑动查看历史日期。
- 统计窗口：选中某一天后，7 天专注摘要按“该日及前 6 天”计算。
- 视觉：7 天专注柱子的选中态从硬黑改为柔和 Radix 灰，降低视觉突兀感。
- 验证：`node --check electron/main.cjs`、`pnpm test:timeline`、`pnpm exec tsc -b --pretty false`、`git diff --check`、`pnpm build` 通过；构建仅保留既有 chunk 体积提示。
- 文件：SettingsPanel.tsx, ISSUES.md, PROGRESS.md

### R197. 7 天专注图轻量化与日期坐标（2026-05-10）
- 修复：7 天专注图去掉独立的第二排 label button，避免视觉上像 14 个 bar。
- 坐标：每个日期单元下方直接显示 `月/日` 和星期，横坐标有明确日期信息。
- 视觉：压缩图表高度、padding 和柱宽，改为单层轻量面板，减少臃肿感。
- 统计：平均每日专注、最高单日专注、平均分心次数统一按选中日及前 6 天窗口计算。
- 验证：`node --check electron/main.cjs`、`pnpm test:timeline`、`pnpm exec tsc -b --pretty false`、`git diff --check`、`pnpm build` 通过；构建仅保留既有 chunk 体积提示。
- 文件：SettingsPanel.tsx, ISSUES.md, PROGRESS.md

### R198. 14 天专注标题与今天右边界（2026-05-10）
- 标题：个人档案专注图标题从“7 天专注”改为“14 天专注”。
- 统计窗口：摘要、平均、最高和平均分心次数改为按选中日及前 13 天计算。
- 横滑边界：专注图历史带固定加载到今天，右滑最多停在今天，不再因为选中旧日期而提前截断。
- 简化：移除专注图内部的 `chartEndDate` 状态，日期选择只负责切换选中日和 timeline 日期。
- 验证：`node --check electron/main.cjs`、`pnpm test:timeline`、`pnpm exec tsc -b --pretty false`、`git diff --check`、`pnpm build` 通过；构建仅保留既有 chunk 体积提示。
- 文件：SettingsPanel.tsx, ISSUES.md, PROGRESS.md

### R199. 设置默认值与目录文案（2026-05-10）
- 默认值：新安装/未保存设置时，Timeline 最小时长从 1min 改为 5min。
- 默认值：休息提醒默认间隔从 25min 改为 60min。
- 设置目录：通用移动到第二项；历史对话改名为对话历史。
- 说明：仅调整默认值，不覆盖用户已经保存过的本地设置。
- 验证：`node --check electron/main.cjs`、`pnpm test:timeline`、`pnpm exec tsc -b --pretty false`、`git diff --check`、`pnpm build` 通过；构建仅保留既有 chunk 体积提示。
- 文件：settingsStore.ts, SettingsPanel.tsx, ISSUES.md, PROGRESS.md

### R200. 设置页玻璃质感与字段编辑态（2026-05-10）
- 视觉：设置窗口背景改为 Apple 风浅灰蓝底色，侧栏、分组卡片和 quiet-card 增加磨砂玻璃、内高光和柔和阴影。
- 字段：统一 Input、Textarea、Select 为 Radix 风格 13px 字号、圆角、低对比边框和只读态样式。
- 编辑态：宠物名、System Prompt、分心规则、STT/TTS 自定义字段、最大 Token、唤醒词和通用快捷键默认只读，点击“修改”后进入可编辑状态。
- Slider：重做滑动条轨道和 thumb，使用 Vite 蓝进度、玻璃轨道、白色高光 thumb 和 hover/focus 微交互。
- 验证：`node --check electron/main.cjs`、`pnpm test:timeline`、`pnpm exec tsc -b --pretty false`、`git diff --check`、`pnpm build` 通过；构建仅保留既有 chunk 体积提示。
- 文件：SettingsLayout.tsx, input.tsx, textarea.tsx, SettingsPanel.tsx, index.css, ISSUES.md, PROGRESS.md

### R201. 设置输入留白与分心规则 Token 编辑器（2026-05-10）
- 输入框：Input / Textarea 左右 padding 加宽，避免边框贴近文字。
- 分心规则：屏蔽应用、屏蔽关键词从多行文本框改为自然换行的 token 输入区域。
- 交互：每个规则都是独立小文本框，右侧有删除按钮；末尾 `+` 按钮可继续添加应用或关键词。
- 保存：应用设置前自动 trim 并清理空白规则，避免空 token 进入配置。
- 验证：`node --check electron/main.cjs`、`pnpm test:timeline`、`pnpm exec tsc -b --pretty false`、`git diff --check`、`pnpm build` 通过；构建仅保留既有 chunk 体积提示。
- 文件：input.tsx, textarea.tsx, SettingsPanel.tsx, ISSUES.md, PROGRESS.md

### R202. 设置分组卡片边距修正（2026-05-10）
- 卡片：通用、外观、提醒事项、AI 对话里的 SettingsGroup 改为复用个人档案浅色卡片边框、底色和内高光效果。
- 行距：SettingRow / AppearanceRow / 不可用行统一增加左右内边距，避免文字贴住卡片左右边线。
- 规则区：屏蔽应用和屏蔽关键词 token 编辑器外层增加和普通设置行一致的水平留白。
- 验证：`node --check electron/main.cjs`、`pnpm test:timeline`、`pnpm exec tsc -b --pretty false`、`git diff --check`、`pnpm build` 通过；构建仅保留既有 chunk 体积提示。
- 文件：SettingsPanel.tsx, ISSUES.md, PROGRESS.md

### R203. 个人档案打开时禁止纵向自动滚动（2026-05-10）
- 修复：14 天专注图定位选中日期时，不再调用 `scrollIntoView`，避免打开个人档案时页面被带着向下滚动。
- 实现：改为只计算并设置专注图横向容器的 `scrollLeft`，不触碰页面纵向滚动，也不触发 smooth 自动滑动。
- 验证：`node --check electron/main.cjs`、`pnpm test:timeline`、`pnpm exec tsc -b --pretty false`、`git diff --check`、`pnpm build` 通过；构建仅保留既有 chunk 体积提示。
- 文件：SettingsPanel.tsx, ISSUES.md, PROGRESS.md

### R204. 设置按钮色彩统一（2026-05-10）
- 视觉：默认 Button 从黑色 primary 改为 Vite 蓝玻璃按钮，统一保存、添加、确认等主操作按钮的色彩风格。
- 修复：个人档案日历选中态、API 默认标签、用量进度条不再使用黑色 foreground/primary，改为同一套浅蓝低对比风格。
- 范围：保留 destructive 按钮的红色警示语义，避免危险操作和普通主按钮混淆。
- 验证：`node --check electron/main.cjs`、`pnpm test:timeline`、`pnpm exec tsc -b --pretty false`、`git diff --check`、`pnpm build` 通过；构建仅保留既有 dynamic import 与 chunk 体积提示。
- 文件：button.tsx, SettingsPanel.tsx, ISSUES.md, PROGRESS.md

### R205. Top 软件时间标签防换行（2026-05-10）
- 修复：个人档案 Top 软件柱状图右侧时间标签列加宽，并强制不换行，避免较长时长挤到下一行。
- 布局：中间 bar 改为 `minmax(0,1fr)` 自适应缩短，给时间标签预留稳定空间。
- 验证：`node --check electron/main.cjs`、`pnpm test:timeline`、`pnpm exec tsc -b --pretty false`、`git diff --check`、`pnpm build` 通过；构建仅保留既有 chunk 体积与 dynamic import 提示。
- 文件：SettingsPanel.tsx, ISSUES.md, PROGRESS.md

### R206. 设置控件改为平面风格（2026-05-10）
- 视觉：移除 Slider 轨道和 thumb 的内高光、立体渐变和大投影，改为平面蓝色进度与白色圆点。
- 按钮：默认蓝色 Button 去掉玻璃内高光和投影，hover 只做轻微蓝色变化。
- 开关与局部状态：Switch、日历选中态、API 默认标签和用量条去掉立体阴影，保持统一的 Apple 平面控件质感。
- 验证：`node --check electron/main.cjs`、`pnpm test:timeline`、`pnpm exec tsc -b --pretty false`、`git diff --check`、`pnpm build` 通过；构建仅保留既有 dynamic import 与 chunk 体积提示。
- 文件：index.css, button.tsx, switch.tsx, SettingsPanel.tsx, ISSUES.md, PROGRESS.md

### R207. Top 软件列表扩展与时间左对齐（2026-05-10）
- 调整：个人档案 Top 软件从 3 个扩展为 4 个，让左侧卡片高度更接近右侧全天活跃度图。
- 布局：Top 软件右侧时间 label 改为左对齐，并继续保持不换行。
- 验证：`node --check electron/main.cjs`、`pnpm test:timeline`、`pnpm exec tsc -b --pretty false`、`git diff --check`、`pnpm build` 通过；构建仅保留既有 dynamic import 与 chunk 体积提示。
- 文件：SettingsPanel.tsx, ISSUES.md, PROGRESS.md

### R208. AI 对话设置重排与 Coding Provider 开关（2026-05-10）
- 提醒事项：删除顶部重复的“提醒事项”标题，进入页面后直接从休息提醒开始。
- AI 对话：按内置额度、Coding 模式、Chat 模型、语音模型重新排列；删除模型参数卡片。
- Coding：新增 Codex / Claude Code 两个独立开关，开启时会快速测试本机命令配置，失败时在开关下方显示红字错误。
- 联动：关闭某个 Coding 工具后，右键菜单、Coding 历史入口和大对话框 provider 切换都会隐藏对应选项；关闭当前 provider 时会自动切到另一个可用 provider，没有可用 provider 时退出 Coding 模式。
- Chat/语音：Chat 模型卡片中先显示当前默认模型，API 添加按钮右对齐；System Prompt 和宠物名字合并在同一卡片；语音模型卡片按 STT、TTS、语音设置分组。
- 验证：`node --check electron/main.cjs`、`pnpm test:timeline`、`pnpm exec tsc -b --pretty false`、`git diff --check`、`pnpm build` 通过；构建仅保留既有 chunk 体积与 dynamic import 提示。
- 文件：main.cjs, App.tsx, PetAvatar.tsx, SettingsPanel.tsx, settingsStore.ts, ISSUES.md, PROGRESS.md

### R209. 模型设置展开逻辑与开关可见度（2026-05-10）
- 开关：Switch 关闭态从接近背景的浅色改为更清晰的灰色，暗色模式也提高对比度。
- Chat 模型：默认状态只在模型标题下方展示 `CloseAI · gpt-4o-mini`；选择自定义后才展开 Base URL / Model / API Key 配置列表。
- 语音模型：STT / TTS 的默认模型信息移到左侧标题下方，和 Chat 模型保持一致。
- 验证：`node --check electron/main.cjs`、`pnpm test:timeline`、`pnpm exec tsc -b --pretty false`、`git diff --check`、`pnpm build` 通过；构建仅保留既有 chunk 体积与 dynamic import 提示。
- 文件：switch.tsx, SettingsPanel.tsx, ISSUES.md, PROGRESS.md

### R210. 设置下拉与 System Prompt 编辑按钮收紧（2026-05-10）
- 下拉：全局 select 高度、字号、圆角和内边距收窄，去掉阴影，避免设置页下拉按钮显得过胖。
- Prompt：System Prompt 文本框右下角的内置“修改”按钮删除，改为下方第一个按钮控制编辑流程。
- 交互：System Prompt 下方第一个按钮默认是白色“修改”，进入编辑态后变为蓝色“保存”，保存后回到只读态。
- 验证：`node --check electron/main.cjs`、`pnpm test:timeline`、`pnpm exec tsc -b --pretty false`、`git diff --check`、`pnpm build` 通过；构建仅保留既有 dynamic import 与 chunk 体积提示。
- 文件：index.css, SettingsPanel.tsx, ISSUES.md, PROGRESS.md

### R211. STT/TTS 自定义配置复用 API 弹窗（2026-05-10）
- 语音模型：STT / TTS 选择自定义后，不再直接展示 Base URL / Model / API Key 输入框。
- 复用：STT / TTS 自定义区域改为和 Chat 模型一致的 API 配置列表与“添加 API Key”按钮，使用同一个 API 配置弹窗填写。
- 生效：语音自定义配置列表增加“使用此配置”，点击后把该配置同步到对应 STT/TTS 实际运行字段，并显示“使用中”。
- 验证：`node --check electron/main.cjs`、`pnpm test:timeline`、`pnpm exec tsc -b --pretty false`、`git diff --check`、`pnpm build` 通过；构建仅保留既有 dynamic import 与 chunk 体积提示。
- 文件：SettingsPanel.tsx, ISSUES.md, PROGRESS.md

### R212. 外观自定义形象与动作说明调整（2026-05-10）
- 外观：将“形象自定义”改名为“自定义形象”，并移动到“灵宠动作”之前。
- 自定义形象：GIF 动图 / 图片方案按钮改为单行显示数量，避免 `GIF 动图（4 个）` 与 `图片（4 张）` 断成两行。
- 灵宠动作：增加说明“灵宠形象使用 GIF 动图时，不叠加动作效果”。
- 验证：`node --check electron/main.cjs`、`pnpm test:timeline`、`pnpm exec tsc -b --pretty false`、`git diff --check`、`pnpm build` 通过；构建仅保留既有 dynamic import 与 chunk 体积提示。
- 文件：SettingsPanel.tsx, ISSUES.md, PROGRESS.md

### R213. 设置开关弹性动效与窗口尺寸收紧（2026-05-10）
- 开关：所有 Switch 轨道和圆点改为 `cubic-bezier(0.34,1.56,0.64,1)` 弹性缓动，切换更轻快。
- 设置条目：通用、外观、提醒事项、AI 对话共用的设置行高度从 56px 收紧到 48px，外层卡片圆角、阴影和间距同步减小。
- 设置窗口：默认尺寸改为内容驱动的 980x760 居中窗口，并在小屏上自动不超过工作区，减少右侧空白。
- 验证：`node --check electron/main.cjs`、`pnpm test:timeline`、`pnpm exec tsc -b --pretty false`、`git diff --check`、`pnpm build` 通过；构建仅保留既有 dynamic import 与 chunk 体积提示。
- 文件：main.cjs, switch.tsx, SettingsPanel.tsx, ISSUES.md, PROGRESS.md

### R214. 主题选择与隐私按钮背景调整（2026-05-10）
- 外观：主题选择从自定义浮层菜单改为和 Chat 模型一致的紧凑原生下拉选择。
- 通用：底部清除历史、删除 API 配置、导出资料三个隐私安全按钮移出 `SettingsGroup`，删除背后的白色背景框。
- 验证：`node --check electron/main.cjs`、`pnpm test:timeline`、`pnpm exec tsc -b --pretty false`、`git diff --check`、`pnpm build` 通过；构建仅保留既有 dynamic import 与 chunk 体积提示。
- 文件：SettingsPanel.tsx, ISSUES.md, PROGRESS.md

### R215. 构建拆包与无效动态导入清理（2026-05-10）
- Push：已先推送 `codex-electron-rewrite` 到远端。
- 拆包：`SettingsPanel` 和完整 `ChatDialog` 改为 `React.lazy` 按窗口加载，pet/compact 首屏不再静态吃完整设置页和大聊天页。
- 轻量组件：抽出 `ChatPrimitives`，App 只静态导入 compact/coding 需要的 `Composer` 和 `MessageBubble`。
- Shim：移除 `@tauri-apps/api/core` 的无效动态导入，统一走静态 import，消除 Vite 的 `INEFFECTIVE_DYNAMIC_IMPORT` 提示。
- 结果：主 JS 从约 684 kB 降到 467.90 kB，低于 500 kB warning 阈值；构建不再输出 chunk 体积或 dynamic import warning。
- 验证：`node --check electron/main.cjs`、`pnpm test:timeline`、`pnpm exec tsc -b --pretty false`、`git diff --check`、`pnpm build` 通过；构建输出主包 `index-ClaEDNe2.js` 467.90 kB / gzip 144.13 kB，未出现 chunk 体积或 dynamic import warning。
- 文件：App.tsx, ChatDialog.tsx, ChatPrimitives.tsx, HoverInputBar.tsx, petStore.ts, SettingsPanel.tsx, ISSUES.md, PROGRESS.md

### R216. 全屏游戏时暂停 Timeline 与取消置顶（2026-05-10）
- 游戏识别：系统无法可靠枚举所有游戏，改为“全屏窗口 + 默认游戏关键词 + 用户游戏列表”的保守判断。
- 通用设置：新增“游戏识别列表”，用户可补充游戏 App 名或窗口标题关键词。
- 运行策略：检测到全屏游戏后取消灵宠/小窗置顶，并暂停 Timeline 前台刷新；游戏结束后恢复置顶策略和 Timeline 采样。
- 性能：游戏中不再执行 Timeline 前台窗口 AppleScript 采样，降低全屏游戏时的轮询干扰。
- 验证：`node --check electron/main.cjs`、`pnpm test:timeline`、`pnpm exec tsc -b --pretty false`、`git diff --check`、`pnpm build` 通过；构建未出现 chunk 体积或 dynamic import warning。
- 文件：main.cjs, App.tsx, settingsStore.ts, SettingsPanel.tsx, ISSUES.md, PROGRESS.md

### R217. 游戏识别列表说明文案调整（2026-05-10）
- 通用设置：“游戏识别列表”下方说明改为“当用户正在进行以下游戏时，会自动取消置顶，并暂停 Timeline 刷新监测，以保证游戏性能。”
- 验证：`node --check electron/main.cjs`、`pnpm test:timeline`、`pnpm exec tsc -b --pretty false`、`git diff --check`、`pnpm build` 通过；构建未出现 chunk 体积或 dynamic import warning。
- 文件：SettingsPanel.tsx, ISSUES.md, PROGRESS.md

### R218. 中英文界面基础支持（2026-05-10）
- 设置：新增 `appLanguage` 设置项，默认中文；通用设置第一项增加“语言”选择，支持中文 / English 切换。
- 翻译：新增轻量 i18n 层，英文模式下翻译设置、聊天、右键菜单、个人档案等核心 UI 的可见文本、placeholder、title 和 aria-label。
- 保护：聊天消息正文标记为不翻译，避免用户/AI 内容被界面语言层误处理。
- 验证：`node --check electron/main.cjs`、`pnpm test:timeline`、`pnpm exec tsc -b --pretty false`、`git diff --check`、`pnpm build` 通过；构建未出现 chunk 体积或 dynamic import warning。
- 文件：App.tsx, i18n.ts, ChatPrimitives.tsx, SettingsPanel.tsx, settingsStore.ts, ISSUES.md, PROGRESS.md

### R219. Timeline 采样器重启后续记当前片段（2026-05-10）
- 排查：日志中 `min=360s`，但 HMR/窗口重建频繁触发 `start -> stop -> persist:skip`，导致未满 6 分钟的当前片段被丢弃，设置里的 Timeline 看不到更新。
- 修复：`TimelineRecorder` 新增状态导出/恢复；前端把未完成 active/candidate/paused 片段暂存到 localStorage，采样器重建后继续累计同一段。
- 边界：暂存状态和 Timeline 最小时长绑定，过期后自动丢弃；聊天/设置窗口重建不再让正在累计的前台窗口从 0 开始。
- 测试：新增“采样器重启后恢复未完成片段”的单元测试，覆盖 4 分钟重启后继续到 6 分钟以上落库的场景。
- 验证：`node --check electron/main.cjs`、`pnpm test:timeline`、`pnpm exec tsc -b --pretty false`、`git diff --check`、`pnpm build` 通过；构建未出现 chunk 体积或 dynamic import warning。
- 文件：App.tsx, timelineRecorder.ts, timelineRecorder.test.ts, ISSUES.md, PROGRESS.md

### R220. Timeline 暂停超过最小时长后断段（2026-05-10）
- 语义：休眠、熄屏或全屏游戏暂停超过用户设置的 Timeline 最小时长后，不再把恢复后的同一 App 拼成一个跨空白的大段。
- 实现：`resumeForeground` 接收恢复时间和最大暂停时长；短暂停顿继续当前片段，长暂停清空 paused，下一次采样重新开始 active。
- 结果：如果 Timeline 最小时长为 5 分钟，暂停 5 分钟以内可续记；暂停超过 5 分钟则断成新段，Timeline 视觉上不会跨休眠空白。
- 测试：新增短暂停顿续记、长暂停断段两个 timeline 单测。
- 验证：`node --check electron/main.cjs`、`pnpm test:timeline`、`pnpm exec tsc -b --pretty false`、`git diff --check`、`pnpm build` 通过；构建未出现 chunk 体积或 dynamic import warning。
- 文件：App.tsx, timelineRecorder.ts, timelineRecorder.test.ts, ISSUES.md, PROGRESS.md

### R221. 个人档案英文动态文案补全（2026-05-10）
- 修复：英文模式下，个人档案卡片和图表中的动态组合文案仍显示中文的问题。
- 覆盖：补充 Timeline 说明、星期、段数、task 数、累计/共、次数、分心次数、小时/分钟、中文日期等动态转换规则。
- 结果：`共 2 小时 · 3 次专注 · 1 次分心`、`累计 15 分钟`、`5月10日`、`3 个 task` 等文本会在英文模式下转换为自然英文表达。
- 验证：`node --check electron/main.cjs`、`pnpm test:timeline`、`pnpm exec tsc -b --pretty false`、`git diff --check`、`pnpm build` 通过；构建未出现 chunk 体积或 dynamic import warning。
- 文件：i18n.ts, ISSUES.md, PROGRESS.md

### R222. 聊天图片选择与语音输入反馈优化（2026-05-10）
- 图片输入：聊天图片按钮改走主进程原生独立文件选择器，并由主进程读取图片为 data URL，避免隐藏 DOM file input 在浮窗里触发的拖动/层级异常。
- 语音输入：新增 `recording / loading / idle` 三阶段状态；录音时麦克风按钮显示随分贝 RMS 波动的双层波纹，云端转写等待时切换为加载 spinner。
- 覆盖：普通小聊天窗口和展开的大聊天窗口共用同一套语音动画状态，系统语音输入也会启动本地音量监听。
- 验证：`node --check electron/main.cjs`、`pnpm exec tsc -b --pretty false`、`git diff --check`、`pnpm test:timeline`、`pnpm build` 通过；构建未出现 chunk 体积或 dynamic import warning。
- 文件：main.cjs, ChatDialog.tsx, ChatPrimitives.tsx, voiceService.ts, ISSUES.md, PROGRESS.md

### R223. 全屏图片选择与启动初始位置稳定（2026-05-10）
- 全屏上传：图片选择器重新绑定到当前 pet/compact chat 浮窗父窗口，打开前强制应用 `visibleOnFullScreen` 和 screen-saver 级置顶，避免全屏 Space 中上传窗口切到其他桌面。
- 初始位置：pet/orb 窗口不再 `ready-to-show` 后立即显示；改为前端按已加载设置完成第一次布局后通知主进程显示，避免启动时先出现在偏下位置再上跳。
- 兼容：保留 1.8s fallback 显示，防止极端加载失败时窗口完全不出现。
- 验证：`node --check electron/main.cjs`、`pnpm exec tsc -b --pretty false`、`git diff --check`、`pnpm test:timeline`、`pnpm build` 通过；构建未出现 chunk 体积或 dynamic import warning。
- 文件：main.cjs, App.tsx, ISSUES.md, PROGRESS.md

### R224. 语音输入框内锯齿波与手动结束（2026-05-10）
- UI：录音时不再在麦克风按钮上显示圆形波纹，改为在输入框区域显示从左向右滑动的锯齿状音频波形。
- 音量：波形振幅由 AudioContext RMS 分贝驱动，声音越大振幅越明显。
- 控制：波形右侧新增小对号按钮，用户可手动结束录音；原有超时自动结束仍保留，结束后云端转写继续显示 loading。
- 验证：`pnpm exec tsc -b --pretty false`、`git diff --check`、`pnpm test:timeline`、`pnpm build` 通过；构建未出现 chunk 体积或 dynamic import warning。
- 文件：ChatPrimitives.tsx, ChatDialog.tsx, voiceService.ts, index.css, ISSUES.md, PROGRESS.md

### R225. 录音波形与轻量滚动条优化（2026-05-10）
- 录音动效：输入框内波形由锯齿线改为参考图风格的细竖向音频柱，保留从左向右滑动和随音量改变振幅。
- 视觉：去掉录音区域底色块，让波形更像系统级轻量录音状态，而不是一块额外组件。
- Overflow：全局滚动条改为 6px、透明轨道、低对比圆角 thumb，横向/纵向 overflow 的视觉存在感更轻。
- 验证：`pnpm exec tsc -b --pretty false`、`git diff --check`、`pnpm test:timeline`、`pnpm build` 通过；构建未出现 chunk 体积或 dynamic import warning。
- 文件：ChatPrimitives.tsx, index.css, ISSUES.md, PROGRESS.md

### R226. 录音波形流动与铺满修正（2026-05-10）
- 静音态：无声音时所有竖柱统一保持短高度，不再出现错落的长短变化。
- 有声态：检测到音量后才按分贝拉长竖柱，并保留轻微形态差异。
- 流动：波形始终向左流动，速度从 1.45s 放慢到 2.35s；条数和宽度扩展到铺满输入框剩余区域，只避开右侧对号按钮。
- 验证：`pnpm exec tsc -b --pretty false`、`git diff --check`、`pnpm test:timeline`、`pnpm build` 通过；构建未出现 chunk 体积或 dynamic import warning。
- 文件：ChatPrimitives.tsx, index.css, ISSUES.md, PROGRESS.md

### R227. 录音波形改为中线采样历史推进（2026-05-10）
- 模型：波形不再整体按当前分贝缩放；改为固定采样节奏，把当前分贝写入中间柱，再把历史采样向左推进。
- 静音：无声音时中间柱也是短柱，整条波形逐步回到统一短高度。
- 速度：采样节奏放慢到 320ms，并用 300ms ease-out 过渡，接近常见录音控件的一格一格推进感。
- 验证：`pnpm exec tsc -b --pretty false`、`git diff --check`、`pnpm test:timeline`、`pnpm build` 通过；构建未出现 chunk 体积或 dynamic import warning。
- 文件：ChatPrimitives.tsx, index.css, ISSUES.md, PROGRESS.md

### R228. 英文模式自定义形象与灵宠动作翻译补全（2026-05-10）
- 补全：英文模式下 `Custom Avatar` 和 `Pet Motion` 内的中文漏项已补，包括 Orb 折叠原因、状态标签、GIF/图片方案、数量单位、当前使用说明、动作标题/描述和 aria-label。
- 动态：新增 `当前使用 n / m 个 GIF`、`n 张图片`、`（n 个）/（n 张）` 等组合文案的英文转换规则。
- 结果：自定义形象卡片、图片网格、方案切换、恢复默认和动作控制区在英文模式下不再残留这些中文文案。
- 验证：`pnpm exec tsc -b --pretty false`、`git diff --check`、`pnpm test:timeline`、`pnpm build` 通过；构建未出现 chunk 体积或 dynamic import warning。
- 文件：i18n.ts, ISSUES.md, PROGRESS.md

### R229. 暂停语音唤醒功能入口（2026-05-10）
- 设置：从 AI 对话 / Voice Models 中移除 `Voice Wake` 和 `Wake Word` 两个设置项。
- 逻辑：删除 pet 窗口里的 wake word 后台 SpeechRecognition 监听 effect，功能暂不启动，也不再占用麦克风/语音识别资源。
- 模型：从 `AppSettings` 和默认设置中移除 `wakeWord`、`wakeWordEnabled` 字段；旧本地存储键会被忽略。
- 验证：`rg "Voice Wake|Wake Word|语音唤醒|唤醒词|wakeWord|wakeWordEnabled|wake word" src electron` 无结果；`pnpm exec tsc -b --pretty false`、`git diff --check`、`pnpm test:timeline`、`pnpm build` 通过。
- 文件：App.tsx, SettingsPanel.tsx, settingsStore.ts, i18n.ts, ISSUES.md, PROGRESS.md

### R230. 修复录音波形采样器被高频音量重置（2026-05-10）
- 修复：`AudioWaveform` 的采样 interval 不再依赖高频变化的 `voiceAmount`，改为稳定 interval + ref 读取最新音量，避免定时器不断重建导致波形看起来静止。
- 音量：降低静音阈值并加入视觉增益，小声输入也能推动中间采样柱高度变化。
- 速度：采样节奏调整为 180ms，配合 200ms 过渡，保持录音历史向左推进的可见动态。
- 验证：`pnpm exec tsc -b --pretty false`、`git diff --check`、`pnpm test:timeline`、`pnpm build` 通过；构建未出现 chunk 体积或 dynamic import warning。
- 文件：ChatPrimitives.tsx, ISSUES.md, PROGRESS.md

### R231. 加快录音波形向左推进速度（2026-05-10）
- 调整：`AudioWaveform` 的采样节奏从 180ms 提升到 120ms，让录音条向左推进更利落。
- 视觉：柱高/透明度过渡从 200ms 缩短到 150ms，避免速度提升后出现拖沓感。
- 验证：`pnpm exec tsc -b --pretty false`、`git diff --check`、`pnpm test:timeline`、`pnpm build` 通过；生产构建主包 485.75 kB，未触发 chunk 体积 warning。
- 文件：ChatPrimitives.tsx, ISSUES.md, PROGRESS.md

### R232. Timeline 短暂切屏明细与后台进程修正（2026-05-10）
- Hover：Timeline 详情卡片靠右时会自动显示在鼠标左侧，并按视口上下边界夹紧，避免被窗口边缘遮挡。
- 明细：未达到 Timeline 最小时长的短暂切屏不再丢弃，而是作为 `foreground-short` 附属明细保存到当前主片段；详情页主活动按 app + 标题/URL 聚合，短暂切屏单独列在下方。
- 后台：网易云等仅有进程但无法确认播放状态的软件不再误记为音乐；新增音乐软件列表设置，并只对可确认播放状态的 Music/Spotify 记录后台音乐。
- Terminal：补充从系统进程中识别长跑开发命令的后台 terminal 标记，覆盖没有被 Terminal/iTerm AppleScript 正确读到的场景。
- 验证：`pnpm exec tsc -b --pretty false`、`git diff --check`、`pnpm test:timeline`、`pnpm build` 通过；新增短暂切屏附属明细单测，生产构建主包 486.44 kB，未触发 chunk 体积 warning。
- 文件：App.tsx, main.cjs, SettingsPanel.tsx, settingsStore.ts, timelineRecorder.ts, timelineRecorder.test.ts, ISSUES.md, PROGRESS.md

### R233. Timeline Hover 卡片自适应宽度（2026-05-10）
- 修复：Timeline hover 详情卡片不再固定 300px，改为根据 eyebrow、标题、正文和时间估算宽度，最小 156px、最大 248px。
- 定位：hover 定位使用估算后的实际宽度，靠右片段更容易完整显示；正文从 3 行收敛到 2 行并允许断词换行。
- 验证：`pnpm exec tsc -b --pretty false`、`git diff --check`、`pnpm test:timeline`、`pnpm build` 通过；生产构建主包 486.44 kB，未触发 chunk 体积 warning。
- 文件：SettingsPanel.tsx, ISSUES.md, PROGRESS.md

### R234. 设置页信息层级与目录重排（2026-05-10）
- 目录：侧边栏改为大类分组，拆出基础、Timeline、游戏识别、音乐识别、快捷键、显示、自定义形象、灵宠动作、休息提醒、专注模式、屏蔽应用、屏蔽关键词、内置额度、Coding 模式、Chat 模型、语音模型。
- 层级：设置卡片减少硬边框，改用半透明材质、模糊和 elevation 区分层级；行内分隔线弱化为细微 inset 线。
- 节奏：侧边栏图标统一 16px，标签圆角统一为 8px；列表 token 和额度卡片也改成轻量 elevation。
- 验证：`pnpm exec tsc -b --pretty false`、`git diff --check`、`pnpm test:timeline`、`pnpm build` 通过；生产构建主包 486.44 kB，未触发 chunk 体积 warning。
- 文件：SettingsPanel.tsx, SettingsLayout.tsx, ISSUES.md, PROGRESS.md

### R235. 设置页专注列表合并与英文残留补齐（2026-05-11）
- 目录：音乐识别、游戏识别移入“专注与提醒”末尾；通用目录只保留基础、Timeline、快捷键。
- 合并：Blocked Apps 与 Blocked Keywords 合并为“屏蔽列表”，顶部补充专注模式触发分心提醒的说明，并在同一页分别编辑应用和关键词。
- 视觉：设置右侧进一步弱化硬边框，Profile、Timeline、API 配置、历史对话、自定义形象和灵宠动作卡片统一改用半透明底、blur/elevation 和轻分割线建立层级。
- 英文：扫描 `SettingsPanel.tsx` 设置文案，补齐个人/基础/显示/快捷键/屏蔽列表/游戏识别/音乐识别/短暂切换/API 配置等英文映射，以及 `自定义：...`、`默认：...`、`对话 n` 等动态翻译。
- 验证：`pnpm exec tsc -b --pretty false`、设置页中文残留扫描脚本、`git diff --check`、`pnpm test:timeline`、`pnpm build` 通过；生产构建主包 488.14 kB，未触发 chunk 体积 warning。
- 文件：SettingsPanel.tsx, i18n.ts, ISSUES.md, PROGRESS.md

### R236. 通用目录后置与发送快捷键设置（2026-05-11）
- 目录：设置左侧将“通用”分组移动到最后，保留基础、Timeline、快捷键三个入口。
- 设置：快捷键页新增“发送消息”下拉项，可选择 Enter 发送或 Command/Control + Enter 发送。
- 行为：普通悬浮小窗、大聊天窗口、多面板聊天、Coding 小窗和 Coding 大窗统一使用该发送规则；Shift+Enter 仍保留换行。
- 英文：补充“发送消息”和发送快捷键说明的英文映射，并复查设置页短中文文案无残留缺口。
- 验证：`pnpm exec tsc -b --pretty false`、设置页中文残留扫描脚本、`pnpm test:timeline`、`pnpm build` 通过；生产构建主包 488.37 kB，未触发 chunk 体积 warning。
- 文件：App.tsx, ChatDialog.tsx, HoverInputBar.tsx, sendShortcut.ts, SettingsPanel.tsx, settingsStore.ts, i18n.ts, ISSUES.md, PROGRESS.md

### R237. 专注倒计时背景跟随灵宠透明度（2026-05-11）
- UI：专注模式下灵宠底部倒计时不再是裸文字，新增轻量圆角背景、细边和磨砂阴影。
- 透明度：倒计时背景和边框使用 `settings.petOpacity` 计算透明度，和灵宠/悬浮球透明度设置保持一致；文字本身保持清晰。
- 验证：`pnpm exec tsc -b --pretty false`、`pnpm test:timeline`、`pnpm build` 通过；生产构建主包 488.71 kB，未触发 chunk 体积 warning。
- 文件：App.tsx, ISSUES.md, PROGRESS.md

### R238. 深色模式改为 macOS 中性灰阶（2026-05-11）
- 配色：全局 dark tokens 从偏蓝黑/暖棕改为 macOS 系统设置风格的中性石墨灰，背景、侧栏、卡片、输入框和文字对比统一收敛。
- 设置页：设置窗口增加专用作用域，深色下使用 #1f1f1f 主背景、#252525 侧栏、#2c2c2c 卡片面。
- 高光：移除设置页深色模式中卡片、文本框、内容盒子的白色 inset 顶部高光条，保留低对比阴影和细分割线。
- 验证：`pnpm exec tsc -b --pretty false`、`pnpm test:timeline`、`pnpm build` 通过；生产构建主包 488.71 kB，未触发 chunk 体积 warning。
- 文件：index.css, SettingsLayout.tsx, SettingsPanel.tsx, ISSUES.md, PROGRESS.md

### R239. 深色设置与聊天面板残留白底修正（2026-05-11）
- 设置页：补充覆盖深色模式右侧区域残留的 `bg-white/*`、浅灰 hex 背景和表单背景，统一回到 macOS 石墨灰卡片面。
- 聊天 UI：大小聊天框统一深色面板和输入框底色，移除 message bubble、composer、panel 中残留的白色 inset 高光条。
- 交互：保留聊天输入框 focus ring，但改为低透明 accent 描边，避免深色模式下出现亮白边。
- 验证：`pnpm exec tsc -b --pretty false`、`pnpm test:timeline`、`git diff --check`、`pnpm build` 通过；生产构建主包 488.71 kB，未触发 chunk 体积 warning。
- 文件：index.css, ISSUES.md, PROGRESS.md

### R240. 深色模式首帧防闪烁（2026-05-11）
- 启动：在 `index.html` 头部同步读取本地设置 store，React 和 CSS 首次绘制前就给根节点写入 `.dark`、`color-scheme` 和窗口初始背景色。
- 窗口：设置窗口和大聊天窗口改为等主页面完成首次加载后再显示，避免 Electron 的浅色 `backgroundColor` 在暗色主题中露出一帧。
- 背景：对 settings/chat hash 增加首帧背景类，只影响非透明窗口；灵宠/悬浮球窗口继续保持透明背景。
- 验证：`pnpm exec tsc -b --pretty false`、`pnpm test:timeline`、`git diff --check`、`pnpm build` 通过；生产构建主包 488.71 kB，未触发 chunk 体积 warning。
- 文件：index.html, electron/main.cjs, ISSUES.md, PROGRESS.md

### R241. 设置深色右侧背景修正（2026-05-11）
- 布局：移除 SettingsLayout root 上的浅色 radial/linear 背景 utility，避免深色模式下内容区被浅色背景抢回。
- 背景：将设置窗口浅色/深色背景收敛到 `.settings-window` 作用域；深色下 root、main 和 Radix ScrollArea viewport/content 都强制使用 #1f1f1f。
- 验证：`pnpm exec tsc -b --pretty false`、`pnpm test:timeline`、`git diff --check`、`pnpm build` 通过；生产构建主包 488.71 kB，未触发 chunk 体积 warning。
- 文件：SettingsLayout.tsx, index.css, ISSUES.md, PROGRESS.md

### R242. 深色设置磨砂玻璃质感（2026-05-11）
- 背景：深色设置窗口从纯平面黑改为低对比暗色材质，加入非常轻的径向光感和系统灰渐变，避免“死黑”。
- 材质：侧栏、卡片和内容盒子统一使用半透明深灰、blur/saturate 和低对比边缘，接近 macOS 深色设置窗口的 visual effect 质感。
- 控件：输入框和选择器改成半透明暗灰面，保留清晰对比但去掉厚重实心感。
- 验证：`pnpm exec tsc -b --pretty false`、`pnpm test:timeline`、`git diff --check`、`pnpm build` 通过；生产构建主包 488.71 kB，未触发 chunk 体积 warning。
- 文件：index.css, ISSUES.md, PROGRESS.md

### R243. 首帧主题与灵宠初始布局稳定化（2026-05-11）
- 主题：`App` 的主题 effect 改为等真实设置加载完成后才运行，避免 HTML 预置的 `.dark` 被默认 `system` 设置临时覆盖成浅色。
- 窗口：设置窗口和大聊天窗口不再只等 `did-finish-load`，而是等 renderer 在真实设置加载完成后发送 `renderer_window_ready` 再显示。
- 灵宠：移除 pet 窗口 1.8s fallback 抢先显示；首次启动和手动显示都必须等首个稳定 layout 完成并发送 `pet_window_layout_ready` 后再 `showInactive`。
- 验证：`pnpm exec tsc -b --pretty false`、`pnpm test:timeline`、`git diff --check`、`pnpm build` 通过；生产构建主包 488.82 kB，未触发 chunk 体积 warning。
- 文件：App.tsx, electron/main.cjs, ISSUES.md, PROGRESS.md

### R244. Timeline 跨日片段裁剪（2026-05-11）
- 查询：`getTimelineEntries(date)` 不再只按落库日期过滤，改为返回与所选日期 00:00-24:00 有交集的所有记录。
- 渲染：设置页 Timeline 在显示前按当前日期边界裁剪主 task 和后台 marker，跨日记录会分别在昨天/今天显示各自对应时段。
- 修复：例如 23:51-00:45 的 Codex 记录，昨天显示 23:51-24:00，今天显示 00:00-00:45，不再错误画到今天 23:51-24:00。
- 验证：`pnpm exec tsc -b --pretty false`、`pnpm test:timeline`、`git diff --check`、`pnpm build` 通过；生产构建主包 488.82 kB，未触发 chunk 体积 warning。
- 文件：db.ts, SettingsPanel.tsx, ISSUES.md, PROGRESS.md

### R245. 启动闪烁与灵宠跳动单测覆盖（2026-05-11）
- 抽象：将首帧主题决策抽为 `startupTheme.ts`，将 Electron 窗口延迟显示和 pet layout-ready 显示抽为 `windowLifecycle.cjs`。
- 测试：新增 `test:startup`，覆盖深色首帧不被未加载设置覆盖、系统浅色下持久化 dark 仍生效、settings/chat 等 renderer ready 才显示、pet layout ready 前绝不 show、隐藏时取消 pending show、ready 后手动显示立即稳定。
- 集成：`App` 使用 `getThemeClassAction`，main 进程使用可测 window lifecycle controller，`pnpm test` 同时运行 timeline 和 startup 测试。
- 验证：`pnpm exec tsc -b --pretty false`、`pnpm test`、`git diff --check`、`pnpm build` 通过；生产构建主包 488.99 kB，未触发 chunk 体积 warning。
- 文件：App.tsx, main.cjs, startupTheme.ts, startupTheme.test.ts, windowLifecycle.cjs, windowLifecycle.test.cjs, package.json, ISSUES.md, PROGRESS.md

### R246. Timeline 图例实时 Coding 时长（2026-05-11）
- UI：Timeline 上方分类图例右侧增加时长徽标，统计口径改为当前 Timeline 主色块，不再使用个人档案 `codingMs`。
- 修复：`getTimelineEntries(date)` 会纳入与当天有交集的后台 marker；若只有后台进程跨日而主前台不在当天，则只显示在后台轨道，不生成主色块。
- 详情：跨日裁剪和短暂切换提取移动到 `timelineView.ts` 并补充单测，确保未达阈值的软件使用会作为“短暂切换”出现在点击详情里。
- 验证：`pnpm test`、`pnpm exec tsc -b --pretty false`、`git diff --check`、`pnpm build` 通过；生产构建主包 488.99 kB，未触发 chunk 体积 warning。
- 文件：SettingsPanel.tsx, db.ts, timelineView.ts, timelineView.test.ts, db.timeline.test.ts, package.json, PROGRESS.md, ISSUES.md

### R247. 启动闪烁与灵宠首帧跳动实链路修复（2026-05-11）
- 深色：设置/大聊天窗口在 settings 未加载前不再渲染完整 UI，只显示预绘制背景；renderer ready 也延后到真实设置加载并完成两帧绘制后才通知 main 显示窗口。
- 窗口：main 进程不再给设置/聊天窗口硬编码浅色 `backgroundColor`，改为跟随系统深浅色的 opaque window 底色，减少 Electron 原生底色闪烁。
- 灵宠：首个 layout 应用后等待两帧稳定绘制，再发送 `pet_window_layout_ready`，避免 main 进程在 React layout state 尚未完成绘制时 showInactive。
- 验证：`pnpm test`、`pnpm exec tsc -b --pretty false`、`git diff --check`、`pnpm build` 通过；生产构建主包 489.47 kB，未触发 chunk 体积 warning。
- 文件：App.tsx, main.tsx, startupTheme.ts, startupTheme.test.ts, electron/main.cjs, PROGRESS.md, ISSUES.md

### R248. 小聊天框置顶逻辑回滚到稳定基线（2026-05-13）
- 回滚：以 `302fa5b^` 为基准恢复 compact chat 窗口逻辑，重新使用 macOS `panel`、`showInactive()` 和原有 `applyFloatingFullscreenBehavior`/topmost guard 链路。
- 清理：移除输入态窗口状态机、parent/child window、强制重建 compact chat、webContents focus 等实验残留，避免破坏小窗置顶、拖拽跟随和动态 resize。
- 知识库：修正“查询中...”误触发，只根据用户消息判断是否需要读取系统时间/天气/设备/日历等上下文；普通对话不再触发查询占位。
- 记录：补充 ISSUE-253，明确输入法候选窗仍需独立方案处理，后续不应再直接扰动主小聊天框窗口结构。
- 验证：`pnpm build`、`pnpm test:startup`、`git diff --check` 通过；生产构建主包 497.63 kB，gzip 155.41 kB。
- 文件：electron/main.cjs, ChatPrimitives.tsx, systemKnowledge.ts, ChatDialog.tsx, HoverInputBar.tsx, ISSUES.md, PROGRESS.md

### R249. 系统知识库日历/提醒事项状态分流（2026-05-13）
- 日历/提醒：系统知识库 IPC 现在分别返回 Calendar 和 Reminders 的访问状态及错误；prompt 不再把单边失败概括成两者都无法读取。
- 待办：Reminders 读取改为包含未完成的无日期待办，避免用户真实待办没有 due date 时被误说成没有数据。
- 占位：系统知识库触发只看当前最后一条用户输入，避免历史关键词让普通对话也显示查询占位；占位文案从“查询中...”统一改为 `Querying...`。
- 验证：`pnpm build`、`pnpm test` 通过；生产构建主包 497.79 kB，gzip 155.48 kB。
- 文件：electron/main.cjs, systemKnowledge.ts, ChatDialog.tsx, HoverInputBar.tsx, ISSUES.md, PROGRESS.md
