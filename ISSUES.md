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

## ISSUE-053
- 发现时间：2026-05-07
- 发现者：用户反馈
- 相关任务：H. 语音输入 / H. 历史对话
- 严重程度：严重
- 问题现象：语音输入按钮点击后看起来没有任何反应；历史聊天记录中上传/粘贴过的图片消失，只剩文字。
- 原因分析：语音失败路径只把错误写入输入框，在小窗外置语音按钮场景下反馈不明显；当前 WebView 不支持 `SpeechRecognition` 时没有显式弹窗。图片方面，消息表只保存 `image_path`，但文件选择器和剪贴板图片只有 dataURL 没有真实路径，插入数据库时写入空 path，历史加载自然无法恢复图片。
- 解决方案：语音点击后先进入 listening 状态；缺少系统语音识别接口时弹窗提示。发送含图消息时把 dataURL 写入 `image_path` 字段；历史加载时识别 `data:image/...` 并填充 `imageDataUrl`，设置页历史详情同步渲染图片。
- 涉及文件：`src/features/chat/ChatDialog.tsx`, `src/features/settings/SettingsPanel.tsx`, `PROGRESS.md`, `ISSUES.md`
- 经验总结：历史记录要保存可恢复的数据本体，不能只保存临时浏览器文件引用；外置按钮触发的异步能力必须有显式状态或错误反馈。
- 是否需更新技术文档：是。

## ISSUE-054
- 发现时间：2026-05-07
- 发现者：用户反馈
- 相关任务：E. 设置中心 / F. 灵宠形象
- 严重程度：严重
- 问题现象：设置-个性化形象里看不到系统默认灵宠形象；上传新图片后，设置页无法显示，灵宠前端也无法渲染；文件选择器允许选择不适合的图片格式。
- 原因分析：设置页只渲染 `userFrames`，没有把 `defaultAssets` 纳入网格展示。用户上传图片保存到 app local data 后通过 `convertFileSrc` 渲染，但 Tauri 配置未启用 `protocol-asset`/`assetProtocol`，CSP 也没有放行 `asset:` 和 `http://asset.localhost`，导致本地图片被 WebView 拦截。文件选择器包含 SVG，但 Rust `image` 转码链路不支持 SVG。
- 解决方案：设置页默认图和自定义图同时展示，默认图只读；启用 asset protocol 并限制 scope 到 `$APPLOCALDATA/assets/**`，CSP 放行 asset 图片/媒体；文件选择器和 Rust 导入命令统一限制为 PNG/JPG/JPEG/WEBP/GIF/BMP。
- 涉及文件：`src/features/settings/SettingsPanel.tsx`, `src/features/chat/ChatDialog.tsx`, `src-tauri/src/commands/images.rs`, `src-tauri/tauri.conf.json`, `src-tauri/Cargo.toml`, `src-tauri/Cargo.lock`, `PROGRESS.md`, `ISSUES.md`
- 经验总结：`convertFileSrc` 不是纯前端转换，必须同时打开 Tauri asset protocol、设置访问 scope、并在 CSP 中允许对应协议；设置页应展示“可用资源全集”，而不是只展示用户覆盖资源。
- 是否需更新技术文档：是。

## ISSUE-055
- 发现时间：2026-05-07
- 发现者：用户反馈
- 相关任务：H. 语音输入 / R43 唤醒词检测
- 严重程度：阻断
- 问题现象：软件启动后快速闪退；崩溃报告显示 `Namespace TCC, Code 0`，原因是访问语音识别隐私数据时缺少 `NSSpeechRecognitionUsageDescription`。
- 原因分析：开发模式由 `node` 启动裸 Tauri 可执行文件，不一定处于带 `Info.plist` 的 `.app` bundle；如果用户曾开启唤醒词，宠物窗口启动后会自动调用 `SpeechRecognition.start()`，macOS 在缺少语音识别用途说明时不会返回普通错误，而是直接终止进程。
- 解决方案：新增后端安全检查命令，只有当前 macOS 运行环境确认具备 `NSMicrophoneUsageDescription` 和 `NSSpeechRecognitionUsageDescription` 时，前端才允许启动 `SpeechRecognition`；唤醒词和语音按钮都接入该检查。
- 涉及文件：`src-tauri/src/commands/desktop.rs`, `src-tauri/src/lib.rs`, `src/App.tsx`, `src/features/chat/ChatDialog.tsx`, `PROGRESS.md`, `ISSUES.md`
- 经验总结：macOS TCC 缺用途说明是进程级硬崩，不能依赖 try/catch；所有隐私敏感 API 都必须在调用前确认 bundle 声明和运行环境。
- 是否需更新技术文档：是。

## ISSUE-056
- 发现时间：2026-05-07
- 发现者：用户反馈
- 相关任务：E. 设置中心 / F. 灵宠形象
- 严重程度：严重
- 问题现象：个性化形象中的默认图片和新上传图片都只显示为空占位框；图片卡片缺少明确的“使用/不使用”状态控制，系统默认图片需要不可删除但可选择不使用。
- 原因分析：设置页默认图使用 `assets/...` 相对路径，在当前 Tauri/Vite WebView 下可能解析不到 public 资源；同时形象配置只有“默认图列表”和“上传图列表”，渲染逻辑一旦发现上传图就默认全部使用上传图，缺少每张图片的启用/禁用状态。
- 解决方案：内置图片预览和灵宠渲染改为 `/assets/...` 绝对路径；新增 `disabledFrames` 配置记录不参与随机切换的图片；设置页所有图片都显示使用切换，上传图可删除，默认图删除按钮置灰。
- 涉及文件：`src/features/settings/SettingsPanel.tsx`, `src/features/pet/animations.ts`, `src/features/pet/PetAvatar.tsx`, `PROGRESS.md`, `ISSUES.md`
- 经验总结：public 资源在桌面 WebView 中应使用绝对路径；“资源库”和“启用集合”必须分开建模，否则上传资源会隐式覆盖默认资源，无法支持逐张启用。
- 是否需更新技术文档：是。

## ISSUE-057
- 发现时间：2026-05-07
- 发现者：用户反馈
- 相关任务：E. 设置中心 / F. 灵宠形象 / H. 小对话窗口
- 严重程度：严重
- 问题现象：上传的宠物图片仍然无法在设置页预览；小聊天框的朗读和复制按钮悬在气泡侧边，不符合当前小窗布局要求。
- 原因分析：上传图依赖 `convertFileSrc` 和 Tauri asset protocol，但不同窗口、开发模式和 CSP 下 asset URL 解析仍可能失败；设置页没有独立的图片内容读取兜底。小窗和大窗共用 `MessageBubble` 的侧边绝对定位按钮，小窗宽度更窄时显得拥挤。
- 解决方案：新增后端命令把已导入的宠物图片安全读取为 data URL，设置页和灵宠本体都优先使用 data URL；`MessageBubble` 在 compact 模式下把朗读/复制按钮渲染到气泡下方，大窗保持原布局。
- 涉及文件：`src-tauri/src/commands/images.rs`, `src-tauri/src/lib.rs`, `src/features/settings/SettingsPanel.tsx`, `src/features/pet/PetAvatar.tsx`, `src/features/chat/ChatDialog.tsx`, `PROGRESS.md`, `ISSUES.md`
- 经验总结：本地用户资源预览不能只依赖协议 URL；对于小窗口组件，共用消息组件时必须按 compact 模式调整操作按钮的位置。
- 是否需更新技术文档：是。

