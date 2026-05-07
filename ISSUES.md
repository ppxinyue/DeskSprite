# DeskSprite 开发问题记录

## ISSUE-001
- 发现时间：2026-04-30
- 发现者：Agent 1
- 相关任务：A. 项目初始化
- 严重程度：已解决
- 问题现象：npm/pnpm 下载依赖极慢（部分包下载速度 < 10 KiB，多次 ECONNRESET/ETIMEDOUT），首次 `pnpm install` 耗时 6 分钟。
- 原因分析：国内网络环境访问 npm registry 不稳定，需要代理。
- 解决方案：配置本地代理 `export https_proxy=http://127.0.0.1:6478 http_proxy=http://127.0.0.1:6478 all_proxy=socks5://127.0.0.1:6478`，使用 `pnpm dlx` 替代 `npx`（避免 npm 缓存权限问题）。
- 经验总结：所有网络请求命令前加上代理环境变量。用 `pnpm dlx` 而非 `npx` 执行 CLI 工具。
- 是否需更新技术文档：否

## ISSUE-002
- 发现时间：2026-04-30
- 发现者：Agent 1
- 相关任务：A3. 配置 shadcn/ui
- 严重程度：已解决
- 问题现象：`shadcn add` 组件后，文件安装到项目根目录的 `@/components/ui/` 而非 `src/components/ui/`，导致 TypeScript 报 `Cannot find module '@/components/ui/tooltip'`。
- 原因分析：`components.json` 中 `aliases.components` 设为 `@/components`，但 shadcn CLI（v4.6.0）将其解析为字面 `@/` 目录而非 `src/`。
- 解决方案：手动将 `@/components/ui/*.tsx` 移动到 `src/components/ui/`，删除空的 `@/` 目录。
- 经验总结：shadcn/ui 初始化后应验证组件文件实际位置。后续如再使用 `shadcn add`，需检查安装路径。
- 是否需更新技术文档：否

## ISSUE-003
- 发现时间：2026-04-30
- 发现者：Agent 1
- 相关任务：A3. Tailwind + shadcn 配置
- 严重程度：已解决
- 问题现象：TypeScript 6.0 报 `Option 'baseUrl' is deprecated and will stop functioning in TypeScript 7.0`，导致构建失败。
- 原因分析：TypeScript 6 弃用了 `baseUrl` + `paths` 组合，推荐使用 imports/package.json#imports。
- 解决方案：在 `tsconfig.app.json` 中添加 `"ignoreDeprecations": "6.0"` 以静默警告，保留 `baseUrl` + `paths` 配置（Vite 通过 vite-tsconfig-paths 或手动 resolve.alias 处理实际路径解析）。
- 经验总结：TypeScript 6+ 中路径别名的配置方式可能有变化，后续版本需关注。
- 是否需更新技术文档：否

## ISSUE-004
- 发现时间：2026-04-30
- 发现者：Agent 1
- 相关任务：A3. shadcn/ui 依赖
- 严重程度：已解决
- 问题现象：shadcn 组件安装后缺少 `class-variance-authority` 依赖，构建报 `Cannot find module 'class-variance-authority'`。
- 原因分析：shadcn CLI 通过 `pnpm dlx` 运行时，未自动将依赖写入项目的 package.json。
- 解决方案：手动 `pnpm add class-variance-authority`。
- 经验总结：使用 `pnpm dlx shadcn add` 后需检查是否有遗漏的依赖。
- 是否需更新技术文档：否

## ISSUE-005
- 发现时间：2026-05-01
- 发现者：Agent 1
- 相关任务：A5. 配置 tauri.conf.json 权限
- 严重程度：已解决
- 问题现象：`core:window:allow-skip-taskbar` 和 `core:window:allow-set-transparent` 权限不存在，cargo build 报错。`trayIcon` 配置字段导致 `set_tray_icon` 方法找不到。
- 原因分析：Tauri 2.0 的权限名与文档不完全一致，透明窗口是窗口属性而非权限控制，托盘图标应通过代码创建而非配置文件。
- 解决方案：移除不存在的权限，删除 `trayIcon` 配置（托盘在任务 C 通过代码实现），仅保留验证通过的权限列表。
- 经验总结：添加权限前应先确认实际可用权限名，可从 cargo build 错误输出的列表中查找。
- 是否需更新技术文档：否

## ISSUE-006
- 发现时间：2026-05-01
- 发现者：Agent 1
- 相关任务：B1. 数据库初始化
- 严重程度：已解决
- 问题现象：cargo build 报 `no method named get_webview_window` 错误，csp.rs 中 AppHandle 缺少 Manager trait import。
- 原因分析：tauri::Manager trait 需要显式引入才能使用 get_webview_window 方法。
- 解决方案：在 csp.rs 中添加 `use tauri::Manager;`。
- 经验总结：Tauri 2.0 的 AppHandle 扩展方法需要引入对应 trait。
- 是否需更新技术文档：否

## ISSUE-007
- 发现时间：2026-05-01
- 发现者：Agent 1
- 相关任务：B5. 前端 db.ts
- 严重程度：已解决
- 问题现象：前端 pnpm build 报 `Cannot find module '@tauri-apps/plugin-sql'`。
- 原因分析：前端缺少 @tauri-apps/plugin-sql 依赖包，Rust 端已配置但前端包未安装。
- 解决方案：`pnpm add @tauri-apps/plugin-sql`。
- 经验总结：Tauri 插件需要同时安装 Rust 端和前端端的包。
- 是否需更新技术文档：否

## ISSUE-008
- 发现时间：2026-05-01
- 发现者：Agent 1
- 相关任务：C. 窗口管理 + 系统托盘
- 严重程度：已解决
- 问题现象：cargo build 报多类错误：tray mod not found、transparent 方法不存在、global-shortcut API 类型不匹配。
- 原因分析：1) tray-icon 需要在 Cargo.toml 中启用 feature；2) transparent 窗口需要 macos-private-api feature（Cargo.toml + tauri.conf.json 同步配置）；3) global-shortcut v2 的 handler 回调参数是 ShortcutEvent 而非 ShortcutState。
- 解决方案：Cargo.toml 添加 features `["tray-icon", "macos-private-api"]`，tauri.conf.json 添加 `"macOSPrivateApi": true`，修正 handler 签名使用 `event.state == ShortcutState::Pressed`。
- 经验总结：Tauri 2.0 的特殊窗口属性（透明、托盘）需要 feature flags，且 Cargo.toml 和 tauri.conf.json 必须同步配置。
- 是否需更新技术文档：否

## ISSUE-009
- 发现时间：2026-05-01
- 发现者：Agent 1
- 相关任务：K. 集成测试
- 严重程度：已解决
- 问题现象：运行 `pnpm tauri dev` 后宠物窗白框，灵宠不显示，设置页面按钮无法操作。
- 原因分析：1) capabilities/default.json 中 `sql:default` 权限不足以覆盖 `sql:allow-execute` 和 `sql:allow-select`，导致所有数据库操作被拒绝；2) 数据库操作失败后未 catch 错误，阻塞了 UI 渲染；3) 宠物窗 body 有白色背景覆盖了透明效果；4) framer-motion 的 framer-motion 动画系统过于复杂导致渲染问题。
- 解决方案：1) 在 capabilities 中添加 `sql:allow-execute`、`sql:allow-select` 等显式权限；2) 所有 DB 调用加 try-catch，失败时使用默认值；3) body 默认透明，settings 窗口通过 has-background 类添加背景；4) 简化 PetAvatar 为纯 CSS 动画 + img 标签，移除 framer-motion 依赖。
- 经验总结：Tauri 2.0 的 `xxx:default` 权限可能不包含所有需要的子权限，需要显式添加。所有前端对 Tauri 的 invoke 调用必须加错误处理。
- 是否需更新技术文档：否

