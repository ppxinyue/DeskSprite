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