## ISSUE-058
- 发现时间：2026-05-07
- 发现者：用户反馈
- 相关任务：H. 小对话窗口 / H. 图片输入 / E. 个性化形象
- 严重程度：改进
- 问题现象：小聊天框里不需要复制和朗读按钮；大聊天窗口的上传图标像“上传文件”而不是“上传图片”；上传图片入口仍可能让用户选中非图片文件，随后才由后端报错。
- 原因分析：`MessageBubble` 复用了大窗操作按钮逻辑并在 compact 模式额外渲染按钮；图片选择器只依赖 `accept`/dialog filter，不同系统文件选择器仍可能允许用户切到所有文件或选中不符合格式的材料。
- 解决方案：compact 模式完全不渲染复制/朗读按钮；上传入口改用 `ImagePlus` 图片图标；聊天上传和设置上传都在前端先校验 PNG/JPG/JPEG/WEBP/GIF/BMP，不合法时立即弹出提示并阻止导入。
- 涉及文件：`src/features/chat/ChatDialog.tsx`, `src/features/settings/SettingsPanel.tsx`, `PROGRESS.md`, `ISSUES.md`
- 经验总结：文件选择器过滤只能提升默认体验，不能作为校验；图片入口的图标和校验都要表达“这里只接收图片”。
- 是否需更新技术文档：是。

## ISSUE-059
- 发现时间：2026-05-07
- 发现者：用户反馈
- 相关任务：D. AI 配置 / H. 大对话窗口
- 严重程度：严重
- 问题现象：模型配置里的服务商 base_url 与用户指定列表不一致；模型名称不应由内置列表限制；快速测试按钮不能真实返回 API key 无效、模型不存在等服务端错误。
- 原因分析：旧 provider preset 维护了一组容易过期的模型列表，且 kimi/minimax/qwen 等 base_url 与目标值不一致；测试命令只检查本地 keychain，甚至没有使用配置里的真实 keyring_ref，也不会向服务商发请求。
- 解决方案：provider preset 改为用户指定的 11 个服务商和 base_url；模型名改为手填；测试按钮在前端读取配置对应 API Key 并发起最小模型请求，失败时解析并展示服务商原始错误信息。
- 涉及文件：`src/features/ai/providers.ts`, `src/features/settings/SettingsPanel.tsx`, `PROGRESS.md`, `ISSUES.md`
- 经验总结：模型测试必须验证“base_url + model + API key”组合，而不是只验证本地保存状态；模型名应由用户输入以适配不断变化的供应商模型。
- 是否需更新技术文档：是。

## ISSUE-060
- 发现时间：2026-05-07
- 发现者：用户反馈
- 相关任务：D. AI 配置
- 严重程度：改进
- 问题现象：模型配置缺少自定义服务商；新增/编辑弹窗里的“配置名称”字段造成额外认知负担；“获取 API Key”链接在桌面 WebView 内不保证能真正打开外部网页。
- 原因分析：上一轮固定 provider preset 时把自定义项一起移除了；配置名称只是展示别名，不是实际模型连接所需字段；普通 `<a target="_blank">` 在 Tauri WebView 中可能被窗口策略拦截或留在应用内。
- 解决方案：恢复“自定义”选项并允许编辑 Base URL；删除配置名称输入和界面展示；新增 `open_external_url` 命令，通过系统浏览器打开服务商 API key 文档。
- 涉及文件：`src/features/ai/providers.ts`, `src/features/ai/types.ts`, `src/features/settings/SettingsPanel.tsx`, `src/features/chat/ChatDialog.tsx`, `src-tauri/src/commands/desktop.rs`, `src-tauri/src/lib.rs`, `PROGRESS.md`, `ISSUES.md`
- 经验总结：桌面应用里的外部文档入口应走系统浏览器；模型配置表单只保留真实影响连接的字段。
- 是否需更新技术文档：是。

## ISSUE-061
- 发现时间：2026-05-07
- 发现者：用户反馈
- 相关任务：D. AI 配置 / 模型测试
- 严重程度：严重
- 问题现象：用户刚填写并保存 API Key 后，点击测试模型仍返回 `No matching entry found in secure storage`，说明测试链路没有读到刚保存的 key。
- 原因分析：编辑旧配置时，如果原数据库记录没有 `keyring_ref` 或引用已经失效，前端可能继续复用坏引用；上一轮增加的保存后立即读回校验也会在保存阶段把旧 keychain 异常暴露给用户，导致无法完成重新保存。
- 解决方案：`updateApiConfig` 支持更新 `keyring_ref`；用户重新填写 API Key 时总是生成新的简单格式引用并写回数据库；API Key 留空编辑时不再读取旧钥匙串，测试/调用模型时再读取并提示重新填写。
- 涉及文件：`src/features/settings/apiConfigStore.ts`, `src/lib/db.ts`, `src/features/settings/SettingsPanel.tsx`, `PROGRESS.md`, `ISSUES.md`
- 经验总结：安全存储引用必须和数据库记录同事务语义更新；“重新填写保存”应能刷新坏引用，保存阶段不能因为旧引用异常阻断用户修复配置。
- 是否需更新技术文档：是。

## ISSUE-062
- 发现时间：2026-05-07
- 发现者：用户反馈
- 相关任务：D. AI 配置 / 模型测试 / H. 对话调用
- 严重程度：阻断
- 问题现象：API Key 已经能保存，但测试仍提示“未找到已保存的 API Key”；再次编辑配置时，API Key 输入框看起来又是空的，用户无法确认 key 已本地保存。
- 原因分析：应用把系统 Keychain 当作唯一实际存储，只在数据库保存引用；当前开发/运行环境下 Keychain 写入与读取不稳定，导致数据库有配置但没有可读取的 key。编辑弹窗为了不泄露明文把输入框置空，但没有点状已保存状态，用户会误以为 key 没保存。
- 解决方案：新增本地 `api_key` 持久化字段作为主读取源，Keychain 仅作为兼容备份；保存时写本地隐藏值，测试和对话优先读取本地值；编辑弹窗显示 `••••••••` 占位并支持重新粘贴覆盖。
- 涉及文件：`src-tauri/migrations/0003_add_api_key_to_configs.sql`, `src-tauri/src/lib.rs`, `src/lib/apiKeyStorage.ts`, `src/lib/db.ts`, `src/features/settings/apiConfigStore.ts`, `src/features/settings/SettingsPanel.tsx`, `src/features/ai/defaultModel.ts`, `src/features/ai/aiService.ts`, `PROGRESS.md`, `ISSUES.md`
- 经验总结：桌面应用的关键配置不能只有不可观测的外部安全存储引用；至少要有一个应用本地可迁移、可验证的持久化来源，同时 UI 要明确表达“已保存但不显示明文”。
- 是否需更新技术文档：是。

## ISSUE-063
- 发现时间：2026-05-07
- 发现者：用户反馈
- 相关任务：D. AI 配置 / H. 对话调用
- 严重程度：阻断
- 问题现象：用户新增模型保存后，测试显示 `TypeError`，无法判断是 key、模型名还是服务商配置问题。
- 原因分析：测试和聊天请求在前端 WebView 里直接 `fetch` 服务商 API；很多模型服务商不会给桌面 WebView 源设置 CORS 许可，浏览器会在请求层直接抛 `TypeError`，导致请求甚至没进入服务商接口。
- 解决方案：模型测试改为 Tauri 后端 `reqwest` 请求；聊天调用也改为后端 `chat_completion`，前端只负责传入本地保存的 key 和消息，后端负责 OpenAI/Anthropic 格式适配。
- 涉及文件：`src-tauri/src/commands/ai.rs`, `src-tauri/src/lib.rs`, `src/features/ai/aiService.ts`, `src/features/settings/SettingsPanel.tsx`, `PROGRESS.md`, `ISSUES.md`
- 经验总结：桌面 App 访问第三方模型 API 不应依赖 WebView 跨域能力；所有供应商请求都应走后端网络层，前端只处理 UI 与本地配置。
- 是否需更新技术文档：是。