## ISSUE-010
- 发现时间：2026-05-06
- 发现者：Agent 1
- 相关任务：F. 灵宠动画系统重构
- 严重程度：已解决
- 问题现象：灵宠动画系统需要从旧的5种状态（idle/happy/thinking/sleeping/dragging）重构为6种状态（idle/yawn/happy/sleeping/running/thinking），并支持多帧PNG/GIF/视频三种媒体类型。
- 原因分析：旧系统只支持单张图片切换，不支持逐帧动画和GIF/视频。状态触发缺乏自动化（无idle→yawn→sleeping自动链）。
- 解决方案：1) animations.ts 重构为 PetStateMediaConfig（frames + animatedPath + animatedType）；2) 新建 petStateEngine.ts 实现自动状态触发（5分钟idle→yawn→sleeping，happy 3秒后回idle）；3) PetAvatar.tsx 完整重写支持逐帧播放、拖拽、单击随机切换；4) SettingsPanel ImageSection 支持三路上传 + 帧率Slider。
- 经验总结：动画系统应从设计初期就考虑多帧和视频支持，避免后续大重构。
- 是否需更新技术文档：否

## ISSUE-011
- 发现时间：2026-05-06
- 发现者：Agent 1
- 相关任务：F8. 添加 plugin-process 依赖
- 严重程度：已解决
- 问题现象：PetAvatar.tsx 使用 `exit` from `@tauri-apps/plugin-process` 但前端和 Rust 端均未安装此插件。
- 原因分析：右键菜单"退出"功能需要 plugin-process 提供的 exit API。
- 解决方案：前端 `pnpm add @tauri-apps/plugin-process`，Rust 端 Cargo.toml 添加 `tauri-plugin-process = "2"`，lib.rs 注册 `.plugin(tauri_plugin_process::init())`。
- 经验总结：使用 Tauri 插件 API 前应确认双端依赖都已安装。
- 是否需更新技术文档：否

## ISSUE-012
- 发现时间：2026-05-06
- 发现者：用户反馈
- 相关任务：F. 灵宠动画系统
- 严重程度：严重（功能完全不可用）
- 问题现象：灵宠窗口全屏后桌面所有其他窗口卡死，无法点击任何东西。
- 原因分析：Tauri 全屏透明窗口在操作系统级别拦截所有鼠标事件，CSS `pointer-events-none` 只影响 WebView 内部的 DOM 事件分发，不影响操作系统层面的窗口事件传递。
- 解决方案：1) 创建宠物窗口后调用 `set_ignore_cursor_events(true)` 让窗口默认穿透鼠标事件；2) 新增 `set_cursor_passthrough` Rust 命令；3) 前端 PetAvatar 在 onMouseEnter 时调用 `set_cursor_passthrough(false)` 接收事件，onMouseLeave 时调用 `set_cursor_passthrough(true)` 恢复穿透。
- 经验总结：透明窗口穿透需要操作系统级别的 API，CSS pointer-events 不够。
- 是否需更新技术文档：否

## ISSUE-013
- 发现时间：2026-05-06
- 发现者：用户反馈
- 相关任务：K. 设置页面
- 严重程度：严重
- 问题现象：设置界面完全无法使用，按钮无法点击。
- 原因分析：设置窗口 body 背景透明，WebView 将透明区域的点击事件穿透到下层，导致 React 事件层无法接收。
- 解决方案：在 index.css 的 `body.has-background` 中添加 `pointer-events: auto` 确保设置窗口内容可点击。
- 经验总结：Tauri WebView 中透明窗口和普通窗口的事件处理机制不同，需要显式启用 pointer-events。
- 是否需更新技术文档：否

## ISSUE-014
- 发现时间：2026-05-06
- 发现者：用户反馈
- 相关任务：R4. 穿透稳定性
- 严重程度：中等
- 问题现象：拖拽灵宠时 onMouseLeave 触发，导致穿透恢复，鼠标事件丢失。
- 原因分析：PetAvatar 的 onMouseLeave 在拖拽过程中也会触发（鼠标可能移出 img 元素），直接调用 disableHit 导致穿透恢复。
- 解决方案：onMouseLeave 中检查 isDragging ref，拖拽期间不恢复穿透；拖拽 mouseup 时延迟 100ms 再恢复。
- 经验总结：拖拽场景下 hover 事件和穿透切换需要配合，不能无条件恢复穿透。
- 是否需更新技术文档：否

## ISSUE-015
- 发现时间：2026-05-06
- 发现者：用户反馈
- 相关任务：R5. 灰色背景
- 严重程度：中等
- 问题现象：灵宠切换状态时周围出现灰色/白色背景残留。
- 原因分析：1) `transform: scale()` 触发 GPU 合成层，合成层有默认不透明背景；2) 容器 div 未显式设置 `background: transparent`，Tauri 透明窗口中未设置背景的元素渲染为不透明。
- 解决方案：1) `#root` 设为透明；2) petBounce 动画改用 translateY 替代 scale；3) PetAvatar 和 App.tsx 中所有容器 div 显式 `background: transparent`。
- 经验总结：Tauri 透明窗口中，所有容器元素必须显式设 `background: transparent`，CSS transform 动画可能触发合成层背景。
- 是否需更新技术文档：否

## ISSUE-016
- 发现时间：2026-05-06
- 发现者：用户反馈
- 相关任务：R7. 设置界面重组
- 严重程度：改进
- 问题现象：原设置页 8 个 section 过于分散，交互体验不佳，滑块调节即时写入数据库无法预览。
- 原因分析：初始设计将每个功能点拆为独立 section，缺少分组逻辑和预览机制。
- 解决方案：1) 合并为 4 个 section（外观/AI对话/快捷键/隐私）；2) 外观设置用 draft state + 确认按钮；3) SettingsLayout 视觉优化。
- 经验总结：设置页应按使用频率和关联性分组，滑块类控件适合 draft/confirm 模式。
- 是否需更新技术文档：否

## ISSUE-017
- 发现时间：2026-05-06
- 发现者：用户反馈
- 相关任务：R8. 版本同步
- 严重程度：已解决（警告）
- 问题现象：`pnpm tauri dev` 输出 "Found version mismatched Tauri packages: tauri (v2.11.0) : @tauri-apps/api (v2.10.1)"。
- 原因分析：Cargo.toml 中 tauri crate 版本和 package.json 中 @tauri-apps/api 版本不在同一 major/minor。
- 解决方案：`pnpm add @tauri-apps/api@latest` 升级到 v2.11.0。
- 经验总结：Tauri 前后端包版本应保持同步，出现 mismatch 警告时优先升级前端包。
- 是否需更新技术文档：否

## ISSUE-018
- 发现时间：2026-05-06
- 发现者：用户反馈
- 相关任务：F. 灵宠动画系统 / R9. 拖拽稳定性
- 严重程度：严重
- 问题现象：灵宠第一次拖动正常，第二次拖动时鼠标穿透灵宠，无法再次拖动。
- 原因分析：`PetAvatar` 在全局 `mouseup` 后固定延迟 100ms 调用 `set_cursor_passthrough(true)`。如果鼠标释放后仍停在灵宠上方，Tauri 窗口已经进入 OS 级鼠标穿透状态，后续点击不会再可靠触发 React 的 `mouseenter/mousedown`，导致第二次拖动落到下层窗口。
- 解决方案：拖拽结束时根据灵宠根元素 `getBoundingClientRect()` 判断鼠标是否仍在灵宠区域内；若仍在区域内，保持窗口命中，等待真正 `mouseleave` 后再恢复穿透；若释放时已离开灵宠区域，则立即恢复穿透。
- 同步调整：按用户要求删除 `running`、`yawn`、`happy` 三个状态，仅保留 `idle`、`thinking`、`sleeping`；默认和用户上传的多 PNG 按随机 1-5 分钟切换，点击灵宠主动切换一次。
- 涉及文件：`PetAvatar.tsx`, `animations.ts`, `petStateEngine.ts`, `ChatDialog.tsx`, `HoverInputBar.tsx`, `SettingsPanel.tsx`, `PROGRESS.md`, `ISSUES.md`
- 经验总结：透明全屏窗口的鼠标穿透必须围绕 OS 级 hit-test 设计，不能在指针仍位于交互目标上时主动关闭命中；否则下一次交互没有机会从前端重新打开命中。
- 是否需更新技术文档：是，后续 tech-spec 应同步三状态模型。

