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