## ISSUE-064
- 发现时间：2026-05-07
- 发现者：用户反馈
- 相关任务：D. AI 配置 / H. 对话调用
- 严重程度：阻断
- 问题现象：测试返回 `HTTP 400: invalid token: 未找到已保存的 API Key...`，说明内部错误提示被当成 API token 发给了服务商。
- 原因分析：用户模型读取链路同时存在本地 `api_key`、历史 `local:v1:` 编码值和 Keychain fallback；在早期错误路径中，错误提示文本可能进入本地 key 字段，后续解析又把非空字符串当作有效 token。
- 解决方案：用户新增模型改为和默认模型一样，运行时只使用配置对象里的本地 `apiKey`；保存时原样写入 `api_key`，不再 fallback 到 Keychain；加载旧数据时过滤内部错误提示文本。
- 涉及文件：`src/lib/apiKeyStorage.ts`, `src/features/settings/apiConfigStore.ts`, `src/lib/db.ts`, `src/features/settings/SettingsPanel.tsx`, `src/features/ai/defaultModel.ts`, `src/features/ai/aiService.ts`, `PROGRESS.md`, `ISSUES.md`
- 经验总结：错误文本绝不能进入凭证数据流；凭证的真实来源必须单一，默认模型和用户模型应共享同样的调用语义。
- 是否需更新技术文档：是。

## ISSUE-065
- 发现时间：2026-05-07
- 发现者：用户反馈
- 相关任务：D. AI 配置 / 模型测试
- 严重程度：严重
- 问题现象：用户确认配置正确后仍返回 `HTTP 401: invalid token`；默认 CloseAI 模型能工作，但用户新增模型容易失败。
- 原因分析：内置默认模型使用 CloseAI proxy base_url，但用户可选服务商中没有 CloseAI，容易误选 OpenAI 官方 base_url；另外用户粘贴 API Key 时可能包含 `Bearer ` 前缀、引号或不可见空格，导致服务商认为 token 无效。
- 解决方案：新增 CloseAI provider，base_url 与内置默认模型一致；保存和后端请求前都归一化 API Key，去掉 Bearer 前缀、外层引号和不可见空格。
- 涉及文件：`src/features/ai/providers.ts`, `src/features/ai/types.ts`, `src/features/settings/apiConfigStore.ts`, `src-tauri/src/commands/ai.rs`, `PROGRESS.md`, `ISSUES.md`
- 经验总结：默认模型可用的服务商也必须作为用户可选 provider 暴露；API Key 输入必须容忍常见复制格式。
- 是否需更新技术文档：是。

## ISSUE-066
- 发现时间：2026-05-07
- 发现者：用户反馈
- 相关任务：D. AI 配置 / 模型测试
- 严重程度：严重
- 问题现象：CloseAI 用户配置仍返回 `HTTP 400: invalid token: HTTP 401: invalid token`，用户无法判断这是 base_url 不通、Key 没保存、还是服务商拒绝 token。
- 原因分析：测试链路只展示服务商错误，不展示请求 endpoint 和实际参与测试的 Key 摘要；设置页仍提示“钥匙串保存”，与当前本地数据库保存逻辑不一致，进一步干扰判断。
- 解决方案：测试失败信息追加 endpoint、Key 长度、尾号和短指纹；设置列表和编辑弹窗显示同样的安全摘要；保存/读取/后端请求统一移除外层引号、`Bearer `、不可见字符和误粘贴空白。
- 涉及文件：`src/lib/apiKeyStorage.ts`, `src/features/settings/apiConfigStore.ts`, `src/features/settings/SettingsPanel.tsx`, `src-tauri/src/commands/ai.rs`, `PROGRESS.md`, `ISSUES.md`
- 经验总结：凭证问题必须可观测但不能泄密；只显示 `invalid token` 不足以区分“服务商已响应但拒绝 token”和“应用用了错误 token”。
- 是否需更新技术文档：是。

## ISSUE-067
- 发现时间：2026-05-07
- 发现者：复盘整理
- 相关任务：D. AI 配置 / 模型测试 / 工程流程
- 严重程度：改进
- 问题现象：API Key 保存与测试问题被反复修了多轮，每轮只解决一层表象，缺少一份串联“保存、读取、测试、调用、错误解释”的排查说明。
- 原因分析：相关经验分散在多个 issue 和 progress 条目中；技术规格仍保留早期 Keychain/前端直连假设，容易让后续实现者重新走回旧路径。
- 解决方案：新增 `docs/model-config-debugging.md`，记录完整失败链路、当前正确流程、错误含义和 Debug Checklist；后续修改 AI 配置时先对照该文档。
- 涉及文件：`docs/model-config-debugging.md`, `PROGRESS.md`, `ISSUES.md`
- 经验总结：反复失败的 bug 必须沉淀成单独复盘文档；凭证类问题尤其要写清楚“数据源、错误流、可观测性、安全边界”，否则很容易把错误文案、旧引用或浏览器层问题误判成服务商问题。
- 是否需更新技术文档：是，后续需要把 `docs/tech-spec-v0.2.md` 中 Keychain-only 和前端直连的旧假设同步为当前后端请求 + 本地可验证凭证源的实现策略。

## ISSUE-068
- 发现时间：2026-05-07
- 发现者：用户反馈
- 相关任务：E. 个性化形象 / F. 灵宠窗口
- 严重程度：严重
- 问题现象：设置页中默认图片和用户上传图片都无法正常预览，只剩空占位框；其他应用进入 macOS 全屏后，灵宠消失或不再置顶显示。
- 原因分析：预览层仍依赖 public `/assets/...` 路径和本地 asset protocol，任何协议、CSP 或 WebView 解析差异都会让 `<img>` 静默失败；全屏问题一方面来自 macOS Space 对辅助窗口的重新分层，另一方面旧智能附着逻辑在 fullscreen 模式会主动把灵宠挪到屏幕外。
- 解决方案：设置页预览统一转成 data URL 渲染并显示失败状态；macOS 置顶策略增加 fullscreen auxiliary、transient、disallow tiling、setCanHide(false) 等行为，并让 topmost guard 定期重申 pet/compact-chat 两个窗口的 level 和前置顺序；智能附着 fullscreen 模式改为可见悬浮。
- 涉及文件：`src/features/settings/SettingsPanel.tsx`, `src/features/pet/attachEngine.ts`, `src-tauri/src/commands/window.rs`, `PROGRESS.md`, `ISSUES.md`
- 经验总结：设置页预览不能依赖“图片 URL 理论上可访问”，应把资源加载结果变成显式状态；macOS 全屏置顶要同时处理窗口 level、collection behavior、Space membership 和应用自己的隐藏逻辑。
- 是否需更新技术文档：是。