## ISSUE-019
- 发现时间：2026-05-06
- 发现者：用户反馈
- 相关任务：C. 窗口管理 / H. 悬浮对话框 / 默认模型
- 严重程度：严重
- 问题现象：第二次连续拖动修复后，如果用户先点击其他窗口，再把鼠标移回灵宠，灵宠仍可能无法选中，鼠标穿透到下层窗口。
- 原因分析：根本问题不是拖拽阈值，而是“全屏透明窗口 + OS 级鼠标穿透 + 前端 hover 恢复命中”这个设计不成立。窗口进入 `ignore_cursor_events=true` 后，操作系统不会把鼠标事件派发给该窗口，前端无法靠 `mouseenter` 把命中恢复回来。
- 解决方案：将宠物窗改为小型透明置顶窗口，不再覆盖整个桌面，也不再依赖 OS 级穿透恢复；窗口保持 `always_on_top` 和可命中，拖拽使用 Tauri `startDragging()` 移动整个窗口。hover 时临时放大窗口以容纳聊天框，mouseleave 后缩回只包住灵宠的尺寸。
- 交互同步：聊天框不再长驻，只有鼠标 hover 灵宠区域时显示，鼠标移开即隐藏；右键菜单保留“设置 / 隐藏 / 退出”，隐藏通过 `hide_pet_window` 不再显示灵宠。
- 默认模型同步：新增内置 CloseAI OpenAI-compatible 配置，无用户默认 API 配置时自动使用；本地 `settings` 记录估算 token 用量，到 100000 后提示用户配置自己的 API Key。
- 涉及文件：`src-tauri/src/commands/window.rs`, `src/App.tsx`, `src/features/pet/PetAvatar.tsx`, `src/features/ai/defaultModel.ts`, `src/features/chat/ChatDialog.tsx`, `src/features/chat/HoverInputBar.tsx`, `PROGRESS.md`, `ISSUES.md`
- 经验总结：桌面悬浮交互需要优先通过真实窗口边界控制命中区域；把全屏透明层做成“看不见但可穿透”的做法在跨窗口、失焦、回焦场景下天然脆弱。
- 是否需更新技术文档：是。

## ISSUE-020
- 发现时间：2026-05-06
- 发现者：用户反馈
- 相关任务：C. 窗口管理
- 严重程度：严重
- 问题现象：改成小型宠物窗后，灵宠完全没有显示。
- 原因分析：初始窗口位置使用了 primary monitor 的物理像素宽度计算右侧坐标，在 macOS Retina / 高 DPI 环境中可能被当作逻辑像素使用，导致窗口创建在屏幕可见范围外。
- 解决方案：宠物窗启动位置改为固定可见坐标 `(100, 120)`，创建后显式 `show()` 并再次设置 `always_on_top`。
- 涉及文件：`src-tauri/src/commands/window.rs`
- 经验总结：Tauri 跨平台窗口定位要谨慎混用 monitor physical size 与 logical position；在交互稳定前优先使用保守可见坐标。
- 是否需更新技术文档：否

## ISSUE-021
- 发现时间：2026-05-06
- 发现者：用户反馈
- 相关任务：H. 悬浮对话框 / E. 设置中心
- 严重程度：严重
- 问题现象：hover 对话框没有完全显示，内容超出小窗口后被裁切；消息区没有可靠滚动；主题未完整跟随设置；历史对话只能看到摘要。
- 原因分析：对话框使用 `absolute left-1/2 -translate-x-1/2` 挂在灵宠下方，当前宠物窗宽度只比对话框略宽，居中偏移会产生负 x 坐标并被窗口裁切；消息区使用的 Radix ScrollArea 没有获得稳定高度，导致溢出不可控。
- 解决方案：宠物窗口内部改成固定宽度文档流布局，灵宠居中，对话框在下方占满设置宽度；消息区改用原生 `overflow-y-auto` 并显式 `maxHeight = dialogWidth - input/header`；输入框按内容自动增高，整体高度不超过“宽度等长”的上限。
- 同步调整：补充 `--color-pet-bubble-ai-text` 主题变量；设置页历史对话支持点击进入完整消息；对话框宽度设置改为滑动条；宠物窗启用 `accept_first_mouse(true)` 让未聚焦时的首次鼠标事件也能被接收。
- 涉及文件：`src/App.tsx`, `src/features/chat/ChatDialog.tsx`, `src/features/settings/SettingsPanel.tsx`, `src/features/settings/settingsStore.ts`, `src/index.css`, `src-tauri/src/commands/window.rs`, `src/features/pet/PetAvatar.tsx`
- 经验总结：小型桌面窗口内的浮层不能依赖负向 transform 居中，任何超出窗口矩形的内容都会被 OS/WebView 裁切；聊天类内容必须有一个明确高度的滚动容器。
- 是否需更新技术文档：是。

## ISSUE-022
- 发现时间：2026-05-06
- 发现者：用户反馈
- 相关任务：F. 灵宠交互 / H. 悬浮对话框
- 严重程度：严重
- 问题现象：拖拽后仍可能触发宠物形象切换；hover 弹出对话框时灵宠位置跳动；发出对话后没有即时回复占位；右键菜单在小型透明窗口中闪烁或卡住。
- 原因分析：Tauri 原生 `startDragging()` 的鼠标事件收尾不稳定，React click 仍可能在拖拽后触发；容器宽度从宠物宽度切到对话框宽度时使用居中布局导致灵宠重排；Radix ContextMenu 在透明小窗口与窗口尺寸变化组合下容易出现焦点/portal 抖动。
- 解决方案：拖拽改为前端手动计算位移并调用 `setPosition(PhysicalPosition)`，超过阈值才标记为拖拽，非拖拽单击才切图；hover 容器改为左上固定布局；发送后立即插入 `...` 助手消息并在流式 token 到达时更新；右键菜单改为自绘半透明小菜单，失焦/外部点击/滚轮自动关闭。
- 同步调整：对话框顶部加入“新对话 / 历史对话”，每次 hover 默认新对话；浅色主题 AI 回复气泡使用半透明深灰，深色主题使用黑色。
- 涉及文件：`src/features/pet/PetAvatar.tsx`, `src/App.tsx`, `src/features/chat/ChatDialog.tsx`, `src/index.css`, `PROGRESS.md`, `ISSUES.md`
- 经验总结：桌面小窗里的右键菜单和拖拽不宜依赖复杂 portal/focus 行为；交互状态应由窗口自身明确管理。
- 是否需更新技术文档：是。

## ISSUE-023
- 发现时间：2026-05-06
- 发现者：用户反馈
- 相关任务：F. 灵宠交互 / H. 对话系统 / E. 设置中心
- 严重程度：严重
- 问题现象：hover 自动弹出对话条造成视觉疲劳；拖拽改为手动移动后卡顿；设置外观需要确认；右键对话入口需要支持新对话、最近历史和大窗口；设置窗口尺寸不足。
- 原因分析：hover 作为聊天入口太敏感，透明小窗频繁 resize 会造成闪烁；手动逐帧调用窗口 setPosition 会受 IPC 与 DPI 换算影响而卡顿；外观设置 draft/confirm 模式不适合桌面宠物实时预览。
- 解决方案：取消 hover 自动显示聊天框，改为右键菜单中的“新对话 / 历史对话 / 最近3条 / 打开大窗口”；拖拽恢复 Tauri 原生 `startDragging()` 以减少卡顿；外观设置拖动即写入；设置窗口默认增大；新增独立 chat 窗口并支持模型选择。
- 涉及文件：`src-tauri/src/commands/window.rs`, `src-tauri/src/lib.rs`, `src-tauri/capabilities/default.json`, `src/App.tsx`, `src/features/pet/PetAvatar.tsx`, `src/features/pet/petStore.ts`, `src/features/chat/ChatDialog.tsx`, `src/features/settings/SettingsPanel.tsx`, `src/components/layouts/SettingsLayout.tsx`, `src/features/ai/defaultModel.ts`
- 经验总结：桌面宠物的聊天入口应是明确命令而不是 hover；窗口拖拽优先使用平台原生能力，连续 IPC 移动只适合低频定位。
- 是否需更新技术文档：是。

## ISSUE-024
- 发现时间：2026-05-06
- 发现者：用户反馈
- 相关任务：C. 窗口管理 / H. 对话系统 / E. 设置中心
- 严重程度：严重
- 问题现象：设置窗口和大对话窗口默认打开后仍然太小；外观滑块没有实时反映到宠物窗；右键菜单与最近历史容易显示不全；大窗口入口位置不符合预期；灵宠切换 PNG 后偶发上一张图的透明背景边框残留。
- 原因分析：窗口尺寸使用固定像素而非屏幕比例；设置更新虽然写入数据库，但其他窗口没有主动监听 `settings:updated` 后重载；右键菜单在小型透明宠物窗内渲染，菜单加历史项后超出窗口矩形会被系统裁切；PNG 切换时图片直接替换在同一透明窗口合成层内，旧合成内容可能短暂残留。
- 解决方案：设置窗和 chat 窗按主屏工作区 60% 居中创建；宠物窗监听 `settings:updated` 并重新加载设置；右键菜单打开时临时扩大窗口，历史收进“历史对话”二级菜单；小对话窗顶部提供模型/图片/语音/放大按钮，放大按钮调用独立 chat 窗；灵宠图片使用固定尺寸、透明背景、`contain: paint` 和 `isolation` 的绘制容器隔离每次 PNG 切换。
- 涉及文件：`src-tauri/src/commands/window.rs`, `src/App.tsx`, `src/features/pet/PetAvatar.tsx`, `src/features/chat/ChatDialog.tsx`, `src/features/settings/SettingsPanel.tsx`, `PROGRESS.md`, `ISSUES.md`
- 经验总结：小型桌面悬浮窗内的任何浮层都必须先保证 OS 窗口矩形足够容纳；跨窗口设置实时预览要走事件同步，而不是只依赖本窗口 zustand state。
- 是否需更新技术文档：是。

## ISSUE-025
- 发现时间：2026-05-06
- 发现者：用户反馈
- 相关任务：C. 窗口管理 / F. 灵宠渲染 / H. 对话系统
- 严重程度：严重
- 问题现象：设置窗口和大对话窗口打开时会从大尺寸闪回小尺寸；灵宠 PNG 切换后多轮修复仍保留上一张图的透明边框；小窗对话时灵宠会自动切换形象；历史对话在大窗左侧无法稳定加载；图片和语音输入按钮不可用。
- 原因分析：React `App` 初始 `windowLabel` 默认是 `pet`，settings/chat 窗口首帧会执行宠物窗 `setSize`；透明 WebView 中直接替换 `<img>` 可能复用旧合成层，CSS `contain/isolation` 仍不能保证清空上一张透明 PNG 的边缘像素；聊天发送时调用 `setPetState('thinking')` 会触发状态图片切换；大窗单窗口模式固定显示第一个面板，历史可能加载到当前激活但不可见的面板；图片/语音按钮没有接真实输入源。
- 解决方案：`windowLabel` 初始值改为 `getCurrentWindow().label`；settings/chat 默认 80% 工作区居中并在复用窗口时强制重设尺寸；PNG 灵宠改为 canvas `globalCompositeOperation='copy'` 清透明画布后再绘制新图；小窗打开时暂停自动随机切图，聊天发送不再改灵宠状态；大窗单窗口显示当前激活面板；图片输入使用文件选择和 data URL 传给 VLM 请求，语音输入使用 Web Speech API 写入输入框。
- 涉及文件：`src-tauri/src/commands/window.rs`, `src/App.tsx`, `src/features/pet/PetAvatar.tsx`, `src/features/chat/ChatDialog.tsx`, `src/features/ai/aiService.ts`, `src/features/ai/types.ts`, `src/features/chat/chatStore.ts`, `src/features/settings/settingsStore.ts`, `PROGRESS.md`, `ISSUES.md`
- 经验总结：透明桌面窗口的残影问题不能只靠 DOM/CSS 隔离解决，涉及透明 alpha 的连续图像切换应使用单一 canvas 显式清空像素缓冲区；多窗口 React 应在首帧就拿到真实窗口 label，避免错误窗口逻辑短暂执行。
- 是否需更新技术文档：是。

## ISSUE-026
- 发现时间：2026-05-06
- 发现者：用户反馈
- 相关任务：H. 小对话窗 UI
- 严重程度：改进
- 问题现象：小对话窗视觉仍像“卡片 + 灰底 + 冗长气泡”，半透明和阴影影响可读性，缺少 ChatGPT-like 的扁平层级；主题数量不满足 2 浅色 + 2 深色。
- 原因分析：小窗一直复用全局 `pet-dialog` 和 `pet-bubble` 变量，视觉目标混在灵宠陪伴风格和专业聊天风格之间；输入框在不同模式下复用组件样式，导致边框、阴影和间距累积。
- 解决方案：为聊天 UI 独立 `--color-chat-*` 变量，提供浅色 A/浅色 B/深色 A/深色 B；小窗容器、消息、输入框按 ChatGPT-like 尺寸重写，保留单层必要边框；移除毛玻璃和大阴影；Markdown 代码块单独样式化，复制按钮仅 hover 显示。
- 涉及文件：`src/features/chat/ChatDialog.tsx`, `src/index.css`, `src/App.tsx`, `src/features/settings/SettingsPanel.tsx`, `src/features/settings/settingsStore.ts`, `PROGRESS.md`, `ISSUES.md`
- 经验总结：聊天界面应使用独立设计 token，避免桌面宠物的装饰性视觉变量渗透到高可读文本界面。
- 是否需更新技术文档：是。

## ISSUE-027
- 发现时间：2026-05-06
- 发现者：用户反馈
- 相关任务：H. 大对话窗口 UI
- 严重程度：改进
- 问题现象：大对话窗口灰色块过多，面板边框过重，层级不清晰，整体更像后台工具而不是专业对话产品。
- 原因分析：大窗沿用了“多面板卡片”思路，侧边栏、Header、面板和输入区各自有边框/背景，导致嵌套层级过多；模型选择放在面板内部，布局和新建按钮放在主 Header，控件语义不统一。
- 解决方案：改成 ChatGPT-like 结构：240px 纯文本侧边栏、48px Header、主消息区、底部输入区；Header 左侧统一控制当前激活面板模型，右侧保留 icon-only 多布局切换和新增面板；面板不再是卡片，只用 1px 分隔线保留多布局边界。
- 涉及文件：`src/features/chat/ChatDialog.tsx`, `src/index.css`, `PROGRESS.md`, `ISSUES.md`
- 经验总结：多面板能力和专业聊天界面可以共存，但主结构必须先是“对话产品”，再用低噪声分隔线表达面板布局，不能让每个功能都变成一张卡片。
- 是否需更新技术文档：是。

## ISSUE-028
- 发现时间：2026-05-06
- 发现者：用户反馈
- 相关任务：H. 对话窗口主题与消息排版
- 严重程度：改进
- 问题现象：新增的四套主题和聊天 accent 使用了绿色/蓝色；消息仍用气泡包裹；大窗模型选择不在每个主对话窗口左上角；小窗输入框上方有分隔线。
- 原因分析：上一轮为 ChatGPT-like 视觉引入了独立彩色 token 和气泡式 message block，但用户现在要求更克制的黑白灰文本流；大窗 Header 统一模型选择虽然减少了控件，但不符合多面板下每个窗口独立选择的视觉预期。
- 解决方案：主题回退到 system/light/dark，并将聊天 token 改为黑白灰；消息组件移除背景、圆角和 padding，只保留左右对齐纯文本；大窗每个 `StandaloneChatPanel` 顶部恢复一个灰色 select；小窗 composer 去掉上边框。
- 涉及文件：`src/features/chat/ChatDialog.tsx`, `src/index.css`, `src/App.tsx`, `src/features/settings/SettingsPanel.tsx`, `src/features/settings/settingsStore.ts`, `PROGRESS.md`, `ISSUES.md`
- 经验总结：对话产品的“专业感”有时来自更少的视觉容器；主题系统应先满足语义稳定，再扩展风格数量。
- 是否需更新技术文档：是。