## ISSUE-069
- 发现时间：2026-05-07
- 发现者：方案评估
- 相关任务：I. 语音输入输出
- 严重程度：改进
- 问题现象：当前语音输入依赖系统 Web Speech API，WebView 暴露情况不稳定；系统 TTS 可用但质量不统一。用户希望提供默认 STT/TTS 模型和免费额度，超额后回退系统能力。
- 原因分析：云端 STT/TTS 能提升体验，但默认 API Key 如果直接打包进客户端会被提取，本地额度也只能作为体验限制，不能真正防滥用。
- 解决方案：新增 `docs/voice-stt-tts-plan.md`，建议语音能力设计为 `system | cloud-auto | user-cloud` 三种模式；云端增强使用 CloseAI OpenAI-compatible STT/TTS 接口，失败或超额自动回退系统语音；真正安全的免费额度需要服务端代理控制。
- 涉及文件：`docs/voice-stt-tts-plan.md`, `PROGRESS.md`, `ISSUES.md`
- 经验总结：语音云端增强应是渐进增强而非硬依赖；客户端内置 key 只能视为体验 key，不能承担安全额度控制。
- 是否需更新技术文档：是。

## ISSUE-070
- 发现时间：2026-05-07
- 发现者：实现推进
- 相关任务：I. 语音输入输出 / 设置页额度
- 严重程度：改进
- 问题现象：只有方案文档，没有真实 STT/TTS 调用、额度统计和设置入口；用户无法体验默认语音模型，也无法查看内置额度已用百分比。
- 原因分析：此前语音只保留系统 `SpeechRecognition` / `speechSynthesis`，没有后端音频上传接口；默认 Chat 额度已有本地计数，但 STT/TTS 还没有本机 usage key。
- 解决方案：新增 Rust `transcribe_audio` / `synthesize_speech` 命令；前端新增 `voiceService.ts` 统一处理录音、云端 STT、云端 TTS、额度计数和系统回退；设置页增加语音输入/输出模式和 Chat/STT/TTS 三类内置额度百分比。
- 涉及文件：`src-tauri/Cargo.toml`, `src-tauri/Cargo.lock`, `src-tauri/src/commands/ai.rs`, `src-tauri/src/lib.rs`, `src/features/voice/voiceService.ts`, `src/features/chat/ChatDialog.tsx`, `src/features/settings/SettingsPanel.tsx`, `src/features/settings/settingsStore.ts`, `docs/voice-stt-tts-plan.md`, `PROGRESS.md`, `ISSUES.md`
- 经验总结：云端语音必须设计成“可失败”的增强路径；桌面端要保留系统输入输出兜底，同时把本机额度写成独立 usage key，方便未来替换成服务端额度系统。
- 是否需更新技术文档：是。

## ISSUE-071
- 发现时间：2026-05-07
- 发现者：用户反馈
- 相关任务：D. AI 配置 / I. 语音输入输出
- 严重程度：改进
- 问题现象：内置 TTS 模型响应偏慢；设置页把 Chat、TTS、STT 混在同一套默认/用户模型语义里，用户无法单独配置自己的 TTS/STT 模型。
- 原因分析：上一轮实现将 `user-cloud` 语音模式复用 Chat 默认 API 配置，只能换 key，不能为 STT/TTS 分别设置不同 base URL 和模型名；Chat 是否使用默认模型也缺少显式开关。
- 解决方案：把 Chat/TTS/STT 拆成三个设置模块；Chat 增加默认/自定义模式，自定义时使用 API 配置中设为默认的模型；STT/TTS 自定义各自保存 Base URL、模型名和 API Key；内置 TTS 先试 `tts-1-hd` 后按听感反馈改为 `tts-1`。
- 涉及文件：`src/features/settings/settingsStore.ts`, `src/features/voice/voiceService.ts`, `src/features/settings/SettingsPanel.tsx`, `src/features/chat/ChatDialog.tsx`, `src/features/chat/HoverInputBar.tsx`, `docs/voice-stt-tts-plan.md`, `PROGRESS.md`, `ISSUES.md`
- 经验总结：Chat、STT、TTS 虽然都走 OpenAI-compatible 接口，但模型、权限和性能特征不同，设置层不能强行共用一个“默认模型”抽象。
- 是否需更新技术文档：是。

## ISSUE-072
- 发现时间：2026-05-09
- 发现者：用户反馈
- 相关任务：Electron 重构 / 灵宠形象 / 桌面窗口交互
- 严重程度：严重
- 问题现象：Electron 重构后，灵宠窗口、Dock 图标、任务栏图标、设置窗口、右键菜单、小聊天框尺寸和拖拽边界出现多轮不稳定；切到 GIF 默认形象后，用户本地 `pnpm electron:dev` 只启动了 Vite，没有真正拉起 Electron 进程，导致桌面、Dock 和任务栏都看不到应用。
- 原因分析：1) Electron dev 脚本等待 `http://localhost:5173`，但本机 Vite 实际监听在 `127.0.0.1:5173`，`wait-on` 卡住后 Electron 未启动；2) GIF 不能继续走 canvas 绘制，否则只会显示静态首帧；3) 自定义协议下内置资源 URL 需要用当前页面 URL 解析，不能依赖单一根路径假设；4) 右键菜单如果常驻预留窗口空间，会压缩 pet 右侧可移动范围；5) 菜单全局 capture 监听会抢在菜单项点击前关闭菜单，导致设置入口偶发失效。
- 解决方案：1) `pnpm electron:dev` 改为固定 `vite --host 127.0.0.1`，并用 `wait-on tcp:127.0.0.1:5173` 等端口；Electron dev URL 同步改成 `http://127.0.0.1:5173`；2) 新增 GIF 形象方案，默认 `mediaMode=gif`，用户可在设置中切换 GIF / 图片两套入口；3) GIF 渲染改为 `<img>`，静态图片继续走 canvas；4) 内置资源 URL 改为基于 `window.location.href` 生成；5) pet 拖拽边界按可见形象计算，右键时才临时扩展菜单空间，并在靠近右侧阈值后把菜单放到 pet 左侧；6) 移除菜单点击前的全局 pointer capture，补齐右键“退出”入口。
- 涉及文件：`electron/main.cjs`, `electron/preload.cjs`, `package.json`, `vite.config.ts`, `src/App.tsx`, `src/features/pet/PetAvatar.tsx`, `src/features/pet/animations.ts`, `src/features/pet/petStore.ts`, `src/features/settings/SettingsPanel.tsx`, `src/features/chat/ChatDialog.tsx`, `src/index.css`, `PROGRESS.md`, `ISSUES.md`
- 经验总结：Electron dev 脚本必须和 Vite 实际监听地址完全一致，不能假设 `localhost` 一定等价于 `127.0.0.1`；桌面透明窗口的交互边界应以用户可见对象为锚点，而不是以内部透明窗口矩形为准；GIF/图片/视频应该在渲染层分流处理，不能统一塞进 canvas。
- 是否需更新技术文档：是。

## ISSUE-073
- 发现时间：2026-05-09
- 发现者：用户反馈
- 相关任务：灵宠提醒/专注模式 / GIF 资源迁移
- 严重程度：严重
- 问题现象：新增 `public/assets/idle/gif` 与 `public/assets/idle/png` 后，`work` 和 `rest` 状态 GIF 能显示，但 `idle` GIF 没有加载成功；休息提示和专注分心提示下方只有图标按钮，用户无法判断按钮含义。
- 原因分析：`idle` 是旧状态，用户本地数据库中可能仍保存旧 `petMedia_idle`，其中的 `defaultGifAssets` 指向已删除的 `assets/GIF/blink.GIF`，或 `defaultAssets/disabled*` 指向旧的 `assets/idle/*.png`；新增的 `work/rest` 没有旧配置覆盖，所以正常。提示按钮只依赖 check/x 图标，缺少文本语义。
- 解决方案：`normalizePetMediaConfig()` 中过滤旧 `assets/GIF/*` 和旧 `assets/{idle,thinking,sleeping}/*` 默认资源/禁用项，让旧配置自动回退到新的 idle gif/png 默认路径；提示气泡按钮改成“图标 + 文本”，休息提示显示“休息/忽略”，专注警告显示“继续专注/结束”。
- 涉及文件：`src/features/pet/animations.ts`, `src/App.tsx`, `PROGRESS.md`, `ISSUES.md`
- 经验总结：资源目录迁移时，不能只改代码默认值，还要处理用户数据库里已经持久化的旧资源路径；图标按钮用于宠物微交互时也需要短文本兜底，尤其是有多个语义相近的动作时。
- 是否需更新技术文档：否。