## ISSUE-029
- 发现时间：2026-05-06
- 发现者：用户反馈
- 相关任务：A. AI 默认人格 / C. 窗口管理 / E. 设置中心
- 严重程度：改进
- 问题现象：默认 system prompt 不再符合“极度简洁”的灵宠定位；其他窗口全屏时灵宠可能不在对应 Space 置顶显示；设置窗口初始尺寸和左侧目录占比需要收敛。
- 原因分析：默认 prompt 存在前端常量和数据库迁移两份来源，且老用户数据库中可能已保存旧默认；宠物窗只设置 `always_on_top`，macOS 全屏 Space 还需要 `visible_on_all_workspaces`；设置窗口沿用 80% 尺寸和 224px 侧栏。
- 解决方案：抽出 `DEFAULT_SYSTEM_PROMPT` 与 `normalizeSystemPrompt`，运行态把旧默认映射到新默认；新迁移写入新 prompt；宠物窗创建和 show 时设置 `visible_on_all_workspaces(true)`；设置窗口改为 70% 居中，侧栏收窄到 192px。
- 涉及文件：`src/features/ai/systemPrompt.ts`, `src/features/settings/SettingsPanel.tsx`, `src-tauri/migrations/0001_initial.sql`, `src-tauri/src/commands/window.rs`, `src/components/layouts/SettingsLayout.tsx`, `PROGRESS.md`, `ISSUES.md`
- 经验总结：跨 Space 悬浮窗需要显式声明全工作区可见；默认 prompt 升级要兼顾新安装和已安装用户，不能只改迁移。
- 是否需更新技术文档：是。

## ISSUE-030
- 发现时间：2026-05-06
- 发现者：用户反馈
- 相关任务：A. AI 默认人格 / C. 窗口管理 / H. 大对话窗口
- 严重程度：严重
- 问题现象：大窗模型选择按钮仍不够精致；历史对话加载后还可以切换模型；历史时间不符合本机系统时间感知；大窗放大后聊天主体仍受固定宽度限制；其他应用全屏时灵宠仍未稳定置顶；无气泡文本流不符合最新视觉要求。
- 原因分析：历史会话只加载 messages，没有把 `conversations.model_id` 作为只读会话属性同步到面板；SQLite `CURRENT_TIMESTAMP` 是 UTC 字符串，前端直接展示会产生时区错觉；消息和输入区仍有 720px 最大宽度；macOS 上 Tauri 的 `always_on_top` 只对应 Floating level，`visible_on_all_workspaces` 只设置 CanJoinAllSpaces，缺少 FullScreenAuxiliary 和更高窗口 level。
- 解决方案：历史数据结构加入 `modelId`，加载历史时锁定面板模型并只展示模型标签；时间显示统一转成本机时区；消息写入后更新会话 `updated_at`；大窗主体改成全宽；恢复轻量气泡并使用黑白灰 token；通过 `objc2-app-kit` 直接设置 `FullScreenAuxiliary` 等 collection behavior 和 `NSPopUpMenuWindowLevel`。
- 涉及文件：`src/features/chat/ChatDialog.tsx`, `src/index.css`, `src/lib/db.ts`, `src/features/ai/systemPrompt.ts`, `src-tauri/src/commands/window.rs`, `src-tauri/Cargo.toml`, `src-tauri/Cargo.lock`, `src-tauri/migrations/0001_initial.sql`, `PROGRESS.md`, `ISSUES.md`
- 经验总结：macOS 全屏 Space 不是普通置顶问题，需要同时处理 Space membership 与窗口 level；历史会话应把模型视为会话元数据而非可编辑输入。
- 是否需更新技术文档：是。

## ISSUE-031
- 发现时间：2026-05-06
- 发现者：用户反馈
- 相关任务：H. 大对话窗口 UI
- 严重程度：改进
- 问题现象：大聊天窗口顶端仍显示 “DeskSprite Chat”；模型选择触发器显示了描述小字，入口不够干净；无用户 API 配置时菜单里“默认模型”和 CloseAI 重复。
- 原因分析：Tauri chat 窗口仍设置了原生 title；自定义模型触发器复用了菜单行项的标题/描述双行结构；模型选项没有根据用户配置数量做去重。
- 解决方案：chat 窗口 title 改为空；触发器只保留模型名称和 chevron；当用户没有自定义 API 配置时，菜单只渲染一个 CloseAI 默认项。
- 涉及文件：`src-tauri/src/commands/window.rs`, `src/features/chat/ChatDialog.tsx`, `PROGRESS.md`, `ISSUES.md`
- 经验总结：主入口和下拉菜单的信息密度应该分层，入口保持短，详细信息放在展开态。
- 是否需更新技术文档：是。

## ISSUE-032
- 发现时间：2026-05-06
- 发现者：用户反馈
- 相关任务：H. 大对话窗口 UI
- 严重程度：改进
- 问题现象：模型选择按钮高度偏矮、宽度偏长；历史对话的模型展示仍像一个文本框/按钮。
- 原因分析：可交互模型触发器和历史模型展示复用了同一尺寸体系，导致只读历史元信息也呈现为控件。
- 解决方案：可交互触发器改为 40px 高、220px 宽；历史模型展示改为左上角 11px 白底小字，无边框、无圆角、无控件填充。
- 涉及文件：`src/features/chat/ChatDialog.tsx`, `PROGRESS.md`, `ISSUES.md`
- 经验总结：同一语义字段在“可编辑”和“只读历史”状态下应有明显视觉差异，避免用户误以为可操作。
- 是否需更新技术文档：是。

## ISSUE-033
- 发现时间：2026-05-06
- 发现者：用户反馈
- 相关任务：H. 小对话窗口 UI
- 严重程度：改进
- 问题现象：小对话窗口的消息气泡被固定成整行宽度，短消息也撑满对话框。
- 原因分析：小窗消息传入 `fullWidth` 后直接使用 `w-full max-w-full`，把“最大可占满”实现成了“始终占满”。
- 解决方案：移除 `w-full`，保留 `max-w-full`，让 flex item 按内容收缩，同时长消息仍可撑到窗口最大宽度并换行。
- 涉及文件：`src/features/chat/ChatDialog.tsx`, `PROGRESS.md`, `ISSUES.md`
- 经验总结：最大宽度约束和固定宽度是两种不同语义，聊天气泡应优先按内容收缩。
- 是否需更新技术文档：是。

## ISSUE-034
- 发现时间：2026-05-06
- 发现者：用户反馈
- 相关任务：H. 大对话窗口 / A. AI 默认人格
- 严重程度：严重
- 问题现象：大聊天窗口历史对话点击后无法稳定打开；默认 system prompt 需要补充独立灵宠、不讨好用户的行为边界。
- 原因分析：历史加载只更新当前 active panel，若 active panel 状态异常或处于多面板布局，用户会看不到加载结果；加载历史时也未显式清理输入、图片和 streaming 状态。Prompt 只覆盖简洁人格，没有约束主动讨好式话术。
- 解决方案：点击历史时重新读取 `conversations` 和 messages，加载到有效面板并切回 single layout，同时清空输入/图片/streaming；新增上一版 expert prompt 兼容常量，并将默认 prompt 更新到带独立性规则的版本。
- 涉及文件：`src/features/chat/ChatDialog.tsx`, `src/features/ai/systemPrompt.ts`, `src-tauri/migrations/0001_initial.sql`, `PROGRESS.md`, `ISSUES.md`
- 经验总结：历史打开是导航行为，应确保目标内容立即成为可见主视图，而不是只隐式更新某个可能不可见的面板。
- 是否需更新技术文档：是。

## ISSUE-035
- 发现时间：2026-05-06
- 发现者：用户反馈
- 相关任务：E. 设置中心 / C. 窗口管理 / B. 应用图标
- 严重程度：改进
- 问题现象：外观设置说明文字多余；主题选择仍是原生 select；对话框宽度范围和默认值不符合预期，且滑块起止点不齐；设置窗口默认宽度偏宽；透明度只影响灵宠不影响小对话框；Dock 图标未使用 idle 形象。
- 原因分析：外观设置仍沿用早期通用 SettingRow 布局，控件宽度各自定义；`dialogWidth` 默认值和 slider 范围未同步最新交互规格；小对话框未接收 `petOpacity`；Tauri bundle 图标仍是旧图标资源。
- 解决方案：重写外观设置行布局为固定 label/control 栅格；主题选择改为 popover；dialogWidth 默认 300 并 clamp 到 200-600；设置窗口改为 62% 宽、70% 高；小窗 `ChatDialog` 接收 `dialogOpacity`；用 idle.png 等比置入透明方形画布并重新生成全部 bundle icons。
- 涉及文件：`src/features/settings/SettingsPanel.tsx`, `src/features/settings/settingsStore.ts`, `src/App.tsx`, `src/features/chat/ChatDialog.tsx`, `src-tauri/src/commands/window.rs`, `src-tauri/icons/*`, `PROGRESS.md`, `ISSUES.md`
- 经验总结：设置页的滑块应共享同一度量系统；应用图标需要同时更新 png/ico/icns，macOS Dock 主要依赖 icns。
- 是否需更新技术文档：是。

## ISSUE-036
- 发现时间：2026-05-06
- 发现者：用户反馈
- 相关任务：E. 设置中心 / H. 小对话窗口
- 严重程度：改进
- 问题现象：透明度设置已影响灵宠和小对话框，但未影响小对话框上方的图片、语音、放大 3 个悬浮按钮。
- 原因分析：`FloatingToolButton` 没有接收透明度参数，按钮仍按默认不透明度渲染。
- 解决方案：给 `FloatingToolButton` 增加 `opacity` 属性，并从 `settings.petOpacity` 传入三个工具按钮。
- 涉及文件：`src/App.tsx`, `PROGRESS.md`, `ISSUES.md`
- 经验总结：外观透明度要覆盖同一交互组内所有可见元素，避免按钮和面板视觉层级不一致。
- 是否需更新技术文档：是。

## ISSUE-037
- 发现时间：2026-05-06
- 发现者：用户反馈
- 相关任务：E. 设置中心 / F. 灵宠动画
- 严重程度：改进
- 问题现象：项目里已有 `petJump`、`petWobble`、`petBreathe` keyframes，但用户无法在设置中启用、调节，也无法让动作与 PNG 形象切换同步。
- 原因分析：灵宠渲染层只固定使用 `petBounce`，动作没有进入 settings store；PNG 切换逻辑只更新 `currentFrame`，没有同步更新动作状态。
- 解决方案：新增 `petMotions` 设置项，外观页提供三个动作的开关、幅度、速度倍率控件；`PetAvatar` 抽出切图+切动作的统一函数，自动切图和非拖拽点击都走同一同步路径；CSS keyframes 改为 CSS 变量驱动幅度。
- 涉及文件：`src/features/settings/settingsStore.ts`, `src/features/settings/SettingsPanel.tsx`, `src/App.tsx`, `src/features/pet/PetAvatar.tsx`, `src/index.css`, `PROGRESS.md`, `ISSUES.md`
- 经验总结：用户可配置动画应把“启用状态”和“参数”都放进持久化设置；同步需求应复用已有事件边界，而不是新增独立动画定时器。
- 是否需更新技术文档：是。

## ISSUE-038
- 发现时间：2026-05-06
- 发现者：用户反馈
- 相关任务：F. 灵宠渲染 / C. 窗口管理
- 严重程度：严重
- 问题现象：灵宠形象背后出现明显白色矩形背景，看起来像有两个可见图层。
- 原因分析：`PetAvatar` 外层交互容器为了增强命中区域，设置了 `rgba(255,255,255,0.001)`；在 macOS 透明 WebView 合成和缩放后，这个极低 alpha 仍可能被肉眼看到。
- 解决方案：移除白色 alpha 背景，保留透明外层 DOM 容器承接点击、拖拽、右键事件；真正的灵宠形象继续由 canvas/video 绘制。
- 涉及文件：`src/features/pet/PetAvatar.tsx`, `PROGRESS.md`, `ISSUES.md`
- 经验总结：透明窗口中的“几乎透明”颜色仍可能被系统合成放大为可见色块；命中层应避免依赖可绘制背景色。
- 是否需更新技术文档：是。

## ISSUE-039
- 发现时间：2026-05-06
- 发现者：用户反馈
- 相关任务：F. 灵宠渲染
- 严重程度：严重
- 问题现象：去掉白色 alpha 命中层后，灵宠背后仍有半透明框线；动作时该框线不随宠物移动，形象切换后还会残留第一张形象的轮廓。
- 原因分析：内置 PNG 的非透明 alpha 会触达源图边缘，缩放后容易形成边缘线；`PetAvatar` 外层的 `overflow: hidden`、`isolation`、`contain: paint` 会在透明 WebView 中制造静态裁剪/合成层；复用同一个 canvas 也增加旧纹理边界被保留的概率；透明无边框窗口的系统阴影也可能形成固定矩形框。
- 解决方案：移除外层裁剪/隔离/contain 属性；canvas 随 `src` 变化强制 remount；清屏改为 reset transform + `clearRect`；绘制时使用 2px 透明内边距，并从源图四边裁掉约 0.4% 的边缘像素，避免源 PNG 边缘参与最终缩放；创建宠物窗时显式 `.shadow(false)`。
- 涉及文件：`src/features/pet/PetAvatar.tsx`, `src-tauri/src/commands/window.rs`, `PROGRESS.md`, `ISSUES.md`
- 经验总结：透明桌面宠物不能让裁剪层、源图边缘和复用 canvas 三者叠加；干净透明渲染要同时控制 DOM 合成层和位图绘制边界。
- 是否需更新技术文档：是。

## ISSUE-040
- 发现时间：2026-05-07
- 发现者：用户反馈
- 相关任务：F. 灵宠动画 / H. 小对话窗口
- 严重程度：改进
- 问题现象：用户对话时，灵宠仍可能继续执行 `petJump`、`petWobble`、`petBreathe` 等动作动画。
- 原因分析：自动 PNG 切换已在 `dialogOpen` 时停止，但 CSS motion style 仍会渲染；手动点击仍会随机切换动作；视频类形象也没有跟随对话状态暂停。
- 解决方案：把 `dialogOpen` 作为统一的 `animationsPaused` 开关；暂停时不生成 motion style，手动切图不再切动作；视频形象在暂停时调用 `pause()`，关闭对话后恢复播放。
- 涉及文件：`src/features/pet/PetAvatar.tsx`, `PROGRESS.md`, `ISSUES.md`
- 经验总结：对话态是用户注意力集中场景，动画暂停要覆盖 CSS 动作、自动切图、手动动作切换和媒体播放。
- 是否需更新技术文档：是。

## ISSUE-041
- 发现时间：2026-05-07
- 发现者：用户反馈
- 相关任务：H. 小对话窗口
- 严重程度：改进
- 问题现象：小对话窗依赖右键入口，缺少快速展开/收起；宠物窗口失焦后小对话窗会自动隐藏，用户希望回复继续显示直到主动收起。
- 原因分析：`PetWindow` 监听 `onFocusChanged` 并在失焦时调用 `closeChat()`；小窗没有常驻显式 toggle 控件；展开逻辑没有默认恢复最近历史对话。
- 解决方案：移除失焦自动关闭逻辑；在灵宠右侧新增常驻箭头按钮，点击时显式展开/收起；展开时读取最近一条 `conversations` 记录并以历史模式打开，没有历史则新建对话。
- 涉及文件：`src/App.tsx`, `PROGRESS.md`, `ISSUES.md`
- 经验总结：对话窗口属于持续任务，不应由窗口焦点隐式控制生命周期；关闭/打开应使用用户可见、可预测的显式控件。
- 是否需更新技术文档：是。