## ISSUE-074
- 发现时间：2026-05-09
- 发现者：用户反馈
- 相关任务：专注模式 / 分心检测
- 严重程度：中等
- 问题现象：专注模式中检测到分心后，灵宠切换成休息状态形象；用户期望仍保持专注模式形象，只弹出分心提示。
- 原因分析：分心警告复用了休息提醒的视觉状态切换，在触发 `focus-warning` 前调用了 `setPetState('rest')`，导致专注倒计时期间状态图标被覆盖。
- 解决方案：分心警告触发时改为保持/重设 `work` 状态，只显示头顶提示气泡；用户选择继续专注时仍保持 `work`，选择结束专注时回到 `idle`。
- 涉及文件：`src/App.tsx`, `PROGRESS.md`, `ISSUES.md`
- 经验总结：提示气泡和宠物状态是两条独立状态线；专注警告属于专注状态的附加反馈，不应复用休息状态图标。
- 是否需更新技术文档：否。

## ISSUE-075
- 发现时间：2026-05-09
- 发现者：用户反馈
- 相关任务：提醒事项 / 宠物形象展示
- 严重程度：改进
- 问题现象：休息和喝水被拆成两个状态，用户理解成本偏高；休息倒计时开始后，灵宠仍停留在桌面角落，缺少“该休息了”的仪式感和视觉反馈。
- 原因分析：旧实现把 `rest` 用作提示态、`drinking` 用作 60 秒倒计时态，状态粒度跟用户体验目标不一致；窗口布局也只围绕常驻桌面小尺寸设计，没有独立的休息展示布局。
- 解决方案：将喝水素材合并进 `rest` 默认 GIF 池，进入每次休息时随机选择休息/喝水图；休息倒计时开始前保存 pet 当前窗口位置和布局，动画放大到屏幕中央、占据工作区约 80%，结束后平滑回到原位置再切回待机。
- 涉及文件：`src/App.tsx`, `src/features/pet/animations.ts`, `src/features/pet/PetAvatar.tsx`, `PROGRESS.md`, `ISSUES.md`
- 经验总结：用户体验里的“休息”应是一个连续场景，而不是多个内部状态；桌面宠物的大幅展示需要保存和恢复窗口几何，避免影响日常拖拽边界和右键菜单布局。
- 是否需更新技术文档：否。

## ISSUE-076
- 发现时间：2026-05-09
- 发现者：用户反馈
- 相关任务：专注模式 / 设置页提醒事项
- 严重程度：改进
- 问题现象：进入专注模式后，右键菜单仍显示“专注模式”，无法从同一入口退出；休息提醒、专注时长和分心检测设置夹在外观页里，且滑动后立即保存，用户缺少明确确认动作，也不容易判断运行中的倒计时是否已刷新。
- 原因分析：右键菜单没有接收当前专注状态；提醒/专注配置仍复用外观设置的即时保存模式，和“定时器类设置需要确认后应用”的心理模型不一致。
- 解决方案：PetAvatar 接收 `focusActive` 和 `onFocusToggle`，专注中右键菜单动态显示“退出专注”；设置页新增左侧“提醒事项”目录，休息提醒、专注时长、分心检测和屏蔽规则迁入该页，草稿修改后点击“确认”才保存并广播；pet 窗口收到新专注时长后即时重算当前专注倒计时。
- 涉及文件：`src/App.tsx`, `src/features/pet/PetAvatar.tsx`, `src/features/settings/SettingsPanel.tsx`, `PROGRESS.md`, `ISSUES.md`
- 经验总结：运行态入口要体现当前状态，定时器配置要有明确应用动作；修改中的草稿和已生效设置应该区分开，避免用户不确定倒计时是否已经更新。
- 是否需更新技术文档：否。

## ISSUE-077
- 发现时间：2026-05-09
- 发现者：用户反馈
- 相关任务：休息展示 / 倒计时交互
- 严重程度：改进
- 问题现象：休息时灵宠已经能放大到屏幕中央，但中央展示下方缺少足够明确的倒计时和提前结束入口，用户不能主动结束休息。
- 原因分析：旧倒计时是一行通用的不可交互小字，只覆盖 focus/rest 两种状态；休息展示变成大场景后，需要独立的控制条和可点击操作。
- 解决方案：休息态下方改为独立控制条，显示不透明倒计时 pill 和“提前结束”按钮；提前结束复用休息结束流程，先平滑恢复窗口几何，再回到待机；中央展示底部预留空间同步加大，避免控件被裁切。
- 涉及文件：`src/App.tsx`, `PROGRESS.md`, `ISSUES.md`
- 经验总结：放大展示态应提供就地控制，尤其是倒计时类体验，需要用户能随时退出而不是只能等待。
- 是否需更新技术文档：否。

## ISSUE-078
- 发现时间：2026-05-09
- 发现者：用户反馈
- 相关任务：专注模式 / 休息循环
- 严重程度：改进
- 问题现象：一轮专注结束并完成休息后，灵宠回到待机，没有自动进入下一轮专注。
- 原因分析：休息流程没有记录来源，普通休息提醒和专注完成后的休息都走同一个 `finishRest()`，结束后统一切回 `idle`。
- 解决方案：新增 `autoFocusAfterRestRef`，仅在 `focus-complete` 提示触发休息时标记；休息倒计时自然结束或用户点击提前结束后，先恢复窗口，再根据标记自动调用 `startFocus()` 开启下一轮专注；普通休息提醒仍回到待机。
- 涉及文件：`src/App.tsx`, `PROGRESS.md`, `ISSUES.md`
- 经验总结：周期性工作流要保留步骤来源，不能让多个入口共用同一个无上下文的结束动作。
- 是否需更新技术文档：否。

## ISSUE-079
- 发现时间：2026-05-09
- 发现者：用户反馈
- 相关任务：个人档案 / 专注统计
- 严重程度：改进
- 问题现象：应用已经具备专注模式和分心检测，但设置页没有汇总每日专注时长、专注次数和分心次数，用户无法看到长期使用反馈。
- 原因分析：专注和分心事件只驱动当前 UI 状态，没有持久化到本地统计；设置页也缺少类似屏幕使用时间的按日切换和趋势图入口。
- 解决方案：在 Electron 本地 storage 中新增 `focusStats`，专注自然结束或手动退出时记录时长和次数，分心提示真正弹出时记录分心次数；设置页新增“个人档案”栏目，提供日期切换、当日概览、最近 14 天柱状图和均值/最高值摘要。
- 涉及文件：`src/lib/db.ts`, `src/App.tsx`, `src/features/settings/SettingsPanel.tsx`, `PROGRESS.md`, `ISSUES.md`
- 经验总结：统计类功能要在事件发生点记录，而不是从 UI 状态倒推；趋势展示要补齐空日期，避免没有数据的日期在图表中消失。
- 是否需更新技术文档：否。