## ISSUE-042
- 发现时间：2026-05-07
- 发现者：用户反馈
- 相关任务：H. 小对话窗口 / C. 窗口管理
- 严重程度：严重
- 问题现象：展开/收起按钮和图片/语音/放大按钮分散；工具按钮默认视觉过强；放大大窗后不能接续小窗当前会话；灵宠拖到屏幕边缘时，小对话框容易被屏幕裁切。
- 原因分析：展开按钮单独定位，后 3 个按钮只在小窗打开时另一处渲染；大窗启动入口没有传递当前小窗 `conversationId`；系统拖拽结束后没有窗口边界修正，且小窗宽度只使用设置值，没有结合当前屏幕工作区。
- 解决方案：将 4 个工具按钮合并成一排，后 3 个在小窗关闭时隐藏；按钮默认半透明/低饱和，hover 后恢复；放大前把当前 chat store/pet store 会话 id 写入 handoff 并发出窗口事件，大窗初始或已打开时加载该会话；宠物窗口移动/变更尺寸后按当前 monitor workArea 夹回 16px 安全边距，小窗宽度按工作区自动收窄。
- 涉及文件：`src/App.tsx`, `src/features/chat/ChatDialog.tsx`, `PROGRESS.md`, `ISSUES.md`
- 经验总结：小窗和大窗是同一对话任务的两个视图，切换视图必须传递会话上下文；桌面悬浮窗需要在每次移动和尺寸变化后主动做屏幕边界保护。
- 是否需更新技术文档：是。

## ISSUE-043
- 发现时间：2026-05-07
- 发现者：用户反馈
- 相关任务：H. 对话窗口 UI
- 严重程度：改进
- 问题现象：LLM 回复生成前的占位仍是三个点，不符合新的 developer-facing CLI 风格要求。
- 原因分析：小窗和大窗都通过 `message.content === '...'` 识别 pending assistant 消息，并渲染 `TypingDots`。
- 解决方案：新增 `Terminal` loading component，渲染等宽 prompt 和闪烁方块光标；`MessageBubble` 保留内部 `...` sentinel，但 pending UI 改为 `<Terminal prompt="$" />`。
- 涉及文件：`src/components/loading-ui/terminal.tsx`, `src/features/chat/ChatDialog.tsx`, `src/index.css`, `PROGRESS.md`, `ISSUES.md`
- 经验总结：流式消息状态标记和展示组件要解耦，内部 sentinel 可以稳定状态机，外部 loader 可以随 UI 规范替换。
- 是否需更新技术文档：是。

## ISSUE-044
- 发现时间：2026-05-07
- 发现者：用户反馈
- 相关任务：C. 窗口管理 / H. 小对话窗口 / F. 灵宠动画
- 严重程度：严重
- 问题现象：拖动灵宠时明显抖动；灵宠位于屏幕角落时展开小对话窗，灵宠本体会突然跳动；多个窗口交互看起来不够丝滑。
- 原因分析：旧逻辑在窗口 moved 事件里持续做贴边修正，拖拽过程中会和系统原生拖动互相抢位置；展开小窗时按窗口左上角扩缩，没有把灵宠屏幕坐标作为锚点；`PetAvatar` 还会在右键菜单开关时直接 `setSize`，绕过外层布局；宠物动作动画也会叠加在拖拽视觉上。
- 解决方案：把窗口尺寸和位置统一收口到 `PetWindow`；moved 事件只做 debounce 后的拖拽结束收尾；程序自身布局更新触发的 moved 事件被忽略；布局计算以灵宠当前屏幕坐标为锚点，自动选择小窗方位并按工作区压缩尺寸；拖拽期间暂停宠物动作；移除 `PetAvatar` 直接修改窗口尺寸的逻辑。
- 涉及文件：`src/App.tsx`, `src/features/pet/PetAvatar.tsx`, `PROGRESS.md`, `ISSUES.md`
- 经验总结：悬浮宠物窗口必须只有一个布局协调者；原生拖动期间不要实时纠偏，边界保护适合在移动停止后一次性完成。
- 是否需更新技术文档：是。

## ISSUE-045
- 发现时间：2026-05-07
- 发现者：用户反馈
- 相关任务：C. 窗口管理 / H. 小对话窗口
- 严重程度：严重
- 问题现象：灵宠仍会被先拖出屏幕后再跳回；位于屏幕边缘时右键菜单和历史二级菜单容易显示不全；LLM 生成前占位样式需要改为单点 pulse。
- 原因分析：系统原生拖拽不暴露实时边界约束，只能在 moved 事件后纠偏，因此会出现“先越界再回弹”；右键菜单仍由头像内部按当前小窗口尺寸渲染，没有为菜单和二级菜单预留足够窗口区域；Terminal loader 与新的 ChatGPT 式最小占位不一致。
- 解决方案：改为受控 pointer 拖拽，每次移动都按工作区和灵宠本体尺寸计算硬边界并设置窗口位置；右键菜单打开时由 `PetWindow` 扩展透明窗口并保持灵宠屏幕锚点不变，菜单和二级菜单分别 clamp/自动左右翻转；移除“退出”；新增 `PulseDot` loader 并替换 Terminal loader。
- 涉及文件：`src/App.tsx`, `src/features/pet/PetAvatar.tsx`, `src/features/chat/ChatDialog.tsx`, `src/components/loading-ui/pulse-dot.tsx`, `src/index.css`, `PROGRESS.md`, `ISSUES.md`
- 经验总结：需要硬边界的悬浮窗不能依赖系统拖拽后的补偿；边缘菜单必须同时处理外层窗口可用区域和菜单内部弹出方向。
- 是否需更新技术文档：是。

## ISSUE-046
- 发现时间：2026-05-07
- 发现者：用户反馈
- 相关任务：C. 窗口管理 / H. 小对话窗口 / E. 设置中心
- 严重程度：严重
- 问题现象：展开小对话窗、拖拽到边界或切换窗口布局时仍会出现一次闪烁；边界拖拽仍有轻微回弹；小窗图标、对话框和文字偏大；用户希望小窗不再显示在灵宠上方，并且可以设置字号。
- 原因分析：`dialogOpen` 后立即渲染 ChatDialog，但透明窗口 resize/reposition 仍在异步执行，中间帧会暴露旧尺寸旧坐标；受控拖拽结束后仍可能收到延迟 moved 事件并触发收尾 layout；旧布局在底部空间不足时会把对话框放到灵宠上方；小窗字号没有持久化设置项。
- 解决方案：增加 `dialogSurfaceReady` 门控，小窗内容等原生窗口布局完成后再挂载；受控拖拽期间和松手后一段时间忽略 moved 事件，并取消松手后的二次 layout；小窗布局优先下方，空间不足时切到左右侧；缩小工具按钮和 compact chat 间距；新增 `compactChatFontSize` 设置并接入小窗消息、历史、输入框和 PulseDot。
- 涉及文件：`src/App.tsx`, `src/features/chat/ChatDialog.tsx`, `src/features/settings/SettingsPanel.tsx`, `src/features/settings/settingsStore.ts`, `src/components/loading-ui/pulse-dot.tsx`, `src/index.css`, `PROGRESS.md`, `ISSUES.md`
- 经验总结：透明悬浮窗的内容挂载要晚于原生窗口几何变更；拖拽硬边界要同时避免拖动过程越界和拖动结束后的补偿事件。
- 是否需更新技术文档：是。

## ISSUE-047
- 发现时间：2026-05-07
- 发现者：用户反馈
- 相关任务：C. 窗口管理 / F. 灵宠动画 / H. 小对话窗口
- 严重程度：严重
- 问题现象：弹出小对话窗时，灵宠本体有时仍会跳动或闪烁；打开小窗对话后灵宠动作被暂停，但用户希望运动状态保持不变。
- 原因分析：原生透明窗口的 move/resize 与 React 内部 `petLeft/petTop` 更新不是原子操作；旧逻辑先提交内部布局，再等待原生窗口移动/缩放，或用 `Promise.all` 让 move 先完成但 resize 未完成，都会暴露一帧旧窗口/新布局不一致的画面；`PetAvatar` 把 `dialogOpen` 纳入 `animationsPaused`，导致小窗打开时停止动作。
- 解决方案：将 layout 提交延后到原生窗口几何变更之后；窗口展开时按 resize -> move -> apply layout 的顺序执行，缩短中间帧；`animationsPaused` 改为只受拖拽状态控制，小窗对话时动作继续播放。
- 涉及文件：`src/App.tsx`, `src/features/pet/PetAvatar.tsx`, `PROGRESS.md`, `ISSUES.md`
- 经验总结：透明悬浮窗口的视觉稳定性取决于原生窗口几何和 DOM 内部坐标的提交顺序；对话态不应隐式改变用户配置的灵宠运动状态。
- 是否需更新技术文档：是。

## ISSUE-048
- 发现时间：2026-05-07
- 发现者：用户反馈
- 相关任务：C. 窗口管理 / H. 小对话窗口
- 严重程度：严重
- 问题现象：即使调整了窗口 resize/move 与 DOM layout 的提交顺序，灵宠接近屏幕边缘时，弹出小对话窗仍会出现可见闪烁和跳动。
- 原因分析：只要小对话框和灵宠共用同一个透明窗口，靠近边缘时就必须同时改变窗口左上角和灵宠在窗口内部的相对坐标；这两个变化无法在 WebView 与原生窗口之间完全原子化提交，因此边缘场景仍会露出中间帧。
- 解决方案：将小对话框拆分为独立 `compact-chat` 透明窗口；灵宠窗口不再因小窗打开/关闭而 resize/move/re-layout，只负责本体和工具按钮；小窗独立跟随灵宠屏幕坐标定位，工具按钮通过事件转发图片/语音操作，小窗回传 conversationId 供大窗接续。
- 涉及文件：`src/App.tsx`, `src/features/chat/ChatDialog.tsx`, `src-tauri/src/commands/window.rs`, `src-tauri/src/lib.rs`, `src-tauri/capabilities/default.json`, `PROGRESS.md`, `ISSUES.md`
- 经验总结：悬浮宠物本体要稳定，就不能让外部面板改变它所在窗口的几何；复杂面板应独立成 sibling window，而不是塞进同一个透明宠物窗口。
- 是否需更新技术文档：是。

## ISSUE-049
- 发现时间：2026-05-07
- 发现者：用户反馈
- 相关任务：C. 窗口管理 / H. 小对话窗口
- 严重程度：严重
- 问题现象：灵宠靠近屏幕边缘时，打开小聊天窗口正常，但收起小聊天窗口时灵宠会向上跳一下；右侧 4 个小图标显示不完整，放大按钮可能消失。
- 原因分析：收起小窗仍会让灵宠窗口执行一次 layout effect，边缘处会被窗口整体 clamp 到工作区内，表现为宠物向上跳；同时折叠窗口宽度只按宠物本体估算，没有为 4 个右侧工具按钮预留完整宽度，拖到右侧边缘后按钮区域会被透明窗口或屏幕边界裁切。
- 解决方案：移除 `dialogOpen` 对灵宠窗口 layout effect 的依赖，收起小窗只隐藏 `compact-chat`；折叠宽度固定包含 4 个工具按钮；拖拽硬边界按整个灵宠窗口计算，防止工具区越过屏幕边缘。
- 涉及文件：`src/App.tsx`, `PROGRESS.md`, `ISSUES.md`
- 经验总结：独立小窗之后，聊天开关不应再参与宠物窗口几何；透明工具区也是可见交互面，边界计算必须把它纳入同一个硬约束。
- 是否需更新技术文档：是。

## ISSUE-050
- 发现时间：2026-05-07
- 发现者：用户反馈
- 相关任务：H. 大对话窗口 / R43 语音功能 / R45 多模型配置
- 严重程度：严重
- 问题现象：大对话窗口发送消息后白屏，无法正常继续对话；同时当前仓库 `pnpm build` 失败。
- 原因分析：多模型/朗读功能接入后，`StandaloneChatPanel` 在消息渲染处直接引用外层不存在的 `settings` 变量；发送后 `panel.messages` 从空变为非空，渲染 `MessageBubble` 时触发 `ReferenceError`，导致 React 白屏。新增语音和设置代码还带入了若干 TypeScript 错误，包括 Web Speech API 类型缺少 `stop`、`onerror` 签名不匹配、`resultIndex` 可空，以及设置页无效 `hint` prop 和未使用导入。
- 解决方案：由 `StandaloneChatWorkspace` 把 `settings.speakRate` 作为 prop 传给 `StandaloneChatPanel`；补全语音识别类型并防御 `resultIndex` 缺省；清理未使用导入/解构，给 `AppearanceRow` 增加 `hint` prop 支持。
- 涉及文件：`src/features/chat/ChatDialog.tsx`, `src/App.tsx`, `src/features/settings/SettingsPanel.tsx`, `src/features/settings/apiConfigStore.ts`, `src/features/pet/petStore.ts`, `PROGRESS.md`, `ISSUES.md`
- 经验总结：大窗和小窗的面板组件不要隐式读取父级 hook 变量；消息从空到非空的首帧渲染是聊天窗口最关键的崩溃检查点，必须让 `pnpm build` 在合并前通过。
- 是否需更新技术文档：是。

## ISSUE-051
- 发现时间：2026-05-07
- 发现者：用户反馈
- 相关任务：H. 对话输入 / R43 语音功能 / R45 多模型配置
- 严重程度：改进
- 问题现象：首次语音输入需要系统麦克风权限弹窗；对话输入不支持直接粘贴剪贴板图片；用户把图片发给不支持视觉/文件输入的模型时缺少提前提示。
- 原因分析：语音输入只依赖 Web Speech API 启动时的隐式权限行为，macOS bundle 也缺少麦克风/语音识别用途说明；图片输入只支持文件选择器；发送链路没有在请求前根据 provider/model 做附件能力判断。
- 解决方案：语音输入前先调用 `getUserMedia` 并立即释放音轨，确保首次使用触发系统授权；新增 `Info.plist` 声明 `NSMicrophoneUsageDescription` 和 `NSSpeechRecognitionUsageDescription`；Composer 监听 paste 事件并从 `clipboardData` 提取图片文件；发送前用模型名/provider 启发式检查视觉能力，不支持时弹出提示并阻止发送。
- 涉及文件：`src/features/chat/ChatDialog.tsx`, `src-tauri/Info.plist`, `PROGRESS.md`, `ISSUES.md`
- 经验总结：输入附件能力要在客户端先校验，避免用户把图片请求发给文本模型后才看到 API 报错；系统隐私权限需要同时有运行时触发和 bundle 用途说明。
- 是否需更新技术文档：是。

## ISSUE-052
- 发现时间：2026-05-07
- 发现者：用户反馈
- 相关任务：H. 语音输入
- 严重程度：严重
- 问题现象：点击语音输入时出现“当前系统不支持麦克风权限请求”，导致无法继续尝试系统语音输入。
- 原因分析：上一轮把 `navigator.mediaDevices.getUserMedia` 当作语音输入的必要前置条件；但 Tauri/WKWebView 环境可能没有暴露该 API，即使系统 `SpeechRecognition` 仍可直接启动并请求麦克风。
- 解决方案：把 `getUserMedia` 改为可选预请求；存在时先用它触发权限，不存在时直接调用 `SpeechRecognition.start()`；启动失败时再提示系统语音输入不可用。
- 涉及文件：`src/features/chat/ChatDialog.tsx`, `PROGRESS.md`, `ISSUES.md`
- 经验总结：权限预请求只能作为增强路径，不能阻断真正的系统能力调用；桌面 WebView 中浏览器 API 暴露情况比普通浏览器更不稳定。
- 是否需更新技术文档：是。