## ISSUE-080
- 发现时间：2026-05-09
- 发现者：用户反馈
- 相关任务：休息形象 / GIF 资源兼容
- 严重程度：中等
- 问题现象：喝水 GIF 需要出现在休息形象池里；代码默认值已包含喝水图，但旧的本地 `petMedia_rest` 配置可能仍只保存休息图，覆盖掉新的默认列表。
- 原因分析：`normalizePetMediaConfig()` 对已保存的 `defaultGifAssets` 采用“用户配置优先”，没有把新增的 `assets/rest/gif/drinking_raw.GIF` 合并进旧配置。
- 解决方案：归一化 `rest` 状态时强制把 `assets/rest/gif/drinking_raw.GIF` 合并进默认 GIF 池，保证旧配置升级后也能在休息中随机出现喝水动画。
- 涉及文件：`src/features/pet/animations.ts`, `PROGRESS.md`, `ISSUES.md`
- 经验总结：默认资源池新增素材时，要同时处理已持久化配置，否则用户本地旧配置会遮住新默认值。
- 是否需更新技术文档：否。

## ISSUE-081
- 发现时间：2026-05-09
- 发现者：用户反馈
- 相关任务：个人档案 / 日期选择
- 严重程度：改进
- 问题现象：个人档案只能用左右箭头逐日切换，不支持点开日历直接选择日期。
- 原因分析：最初只实现了屏幕使用时间式的前后日期浏览，没有补充月历弹层，跨多天查看成本偏高。
- 解决方案：个人档案日期控件改为可点击按钮，点开后显示月历弹层；支持上/下月切换、点击选择日期、点击外部或 Esc 关闭，并禁用未来日期。
- 涉及文件：`src/features/settings/SettingsPanel.tsx`, `PROGRESS.md`, `ISSUES.md`
- 经验总结：趋势图的日期浏览适合箭头，历史回看则需要直接选择日期，两者应并存。
- 是否需更新技术文档：否。

## ISSUE-082
- 发现时间：2026-05-09
- 发现者：用户需求
- 相关任务：形象渲染模式 / Orb 模式
- 严重程度：新增功能
- 问题现象：现有灵宠三状态只能通过 PNG/GIF 呈现，用户希望增加独立的 Orb 模式，在不改变聊天、右键、拖拽、专注、休息等功能的前提下，仅替换灵宠本体渲染。
- 原因分析：PetAvatar 过去把“形象渲染”和“桌面交互外壳”耦合在同一个图片/GIF 渲染流程中；需要在保留外壳事件和窗口几何的同时，提供代码动效渲染分支。
- 解决方案：新增 `avatarRenderMode: pet | orb` 设置；pet 模式保留原 PNG/GIF，orb 模式根据 idle/work/rest 状态渲染代码球体。idle 使用鼠标距离驱动字重，work 使用 hover 字母翻牌，rest 使用慢旋转和自主呼吸字重；大小复用现有灵宠大小参数和休息 80% 屏幕放大逻辑。
- 涉及文件：`src/features/settings/settingsStore.ts`, `src/features/settings/SettingsPanel.tsx`, `src/features/pet/PetAvatar.tsx`, `src/App.tsx`, `src/index.css`, `PROGRESS.md`, `ISSUES.md`
- 经验总结：视觉模式应只替换渲染内核，桌面宠物的交互边界、菜单和窗口定位要继续复用同一套外壳，避免两套模式行为分叉。
- 是否需更新技术文档：否。

## ISSUE-083
- 发现时间：2026-05-09
- 发现者：用户反馈
- 相关任务：Orb 模式视觉质量
- 严重程度：改进
- 问题现象：Orb 模式框架可用，但悬浮球视觉显得粗糙，偏网页发光球，不够高级；动效也太直白。
- 原因分析：首版 Orb 使用高可见度彩色 glow、较硬的文字和直接的边框高亮，缺少 macOS 风格玻璃材质里的边缘折射、内阴影、微弱层次和克制状态色。
- 解决方案：重做 Orb 材质层：新增 ambient/glass/aura 多层结构，降低状态色占比，强化半透明玻璃、高光、内阴影和细边缘折射；文字字号下调，字距和动效节奏收敛，rest 旋转和呼吸更慢，work 翻牌更柔和。
- 涉及文件：`src/features/pet/PetAvatar.tsx`, `src/index.css`, `PROGRESS.md`, `ISSUES.md`
- 经验总结：Apple 风格的“高级感”更多来自低对比、材质层次、克制运动和精细阴影，而不是更亮的颜色或更强的发光。
- 是否需更新技术文档：否。

## ISSUE-084
- 发现时间：2026-05-09
- 发现者：用户反馈
- 相关任务：Orb 模式前端重做
- 严重程度：改进
- 问题现象：上一版 Orb 只是改善了单个球体样式，但没有真正采用参考前端的 Orb Stage 结构，整体仍不像参考项目那种“外环 + 核心球 + 状态文字 + 光晕”的完整前端。
- 原因分析：初版实现主要用 CSS 在同一个节点上叠效果，缺少独立外环、核心球容器、状态文字进出场以及 motion 驱动的呼吸/旋转层级。
- 解决方案：重构 OrbAvatar 前端结构，引入 `framer-motion` 的 `motion` 和 `AnimatePresence`；新增外圈仪表环、核心 shell、核心 glow、ambient/glass/ring/aura/noise 层；状态文字按状态 key 独立进出场，核心球呼吸、hover、rest 旋转改由 motion 驱动。
- 涉及文件：`src/features/pet/PetAvatar.tsx`, `src/index.css`, `PROGRESS.md`, `ISSUES.md`
- 经验总结：Orb 模式要像一个独立前端组件，而不是把球体材质贴在旧节点上；视觉结构分层比单纯调 CSS 阴影更重要。
- 是否需更新技术文档：否。

## ISSUE-085
- 发现时间：2026-05-09
- 发现者：用户反馈
- 相关任务：Orb 模式视觉收敛
- 严重程度：改进
- 问题现象：Orb 模式出现多个圆环，球体外部还有类似方形磨砂背景；内部文字过大，文字 hover 动效观感不好。
- 原因分析：上一版为了接近参考前端加入了外圈仪表环、内 ring、aura 和文字动态效果；在桌面宠物小窗口里，这些层级会显得杂乱，并且外溢阴影/外环容易被感知成方形背景。
- 解决方案：删除外圈、内 ring、aura 和文字动态效果，只保留一个球体轮廓；根节点裁成圆形避免外溢方形感；文字字号缩小约一半，并改用 Claude 风格英文字体栈 `Styrene B / Styrene A / Inter / system`。
- 涉及文件：`src/features/pet/PetAvatar.tsx`, `src/index.css`, `PROGRESS.md`, `ISSUES.md`
- 经验总结：桌面悬浮物需要极强的轮廓克制，参考 demo 的外环结构不一定适合常驻桌面小窗；如果用户要求一个球，就不能让辅助层看起来也是球。
- 是否需更新技术文档：否。

## ISSUE-086
- 发现时间：2026-05-09
- 发现者：用户反馈
- 相关任务：Orb 模式动效
- 严重程度：改进
- 问题现象：Orb 已收敛为单球体，但缺少球体本身的呼吸感和状态相关的内部颜色流动。
- 原因分析：上一轮删掉多余圆层和文字动效后，Orb 视觉更干净，但内部动态只剩 glow 呼吸，idle/rest 状态差异不够明确。
- 解决方案：新增裁切在球体内部的 `orb-avatar__flow` 层；球体 shell 做自然呼吸缩放；idle 状态下内部颜色左右慢速漂移，rest 状态下内部颜色顺时针旋转流动，work 保持低强度漂移。
- 涉及文件：`src/features/pet/PetAvatar.tsx`, `src/index.css`, `PROGRESS.md`, `ISSUES.md`
- 经验总结：Orb 的状态动效应发生在单一球体内部，不能重新引入外部环形装饰；动效要增强生命感而不破坏轮廓简洁。
- 是否需更新技术文档：否。

## ISSUE-087
- 发现时间：2026-05-09
- 发现者：用户反馈
- 相关任务：Orb 模式文字动效
- 严重程度：改进
- 问题现象：Orb 三种状态文字需要在鼠标 hover 时统一增加 Letter 3D Swap 翻牌效果。
- 原因分析：上一轮为了收敛视觉，删除了文字动态效果；但用户希望保留 Fancy Components 风格的 3D 字母翻转作为 hover 微交互。
- 解决方案：为 idle/work/rest 三态文字的每个字母增加前后两个 3D 面；hover 到球体时按字母顺序 stagger 执行 X 轴 3D 翻牌动画，结束后复位。
- 涉及文件：`src/features/pet/PetAvatar.tsx`, `src/index.css`, `PROGRESS.md`, `ISSUES.md`
- 经验总结：文字动效可以保留，但要限制在文字本身，不重新引入外圈或额外背景，避免破坏单球体约束。
- 是否需更新技术文档：否。

## ISSUE-088
- 发现时间：2026-05-09
- 发现者：用户反馈
- 相关任务：Orb 模式动效感知
- 严重程度：改进
- 问题现象：Orb 虽然已有呼吸和内部 flow 层，但用户仍感到悬浮球“完全静止不动”。
- 原因分析：上一版动效参数过于克制：shell 缩放幅度只有约 1.8%，内部 flow 的透明度、位移和速度都偏低，在桌面悬浮窗口尺寸下不容易被感知。
- 解决方案：提升 shell 循环缩放到约 4%，缩短呼吸周期；增强 flow 层透明度、位移范围和状态差异，使 idle 的左右流动、rest 的顺时针旋转和 work 的斜向漂移都更明确。
- 涉及文件：`src/features/pet/PetAvatar.tsx`, `src/index.css`, `PROGRESS.md`, `ISSUES.md`
- 经验总结：桌面常驻 Orb 的动效不能只在“仔细看”时才成立；需要在不破坏高级感的前提下，让呼吸和内部流动在正常视距也能被看见。
- 是否需更新技术文档：否。

## ISSUE-089
- 发现时间：2026-05-09
- 发现者：用户反馈
- 相关任务：Orb 模式文字动效
- 严重程度：改进
- 问题现象：Orb 文字 hover 时的 3D Swap 动效需要删除，改为默认持续的 Breathing Text 风格动效。
- 原因分析：hover 翻牌动效偏强，和当前 Orb 的慢呼吸、内部流动气质不够统一；用户希望文字本身持续轻微变化，而不是依赖 hover 触发。
- 解决方案：删除每个字母的 front/back 3D 面、hover selector 和 `orbLetter3DSwap` keyframes；改用 `motion.span` 为每个字母持续动画 `fontVariationSettings`，实现错峰字重呼吸。
- 涉及文件：`src/features/pet/PetAvatar.tsx`, `src/index.css`, `PROGRESS.md`, `ISSUES.md`
- 经验总结：Orb 模式里的文字动效应该和球体呼吸属于同一种节奏；默认持续的轻量变化比 hover 翻牌更适合桌面常驻物。
- 是否需更新技术文档：否。

## ISSUE-090
- 发现时间：2026-05-09
- 发现者：用户反馈
- 相关任务：Orb 模式视觉自然度
- 严重程度：改进
- 问题现象：Orb 仍然不够自然，外边缘过于明显，呼吸效果不够强，整体缺少 fancy 的高级生命感。
- 原因分析：上一版仍保留了硬边框和按钮式玻璃材质；同时 `orb-avatar__flow` 的负 inset 被后续公共 selector 覆盖，导致内部流动范围被压缩，呼吸和流光都显得不够明显。
- 解决方案：移除硬边框，改用 radial mask 羽化到透明；重写球体渐变、edge bloom 和 conic 流光；扩大 shell 呼吸缩放幅度；修正 flow inset 覆盖问题，让内部颜色真正大范围流动。
- 涉及文件：`src/features/pet/PetAvatar.tsx`, `src/index.css`, `PROGRESS.md`, `ISSUES.md`
- 经验总结：Orb 不应像一个有描边的 UI 控件，而应像一个有体积、有边缘消散、有内部流体的桌面生命体；动效层级要检查 selector 覆盖，避免设计参数被后续规则悄悄抹掉。
- 是否需更新技术文档：否。

## ISSUE-091
- 发现时间：2026-05-09
- 发现者：用户反馈
- 相关任务：Orb 模式精修
- 严重程度：改进
- 问题现象：Orb 内部文字仍偏大且为大写；状态颜色略浓烈；希望增加更 fancy 的粒子动效。
- 原因分析：上一版为了增强生命感，提高了 flow 和 edge bloom 的状态色比例；文字仍沿用大写标签和较高字号比例，导致视觉重心偏硬。
- 解决方案：将状态标签改为小写并降低字号比例；整体降低状态色混合比例；新增内部粒子层，通过多点 radial gradients 和慢速漂移动画制造细小光尘效果。
- 涉及文件：`src/features/pet/PetAvatar.tsx`, `src/index.css`, `PROGRESS.md`, `ISSUES.md`
- 经验总结：Orb 的 fancy 感不只来自更强的颜色，也可以来自更轻的文字、更低饱和的材质和细节粒子的慢速运动。
- 是否需更新技术文档：否。

## ISSUE-092
- 发现时间：2026-05-09
- 发现者：用户反馈
- 相关任务：Orb 模式视觉与 Rest 行为
- 严重程度：重要
- 问题现象：Orb 视觉仍不稳定，光源和动画过多，材质像雾化泡泡而非有重量的球体；字体/字距不自然；rest 放大时卡顿；rest 结束后没有稳定继续专注。
- 原因分析：Orb DOM 包含 particles/glass/noise 等多个非必要层，CSS 同时运行 edge bloom、glow、flow、particle drift、逐字 breathing 等多套节奏；状态色过弱且分散，缺少主视觉；rest 大尺寸时多层 blur/粒子和每帧原生窗口 resize/move 叠加，容易卡顿；自动续专注依赖点击 OK 时的 prompt 快照。
- 解决方案：按液态金属球方向重做 Orb，只保留 shell/glow/flow/text 四层；三态使用暖银/电光蓝/琥珀金；删除粒子、玻璃、噪声和逐字 breathing；精简为主呼吸 + 状态专属 flow/glow；rest 放大动画减少原生窗口调用；focus-complete 时写入 `autoFocusAfterRestRef`，确保休息结束后继续专注。
- 涉及文件：`src/App.tsx`, `src/features/pet/PetAvatar.tsx`, `src/index.css`, `PROGRESS.md`, `ISSUES.md`
- 经验总结：Orb 的高级感来自明确的材质主角和少量方向统一的动画；进入 80% 屏幕尺寸的 rest presentation 时要控制原生窗口调用和 CSS 重绘；状态机关键意图要用显式 ref 保留，而不是依赖某次渲染里的 prompt 快照。
- 是否需更新技术文档：否。

## ISSUE-093
- 发现时间：2026-05-09
- 发现者：用户反馈
- 相关任务：Orb 黑白灰重做
- 严重程度：重要
- 问题现象：液态金属版本仍然不好看，用户要求重新做，只使用黑、白、灰经典配色；外观只保留一层黑色圆形边框，三态改为彗星和粒子行为。
- 原因分析：前几版持续在材质、渐变和颜色上调参，方向已经偏离用户想要的极简黑白灰动效球；CSS 渐变材质无法表达“彗星碰撞/粒子掉落”的状态语义。
- 解决方案：删除 Orb 的彩色渐变材质和 Framer Motion 文字/球体动效，改为 canvas 驱动的彗星粒子系统；idle 单彗星弹跳，work 中心彗星喷散，rest 多彗星高速碰撞；CSS 只负责黑色圆边框和 hover 英文小字。
- 涉及文件：`src/features/pet/PetAvatar.tsx`, `src/index.css`, `PROGRESS.md`, `ISSUES.md`
- 经验总结：当用户明确要求“重新做”时，应该停止延续旧材质方案，改用更贴合行为语义的渲染方式；复杂运动更适合集中到 canvas 单循环里，而不是堆 CSS 层。
- 是否需更新技术文档：否。

## ISSUE-094
- 发现时间：2026-05-09
- 发现者：用户反馈
- 相关任务：Orb 粒子细化
- 严重程度：改进
- 问题现象：Orb 外层圆圈缺少呼吸感；彗星尾部粒子看起来像“小蝌蚪”，希望换成星空感粒子。
- 原因分析：粒子继承了彗星方向速度、生命周期较长且以实心圆绘制，连续排布后像拖尾生物形态；外圈本身没有动画，只靠内部彗星变化。
- 解决方案：为 `orb-avatar` 添加轻微循环缩放；粒子改为短寿命、低速度、快速衰减的星尘，并绘制小十字星芒和闪烁透明度，减少长拖尾。
- 涉及文件：`src/features/pet/PetAvatar.tsx`, `src/index.css`, `PROGRESS.md`, `ISSUES.md`
- 经验总结：星空感来自离散闪烁和短暂出现，而不是持续方向拖尾；边界动画可以很轻，但能显著提升悬浮体的呼吸感。
- 是否需更新技术文档：否。

## ISSUE-095
- 发现时间：2026-05-09
- 发现者：用户反馈
- 相关任务：Orb 字母动效重做
- 严重程度：重要
- 问题现象：用户要求不要粒子方案，改为字母驱动的三态 Orb：idle 字母绕外圈，work 字母按专注倒计时掉落堆叠，rest 字母铺满圆圈外侧快速旋转，并整体更柔和透明。
- 原因分析：粒子方案虽然解决了彩色材质问题，但仍然不是用户想要的抽象字母视觉；work 状态需要和专注倒计时建立直接语义关系，粒子无法清楚表达倒计时堆积。
- 解决方案：删除 Orb canvas 粒子系统，改为 DOM/CSS 字母环；从 App 传入 `focusProgress`，用同一组开始/结束时间驱动 work 字母下落；idle/rest 使用环形字母布局和旋转动画；边框使用柔灰透明呼吸。
- 涉及文件：`src/App.tsx`, `src/features/pet/PetAvatar.tsx`, `src/index.css`, `PROGRESS.md`, `ISSUES.md`
- 经验总结：当状态本身有明确语义时，视觉元素应直接承载该语义；专注倒计时适合用确定性进度驱动，而不是随机粒子动画。
- 是否需更新技术文档：否。

## ISSUE-096
- 发现时间：2026-05-09
- 发现者：用户提供参考实现
- 相关任务：Orb 参考效果复现
- 严重程度：改进
- 问题现象：当前字母环版本已经符合方向，但缺少参考 demo 中的独立卫星轨道、中心柔光核、work 连续下落字母流和 rest 外圈多轨道细节。
- 原因分析：上一版主要满足功能语义，视觉结构仍偏静态和工程化；参考 demo 的层次来自外圈轨道、中心 nucleus 和连续微动的组合。
- 解决方案：idle 改成字母独立轨道并加入 satellite dot；work 增加循环下落字母流，保留倒计时同步堆叠；rest 使用 16 条外圈 REST 轨道和细线；加入低透明灰阶 nucleus 脉冲。
- 涉及文件：`src/features/pet/PetAvatar.tsx`, `src/index.css`, `PROGRESS.md`, `ISSUES.md`
- 经验总结：复现参考效果时要保留产品状态逻辑，但视觉层应尽量贴近参考的运动层次，而不是只实现文字位置。
- 是否需更新技术文档：否。

## ISSUE-097
- 发现时间：2026-05-09
- 发现者：用户设计规格
- 相关任务：Orb 三态交互语义强化
- 严重程度：改进
- 问题现象：Orb 三态需要更明确的交互语义：idle 要有低功耗监听和 hover 聚焦，work 要有重力沉积和 hover 加速，rest 要有高速涡轮和 hover 静态网格对齐。
- 原因分析：上一版已接近参考视觉，但 hover 反馈仍偏弱；work 的字母下落缺少触底重量感，rest 的旋转速度和静止反差不够强。
- 解决方案：idle hover 锁定四象限并收缩轨道半径；work hover 加快下落流并为堆叠字母增加微震/回弹；rest 高速旋转带轻微 blur，hover 时停止并使用 TS 传入的行列变量排成 4x4 网格。
- 涉及文件：`src/features/pet/PetAvatar.tsx`, `src/index.css`, `PROGRESS.md`, `ISSUES.md`
- 经验总结：抽象动效不只是“动起来”，需要让 hover 的物理反馈和状态语义一致；CSS 不适合做复杂行列运算，稳定布局参数应从 TS 传入。
- 是否需更新技术文档：否。

## ISSUE-098
- 发现时间：2026-05-09
- 发现者：用户反馈
- 相关任务：Orb 字母环动态回退
- 严重程度：改进
- 问题现象：用户希望 Orb 粒子/运动动态退回 `b16bc57 style: rebuild orb with letter rings` 的字母环版本，但保留当前 hover 动效。
- 原因分析：参考效果复现和交互语义强化阶段加入了连续 work drop、16 条 REST 轨道、中心 nucleus 等新层，视觉层次更复杂，偏离了 `b16bc57` 那版更干净的字母环动态。
- 解决方案：移除新增的连续 drop、REST 叶片轨道和 nucleus；恢复 idle 四字母环绕、work 倒计时同步四字母下落、rest 28 字母外圈旋转；保留 idle hover 收缩暂停、work 堆叠微震和 rest hover 静态网格。
- 涉及文件：`src/features/pet/PetAvatar.tsx`, `src/index.css`, `PROGRESS.md`, `ISSUES.md`
- 经验总结：当用户明确指定回退到某个视觉提交时，应优先恢复该提交的结构性动效，再选择性保留之后版本中明确被要求保留的交互反馈。
- 是否需更新技术文档：否。

## ISSUE-099
- 发现时间：2026-05-09
- 发现者：用户反馈
- 相关任务：Orb 可读性微调
- 严重程度：改进
- 问题现象：当前 Orb 使用的灰色偏浅，字母字号也偏小，导致外圈字母和 work/rest 状态信息不够清晰。
- 原因分析：上一轮为了保持柔和透明感，将字母、边框和 satellite dot 的 alpha 控制得较低；字号比例也偏保守，在桌面悬浮尺寸下容易显得轻飘。
- 解决方案：提高 Orb 字号比例和最小字号；加深边框、状态字母、work 下落字母、hover 文本和 satellite dot 的灰度/透明度，同时不改变动态结构。
- 涉及文件：`src/features/pet/PetAvatar.tsx`, `src/index.css`, `PROGRESS.md`, `ISSUES.md`
- 经验总结：黑白灰界面里的“高级感”不能等同于过低对比度；小型悬浮组件需要足够的灰阶重量才能在不同桌面背景下稳定可读。
- 是否需更新技术文档：否。
