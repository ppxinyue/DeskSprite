# DeskCat 开发问题记录

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
- 问题现象：大聊天窗口顶端仍显示 “DeskCat Chat”；模型选择触发器显示了描述小字，入口不够干净；无用户 API 配置时菜单里“默认模型”和 CloseAI 重复。
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

## ISSUE-100
- 发现时间：2026-05-09
- 发现者：用户反馈
- 相关任务：Orb 字母大小写层级
- 严重程度：改进
- 问题现象：Orb 外圈字母需要全部使用大写，hover 后内部中央字母需要使用小写。
- 原因分析：当前 `letters` 和 `restLetters` 直接来自小写状态标签，虽然部分外圈样式有 `text-transform: uppercase`，但 work 下落字母仍依赖原始文本，内外层级不够明确。
- 解决方案：外圈/下落/旋转字母源统一从大写状态标签生成；中央 hover 文本继续使用小写 `meta.label`。
- 涉及文件：`src/features/pet/PetAvatar.tsx`, `PROGRESS.md`, `ISSUES.md`
- 经验总结：当同一状态文本在不同视觉层级中承担不同语义时，应在数据源层明确大小写，而不是完全依赖 CSS 变换。
- 是否需更新技术文档：否。

## ISSUE-101
- 发现时间：2026-05-09
- 发现者：用户反馈
- 相关任务：Orb Idle 视觉精简
- 严重程度：改进
- 问题现象：Idle 外圈除了字母还有一个点，用户希望删除，只保留字母。
- 原因分析：早期 idle 设计中保留了 satellite dot 作为卫星轨道提示，但当前视觉方向已经转向纯字母环，这个点会产生额外噪声。
- 解决方案：删除 `orb-avatar__satellite-dot` DOM、对应 CSS 和 pulse keyframes。
- 涉及文件：`src/features/pet/PetAvatar.tsx`, `src/index.css`, `PROGRESS.md`, `ISSUES.md`
- 经验总结：极简 Orb 需要严格控制符号数量；如果文字已经承担状态表达，额外装饰点容易分散注意力。
- 是否需更新技术文档：否。

## ISSUE-102
- 发现时间：2026-05-09
- 发现者：用户反馈
- 相关任务：Orb 容器材质调整
- 严重程度：改进
- 问题现象：Orb 需要从中心向外越来越浅的渐变填充，常态不要外部框线，hover 时外部再出现虚线。
- 原因分析：上一版使用实线边框和近透明背景，边界过于固定；用户现在希望常态更像柔和能量球，交互边界只在 hover 时出现。
- 解决方案：移除 shell 实线 border，改为径向灰阶渐变背景；新增 `::after` 虚线边界，仅在 `.is-hovering` 时淡入。
- 涉及文件：`src/index.css`, `PROGRESS.md`, `ISSUES.md`
- 经验总结：悬浮 orb 的边界可以由材质渐变表达，交互 affordance 再用 hover 状态显示，常态会更轻。
- 是否需更新技术文档：否。

## ISSUE-103
- 发现时间：2026-05-09
- 发现者：用户反馈
- 相关任务：Orb 波浪扩散与 Hover 边界微调
- 严重程度：改进
- 问题现象：Orb 色彩需要像波浪一样向外扩散；hover 时不要虚线，改为更窄、更浅的实线。
- 原因分析：上一版只有静态径向渐变和 hover 虚线，材质有层次但缺少从中心向外的流动感；虚线边界也偏装饰化。
- 解决方案：新增 `::before` 重复径向渐变波纹层并用 scale/opacity 动画向外扩散；将 hover 边界改为 0.8px 浅色实线。
- 涉及文件：`src/index.css`, `PROGRESS.md`, `ISSUES.md`
- 经验总结：Orb 的流动感可以通过独立的低透明波纹层表达，交互边界则应尽量轻，避免压过内部字母。
- 是否需更新技术文档：否。

## ISSUE-104
- 发现时间：2026-05-09
- 发现者：用户反馈
- 相关任务：Orb Work 倒计时动效
- 严重程度：改进
- 问题现象：Work 倒计时不应该让所有字母掉到最下方，而是从四个边角旋转着被吸引到中心，并且一个字母一个字母发生。
- 原因分析：上一版 work 仍沿用沙漏/沉积隐喻，字母位置由 top/fall-progress 控制，最终落在底部；这和用户想要的中心吸附语义不同。
- 解决方案：为 `W/O/R/K` 设置四个角落起点，继续用倒计时进度逐字计算局部吸附进度；TS 输出位移、旋转、缩放 CSS 变量，CSS 将字母平滑吸附到中心。
- 涉及文件：`src/features/pet/PetAvatar.tsx`, `src/index.css`, `PROGRESS.md`, `ISSUES.md`
- 经验总结：倒计时动效的核心是进度映射，视觉隐喻可以替换，但必须保留同一套逐字局部进度计算。
- 是否需更新技术文档：否。

## ISSUE-105
- 发现时间：2026-05-09
- 发现者：用户反馈
- 相关任务：Orb Work 内核公转
- 严重程度：改进
- 问题现象：Work 状态下四个字母被吸向中心后，字母本身还需要绕着内核缓慢公转。
- 原因分析：上一版吸附完成后字母趋近中心，只有亮度脉冲，缺少围绕内核的持续轨道运动。
- 解决方案：新增 `orb-avatar__work-orbit` 包裹层负责 16s 慢速公转；字母自身仍使用逐字吸附变量，但最终停在内核附近的小轨道点上。
- 涉及文件：`src/features/pet/PetAvatar.tsx`, `src/index.css`, `PROGRESS.md`, `ISSUES.md`
- 经验总结：复合动效应拆成父层轨道运动和子层吸附运动，避免 transform 互相覆盖。
- 是否需更新技术文档：否。

## ISSUE-106
- 发现时间：2026-05-09
- 发现者：用户反馈
- 相关任务：Orb Work 字母公转间距
- 严重程度：改进
- 问题现象：Work 的四个字母仍需要完全分开，互相间隔 90 度。
- 原因分析：上一版使用四个不同终点再叠加 animation delay 错相，最终视觉不够严格，可能出现字母间距不均或靠近。
- 解决方案：每个 orbit 容器设置固定 `--orbit-angle`，分别为 0/90/180/270 度；移除 animation delay，keyframes 从各自角度同步公转。
- 涉及文件：`src/features/pet/PetAvatar.tsx`, `src/index.css`, `PROGRESS.md`, `ISSUES.md`
- 经验总结：需要严格几何关系时，应使用显式角度变量，而不是依赖动画延迟制造相位差。
- 是否需更新技术文档：否。

## ISSUE-107
- 发现时间：2026-05-09
- 发现者：用户反馈
- 相关任务：Orb Work 吸附语义修正
- 严重程度：重要
- 问题现象：Work 表示字母被吸附到中心，波纹不应向外扩散而应向内扩散；四个 work 字母仍两两重叠，只表现出 0 和 180 度。
- 原因分析：全局 `orbRadialWave` 只有向外扩散方向，不适合 work；同时 `@keyframes` 内使用 `var(--orbit-angle)` 和 `calc(var(--orbit-angle) + 360deg)` 做角度插值，在实际渲染中可能导致 90/270 度相位不稳定。
- 解决方案：为 `.orb-avatar--work` 单独指定向内收缩的 `orbRadialWaveIn`；work 公转恢复为同一 360 度 keyframes，并通过 `animation-delay: index * -4s` 产生稳定四等分相位。
- 涉及文件：`src/features/pet/PetAvatar.tsx`, `src/index.css`, `PROGRESS.md`, `ISSUES.md`
- 经验总结：CSS 变量参与 keyframes 角度插值时跨浏览器稳定性不如固定 keyframes + 负延迟相位；状态语义也应反映在背景波纹方向上。
- 是否需更新技术文档：否。

## ISSUE-108
- 发现时间：2026-05-09
- 发现者：用户反馈
- 相关任务：Orb Work 动效简化
- 严重程度：改进
- 问题现象：Work 的 4 个字母不需要公转，只需要向内被吸附。
- 原因分析：公转层增加了运动复杂度，但用户当前希望 work 只表达“被中心吸入”的单一语义。
- 解决方案：删除 work orbit 包裹层、`orbWorkOrbit` keyframes 和相位延迟；保留字母自身从四角旋转吸入中心的 transform 过渡。
- 涉及文件：`src/features/pet/PetAvatar.tsx`, `src/index.css`, `PROGRESS.md`, `ISSUES.md`
- 经验总结：当用户收敛动效语义时，应减少复合运动层，保留最清晰的一条视觉动线。
- 是否需更新技术文档：否。

## ISSUE-109
- 发现时间：2026-05-09
- 发现者：用户反馈
- 相关任务：Orb Rest 展示裁切
- 严重程度：重要
- 问题现象：Rest 放大到屏幕中央后没有显示全，两侧有图案被截断。
- 原因分析：rest 外圈字母使用超出 orb 本体尺寸的环形布局，但休息展示窗口只按 orb 本体尺寸加固定边距计算；放大后外圈字母溢出超过边距，被窗口边界裁切。
- 解决方案：为 orb rest 展示增加按比例计算的视觉 bleed；目标 scale 按本体加外圈溢出共同计算，并在窗口尺寸和 petTop 中预留对应空间。
- 涉及文件：`src/App.tsx`, `PROGRESS.md`, `ISSUES.md`
- 经验总结：带外圈装饰/轨道的组件不能只按本体盒模型计算窗口尺寸，放大展示必须把视觉溢出纳入布局。
- 是否需更新技术文档：否。

## ISSUE-110
- 发现时间：2026-05-09
- 发现者：用户反馈
- 相关任务：Orb Hover 可见性
- 严重程度：改进
- 问题现象：Orb 的所有状态在鼠标 hover 到悬浮球上后，都要变成完全不透明。
- 原因分析：Orb 根节点使用 `--orb-opacity` 继承用户设置的透明度，hover 时只做了轻微 scale，没有覆盖整体透明度。
- 解决方案：为 `.orb-avatar.is-hovering` 设置 `opacity: 1`，让 idle/work/rest 在悬停时统一完全不透明；常态仍保留用户设置透明度。
- 涉及文件：`src/index.css`, `PROGRESS.md`, `ISSUES.md`
- 经验总结：交互状态可以临时提高可见性，但不应改变用户配置的常态显示参数。
- 是否需更新技术文档：否。

## ISSUE-111
- 发现时间：2026-05-09
- 发现者：用户反馈
- 相关任务：Orb 状态色增强
- 严重程度：改进
- 问题现象：Orb 现在只有灰色波纹向外扩散，需要在灰色基础上混入状态色：idle 使用小聊天框颜色，work 使用浅蓝色，rest 使用浅粉色。
- 原因分析：之前的 orb 材质为纯灰阶，状态主要靠字母动效区分，颜色语义不足。
- 解决方案：为 orb 根节点新增状态色 CSS 变量；idle 使用 `--color-pet-dialog-bg` 混色，work/rest 分别使用低透明浅蓝/浅粉；shell 核心渐变和波纹层读取这些变量。
- 涉及文件：`src/index.css`, `PROGRESS.md`, `ISSUES.md`
- 经验总结：状态色可以作为灰阶材质的轻量 tint，而不是替代整体黑白灰风格。
- 是否需更新技术文档：否。

## ISSUE-112
- 发现时间：2026-05-09
- 发现者：用户反馈
- 相关任务：Orb 透明度与 Work 配色
- 严重程度：改进
- 问题现象：设置中的透明度参数需要同样控制 orb 透明度；work 的蓝色偏灰，希望改成清新明亮的浅天空蓝。
- 原因分析：Orb 已使用 `--orb-opacity`，但 hover 覆盖为完全不透明后，常态绑定不够显式；work 色值偏低饱和、偏灰，天空蓝感不足。
- 解决方案：为非 hover orb 显式设置 `opacity: var(--orb-opacity)`；将 work 状态色变量调整为更亮的浅天空蓝，并增强少量波纹亮度。
- 涉及文件：`src/index.css`, `PROGRESS.md`, `ISSUES.md`
- 经验总结：交互态和常态透明度要分开表达；状态色如果需要“清新”，应提高亮度和蓝青倾向，而不是只增加灰蓝透明度。
- 是否需更新技术文档：否。

## ISSUE-113
- 发现时间：2026-05-09
- 发现者：用户反馈
- 相关任务：Orb Hover 不透明与状态色亮度
- 严重程度：改进
- 问题现象：蓝色和粉色还可以更明亮；hover 后看起来仍然半透明。
- 原因分析：上一版只把 orb 根节点 opacity 设为 1，但 shell 材质本身由多层低 alpha 渐变组成，所以视觉上仍能透底；work/rest 色值仍偏柔和，明亮度不足。
- 解决方案：为 hover 状态新增不透底的 `--orb-hover-fill` 实心柔色底，并进一步提高 work 天空蓝、rest 浅粉的 alpha 和亮度。
- 涉及文件：`src/index.css`, `PROGRESS.md`, `ISSUES.md`
- 经验总结：CSS `opacity: 1` 只解决整体透明度，不会改变半透明材质本身；真正的不透底需要在材质层加入 opaque fill。
- 是否需更新技术文档：否。

## ISSUE-114
- 发现时间：2026-05-09
- 发现者：用户反馈
- 相关任务：Orb Work/Rest 配色与文字灰度
- 严重程度：改进
- 问题现象：蓝色和粉色不需要继续和原来的灰色混合，work/rest 背景灰色应改成奶白色；文字灰度需要更高。
- 原因分析：shell 的第二层基础渐变仍是统一灰阶，导致 work/rest 的状态色叠上去后仍带灰感；文字 alpha 偏低，在亮色底上不够稳。
- 解决方案：将 shell 基础渐变抽成 CSS 变量，idle 保持灰阶，work/rest 覆盖为奶白渐变；同时提高外圈、work 和 hover 文本的深色透明度。
- 涉及文件：`src/index.css`, `PROGRESS.md`, `ISSUES.md`
- 经验总结：状态色的干净程度不仅取决于彩色本身，也取决于底色；浅彩色适合搭配奶白底而不是灰底。
- 是否需更新技术文档：否。

## ISSUE-115
- 发现时间：2026-05-09
- 发现者：用户反馈
- 相关任务：Orb Hover 透明度范围
- 严重程度：改进
- 问题现象：Work 和 idle 在 hover 时仍然半透明即可，需要删去这两个状态下 hover 变不透明的设置。
- 原因分析：上一版将 `opacity: 1` 和不透底 shell 填充绑定到全局 `.orb-avatar.is-hovering`，导致 idle/work/rest 都变成不透明。
- 解决方案：移除全局 hover opacity 覆盖；将不透底 shell 填充和 `opacity: 1` 收窄到 `.orb-avatar--rest.is-hovering`。
- 涉及文件：`src/index.css`, `PROGRESS.md`, `ISSUES.md`
- 经验总结：交互规则需要按状态作用域控制，避免全局 hover 样式覆盖掉各状态的材质语义。
- 是否需更新技术文档：否。

## ISSUE-116
- 发现时间：2026-05-09
- 发现者：用户参考图
- 相关任务：Orb Work 配色
- 严重程度：改进
- 问题现象：Work 模式蓝色需要使用用户给出的 `[vite]` 参考图中的亮蓝。
- 原因分析：上一版 work 蓝色偏天空蓝/蓝青，和参考图中更明确的 Vite 亮蓝仍有差异。
- 解决方案：将 work 状态核心、边缘和波纹色调整为接近 `rgba(47, 143, 255, ...)` 的亮蓝体系。
- 涉及文件：`src/index.css`, `PROGRESS.md`, `ISSUES.md`
- 经验总结：有视觉参考时，应直接向参考色相靠拢，而不是继续泛化为“天空蓝”。
- 是否需更新技术文档：否。

## ISSUE-117
- 发现时间：2026-05-09
- 发现者：用户反馈
- 相关任务：休息提示与倒计时布局
- 严重程度：重要
- 问题现象：专注结束时弹出的休息提示框左侧显示不全；休息状态下方倒计时不应做成按钮形态，且倒计时和提前结束按钮需要显著放大。
- 原因分析：提示框固定 `left: 50%` 并用 `translateX(-50%)` 居中，pet 靠窗口左侧时泡泡会越界；倒计时样式沿用了小型 rounded badge，按钮也按普通小控件尺寸设计。
- 解决方案：根据 `layout.windowWidth`、`layout.petLeft` 和提示框宽度计算 clamped left，箭头单独计算位置；倒计时改为纯 48px 文本，提前结束按钮扩大约 3 倍。
- 涉及文件：`src/App.tsx`, `PROGRESS.md`, `ISSUES.md`
- 经验总结：浮动窗口里的提示框不能只相对组件中心定位，还要考虑窗口可视边界；休息展示属于大屏状态，控件尺寸应跟随场景放大。
- 是否需更新技术文档：否。

## ISSUE-118
- 发现时间：2026-05-09
- 发现者：用户反馈
- 相关任务：休息倒计时动效与尺寸
- 严重程度：改进
- 问题现象：休息时的倒计时数字和提前结束按钮需要缩小 1/2；rest 放大后的倒计时需要使用 Transitions.dev 的 Number pop-in 动效。
- 原因分析：上一版把休息展示控件放得过大；倒计时只是普通文本，没有按秒变化时的字符进入反馈。
- 解决方案：将倒计时字号调整为 24px、提前结束按钮调整为约 17px；新增 `AnimatedCountdown` 按字符渲染并用 key 触发重放，CSS 加入 `t-digit-pop-in` 和 stagger 延迟。
- 涉及文件：`src/App.tsx`, `src/index.css`, `PROGRESS.md`, `ISSUES.md`
- 经验总结：动态倒计时适合做逐字符轻动效，但尺寸要服务于休息场景的视觉平衡，不能过度压过主体。
- 是否需更新技术文档：否。

## ISSUE-119
- 发现时间：2026-05-09
- 发现者：用户反馈
- 相关任务：休息倒计时动效细化
- 严重程度：改进
- 问题现象：倒计时动画中只有数字需要动画，单位 `s` 不需要动画；倒计时文字应使用统一深灰而非纯黑；数字大小改为 18，按钮改为 14。
- 原因分析：上一版按所有字符拆分并统一套 `.t-digit`，导致单位也参与 pop-in；文本颜色继承 foreground，视觉过黑；尺寸仍偏大。
- 解决方案：`AnimatedCountdown` 判断字符是否为数字，只对数字应用 `.t-digit` 和 stagger；非数字使用静态 span；倒计时容器改为 `#4d4a45`，字号和按钮大小下调。
- 涉及文件：`src/App.tsx`, `src/index.css`, `PROGRESS.md`, `ISSUES.md`
- 经验总结：微交互动效要有语义边界，数字变化才需要进入动画，单位文本应保持稳定作为阅读锚点。
- 是否需更新技术文档：否。

## ISSUE-120
- 发现时间：2026-05-09
- 发现者：用户反馈
- 相关任务：休息倒计时动效删除
- 严重程度：改进
- 问题现象：倒计时 pop-in 动画让视觉显得拥挤，休息展示状态不够安静。
- 原因分析：倒计时每秒变化，逐字符动画在高频刷新下持续吸引注意力，和休息状态需要的轻量、稳定阅读体验冲突。
- 解决方案：删除 `AnimatedCountdown` 组件和 `t-digit-pop-in` 相关 CSS，倒计时直接渲染为稳定文本；保留上一版确认的字号、颜色和按钮尺寸。
- 涉及文件：`src/App.tsx`, `src/index.css`, `PROGRESS.md`, `ISSUES.md`
- 经验总结：高频变化信息不一定适合动效，尤其是倒计时这种辅助信息，稳定性比表现力更重要。
- 是否需更新技术文档：否。

## ISSUE-121
- 发现时间：2026-05-09
- 发现者：用户反馈
- 相关任务：Pet/Orb 双模式设置适配
- 严重程度：重要
- 问题现象：新增 orb 模式后，设置-外观和设置-AI 对话中仍有大量只面向灵宠图片的文案和可编辑项；orb 模式下仍可编辑灵宠动作、形象自定义、宠物名字和 pet 身份 System Prompt；开关选中态蓝色与当前 orb/work 视觉色不统一。
- 原因分析：orb 模式先接入了渲染层，设置页仍按 pet-only 信息架构展示；聊天运行时的系统提示词也只读取通用 pet prompt。
- 解决方案：将透明度/大小文案改为灵宠/悬浮球；orb 模式下灰化并禁用灵宠动作、形象自定义和宠物名字；新增 `ORB_SYSTEM_PROMPT`，`getActiveSystemPrompt()` 根据 `avatarRenderMode` 自动返回 orb 专用 prompt；Switch 选中态改为 Vite 蓝。
- 涉及文件：`src/features/settings/SettingsPanel.tsx`, `src/features/ai/systemPrompt.ts`, `src/components/ui/switch.tsx`, `PROGRESS.md`, `ISSUES.md`
- 经验总结：双形象模式不只是渲染分支，设置项、身份设定和运行时 prompt 都需要按模式同步收敛。
- 是否需更新技术文档：否。

## ISSUE-122
- 发现时间：2026-05-09
- 发现者：用户反馈
- 相关任务：Orb 模式设置收起态与 Prompt 编辑
- 严重程度：改进
- 问题现象：orb 模式下直接把灵宠动作、形象自定义整块变灰，视觉效果像禁用故障；System Prompt 被锁定不可编辑，不符合用户希望继续定制 orb 助手提示词的需求。
- 原因分析：上一版用灰化禁用表达不可用内容，缺少明确的信息结构；orb prompt 只用常量返回，没有独立持久化设置。
- 解决方案：orb 模式下将灵宠动作、形象自定义渲染为收起态不可展开卡片；新增 `orbSystemPrompt` 设置读写，设置页可编辑保存，运行时优先读取保存值。
- 涉及文件：`src/features/settings/SettingsPanel.tsx`, `src/features/ai/systemPrompt.ts`, `PROGRESS.md`, `ISSUES.md`
- 经验总结：不可用功能应从信息架构上收纳，而不是只做视觉降权；模式专属 prompt 需要独立存储，避免污染另一种模式。
- 是否需更新技术文档：否。

## ISSUE-123
- 发现时间：2026-05-09
- 发现者：用户反馈
- 相关任务：外观模式与 AI 身份设置重组
- 严重程度：改进
- 问题现象：Pet/Orb 模式切换仍混在外观基础设置中，不够突出；AI 对话中宠物名字与 System Prompt 分散展示；orb 模式下宠物名字只是禁用而不是收起态。
- 原因分析：上一版按控件类型局部处理，没有按“形象模式”和“身份设置”两个信息层级重新组织页面。
- 解决方案：把形象模式移动到外观页最上方独立成组；将宠物名字和 System Prompt 合并到同一个身份设置组；orb 模式下宠物名字渲染为收起态不可展开行，prompt 继续可编辑。
- 涉及文件：`src/features/settings/SettingsPanel.tsx`, `PROGRESS.md`, `ISSUES.md`
- 经验总结：模式开关属于高层配置，应在页面顶端独立呈现；身份相关字段应集中，避免用户在页面中来回寻找。
- 是否需更新技术文档：否。

## ISSUE-124
- 发现时间：2026-05-09
- 发现者：用户反馈
- 相关任务：专注循环状态修复
- 严重程度：重要
- 问题现象：一轮专注结束后弹出休息提示，用户点击“忽略”时灵宠回到 idle，而不是进入下一轮专注 work。
- 原因分析：提示框忽略分支只特殊处理了 `focus-warning`，`focus-complete` 落入普通休息提醒逻辑，导致 `setPetState('idle')`。
- 解决方案：在 `focus-complete` 的忽略分支直接调用 `startFocus()`，开启下一轮专注并切回 work；普通休息提醒的忽略逻辑保持不变。
- 涉及文件：`src/App.tsx`, `PROGRESS.md`, `ISSUES.md`
- 经验总结：同样是“忽略”，语义要按提示来源区分；专注完成提示属于专注循环，不应复用普通休息提醒的 idle 收尾。
- 是否需更新技术文档：否。

## ISSUE-125
- 发现时间：2026-05-09
- 发现者：用户素材更新
- 相关任务：重新读取默认 Pet 素材
- 严重程度：重要
- 问题现象：`public/assets/rest/gif/playing_clean_3.GIF` 已从默认素材目录删除，但休息状态默认 GIF 配置仍引用该文件，新增的 `rest.GIF` 和 `idle_raw_1.GIF` 尚未进入默认渲染池。
- 原因分析：素材目录更新后，`DEFAULT_MEDIA_CONFIG.rest.defaultGifAssets` 和兼容归一化逻辑没有同步更新，可能导致休息状态加载失效或漏用新素材。
- 解决方案：将休息状态默认 GIF 池更新为 `rest.GIF`、`idle_raw_1.GIF`、`drinking_raw.GIF`；normalize 旧配置时移除 `playing_clean_3.GIF` 并补齐当前默认休息素材。
- 涉及文件：`src/features/pet/animations.ts`, `public/assets`, `PROGRESS.md`, `ISSUES.md`
- 经验总结：素材文件名变化时，需要同时更新默认配置和旧配置归一化，否则已保存配置会继续引用不存在的文件。
- 是否需更新技术文档：否。

## ISSUE-126
- 发现时间：2026-05-09
- 发现者：用户反馈
- 相关任务：Pet 模式动作叠加规则
- 严重程度：改进
- 问题现象：Pet 模式下状态使用 GIF 动图时，仍然会叠加灵宠动作设置中的跳动、摇摆、呼吸，导致 GIF 自带动画和外层动作同时生效。
- 原因分析：`PetAvatar` 的 `motionStyle` 没有区分当前媒体类型，被同时展开到 video、GIF img 和静态 canvas 上。
- 解决方案：将 `motionStyle` 的生成条件限制为 `kind === 'img'`，只在静态图片渲染路径上叠加动作；GIF 和视频保持素材自身动画。
- 涉及文件：`src/features/pet/PetAvatar.tsx`, `PROGRESS.md`, `ISSUES.md`
- 经验总结：素材自带时间轴时不应再叠外层循环动作，动作系统应只增强静态图。
- 是否需更新技术文档：否。

## ISSUE-127
- 发现时间：2026-05-09
- 发现者：用户反馈
- 相关任务：Pet Rest 展示方式调整
- 严重程度：改进
- 问题现象：Pet 模式下 rest 使用的 PNG/GIF 分辨率通常不高，强行放大到屏幕中央会显得模糊；Orb 模式仍适合放大展示。
- 原因分析：休息展示逻辑没有区分 pet 图片素材和代码绘制 orb，两者都走了同一套按屏幕 80% 缩放的展示方案。
- 解决方案：orb 模式继续放大到屏幕中央；pet 模式休息时保持当前尺寸，窗口扩展为工作区展示层，pet 沿屏幕工作区绕一圈运动；倒计时和提前结束按钮独立固定到底部居中；同步当前 rest GIF 池，避免引用已删除的 `rest.GIF`。
- 涉及文件：`src/App.tsx`, `src/features/pet/animations.ts`, `public/assets/rest/gif`, `PROGRESS.md`, `ISSUES.md`
- 经验总结：位图/GIF 素材应避免超过原始观感尺度展示，动态呈现可以通过路径运动而不是强制缩放实现。
- 是否需更新技术文档：否。

## ISSUE-128
- 发现时间：2026-05-09
- 发现者：用户素材更新
- 相关任务：全量纳入 public/assets 新素材
- 严重程度：重要
- 问题现象：`public/assets` 下新增了大量 pet 素材，rest 默认目录中的 `IMG_3448.GIF`、`IMG_3449.GIF` 已被替换为 `IMG_3452.GIF` - `IMG_3458.GIF`，但默认渲染配置仍引用旧文件。
- 原因分析：素材文件批量更新后，静态默认资源列表和旧配置归一化清理规则没有同步刷新。
- 解决方案：重新扫描 `public/assets`，将非 `.DS_Store` 素材纳入 git；更新 rest 默认 GIF 池为当前真实文件，并在 normalize 阶段清理旧 rest GIF 引用。
- 涉及文件：`src/features/pet/animations.ts`, `public/assets`, `PROGRESS.md`, `ISSUES.md`
- 经验总结：批量素材替换后需要同时提交文件变更和默认资源清单，否则运行时会继续请求不存在的文件。
- 是否需更新技术文档：否。

## ISSUE-129
- 发现时间：2026-05-09
- 发现者：用户反馈
- 相关任务：休息时长设置
- 严重程度：改进
- 问题现象：休息时长固定为 60 秒，用户无法在设置中调整。
- 原因分析：休息倒计时使用前端常量计算结束时间，设置模型和提醒事项页面没有对应字段。
- 解决方案：新增 `restDurationSeconds` 设置，默认 60 秒并限制在 10-600 秒；提醒事项页提供 10-300 秒滑条；进入 rest 和 pet 绕圈进度都读取该设置。
- 涉及文件：`src/App.tsx`, `src/features/settings/SettingsPanel.tsx`, `src/features/settings/settingsStore.ts`, `PROGRESS.md`, `ISSUES.md`
- 经验总结：用户可感知的计时流程应避免硬编码，尤其是专注/休息这种节奏类功能。
- 是否需更新技术文档：否。

## ISSUE-130
- 发现时间：2026-05-09
- 发现者：用户反馈
- 相关任务：Pet Rest 绕屏动效调整
- 严重程度：改进
- 问题现象：Pet 模式 rest 时倒计时和提前结束按钮固定在屏幕底部，与绕圈移动的图片分离；绕圈速度被休息总时长绑定，只会转一圈，节奏偏慢。
- 原因分析：上一版为了避免控件跟随图片运动，将倒计时拆成独立底部层；绕圈进度使用休息时长归一化计算。
- 解决方案：让图片、倒计时和提前结束按钮重新作为同一组布局一起绕屏；绕圈速度改为固定 8 秒一圈，在较长休息时长内可连续多圈。
- 涉及文件：`src/App.tsx`, `PROGRESS.md`, `ISSUES.md`
- 经验总结：如果控件是当前动画状态的一部分，应保持空间关系一致；运动速度和状态持续时长可以分离。
- 是否需更新技术文档：否。

## ISSUE-131
- 发现时间：2026-05-09
- 发现者：用户反馈
- 相关任务：休息时长范围调整
- 严重程度：改进
- 问题现象：休息时长设置范围仍是 10-300 秒，不符合用户希望的 1-120 分钟范围。
- 原因分析：上一版按短休息秒级控制设计 UI 和 clamp，未覆盖更长休息区间。
- 解决方案：设置页将 `restDurationSeconds` 以分钟显示，滑块范围改为 60-7200 秒、步进 60 秒；设置加载和 rest 状态机最小值同步改为 60 秒。
- 涉及文件：`src/App.tsx`, `src/features/settings/SettingsPanel.tsx`, `src/features/settings/settingsStore.ts`, `PROGRESS.md`, `ISSUES.md`
- 经验总结：用户表达分钟级范围时，UI 应直接显示分钟，底层单位可以保持秒以兼容倒计时。
- 是否需更新技术文档：否。

## ISSUE-132
- 发现时间：2026-05-09
- 发现者：用户反馈
- 相关任务：Pet Rest 控制区可点击性
- 严重程度：重要
- 问题现象：Pet 模式 rest 时倒计时和提前结束按钮跟着图片快速绕圈，提前结束按钮不容易点击。
- 原因分析：上一版将图片、倒计时和按钮合并为同一运动组，虽然视觉一致，但按钮作为交互目标不应持续移动。
- 解决方案：Pet rest 时只让图片绕圈；倒计时和提前结束按钮固定在屏幕顶部中央，并放入完全不透明背景色块。
- 涉及文件：`src/App.tsx`, `PROGRESS.md`, `ISSUES.md`
- 经验总结：展示元素可以运动，关键操作按钮应保持稳定可点，尤其是退出/结束类控制。
- 是否需更新技术文档：否。

## ISSUE-133
- 发现时间：2026-05-09
- 发现者：用户需求
- 相关任务：Coding 模式接入 Codex
- 严重程度：新功能
- 问题现象：灵宠右侧小对话框只能连接普通 AI 对话，不能承接本机 Codex 的执行状态、输出和用户输入。
- 原因分析：前端没有 Coding 模式开关，主进程没有 Codex CLI 执行桥接，pet 侧 chat 按钮也没有可表达 Codex 状态的红黄绿状态灯。
- 解决方案：新增 `codingModeEnabled` 设置；主进程通过本机 Codex CLI 执行用户输入并广播 `coding:state`；小聊天框在 Coding 模式下切换为 Codex 面板；右侧 chat 按钮常显并使用 mac 红黄绿表达需要处理、工作中、已完成。
- 涉及文件：`electron/main.cjs`, `src/App.tsx`, `src/features/settings/SettingsPanel.tsx`, `src/features/settings/settingsStore.ts`, `PROGRESS.md`, `ISSUES.md`
- 经验总结：外部 agent 接入需要把“执行桥接、状态广播、输入面板、入口状态灯”作为一套完整闭环实现。
- 是否需更新技术文档：否。

## ISSUE-134
- 发现时间：2026-05-09
- 发现者：用户反馈
- 相关任务：Coding 模式入口补充
- 严重程度：重要
- 问题现象：用户在设置中不容易找到 Coding 模式开关，灵宠右键菜单也缺少直接切换 Coding 模式的入口。
- 原因分析：上一版将开关放在 AI 对话页较靠后的“模型参数”区，入口层级太深；右键菜单只覆盖对话、专注、设置、隐藏、退出，没有接入新的模式状态。
- 解决方案：把 Coding 模式独立移动到 AI 对话页顶部；给右键菜单新增 Coding 模式/退出 Coding 切换项，并同步菜单高度估算。
- 涉及文件：`src/App.tsx`, `src/features/pet/PetAvatar.tsx`, `src/features/settings/SettingsPanel.tsx`, `PROGRESS.md`, `ISSUES.md`
- 经验总结：模式级功能应该提供设置页入口和就地快捷入口，不能只藏在某个参数分组里。
- 是否需更新技术文档：否。

## ISSUE-135
- 发现时间：2026-05-09
- 发现者：用户反馈
- 相关任务：Coding 连接错误提示修正
- 严重程度：重要
- 问题现象：小聊天框在 Coding 模式下显示红色 `Action / 无法连接 Codex`，但该错误可能来自前端调用新增 IPC command 失败，而不是 Codex CLI 本身不可用。
- 原因分析：Electron 主进程新增的 `coding_get_state`、`coding_send_message` handlers 需要重启主进程后才会加载；前端 catch 分支把所有失败都归类成“无法连接 Codex”，掩盖了 `Unknown command` 这类真实原因。
- 解决方案：新增连接错误格式化逻辑，对 `Unknown command: coding_*` 给出“重启应用或重新运行 pnpm electron:dev”的明确提示，其余错误保留原始细节。
- 涉及文件：`src/App.tsx`, `PROGRESS.md`, `ISSUES.md`
- 经验总结：新增 Electron IPC 时，前端错误提示要区分“主进程未加载接口”和“后端工具不可用”，否则排障方向会错。
- 是否需更新技术文档：否。

## ISSUE-136
- 发现时间：2026-05-09
- 发现者：用户反馈
- 相关任务：Codex Exec 参数兼容修复
- 严重程度：重要
- 问题现象：Coding 模式发送消息后返回 `error: unexpected argument '--ask-for-approval' found`，Codex 没有执行用户输入。
- 原因分析：当前本机 Codex CLI 的 `codex exec` 已不支持 `--ask-for-approval` 参数，上一版桥接仍按旧参数调用。
- 解决方案：根据本机 `codex exec --help` 移除 `--ask-for-approval on-request`，保留当前可用的 `--json`、`--color never`、`--sandbox workspace-write`、`--cd` 参数。
- 涉及文件：`electron/main.cjs`, `PROGRESS.md`, `ISSUES.md`
- 经验总结：外部 CLI 版本变化时，桥接层应严格以本机 `--help` 为准，不要沿用旧版本参数。
- 是否需更新技术文档：否。

## ISSUE-137
- 发现时间：2026-05-09
- 发现者：用户反馈
- 相关任务：Coding 工作状态与 stdin 修复
- 严重程度：重要
- 问题现象：用户在小对话框向 Codex 发送消息后没有回复且状态变红；同时 Codex 工作中状态有时仍显示绿色。
- 原因分析：桥接进程默认打开 stdin，`codex exec` 会提示 `Reading additional input from stdin...` 并等待额外输入；stderr 中的 `input` 又被正则误判为需要用户输入。另一个问题是先广播用户消息再设置 working，导致短暂绿色完成态。
- 解决方案：spawn Codex 时忽略 stdin；先将状态置为 working 再推送用户消息；stderr 状态判定移除普通 `input` 关键字，仅保留明确的授权/确认/登录信号。
- 涉及文件：`electron/main.cjs`, `PROGRESS.md`, `ISSUES.md`
- 经验总结：CLI 桥接要显式管理 stdio，状态机也应先切状态再广播消息，避免 UI 观察到中间态。
- 是否需更新技术文档：否。

## ISSUE-138
- 发现时间：2026-05-09
- 发现者：用户反馈
- 相关任务：Coding 回复可见性与最终消息兜底
- 严重程度：重要
- 问题现象：小聊天框发送给 Codex 后长时间没有可见回复，终端只看到 macOS 输入法/窗口警告，用户无法判断 Codex 是否在工作。
- 原因分析：本机 `codex exec` 启动后会进行插件/采样连接重试，期间 stdout 只有 JSONL 状态事件，stderr 有大量无关警告；桥接层没有把“已开始/重试中”作为状态消息展示，也完全依赖 JSONL 解析最终回答。
- 解决方案：发送后立即推送工作中系统消息；将 `turn.started` 和 `error` 重连事件映射为状态消息；解析 `item.completed` 的 `agent_message`；同时使用 `--output-last-message` 临时文件作为最终回复兜底。
- 涉及文件：`electron/main.cjs`, `PROGRESS.md`, `ISSUES.md`
- 经验总结：长耗时 CLI 集成需要持续可见的进度反馈和最终结果兜底，不能只等理想路径的标准输出。
- 是否需更新技术文档：否。

## ISSUE-139
- 发现时间：2026-05-09
- 发现者：用户反馈
- 相关任务：Coding 连接当前 Codex Thread
- 严重程度：重要
- 问题现象：小聊天框的 Coding 模式每条消息都像新任务，和当前正在进行的 Codex 对话没有直接关系，也会反复出现“首次连接”提示。
- 原因分析：上一版使用 `codex exec <prompt>`，每次都会启动一个新的非交互式 Codex thread；没有读取当前 Codex 桌面会话暴露的 `CODEX_THREAD_ID`，也没有使用 `codex exec resume`。
- 解决方案：读取 `DESKCAT_CODEX_THREAD_ID` / `CODEX_THREAD_ID`，存在时使用 `codex exec resume <threadId> --json --output-last-message -`，prompt 通过 stdin 传入；缺失 thread id 时显示明确错误，不再自动新建任务。
- 涉及文件：`electron/main.cjs`, `src/App.tsx`, `PROGRESS.md`, `ISSUES.md`
- 经验总结：如果用户语义是“当前对话”，桥接层必须绑定 thread/session id；新建 exec 只能算同项目新任务。
- 是否需更新技术文档：否。

## ISSUE-140
- 发现时间：2026-05-09
- 发现者：用户反馈
- 相关任务：Coding 自动启动灵宠 Codex 会话
- 严重程度：重要
- 问题现象：Electron 从普通终端启动时没有 `CODEX_THREAD_ID`，Coding 模式只显示“没有检测到当前 Codex 对话”，导致用户无法在没有现存 Codex 进程的情况下通过灵宠唤起 Codex。
- 原因分析：上一版只支持绑定外部传入的当前 thread，没有 fallback 到创建并维护灵宠自己的 Codex thread。
- 解决方案：缺少 thread id 时自动 `codex exec` 新建会话，保存 `thread.started` 返回的 thread id；之后所有消息使用 `codex exec resume` 复用该会话。
- 涉及文件：`electron/main.cjs`, `src/App.tsx`, `PROGRESS.md`, `ISSUES.md`
- 经验总结：Coding 模式应同时支持“接管当前 Codex thread”和“独立唤起 Codex thread”，这样才符合桌面宠物入口的使用预期。
- 是否需更新技术文档：否。

## ISSUE-141
- 发现时间：2026-05-09
- 发现者：参考实现复盘
- 相关任务：Coding 事件解析对齐 cc-connect
- 严重程度：重要
- 问题现象：Coding 模式直接把 `item.completed(agent_message)` 作为 Codex 回复显示，并把 `Reconnecting...` 等瞬时事件刷到聊天里，和 Codex CLI 的 turn 语义不完全一致。
- 原因分析：`cc-connect` 的实现会缓存 agent message，直到 `turn.completed` 才输出最终回复；中途出现 tool use 时才将缓存作为 thinking 输出。上一版没有这个 pending/flush 机制。
- 解决方案：新增 pending agent message 缓存；`turn.completed` 时 flush 为 Codex 回复；tool item 出现时先 flush 为 system 过程信息；过滤 reconnect/fallback 瞬时事件；扩展文本字段提取。
- 涉及文件：`electron/main.cjs`, `PROGRESS.md`, `ISSUES.md`
- 经验总结：Codex JSONL 是 turn/event 流，不能把每个事件都当聊天消息，应该按 turn 生命周期汇总后再展示。
- 是否需更新技术文档：否。

## ISSUE-142
- 发现时间：2026-05-09
- 发现者：用户反馈
- 相关任务：Coding 常驻 Codex app-server 后端
- 严重程度：重要
- 问题现象：Coding 模式每条消息仍然很慢，会反复经历 Codex 子进程启动、插件/技能加载和网络重试，用户感觉像一直在“首次连接”。
- 原因分析：`codex exec` 是一次性非交互式命令，每条消息都要重新启动 CLI 进程；即使复用 thread id，也无法复用已经加载好的运行时。
- 解决方案：改为常驻 `codex app-server --listen stdio://`，使用 `initialize` 后的 JSON-RPC 通道发起 `thread/start` / `thread/resume` / `turn/start`；消息事件通过 app-server notification 聚合到小聊天框。
- 涉及文件：`electron/main.cjs`, `PROGRESS.md`, `ISSUES.md`
- 经验总结：桌面侧桥接长期会话时应该优先接入常驻 server，而不是每次 spawn 单次 CLI。
- 是否需更新技术文档：否。

## ISSUE-143
- 发现时间：2026-05-10
- 发现者：用户反馈
- 相关任务：Coding 错误状态灯修复
- 严重程度：重要
- 问题现象：小聊天框输出了 `error`，但灵宠右侧 chat button 仍然保持黄色工作中状态。
- 原因分析：app-server 的 `error` notification 只被追加为聊天消息，没有同步清空 `running` 或将状态切到 `needs-input`；后续 `thread/status/changed(active)` 还可能覆盖回 working。
- 解决方案：`error` / `guardianWarning` notification 立即切红并标记当前 turn 出错；只有仍在正常运行且未处于错误态时，active 状态才允许切黄；turn 完成时尊重已收到的错误标记。
- 涉及文件：`electron/main.cjs`, `PROGRESS.md`, `ISSUES.md`
- 经验总结：状态灯应由错误事件优先驱动，不能只依赖最终 turn status。
- 是否需更新技术文档：否。

## ISSUE-144
- 发现时间：2026-05-10
- 发现者：用户反馈
- 相关任务：Coding 错误详情完整展示
- 严重程度：中等
- 问题现象：小聊天框只输出 `error`，用户看不到 reconnect、retry 或具体失败原因。
- 原因分析：上一版主动过滤了 `Reconnecting` / `Falling back` 过程事件；同时文本提取只看 `params.message`，当 app-server 把原因放在 `error/detail/reason/cause` 等字段时会退化成 method 名。
- 解决方案：新增 Codex notice 格式化逻辑，按常见错误字段展开详情；保留 reconnect/retry 为 system 过程消息；stderr 中关键诊断行也同步展示。
- 涉及文件：`electron/main.cjs`, `PROGRESS.md`, `ISSUES.md`
- 经验总结：调试桥接型功能时，过程性错误比简化状态更重要，UI 应保留足够诊断上下文。
- 是否需更新技术文档：否。

## ISSUE-145
- 发现时间：2026-05-10
- 发现者：用户反馈
- 相关任务：Coding 默认代理注入
- 严重程度：重要
- 问题现象：Codex app-server 输出 `Reconnecting...`，用户怀疑是网络原因，并希望网络原因时自动走本地代理。
- 原因分析：Electron 主进程启动 Codex app-server 时只继承当前进程环境；如果用户从 Dock 或未配置代理的终端启动，Codex 子进程不会自动获得本地代理配置。
- 解决方案：为 Codex 子进程统一构造 env，保留用户已设置的代理变量；缺失时默认注入 `127.0.0.1:6478` 的 HTTP/SOCKS 代理。
- 涉及文件：`electron/main.cjs`, `PROGRESS.md`, `ISSUES.md`
- 经验总结：外部 CLI 集成不能假设桌面进程继承了 shell 代理环境，关键网络子进程应显式补齐代理变量。
- 是否需更新技术文档：否。

## ISSUE-146
- 发现时间：2026-05-10
- 发现者：用户反馈
- 相关任务：Coding 对话体验统一
- 严重程度：重要
- 问题现象：Coding 模式的小对话框 UI 与普通聊天不一致，无法展开成大聊天框，且 Codex 对话没有进入历史记录。
- 原因分析：上一版 Coding 使用了独立的 `CodingCompactDialog` 和主进程内存消息状态，只服务于状态灯/小窗展示，没有复用普通聊天的历史存储、气泡组件和大窗入口。
- 解决方案：抽出 Coding 对话视图复用普通聊天的 `MessageBubble` / `Composer`；监听 Coding state 后写入本地历史；大聊天窗口在 Coding 模式下渲染 Codex 视图。
- 涉及文件：`src/App.tsx`, `src/features/chat/ChatDialog.tsx`, `PROGRESS.md`, `ISSUES.md`
- 经验总结：模式切换应尽量复用同一个 UI 与存储模型，否则细节会快速分叉。
- 是否需更新技术文档：否。

## ISSUE-147
- 发现时间：2026-05-10
- 发现者：用户反馈
- 相关任务：Coding 大窗口布局对齐普通聊天
- 严重程度：中等
- 问题现象：Coding 大对话框虽然能打开，但仍像独立 Codex 面板，没有和普通大聊天窗口保持一致。
- 原因分析：上一版只让大窗复用 Coding 消息视图，没有复刻普通 `StandaloneChatWorkspace` 的双栏布局、历史栏和会话卡片层级。
- 解决方案：Coding standalone 改为普通大聊天同款布局；保留 Codex 后端发送逻辑；历史记录可在左侧栏点击查看。
- 涉及文件：`src/App.tsx`, `PROGRESS.md`, `ISSUES.md`
- 经验总结：用户说“完全一致”时，不能只复用局部组件，窗口级布局也要一致。
- 是否需更新技术文档：否。

## ISSUE-148
- 发现时间：2026-05-10
- 发现者：用户需求扩展
- 相关任务：Coding 继承当前 Codex Session
- 严重程度：重要
- 问题现象：现有 Coding 模式只会开启灵宠自己的新 Codex session，无法观察本机已经进行中的多个 Codex session。
- 原因分析：上一版只维护 app-server 自己的 thread，没有读取 Codex 本地 session 日志，也没有区分“新 session”和“继承当前 session”两种模式。
- 解决方案：新增 session 模式设置；继承模式扫描 `~/.codex/sessions` 最近活跃 JSONL，按需要处理、已输出、工作中聚合状态；右键菜单提供两个入口。
- 涉及文件：`electron/main.cjs`, `src/App.tsx`, `src/features/pet/PetAvatar.tsx`, `src/features/settings/settingsStore.ts`, `PROGRESS.md`, `ISSUES.md`
- 经验总结：继承外部 agent 状态时，应以只读观察为默认能力，避免误导用户以为可以直接接管外部 session 输入。
- 是否需更新技术文档：否。

## ISSUE-149
- 发现时间：2026-05-10
- 发现者：用户反馈
- 相关任务：继承模式小窗 UI 对齐
- 严重程度：中等
- 问题现象：继承当前 session 时的小窗口 UI 和普通 chat 小窗口不一致，输入区域虽然不可用但仍影响视觉。
- 原因分析：上一版复用了 `Composer` 并通过 error 显示提示，导致底部仍然存在输入框结构，不符合“隐去输入框”的要求。
- 解决方案：继承模式小窗仅保留普通消息容器和气泡，隐藏整个输入栏，单独渲染红色提示小字。
- 涉及文件：`src/App.tsx`, `PROGRESS.md`, `ISSUES.md`
- 经验总结：只读模式应移除不可交互控件，而不是禁用控件后继续展示。
- 是否需更新技术文档：否。

## ISSUE-150
- 发现时间：2026-05-10
- 发现者：用户反馈
- 相关任务：继承 Session 通知与会话列表修复
- 严重程度：重要
- 问题现象：继承 Codex session 时状态和消息不准确；小窗/大窗清空按钮无效；多个 session 的回复没有在大窗中作为独立会话展示；继承模式窗口样式仍和普通 chat 有偏差。
- 原因分析：继承模式之前每次都从 Codex 本地 JSONL 重新推导状态，没有“已读确认”层；前端也只把聚合消息当成单个会话显示，没保留 session 粒度。
- 解决方案：为每个继承 session 生成 `ackKey` 并新增确认接口；聚合状态只看未确认红/绿通知；小窗展示最新 session，大窗左侧按 session 列表切换，右侧复用普通 chat 会话卡片样式。
- 涉及文件：`electron/main.cjs`, `src/App.tsx`, `PROGRESS.md`, `ISSUES.md`
- 经验总结：观察外部 agent 的 UI 不能只显示聚合状态，还需要“通知已读”和“session 归属”两个概念，否则会像状态灯坏掉一样反复误报。
- 是否需更新技术文档：否。

## ISSUE-151
- 发现时间：2026-05-10
- 发现者：用户反馈
- 相关任务：普通 Chat 与 Coding Chat 分离
- 严重程度：重要
- 问题现象：退出 Coding 模式后点击 chat button，打开的不是上一次普通 chat，而可能是 Coding 模式留下的 Codex 会话。
- 原因分析：Coding 模式下打开小窗仍复用了普通 `openLatestChat()` 路径，会写入普通 compact chat 的本地会话 key；同时普通最近会话查询没有过滤 Codex Coding 历史。
- 解决方案：Coding 模式单独走 `forceShowCodingChat()`，不改普通 compact chat key；退出 Coding 时隐藏当前 Coding 小窗；普通最近会话和右键历史菜单过滤 Codex 会话标题。
- 涉及文件：`src/App.tsx`, `src/features/pet/PetAvatar.tsx`, `PROGRESS.md`, `ISSUES.md`
- 经验总结：两个模式共享窗口壳可以，但会话 key 和最近会话选择必须分开，否则模式切换后会产生上下文污染。
- 是否需更新技术文档：否。

## ISSUE-152
- 发现时间：2026-05-10
- 发现者：用户反馈
- 相关任务：继承 Codex 过程输出保持工作态
- 严重程度：重要
- 问题现象：Codex 还在规划或执行工具时，过程性短回复会让 Coding chat button 短暂变绿，随后又变黄，状态抖动。
- 原因分析：继承 session 的 JSONL 扫描把所有 `agent_message` / assistant message 都当作完成输出，没有区分 `commentary` 和 `final_answer`。
- 解决方案：新增 final 输出判断，只有 `phase=final_answer`、`task_complete`、`last_agent_message` 等完整结果才切 done；过程性 agent message 只更新工作态活动时间。
- 涉及文件：`electron/main.cjs`, `PROGRESS.md`, `ISSUES.md`
- 经验总结：Codex 的 assistant 文本不一定等于最终回答，状态灯必须基于 turn 完成语义，而不是“出现文本”这个弱信号。
- 是否需更新技术文档：否。

## ISSUE-153
- 发现时间：2026-05-10
- 发现者：用户反馈
- 相关任务：继承通知清空后进入灰色空闲态
- 严重程度：中等
- 问题现象：继承模式下绿色完成通知被清空后，chat button 自动变成黄色，但实际没有新的 Codex 工作在进行。
- 原因分析：清空后所有已完成 session 被 ack 掉，聚合逻辑会回退到最近的 working session；而这些 working session 可能只是旧日志推导出的非终态，并不代表当前仍在运行。
- 解决方案：新增 `idle` 灰色状态；只有最近 90 秒内仍有活动的 working session 才聚合为黄色，否则在无未读通知时返回灰色空闲。
- 涉及文件：`electron/main.cjs`, `src/App.tsx`, `PROGRESS.md`, `ISSUES.md`
- 经验总结：继承外部日志时，working 必须带时间窗口，否则旧的非终态日志会让 UI 永远误以为 Codex 正在工作。
- 是否需更新技术文档：否。

## ISSUE-154
- 发现时间：2026-05-10
- 发现者：用户反馈
- 相关任务：继承 Coding 外壳一致性修复
- 严重程度：重要
- 问题现象：继承 session 时小聊天框不跟随宠物拖动；继承模式红字和右键菜单文案不符合预期；orb 模式新启动会先闪出 pet。
- 原因分析：Coding 小窗通过单独入口显示，没有设置普通 chat 的 `dialogOpen`，所以拖动重定位条件漏掉了 Coding 可见态；启动时 settings 异步加载前使用默认 `avatarRenderMode=pet` 渲染了一帧。
- 解决方案：拖动重定位条件扩展为普通对话打开或 Coding 小窗可见；统一继承提示和右键文案；pet 窗口等待 settings loaded 后再渲染头像。
- 涉及文件：`src/App.tsx`, `src/features/pet/PetAvatar.tsx`, `PROGRESS.md`, `ISSUES.md`
- 经验总结：模式可以改变内容，但窗口外壳的可见/拖动状态不能只绑定普通 chat store，否则同一窗口在不同模式下会出现行为分叉。
- 是否需更新技术文档：否。

## ISSUE-155
- 发现时间：2026-05-10
- 发现者：用户反馈
- 相关任务：Coding 中间输出与小窗横向滚动修复
- 严重程度：重要
- 问题现象：小聊天窗口底部偶尔出现无用横向滑动条；继承 Codex session 时，中间阶段输出仍可能短暂变成绿色。
- 原因分析：Markdown 代码块默认 `overflow-x:auto`，长文本会撑出 compact 容器；继承扫描对非 final agent 文本只记录活动时间，没有把它作为黄色工作态消息展示，且部分 assistant 消息仍可能被误感知为完成。
- 解决方案：消息容器和气泡统一禁止横向 overflow 并强制长词换行；非 final agent/assistant 文本保存为 `lastProgress`，以黄色 working 气泡显示，最终输出出现后替换为绿色完成消息。
- 涉及文件：`electron/main.cjs`, `src/App.tsx`, `src/features/chat/ChatDialog.tsx`, `src/index.css`, `PROGRESS.md`, `ISSUES.md`
- 经验总结：compact 聊天窗口应优先保持布局稳定，长代码和长 URL 应换行而不是引入横向滚动；agent 过程消息是 working 内容，不是完成信号。
- 是否需更新技术文档：否。

## ISSUE-156
- 发现时间：2026-05-10
- 发现者：用户反馈
- 相关任务：聊天纵向滚动不抢焦点
- 严重程度：中等
- 问题现象：小聊天框纵向 overflow 有时会自动滑到底部，用户向上查看内容时被打断。
- 原因分析：普通 chat、Coding chat 和 standalone panel 都在消息刷新时无条件执行 `scrollTop = scrollHeight`；继承 Coding 轮询会频繁触发 render，更容易暴露问题。
- 解决方案：给消息区增加 `stickToBottom` 状态，只在用户本来接近底部时自动贴底；用户手动上滚后不再抢滚动位置。
- 涉及文件：`src/App.tsx`, `src/features/chat/ChatDialog.tsx`, `PROGRESS.md`, `ISSUES.md`
- 经验总结：自动滚动应该服务于“正在看最新消息”的用户，而不能覆盖用户主动查看历史的位置。
- 是否需更新技术文档：否。

## ISSUE-157
- 发现时间：2026-05-10
- 发现者：用户反馈
- 相关任务：Compact Chat 溢出与 Coding 过程气泡重修
- 严重程度：重要
- 问题现象：小聊天框仍可能出现横向 overflow；agent 中间阶段偶尔闪绿色；黄色状态下中间回复没有逐条保留；拖动后小窗 UI 尺寸又不标准。
- 原因分析：拖动重定位时主进程重设了 compact 窗口宽高，把已由内容撑开的高度压回默认几何；继承扫描只保存最后一条过程消息，且 `final_answer` 片段仍可能被视作最终完成；部分 Markdown/table/code 路径仍可能撑宽气泡。
- 解决方案：重定位只移动小窗位置并保留当前尺寸；过程消息数组化返回给前端；最终完成判定收紧到 `task_complete` / `last_agent_message`；继续补齐横向 overflow 限制。
- 涉及文件：`electron/main.cjs`, `src/App.tsx`, `src/features/chat/ChatDialog.tsx`, `src/index.css`, `PROGRESS.md`, `ISSUES.md`
- 经验总结：compact 窗口的“定位”和“尺寸”必须解耦；继承外部 agent 时，中间文本应作为工作态日志，而不是覆盖或触发完成态。
- 是否需更新技术文档：否。

## ISSUE-158
- 发现时间：2026-05-10
- 发现者：用户反馈
- 相关任务：继承 Coding 状态优先级修正
- 严重程度：重要
- 问题现象：虽然后端返回了 `progressMessages`，但黄色过程气泡没有稳定显示，旧的 done session 仍可能让按钮或小窗短暂变绿。
- 原因分析：聚合状态仍然是 done 优先于 active working；前端 compact 继承模式也优先选择非 working session，导致 working session 的过程消息数组被跳过。
- 解决方案：聚合优先级改为 needs-input > working > done > idle；compact 小窗在全局状态为 working 时优先渲染 working session。
- 涉及文件：`electron/main.cjs`, `src/App.tsx`, `PROGRESS.md`, `ISSUES.md`
- 经验总结：过程消息数组只是数据层能力，状态优先级和前端 session 选择也必须同步按 working 优先，UI 才会真实展示过程。
- 是否需更新技术文档：否。

## ISSUE-159
- 发现时间：2026-05-10
- 发现者：用户反馈
- 相关任务：Coding 过程气泡去重
- 严重程度：中等
- 问题现象：黄色状态下，同一条 agent 中间输出会在小窗里显示两遍。
- 原因分析：Codex session JSONL 中同一段过程文本可能同时记录为 `event_msg agent_message` 和 `response_item message`，解析器把两个事件都加入了 `progressMessages`。
- 解决方案：新增过程消息归一化 key，按文本去重；重复事件只更新时间，不新增气泡。
- 涉及文件：`electron/main.cjs`, `PROGRESS.md`, `ISSUES.md`
- 经验总结：读取外部 append-only 日志时，同一语义事件可能有多个投影格式，进入 UI 前要按内容或 call id 做去重。
- 是否需更新技术文档：否。

## ISSUE-160
- 发现时间：2026-05-10
- 发现者：用户反馈
- 相关任务：Coding 窗口气泡与菜单宽度调整
- 严重程度：中等
- 问题现象：Coding 大小窗口仍有清空入口；大聊天窗口里的 agent 回复不像小窗一样逐条气泡化；右键菜单“退出 Coding 模式”会换行。
- 原因分析：Coding 大窗复用了普通大窗的透明 assistant 样式和清空按钮；右键菜单宽度仍按旧的 112px 计算和渲染。
- 解决方案：删除 Coding 清空 UI；给消息气泡增加强制 bubble 样式并用于 Coding 大窗；右键菜单宽度同步扩大到 136px。
- 涉及文件：`src/App.tsx`, `src/features/pet/PetAvatar.tsx`, `src/features/chat/ChatDialog.tsx`, `PROGRESS.md`, `ISSUES.md`
- 经验总结：窗口外壳可复用普通 chat，但 Coding 的消息呈现需要明确指定气泡化，不能依赖普通大窗默认透明 assistant 样式。
- 是否需更新技术文档：否。

## ISSUE-161
- 发现时间：2026-05-10
- 发现者：用户需求
- 相关任务：Coding 模式接入 Claude Code
- 严重程度：增强
- 问题现象：Coding 模式只能接入 Codex，无法监听用户已经在终端中运行的 Claude Code session。
- 原因分析：现有状态源只解析 Codex app-server 与 `~/.codex/sessions`，没有工具选择，也没有 Claude Code JSONL session 的本地扫描和状态映射。
- 解决方案：新增 `codingProvider` 设置；Claude Code 走继承 session 模式，扫描 `~/.claude/projects/**/*.jsonl`，把 `AskUserQuestion` 映射为红色、非 `end_turn` assistant/tool_use 映射为黄色过程气泡、`end_turn` 映射为绿色完成输出。
- 涉及文件：`electron/main.cjs`, `src/App.tsx`, `src/features/pet/PetAvatar.tsx`, `src/features/settings/SettingsPanel.tsx`, `src/features/settings/settingsStore.ts`, `PROGRESS.md`, `ISSUES.md`
- 经验总结：外部 agent 接入应该抽象成 provider + inherited session source，UI 可以复用，但状态解析必须贴合每个工具自己的日志格式。
- 是否需更新技术文档：否。

## ISSUE-162
- 发现时间：2026-05-10
- 发现者：用户反馈
- 相关任务：右键菜单增加 Claude Code 入口
- 严重程度：中等
- 问题现象：Claude Code 已接入设置页，但灵宠右键菜单里没有直接入口，用户需要先去设置切换工具。
- 原因分析：右键菜单仍按单一 Coding provider 渲染，二级菜单只根据当前设置显示一种工具的入口。
- 解决方案：将 Coding 二级菜单拆成 Codex / Claude Code 分组；右键选择 Claude Code 时直接同步 provider 与 inherit session mode。
- 涉及文件：`src/App.tsx`, `src/features/pet/PetAvatar.tsx`, `PROGRESS.md`, `ISSUES.md`
- 经验总结：高频桌面入口不应依赖设置页状态预配置，provider 选择应该在动作入口处可见可切。
- 是否需更新技术文档：否。

## ISSUE-163
- 发现时间：2026-05-10
- 发现者：用户反馈
- 相关任务：Claude Code 支持开启新 session
- 严重程度：重要
- 问题现象：右键菜单只有 Claude Code 继承 session，不能像 Codex 一样开启新 session 并在小聊天框里直接发送消息。
- 原因分析：前端把 `codingProvider=claude` 强制视为继承模式；主进程没有 Claude Code 新 session 的状态源和发送链路。
- 解决方案：取消 Claude Code 强制继承；新增 Claude Code CLI `stream-json` 子进程发送链路和独立状态；右键菜单补充 Claude Code “开启新 session”。
- 涉及文件：`electron/main.cjs`, `src/App.tsx`, `src/features/pet/PetAvatar.tsx`, `src/features/settings/SettingsPanel.tsx`, `PROGRESS.md`, `ISSUES.md`
- 经验总结：同一 provider 也可能同时有“继承外部 session”和“应用内新 session”两种控制面，provider 与 session mode 不能绑定死。
- 是否需更新技术文档：否。

## ISSUE-164
- 发现时间：2026-05-10
- 发现者：用户反馈
- 相关任务：Claude Code Chat 布局与右键二级菜单修正
- 严重程度：重要
- 问题现象：Claude Code 的小窗 UI 仍可能出现横向 overflow、高度和拖动后的布局不稳；右键菜单中 Coding 模式二级菜单显示不全。
- 原因分析：Claude Code 输出更容易包含长路径、长命令和 JSON 片段，现有气泡虽然限制了大多数 Markdown，但外层容器仍缺少统一的 `max-width` / `overflow-wrap:anywhere` 硬约束；右键菜单新增 Claude Code 入口后，实际菜单高度和宽度超过了旧的预留常量，并且 PetAvatar 内部 `MENU_WIDTH` 仍停留在旧值。
- 解决方案：消息气泡和 Coding 容器统一补齐强制换行和横向隐藏；把菜单实际宽度常量修正为 136px，二级菜单预留宽度提升到 190px，菜单窗口高度预留提升到 312px。
- 涉及文件：`src/App.tsx`, `src/features/pet/PetAvatar.tsx`, `src/features/chat/ChatDialog.tsx`, `PROGRESS.md`, `ISSUES.md`
- 经验总结：桌面悬浮菜单的 BrowserWindow 尺寸必须按“展开后的最大二级菜单”预留；agent 输出应按最坏情况的无空格长文本处理，不能只依赖 Markdown 默认换行。
- 是否需更新技术文档：否。

## ISSUE-165
- 发现时间：2026-05-10
- 发现者：用户反馈
- 相关任务：Claude Code 连续新会话与 Coding 大窗工具切换
- 严重程度：重要
- 问题现象：Claude Code new session 中每次回复前都会出现“正在启动 Claude Code 新回合”；大聊天框只能看到当前 coding provider，不能在 Codex 和 Claude Code 间切换查看。
- 原因分析：Claude Code 每次发送都启动独立 `claude -p` 调用，没有显式复用 `--session-id`；Coding 大窗直接跟随全局 `codingProvider`，缺少 standalone 内部 provider tab。
- 解决方案：为 Claude Code 新 session 生成并复用同一个 UUID session id，后续发送用同一个 `--session-id`；启动提示只在第一条消息前显示；Coding standalone 顶部加入 Codex / Claude Code 切换，并按 provider 分离历史 key。
- 涉及文件：`electron/main.cjs`, `src/App.tsx`, `PROGRESS.md`, `ISSUES.md`
- 经验总结：CLI print 模式也需要显式会话 id 才能表现为连续聊天；多 provider UI 不能只依赖全局设置，standalone 窗口需要自己的查看维度。
- 是否需更新技术文档：否。

## ISSUE-166
- 发现时间：2026-05-10
- 发现者：用户反馈
- 相关任务：Claude Code New Session 小窗实时布局对齐
- 严重程度：重要
- 问题现象：Claude Code new session 的小聊天窗口仍存在高度、拖动后布局和横向 overflow 问题。
- 原因分析：Claude Code new session 状态虽然由主进程实时广播，但前端为了避免 Codex 状态串线只通过轮询读取 Claude 状态，导致高度重算和窗口 resize 滞后；Composer 外层也缺少和消息区一样强的 `min-w-0` / `overflow-hidden` 约束。
- 解决方案：给 Coding state 添加 provider 标记，让前端实时订阅并过滤当前 provider；切换 provider/session mode 时重置 compact 高度缓存；Composer 根容器、form、textarea 补齐横向约束。
- 涉及文件：`electron/main.cjs`, `src/App.tsx`, `src/features/chat/ChatDialog.tsx`, `PROGRESS.md`, `ISSUES.md`
- 经验总结：多 provider 共用同一个事件通道时必须携带来源元数据；小窗高度测量要跟随实时消息流，否则拖动和 resize 会感觉像另一套 UI。
- 是否需更新技术文档：否。

## ISSUE-167
- 发现时间：2026-05-10
- 发现者：用户反馈
- 相关任务：Coding 大窗去除重复工具标题
- 严重程度：轻微
- 问题现象：Coding 大聊天窗口右侧顶部已经显示当前工具和切换按钮，聊天框内部顶部又重复显示 Codex / Claude Code 文案。
- 原因分析：新增 provider tab 后，旧的聊天卡片内部工具标签栏没有移除，造成视觉重复。
- 解决方案：删除 Coding standalone 聊天卡片内部的工具标签栏，保留外层顶部作为唯一工具状态与切换入口。
- 涉及文件：`src/App.tsx`, `PROGRESS.md`, `ISSUES.md`
- 经验总结：新增全局层级控件后，要清理旧局部标签，避免同一信息在相邻层级重复出现。
- 是否需更新技术文档：否。

## ISSUE-168
- 发现时间：2026-05-10
- 发现者：用户反馈
- 相关任务：Claude Code 启动提示只显示一次
- 严重程度：中等
- 问题现象：Claude Code new session 中仍会在每次发送前显示“正在启动 Claude Code 新 session。”。
- 原因分析：首次启动判断依赖 `claudeCodingState.messages.length === 0`；当 UI 或状态刷新路径导致消息数组为空时，会误判为新会话，即使 `threadId` 已经存在。
- 解决方案：新增主进程级 `claudeCodingSessionStarted` 布尔状态，首次发送后置为 true；只有显式清空 Claude Code coding 会话时重置。
- 涉及文件：`electron/main.cjs`, `PROGRESS.md`, `ISSUES.md`
- 经验总结：会话生命周期不能用 UI 消息数组推断，应该使用独立 session 状态源。
- 是否需更新技术文档：否。

## ISSUE-169
- 发现时间：2026-05-10
- 发现者：用户反馈
- 相关任务：右键二级菜单容错与启动位置修正
- 严重程度：中等
- 问题现象：右键菜单二级窗口有时在鼠标移动过去之前消失；每次刚启动时 pet/orb 初始位置偏右下，先超出合适范围再回弹到内部。
- 原因分析：二级菜单依赖纯 hover，主菜单项与二级窗口之间存在间隙，鼠标经过间隙时 group hover 断开；Electron pet 窗口初始尺寸仍是旧的 220x220，而前端 collapsed 布局实际高度约 300，导致第一次布局时必须 resize/move 修正。
- 解决方案：在主菜单项与二级菜单之间加入透明三角过渡区作为 hover 通道；Electron 初始窗口改为 220x300，并按安全边距计算初始位置。
- 涉及文件：`electron/main.cjs`, `src/features/pet/PetAvatar.tsx`, `PROGRESS.md`, `ISSUES.md`
- 经验总结：悬浮菜单子项不能只靠视觉相邻，交互上也要有连续 hover 区；初始 BrowserWindow 尺寸应匹配前端首屏布局，避免首帧修正造成回弹感。
- 是否需更新技术文档：否。

## ISSUE-170
- 发现时间：2026-05-10
- 发现者：用户反馈
- 相关任务：Claude Code New Session 续聊改用 Resume
- 严重程度：重要
- 问题现象：Claude Code new session 第一条消息正常，第二条消息报错 `Session ID ... is already in use`，随后状态码 1 退出。
- 原因分析：实现中每次发送都传 `--session-id <uuid>`；Claude Code 对已存在/活跃的 session id 会加锁，继续对话应使用 `--resume <sessionId>`。
- 解决方案：首条消息用 `--session-id` 创建固定会话，后续消息切换为 `--resume` 续聊。
- 涉及文件：`electron/main.cjs`, `PROGRESS.md`, `ISSUES.md`
- 经验总结：CLI 的“指定 session id”和“恢复 session”语义不同；连续聊天要用 resume，而不是反复指定同一个 session id。
- 是否需更新技术文档：否。

## ISSUE-171
- 发现时间：2026-05-10
- 发现者：用户反馈
- 相关任务：右键菜单操作区分割线
- 严重程度：轻微
- 问题现象：右键菜单中专注模式 / Coding 模式与设置 / 隐藏 / 退出之间缺少视觉分组。
- 原因分析：功能区和窗口/应用操作区连续排列，层级不够清晰。
- 解决方案：在 Coding 模式区块之后增加一条分割线。
- 涉及文件：`src/features/pet/PetAvatar.tsx`, `PROGRESS.md`, `ISSUES.md`
- 经验总结：右键菜单要按操作语义分组，避免高频功能和 destructive/窗口操作粘在一起。
- 是否需更新技术文档：否。

## ISSUE-172
- 发现时间：2026-05-10
- 发现者：用户反馈
- 相关任务：Coding 大窗汇总 New 与继承会话
- 严重程度：重要
- 问题现象：Coding 大聊天窗口没有汇总所有 Coding 模式对话，只能看到当前模式下的 new session 或继承 session。
- 原因分析：大窗复用了 compact 的 `codingSessionMode` 分支，导致 new 与 inherit 互斥；继承状态接口也只返回当前可通知的 selected sessions，无法给大窗完整列表。
- 解决方案：standalone 大窗固定读取当前 provider 的 new state，同时额外轮询 inherited state；继承状态增加 `allSessions` 字段给大窗展示，左侧栏同时渲染继承 sessions 与 new session 历史。
- 涉及文件：`electron/main.cjs`, `src/App.tsx`, `PROGRESS.md`, `ISSUES.md`
- 经验总结：compact 通知视角和 standalone 工作台视角不同，前者需要“当前最重要状态”，后者需要“完整可浏览列表”。
- 是否需更新技术文档：否。

## ISSUE-173
- 发现时间：2026-05-10
- 发现者：用户反馈
- 相关任务：历史对话区分普通 Chat 与 Coding
- 严重程度：中等
- 问题现象：设置页历史对话混合普通 chat 与 Coding 会话；Coding 大窗左上角“新建对话”入口太显眼，位置也不符合用户希望。
- 原因分析：历史页直接展示所有 conversations，未过滤 Codex / Claude Code 标题；Coding 大窗复用了普通聊天的左上新建入口。
- 解决方案：设置页历史对话过滤 Coding 会话，并增加低调 Coding 历史入口跳转到 Coding 大窗；Coding 大窗将新建入口移到新 session 历史列表底部，文案改为“新建 session”。
- 涉及文件：`src/App.tsx`, `src/features/settings/SettingsPanel.tsx`, `PROGRESS.md`, `ISSUES.md`
- 经验总结：普通对话历史和 Coding 工作台是两类信息架构，默认历史页应保持干净，Coding 入口作为次级入口保留。
- 是否需更新技术文档：否。

## ISSUE-174
- 发现时间：2026-05-10
- 发现者：用户反馈
- 相关任务：小聊天框边缘展开位置修正
- 严重程度：中等
- 问题现象：小对话框在靠近屏幕边缘的位置展开时，有时空间不足，导致横向 overflow 或样式被压坏。
- 原因分析：compact chat 的窗口定位优先贴近灵宠，只在最终坐标上做 clamp；当灵宠靠边且邻近区域不足时，窗口虽然被限制在屏幕内，但可用布局空间不稳定。
- 解决方案：将定位改为候选位置打分：下方、上方、右侧、左侧和屏幕内居中都参与计算，优先选择完整放得下且高度损失最少的位置。
- 涉及文件：`src/App.tsx`, `PROGRESS.md`, `ISSUES.md`
- 经验总结：悬浮小窗不能只做坐标 clamp，靠边场景要有主动避让策略，必要时直接移动到足够空间区域。
- 是否需更新技术文档：否。

## ISSUE-175
- 发现时间：2026-05-10
- 发现者：用户需求
- 相关任务：自动记录焦点 Timeline
- 严重程度：功能新增
- 问题现象：个人档案只有专注时长和分心次数，无法回看一天内实际使用过哪些前台窗口，也无法知道浏览器主要访问了哪些网站。
- 原因分析：现有分心检测只在专注模式中即时读取前台窗口，没有持续写入本地历史；个人档案也没有按时间段展示焦点窗口的 UI。
- 解决方案：新增系统级前台窗口采样接口，pet 主窗口定时采样并记录超过 8 秒的稳定窗口；浏览器额外读取 URL 并提取域名；个人档案新增横向 timeline、详情展示、后台标记和 Top3 软件统计。
- 涉及文件：`electron/main.cjs`, `src/App.tsx`, `src/lib/db.ts`, `src/features/settings/SettingsPanel.tsx`, `PROGRESS.md`, `ISSUES.md`
- 经验总结：即时检测和历史统计要分层处理，采样器负责稳定窗口聚合，UI 负责按天展示和聚合统计，避免把分心检测逻辑直接变成数据模型。
- 是否需更新技术文档：否。

## ISSUE-176
- 发现时间：2026-05-10
- 发现者：用户反馈
- 相关任务：Timeline 与开机自启迁入通用设置
- 严重程度：中等
- 问题现象：Timeline 记录和开机自启没有设置入口；快捷键、隐私与数据作为独立目录项过于分散；开发中旧主进程会对 `read_timeline_active_window` 返回 Unknown command 并刷屏。
- 原因分析：上一轮只实现了默认行为和个人档案展示，没有补用户可控的全局设置；Electron 主进程 handler 变更需要重启才能生效，热更新期间前端会先于主进程调用新命令。
- 解决方案：新增“通用”设置，合并快捷键和隐私数据，并加入 Timeline 记录、开机自启两个开关；前端采样器尊重 Timeline 开关；旧主进程缺少命令时停止本轮采样避免持续报错。
- 涉及文件：`electron/main.cjs`, `src/App.tsx`, `src/features/settings/SettingsPanel.tsx`, `src/features/settings/settingsStore.ts`, `PROGRESS.md`, `ISSUES.md`
- 经验总结：主进程新增 IPC 命令时，渲染端应考虑开发热更新期间的新旧版本错位，并给用户暴露可控开关。
- 是否需更新技术文档：否。

## ISSUE-177
- 发现时间：2026-05-10
- 发现者：用户请求
- 相关任务：个人档案昨日 Timeline Mock 预览
- 严重程度：轻微
- 问题现象：真实 timeline 需要等待采样积累，不方便立即评审个人档案里的时间轴 UI 样式。
- 原因分析：Timeline 展示依赖当天或所选日期已有记录；新功能刚接入时通常没有足够完整的历史数据。
- 解决方案：个人档案默认打开昨天；如果昨天没有真实记录，则使用 UI 层 mock 数据展示，不写入数据库，并用“昨日示例”标签标明来源。
- 涉及文件：`src/features/settings/SettingsPanel.tsx`, `PROGRESS.md`, `ISSUES.md`
- 经验总结：新图表类 UI 评审可以提供非持久化 mock 数据，避免污染真实数据，同时让视觉验收更快。
- 是否需更新技术文档：否。

## ISSUE-178
- 发现时间：2026-05-10
- 发现者：用户反馈
- 相关任务：Timeline UI 整体化重构
- 严重程度：中等
- 问题现象：Timeline UI 仍像白底上的一组小圆角矩形，短任务图标展示不完整；后台进程与主时间段对应关系不清晰；点击详情只展示单个片段，无法表达同一长时间活动中包含多个网站或窗口。
- 原因分析：上一版把每个 entry 当成独立卡片式片段渲染，图例、后台轨道、详情聚合和统计图都还没有形成一个整体信息架构。
- 解决方案：主时间轴改为连续分段色带，图例独立放上方；后台进程按时间范围画在主时间轴下方；详情按同一 app / 分类的连续活动组顺序列出；统计区合并为 Top 软件柱状图和小时活跃度柱状图。
- 涉及文件：`src/features/settings/SettingsPanel.tsx`, `PROGRESS.md`, `ISSUES.md`
- 经验总结：时间轴应优先表达连续时间和层级关系，图标适合做图例而不是塞进每个短片段里。
- 是否需更新技术文档：否。

## ISSUE-179
- 发现时间：2026-05-10
- 发现者：用户反馈
- 相关任务：Timeline 默认今日与打开滚动动效
- 严重程度：中等
- 问题现象：用户测试使用 10 分钟后，设置里的 timeline 没看到任何更新；打开 timeline 时也缺少从 0 点滚动到当前时刻的进入动效；个人档案顶部缺少 Coding 模式时长卡片。
- 原因分析：为了上一轮 mock 预览，个人档案默认日期被改成“昨天”，真实采样写入“今天”后不会显示在默认页面；Timeline 横向容器没有初始化滚动逻辑；顶部统计卡片只保留了 3 个专注/分心指标。
- 解决方案：个人档案默认日期恢复为今天，昨天 mock 仅在用户切到昨天且没有真实数据时展示；Timeline 容器挂载后从 0 点平滑滚到当前时刻居中；顶部统计卡片增加 Coding 模式时长。
- 涉及文件：`src/features/settings/SettingsPanel.tsx`, `PROGRESS.md`, `ISSUES.md`
- 经验总结：Mock 默认入口不能遮住真实数据日期；时间轴类组件需要明确初始视口策略，否则用户很容易误判数据没有写入。
- 是否需更新技术文档：否。

## ISSUE-180
- 发现时间：2026-05-10
- 发现者：用户反馈
- 相关任务：Timeline 视觉与后台轨道细化
- 严重程度：中等
- 问题现象：后台进程在 timeline 下方显示不清楚；主 timeline 分段填色不够 Apple / Radix 风；点击主 timeline 色块会错误触发从 0 点滑动；mock 数据里部分标题像是读取了聊天内容或编辑文件内容。
- 原因分析：后台进程使用绝对定位短标签，缺少明确轨道和时间标尺；主色块使用偏直接的纯色透明度；滚动 effect 依赖 selected id，点击色块会重新执行；mock 文案没有严格区分窗口标题和内容本身。
- 解决方案：后台进程改成独立轨道行，使用范围胶囊表达时间跨度；主色块改用柔和渐变和轻描边；滚动动画改为首次进入视口只执行一次；mock 数据严格限制在 app 名、窗口标题和 URL。
- 涉及文件：`src/features/settings/SettingsPanel.tsx`, `PROGRESS.md`, `ISSUES.md`
- 经验总结：时间轴交互动效要和选择状态解耦；mock 数据应遵守真实采集边界，否则会误导后续产品判断。
- 是否需更新技术文档：否。

## ISSUE-181
- 发现时间：2026-05-10
- 发现者：用户反馈
- 相关任务：个人档案实时刷新链路修复
- 严重程度：重要
- 问题现象：用户使用一段时间后，个人档案中的今天 Timeline、专注时长和 Coding 模式时长都没有刷新。
- 原因分析：Timeline 采样依赖新主进程命令，开发热更新时旧主进程可能缺少该命令；设置页只靠轮询读取本地 storage，没有收到写入事件；Coding 模式时长上一版使用 timeline 的 coding 分类近似统计，不是真正的 Coding 模式开启时长。
- 解决方案：Timeline 新命令不可用时降级到 `check_distraction`；Timeline / 专注 / 分心 / Coding 统计写入后广播 `profile:data-updated`；新增 `codingMs` 日统计并在 Coding 模式开启期间每 15 秒落库。
- 涉及文件：`src/App.tsx`, `src/lib/db.ts`, `src/features/settings/SettingsPanel.tsx`, `PROGRESS.md`, `ISSUES.md`
- 经验总结：跨窗口本地统计需要显式更新事件；模式时长应独立落库，不能用 app 分类时长替代。
- 是否需更新技术文档：否。

## ISSUE-182
- 发现时间：2026-05-10
- 发现者：用户反馈
- 相关任务：个人档案布局与 Timeline 轻量化
- 严重程度：中等
- 问题现象：最近 14 天柱状图不支持左右滑动；timeline 色块使用渐变不符合用户预期；并行后台视觉过重且 music 信息冗余；设置窗口打开时内容有时过宽显示不全。
- 原因分析：个人档案图表容器仍按固定宽度布局；timeline 使用渐变填充；后台轨道的边框、胶囊和文本都偏强；设置布局主内容最大宽度和侧边栏宽度偏大。
- 解决方案：14 天柱状图增加横向滚动容器；timeline 改纯色柔和色块；并行后台降噪，music 只显示 music，terminal 保留详情；设置布局整体收窄。
- 涉及文件：`src/components/layouts/SettingsLayout.tsx`, `src/features/settings/SettingsPanel.tsx`, `PROGRESS.md`, `ISSUES.md`
- 经验总结：桌面设置窗口要以最小可用宽度为约束设计，图表组件要优先保证窄窗口下的可读性。
- 是否需更新技术文档：否。

## ISSUE-183
- 发现时间：2026-05-10
- 发现者：用户反馈
- 相关任务：专注与 Coding 时长按分钟落库
- 严重程度：中等
- 问题现象：专注时长只在专注结束时结算，Coding 模式时长之前按 15 秒频率写入，二者刷新节奏不统一。
- 原因分析：专注统计使用完整 session 结算口径，没有进行中增量写入；Coding 统计使用短周期写入，和用户希望的 1 分钟持续落库不一致。
- 解决方案：专注模式新增独立统计起点，每 1 分钟增量写入，结束时补尾段；Coding 模式写入周期统一调整为 1 分钟，关闭时补尾段。
- 涉及文件：`src/App.tsx`, `PROGRESS.md`, `ISSUES.md`
- 经验总结：进行中时长类指标应使用独立增量指针，避免影响业务倒计时起点和动画进度。
- 是否需更新技术文档：否。

## ISSUE-184
- 发现时间：2026-05-10
- 发现者：用户反馈
- 相关任务：全屏游戏与屏幕共享可见性策略
- 严重程度：重要
- 问题现象：灵宠的始终置顶会穿透全屏游戏；用户屏幕共享时，灵宠默认仍可能出现在共享画面中。
- 原因分析：当前置顶策略统一使用 macOS screen-saver 层级并由 topmost guard 持续恢复，没有区分全屏游戏场景；屏幕共享也没有独立自动隐藏策略和用户设置入口。
- 解决方案：新增前台上下文检测，游戏类全屏 app 期间抑制 screen-saver 级置顶；新增共享屏幕自动隐藏开关，默认开启，检测到共享时隐藏灵宠，结束后恢复自动隐藏前的状态。
- 涉及文件：`electron/main.cjs`, `src/App.tsx`, `src/features/settings/settingsStore.ts`, `src/features/settings/SettingsPanel.tsx`, `PROGRESS.md`, `ISSUES.md`
- 经验总结：置顶策略需要按场景降级，尤其是游戏和共享屏幕这类用户明确不希望覆盖的上下文。
- 是否需更新技术文档：否。

## ISSUE-185
- 发现时间：2026-05-10
- 发现者：用户反馈
- 相关任务：并行后台改为横向 Timeline 标注
- 严重程度：轻微
- 问题现象：并行后台仍然以纵向一条一条的列表方式展示，和主 timeline 的时间轴关系不够直接。
- 原因分析：上一版虽然给每条后台进程增加了时间范围胶囊，但布局仍是垂直列表，没有真正沿用主 timeline 的横向时间坐标。
- 解决方案：将后台进程改为横向轨道标注，按开始/结束时间绝对定位在同一时间轴上，使用轻量细线和小胶囊展示。
- 涉及文件：`src/features/settings/SettingsPanel.tsx`, `PROGRESS.md`, `ISSUES.md`
- 经验总结：时间关系强的信息应尽量共享同一坐标系，减少用户在视觉上二次映射。
- 是否需更新技术文档：否。

## ISSUE-186
- 发现时间：2026-05-10
- 发现者：用户反馈
- 相关任务：最近 14 天滑动与 Timeline 采样稳定性修复
- 严重程度：重要
- 问题现象：个人档案最近 14 天图表仍缺少明确左右滑动入口；用户试用后 Coding 模式时长已更新，但 timeline 仍为空。
- 原因分析：最近 14 天图表虽然有横向 overflow，但内容宽度和交互入口不够明确；timeline 采样使用完整 `appName + windowTitle + url` 作为段 key，Codex、浏览器、编辑器等窗口标题可能几秒变化一次，导致每个段都未达到 8 秒阈值而被丢弃；同时缺少 Accessibility 授权提示，权限失败时容易表现为空白。
- 解决方案：最近 14 天图表增加左右滑动按钮和 scroll snap；timeline 仅由 pet 主窗口采样；浏览器按 URL 稳定分段，其他 app 按应用名合并并更新标题详情；主进程新增辅助功能权限检查命令，采样首次运行时触发系统授权提示；并行后台改成 music / terminal 两条横向轨道，hover 才展开具体内容，并调整 mock 数据覆盖 3 小时终端和两段音乐。
- 涉及文件：`electron/main.cjs`, `src/App.tsx`, `src/lib/db.ts`, `src/features/settings/SettingsPanel.tsx`, `PROGRESS.md`, `ISSUES.md`
- 经验总结：超过阈值才落库的采样系统不能把高频变化字段作为唯一 key；权限依赖也需要在 UI 流程中主动暴露，不能只在控制台里失败。
- 是否需更新技术文档：否。

## ISSUE-187
- 发现时间：2026-05-10
- 发现者：用户反馈
- 相关任务：Timeline 时长阈值、聚合与分心软件统计
- 严重程度：重要
- 问题现象：设置窗口默认尺寸仍偏窄；最近 14 天只能在固定 14 天范围内横滑；timeline 空态文案过于限定“今天”；后台 hover 同时出现浏览器原生 title 和自定义气泡；主 timeline 被短切屏打断；专注模式只记录分心次数，没有按软件统计。
- 原因分析：设置窗口沿用较小比例；14 天图表只做容器滚动，没有日期窗口状态；后台 marker 使用 `title` 导致原生提示与自定义气泡重叠；timeline 采样遇到 key 切换立即结束当前段；分心统计模型只有每日总次数。
- 解决方案：增大设置窗口默认 bounds；14 天按钮改为翻动统计日期窗口；移除后台 marker 原生 title；新增 timeline 最小时长设置和候选窗口逻辑；展示层按连续 app 聚合；新增 `distractionApps` 日统计，记录 app 次数和估算时长并展示。
- 涉及文件：`electron/main.cjs`, `src/App.tsx`, `src/lib/db.ts`, `src/features/settings/settingsStore.ts`, `src/features/settings/SettingsPanel.tsx`, `PROGRESS.md`, `ISSUES.md`
- 经验总结：时间轴采样需要区分“观测到短暂切换”和“确认切换”；hover 提示只能保留一套系统，避免浏览器原生 tooltip 干扰设计。
- 是否需更新技术文档：否。

## ISSUE-188
- 发现时间：2026-05-10
- 发现者：用户反馈
- 相关任务：Timeline 采集链路实时 Debug 日志
- 严重程度：重要
- 问题现象：用户试用后今天 timeline 仍然没有记录，需要知道采样器实时采到了什么、为什么没有落库。
- 原因分析：当前采样链路跨 renderer、本地存储和 Electron 主进程，失败可能发生在 Accessibility 权限、osascript 返回、最小时长判断、candidate 确认、upsert 落库或设置页读取任一环节；缺少 terminal 级别的实时采样日志。
- 解决方案：新增主进程 timeline debug log 命令；osascript 采样成功/失败直接打印；renderer 采样器在 active/candidate/persist 的每个关键状态向 terminal 打印结构化日志。
- 涉及文件：`electron/main.cjs`, `src/App.tsx`, `PROGRESS.md`, `ISSUES.md`
- 经验总结：跨进程采集功能必须有可观测性，尤其是依赖系统权限和时间阈值的记录逻辑。
- 是否需更新技术文档：否。

## ISSUE-189
- 发现时间：2026-05-10
- 发现者：用户提供 terminal 日志
- 相关任务：Timeline AppleScript 采样脚本修复
- 严重程度：严重
- 问题现象：Timeline 日志持续输出 `sample:skip unsupported or error`，错误为 AppleScript `syntax error: 预期是行的结尾，却找到属性。(-2741)`，导致今天 timeline 无法记录。
- 原因分析：主 `timelineActiveWindowScript` 同时包含 Chromium 浏览器 URL 采集和 Music/Spotify 播放状态采集，这些语句依赖各自应用字典；AppleScript 会在执行前编译整段脚本，即使分支不执行也会解析失败。
- 解决方案：主采样脚本只保留 System Events；浏览器 URL、Music、Spotify 信息改为按实际 app 拆分成独立 osascript 调用，并将失败降级为缺少 URL/音乐详情，不再阻断前台窗口 timeline。
- 涉及文件：`electron/main.cjs`, `PROGRESS.md`, `ISSUES.md`
- 经验总结：AppleScript 中 app-specific dictionary 语句不要混在一条通用脚本里；应把可选增强信息拆成独立、可失败的采集步骤。
- 是否需更新技术文档：否。

## ISSUE-190
- 发现时间：2026-05-10
- 发现者：用户要求
- 相关任务：Timeline 状态机单元测试
- 严重程度：重要
- 问题现象：Timeline 记录逻辑包含 active、candidate、最小时长、短切屏过滤、后台 marker、落库和前端刷新事件，靠手动操作很难覆盖所有组合。
- 原因分析：状态机逻辑之前内联在 React effect 中，无法直接单元测试；没有独立测试脚本验证“短切屏不打断”“候选确认”“后台详情”和“推送前端”等关键路径。
- 解决方案：将状态机抽到 `TimelineRecorder` 纯逻辑模块；新增 Node 内置测试脚本，模拟各类用户活动和 persist/push 行为；App 改为调用同一 recorder，避免测试和线上逻辑分叉。
- 涉及文件：`src/App.tsx`, `src/lib/timelineRecorder.ts`, `src/lib/timelineRecorder.test.ts`, `package.json`, `tsconfig.app.json`, `PROGRESS.md`, `ISSUES.md`
- 经验总结：时间序列状态机必须先抽成纯逻辑，再用确定性时间戳单测，UI 层只负责采样和持久化回调。
- 是否需更新技术文档：否。

## ISSUE-191
- 发现时间：2026-05-10
- 发现者：用户提供 terminal 日志
- 相关任务：Timeline 脚本失败降级与错误日志增强
- 严重程度：重要
- 问题现象：Timeline 日志仍然输出 `sample:skip unsupported or error error="Command failed: /usr/bin/osascript -e "`，没有真实 stderr，且采样失败时整条 timeline 仍为空。
- 原因分析：`execFile` 回调只使用了 `error.message`，丢失 stderr；完整采样脚本失败后没有降级路径，即使简单前台窗口脚本可用，也不会记录基础 app/window。
- 解决方案：采样错误优先记录 stderr；完整 timeline 脚本失败时自动调用简单 active window 脚本，成功则以无 URL/无后台 marker 的基础快照继续进入状态机。
- 涉及文件：`electron/main.cjs`, `PROGRESS.md`, `ISSUES.md`
- 经验总结：增强采集必须可失败，基础前台窗口记录应作为最低可用路径保住。
- 是否需更新技术文档：否。

## ISSUE-192
- 发现时间：2026-05-10
- 发现者：用户提供 terminal 日志
- 相关任务：Timeline 忽略自身窗口并稳定采样器生命周期
- 严重程度：重要
- 问题现象：启动后 Electron 自己先被记录为 active，Codex 变成 candidate；设置同步时出现 start/stop，采样器状态被重置，导致真实活动很难达到最小时长落库。
- 原因分析：TimelineRecorder 没有过滤 DeskCat / Electron 自身窗口；React effect 依赖整个 `settings` 对象，任意设置对象刷新都会销毁并重建 recorder。
- 解决方案：在 recorder 中忽略 DeskCat / PawPal / Electron；App 中用 `settingsRef` 给 fallback 调用读取最新设置，同时把 timeline effect 依赖收窄到实际会影响采样器生命周期的两个设置项。
- 涉及文件：`src/App.tsx`, `src/lib/timelineRecorder.ts`, `src/lib/timelineRecorder.test.ts`, `PROGRESS.md`, `ISSUES.md`
- 经验总结：采样器生命周期必须稳定，不能被无关状态刷新打断；自身窗口应视为不可记录噪声。
- 是否需更新技术文档：否。

## ISSUE-193
- 发现时间：2026-05-10
- 发现者：用户提供 terminal 日志
- 相关任务：Timeline 增强采集拆分与后台音乐修复
- 严重程度：重要
- 问题现象：日志中 Codex / Edge / WeChat 已经 `persist:ok`，但仍持续输出 `timeline-script:error`；用户运行后台音乐时，timeline 没有明确记录音乐后台进程。
- 原因分析：完整增强脚本失败后虽然会 fallback 到简单前台窗口，保住主 timeline 落库，但 fallback 返回 `background: []` 且没有 URL；因此浏览器 URL 和后台 music / terminal marker 都被丢弃。NeteaseMusic 也没有被单独识别为音乐后台来源。
- 解决方案：彻底移除 `readTimelineActiveWindow` 对完整增强脚本的依赖；前台窗口、浏览器 URL、后台进程改为独立采集并并行合并。后台进程扫描支持 Terminal、iTerm2、Music、Spotify、NeteaseMusic，网易云无法稳定读曲名时以轻量 `playing` marker 记录。
- 涉及文件：`electron/main.cjs`, `src/lib/db.ts`, `PROGRESS.md`, `ISSUES.md`
- 经验总结：增强信息采集不能和基础窗口采集耦合；任何 app-specific AppleScript 都应是可失败的小模块，失败后只损失该字段，不影响整条 timeline。
- 是否需更新技术文档：否。

## ISSUE-194
- 发现时间：2026-05-10
- 发现者：用户提供 terminal 日志
- 相关任务：Timeline 后台进程快照修复
- 严重程度：一般
- 问题现象：后台进程扫描偶发 `System Events ... 不能获得 item ... 无效的索引 (-1719)`，但前台窗口仍可正常采样。
- 原因分析：AppleScript 遍历 `every application process` 时，macOS 进程列表是动态变化的；遍历期间有进程退出或新增会导致索引失效。
- 解决方案：不再逐项遍历动态列表，改成一次性读取 `name of every application process` 快照并 join 输出。
- 涉及文件：`electron/main.cjs`, `PROGRESS.md`, `ISSUES.md`
- 经验总结：System Events 的动态集合不适合长循环遍历，能一次性取属性列表就不要逐项访问。
- 是否需更新技术文档：否。

## ISSUE-195
- 发现时间：2026-05-10
- 发现者：用户反馈
- 相关任务：Timeline Debug 日志降噪
- 严重程度：一般
- 问题现象：Timeline 功能已正常落库，但 terminal 每 3 秒输出大量 sample / persist skip / persist ok；Edge 刚切前台时偶发 `browser-url:error`，随后又能正常读到 URL。
- 原因分析：调试期日志没有分级过滤，常规采样和低于阈值状态也全部输出；Chromium 系浏览器刚激活时 active tab 尚未稳定，短暂 URL 读取失败属于可恢复状态，不应按错误噪声打印。
- 解决方案：浏览器 URL 读取失败静默降级为空 URL，后续采样继续补齐；renderer 端过滤高频 sample / hold / below-minimum 日志，persist ok 改为首次和每 60 秒摘要输出。
- 涉及文件：`electron/main.cjs`, `src/App.tsx`, `PROGRESS.md`, `ISSUES.md`
- 经验总结：采样类功能的 debug 日志需要按“状态变化”和“异常”输出，不能按采样频率输出。
- 是否需更新技术文档：否。

## ISSUE-196
- 发现时间：2026-05-10
- 发现者：用户反馈
- 相关任务：休眠暂停计时与 Timeline 视图修复
- 严重程度：重要
- 问题现象：电脑休眠或熄屏超过 1 分钟时，专注时长、Coding 模式时长和 timeline 前台 task 仍可能继续累计；timeline 时间刻度过疏；hover 内容框被裁切；分类和后台轨道图标会随横向滚动离开左侧。
- 原因分析：计时逻辑只按 wall-clock 增量落库，没有系统 idle / locked 状态门控；timeline tooltip 位于横向滚动和圆角轨道内部，容易被 overflow 裁切；图例和轨道 label 放在滚动内容内部，横向滚动时自然跟随移动。
- 解决方案：新增 powerMonitor 活动状态命令；renderer 统一暂停/恢复专注与 Coding 统计并顺延专注倒计时；TimelineRecorder 支持暂停前台并在暂停期间继续延展后台 marker；时间刻度改为 2 小时间隔；图例移到滚动区外，后台 label 改为 sticky；为 tooltip 增加滚动区上下留白并解除轨道 overflow 裁切。
- 涉及文件：`electron/main.cjs`, `src/App.tsx`, `src/lib/timelineRecorder.ts`, `src/lib/timelineRecorder.test.ts`, `src/features/settings/SettingsPanel.tsx`, `PROGRESS.md`, `ISSUES.md`
- 经验总结：统计类计时不能只看 wall-clock，必须把系统休眠/锁屏视为暂停；时间轴的标签和 tooltip 应该独立于滚动内容的裁切层。
- 是否需更新技术文档：否。

## ISSUE-197
- 发现时间：2026-05-10
- 发现者：用户反馈
- 相关任务：7 天专注图与 Timeline Hover 浮层
- 严重程度：一般
- 问题现象：个人档案专注图仍以 14 天为单位展示，用户希望按任意 7 天窗口查看；timeline 条带上下为了 hover 详情预留过多空白，视觉不够紧凑。
- 原因分析：专注图的数据窗口和翻页步长都固定为 14 天；timeline hover 卡片之前放在滚动条带内部，为避免裁切只能增加 `pt/pb` 留白。
- 解决方案：专注图改为 7 天窗口，翻页步长为 7 天，日历选择日期时同步设置该日期为窗口结束日；timeline hover 详情改为 fixed 浮层覆盖显示，条带容器恢复紧凑 padding。
- 涉及文件：`src/features/settings/SettingsPanel.tsx`, `PROGRESS.md`, `ISSUES.md`
- 经验总结：hover 详情不应通过增加布局留白解决遮挡，应该脱离裁切层作为浮层展示。
- 是否需更新技术文档：否。

## ISSUE-198
- 发现时间：2026-05-10
- 发现者：用户反馈
- 相关任务：全天活跃度坐标轴对齐
- 严重程度：一般
- 问题现象：全天活跃度图中 0、6、12、18 这些 x 轴标签在 bar 容器内占据高度，导致带标签的柱子起点和其他柱子不一致。
- 原因分析：bar 和 x 轴 label 被放在同一个 flex column 中，label 会参与该小时柱子的布局高度计算。
- 解决方案：将柱状图拆成独立 bar row 和 label row，bar 统一从底线开始；x 轴标签下移并改为每 2 小时显示一次。
- 涉及文件：`src/features/settings/SettingsPanel.tsx`, `PROGRESS.md`, `ISSUES.md`
- 经验总结：图表轴标签不能参与数据图形的尺寸流，应该放在独立轴层。
- 是否需更新技术文档：否。

## ISSUE-199
- 发现时间：2026-05-10
- 发现者：用户反馈
- 相关任务：个人档案统计区 Apple/Radix 化
- 严重程度：一般
- 问题现象：7 天专注图和上方统计卡片仍不像下方 timeline 的 Apple/Radix 风格，视觉上有漂浮卡片感，整体不够统一。
- 原因分析：顶部统计项仍是四个独立 `quiet-card`；7 天专注图沿用普通柱图容器，缺少和 timeline 一致的浅灰底、低对比边框、整体分组和分隔逻辑。
- 解决方案：统计项改成一个整体分组容器，用分隔线建立层级；7 天专注图改为浅灰面板和独立标签行；下方 mini metrics 合并为一个整体分组。
- 涉及文件：`src/features/settings/SettingsPanel.tsx`, `PROGRESS.md`, `ISSUES.md`
- 经验总结：同一页面的信息模块要统一“容器语法”，尤其是 Apple/Radix 风格里应减少孤立卡片，更多使用整体面板和弱分隔。
- 是否需更新技术文档：否。

## ISSUE-200
- 发现时间：2026-05-10
- 发现者：用户反馈
- 相关任务：分心软件排行卡片
- 严重程度：一般
- 问题现象：分心统计需要更明确地展示具体分心软件、次数和时长，并按次数排名。
- 原因分析：此前虽然已有 `distractionApps` 数据和简略列表，但视觉上不像独立排行卡片，也没有清晰的排名序号和总计信息。
- 解决方案：将分心软件面板改为排行卡片，按次数和时长排序，展示排名、软件名、累计时长、次数和比例条；无数据时显示空态。
- 涉及文件：`src/features/settings/SettingsPanel.tsx`, `PROGRESS.md`, `ISSUES.md`
- 经验总结：统计详情应同时提供排序、总计和空态，避免只给原始列表造成信息层级不清。
- 是否需更新技术文档：否。

## ISSUE-201
- 发现时间：2026-05-10
- 发现者：用户反馈
- 相关任务：个人档案顺序与 7 天专注横滑
- 严重程度：一般
- 问题现象：7 天专注图仍依赖左右按钮翻页，不符合横向 overflow 交互；选中柱使用硬黑色，和 Apple/Radix 风格不统一；个人档案里 timeline 不在最上方。
- 原因分析：前一版专注图仍按分页思路设计，只加载 7 天并通过按钮切换；选中态直接使用前景黑；页面顺序仍优先展示统计卡片。
- 解决方案：7 天专注改为 90 天横向可滚动时间带，选中日期自动滚到可视区域；摘要按选中日及前 6 天计算；选中柱改为柔和灰；timeline 移到个人档案最上方，专注和分心统计放到下方。
- 涉及文件：`src/features/settings/SettingsPanel.tsx`, `PROGRESS.md`, `ISSUES.md`
- 经验总结：时间序列图更适合直接横向滑动，按钮分页容易打断探索；统计页的主叙事内容应该放在最上方。
- 是否需更新技术文档：否。

## ISSUE-202
- 发现时间：2026-05-10
- 发现者：用户反馈
- 相关任务：7 天专注图轻量化与日期坐标
- 严重程度：一般
- 问题现象：7 天专注图看起来像有 14 个 bar，横坐标没有日期，整体视觉太臃肿。
- 原因分析：柱形图和下方星期标签分别使用两排 button，标签行在视觉上像第二排柱；日期只显示星期，没有显示月/日；图表套了较高的内层背景和较大的 padding。
- 解决方案：将柱子、月/日、星期合并成同一个日期单元，删除独立标签行；压缩高度、柱宽和 padding，改成单层轻量横向滚动图。
- 涉及文件：`src/features/settings/SettingsPanel.tsx`, `PROGRESS.md`, `ISSUES.md`
- 经验总结：图表坐标标签不要做成和数据图形相似的交互块，尤其在小尺寸图表里会被误读为额外数据。
- 是否需更新技术文档：否。

## ISSUE-203
- 发现时间：2026-05-10
- 发现者：用户反馈
- 相关任务：14 天专注标题与今天右边界
- 严重程度：一般
- 问题现象：专注图标题仍写“7 天专注”；当选中较早日期后，横向历史带右侧会跟着选中日期截断，无法继续右滑到今天。
- 原因分析：图表数据用 `chartEndDate` 作为结束日加载，点击旧日期会把数据右边界也移动到旧日期；统计窗口仍按 7 天计算。
- 解决方案：专注图固定加载截至今天的历史数据，移除 `chartEndDate`；标题改为“14 天专注”，摘要和下方统计按选中日及前 13 天计算。
- 涉及文件：`src/features/settings/SettingsPanel.tsx`, `PROGRESS.md`, `ISSUES.md`
- 经验总结：横向历史带的滚动边界应和“可浏览范围”绑定，而不是和当前选中点绑定，否则用户无法自然回到今天。
- 是否需更新技术文档：否。

## ISSUE-204
- 发现时间：2026-05-10
- 发现者：用户反馈
- 相关任务：设置默认值与目录文案
- 严重程度：轻微
- 问题现象：Timeline 最小时长默认 1 分钟过短；休息提醒默认 25 分钟不符合当前期望；设置目录中“通用”位置偏后，“历史对话”命名需要改为“对话历史”。
- 原因分析：默认设置沿用早期专注番茄钟参数；设置侧边栏顺序和历史文案尚未按最新信息架构调整。
- 解决方案：默认 Timeline 最小时长改为 5 分钟，休息提醒默认 60 分钟；侧边栏将“通用”放到第二项，“历史对话”改为“对话历史”。
- 涉及文件：`src/features/settings/settingsStore.ts`, `src/features/settings/SettingsPanel.tsx`, `PROGRESS.md`, `ISSUES.md`
- 经验总结：默认值调整应只影响新用户或未保存该项的用户，避免静默覆盖已有偏好。
- 是否需更新技术文档：否。

## ISSUE-205
- 发现时间：2026-05-10
- 发现者：用户反馈
- 相关任务：设置页玻璃质感与字段编辑态
- 严重程度：一般
- 问题现象：设置页整体不够清透；通用、外观、提醒事项和 AI 对话中的输入控件字号和质感不统一；文本字段默认可编辑，容易误触；滑动条视觉偏粗糙。
- 原因分析：设置页仍混用早期透明/白底容器和零散 Tailwind 输入样式；Input、Textarea、Select、Slider 缺少统一的 Radix/Apple 视觉语言；文本字段直接绑定设置值，没有只读编辑态。
- 解决方案：重做设置背景、分组卡片、Input/Textarea/Select 和 Slider 基础样式；新增 `EditableInput` / `EditableTextarea`，让主要文本字段默认只读，通过“修改/完成”切换编辑态。
- 涉及文件：`src/components/layouts/SettingsLayout.tsx`, `src/components/ui/input.tsx`, `src/components/ui/textarea.tsx`, `src/features/settings/SettingsPanel.tsx`, `src/index.css`, `PROGRESS.md`, `ISSUES.md`
- 经验总结：设置页控件应先统一基础组件语义，再做局部字段调整；直接可编辑字段需要显式编辑入口来减少误触。
- 是否需更新技术文档：否。

## ISSUE-206
- 发现时间：2026-05-10
- 发现者：用户反馈
- 相关任务：设置输入留白与分心规则 Token 编辑器
- 严重程度：一般
- 问题现象：设置页文本框左右边框和文字距离太近；专注模式里的屏蔽应用、屏蔽关键词仍是一个词一行的多行文本框，不便浏览和增删。
- 原因分析：Input / Textarea 基础组件横向 padding 偏小；分心规则数据虽然是数组，但 UI 仍用 textarea 字符串编辑，没有体现规则项的独立性。
- 解决方案：加宽 Input / Textarea 横向 padding；新增 `RuleTokenEditor`，用自然换行的小文本框展示每个规则，支持单项编辑、删除和末尾 `+` 添加。
- 涉及文件：`src/components/ui/input.tsx`, `src/components/ui/textarea.tsx`, `src/features/settings/SettingsPanel.tsx`, `PROGRESS.md`, `ISSUES.md`
- 经验总结：数组型配置应使用 token/chip 编辑器，而不是让用户维护换行文本。
- 是否需更新技术文档：否。

## ISSUE-207
- 发现时间：2026-05-10
- 发现者：用户反馈
- 相关任务：设置分组卡片边距修正
- 严重程度：一般
- 问题现象：通用、外观、提醒事项、AI 对话中的设置行文字仍贴近卡片左右边框，整体不像个人档案卡片那样有舒适留白。
- 原因分析：上一轮主要调整了 Input/Textarea 的内部 padding，但 SettingsRow / AppearanceRow 仍是 `px-0`，导致行内容直接从卡片边缘开始。
- 解决方案：SettingsGroup 改为个人档案式浅色卡片边框和底色；SettingRow、AppearanceRow、不可用行以及分心规则区域统一增加水平内边距。
- 涉及文件：`src/features/settings/SettingsPanel.tsx`, `PROGRESS.md`, `ISSUES.md`
- 经验总结：输入舒适度不仅取决于控件自身 padding，也取决于外层 row 和 card 的容器留白。
- 是否需更新技术文档：否。

## ISSUE-208
- 发现时间：2026-05-10
- 发现者：用户反馈
- 相关任务：个人档案打开时禁止纵向自动滚动
- 严重程度：一般
- 问题现象：打开个人档案时，页面会自动向下滑动，用户没有主动滚动也会偏离顶部。
- 原因分析：14 天专注图为了让选中日期进入可视区使用了 `scrollIntoView`；该 API 会同时影响横向和纵向滚动容器，导致外层设置页被带着滚动。
- 解决方案：移除 `scrollIntoView`，改为手动计算并设置专注图横向容器的 `scrollLeft`，只处理横向定位。
- 涉及文件：`src/features/settings/SettingsPanel.tsx`, `PROGRESS.md`, `ISSUES.md`
- 经验总结：嵌套滚动容器里不要用 `scrollIntoView` 做局部横向定位，容易意外影响父级纵向滚动。
- 是否需更新技术文档：否。

## ISSUE-209
- 发现时间：2026-05-10
- 发现者：用户反馈
- 相关任务：设置按钮色彩统一
- 严重程度：一般
- 问题现象：设置页里仍有很多黑色按钮或黑色选中态，和当前 Apple/Radix 玻璃风格不一致。
- 原因分析：基础 Button 默认 variant 仍使用 `bg-primary text-primary-foreground`；部分设置局部 UI 直接使用 `bg-foreground` / `bg-primary` 写死了深色样式。
- 解决方案：将默认 Button 主操作改为 Vite 蓝玻璃按钮；把日历选中态、API 默认标签和用量条统一为浅蓝低对比样式。
- 涉及文件：`src/components/ui/button.tsx`, `src/features/settings/SettingsPanel.tsx`, `PROGRESS.md`, `ISSUES.md`
- 经验总结：设置页主操作颜色应收敛到基础组件，局部状态样式避免绕过设计 token 直接使用 foreground。
- 是否需更新技术文档：否。

## ISSUE-210
- 发现时间：2026-05-10
- 发现者：用户反馈
- 相关任务：Top 软件时间标签防换行
- 严重程度：一般
- 问题现象：个人档案 Top 软件图表里，右侧时长 label 较长时会自动换行，破坏柱状图对齐。
- 原因分析：Top 软件行的 grid 时间列只有 54px，无法稳定容纳 `1h 20min` 等较长文本，且没有设置 `whitespace-nowrap`。
- 解决方案：将时间列加宽到 82px，并对时间 label 设置不换行；bar 列使用 `minmax(0,1fr)` 自适应缩短。
- 涉及文件：`src/features/settings/SettingsPanel.tsx`, `PROGRESS.md`, `ISSUES.md`
- 经验总结：图表右侧数值标签应预留固定宽度并禁用换行，避免数据长度变化影响图形结构。
- 是否需更新技术文档：否。

## ISSUE-211
- 发现时间：2026-05-10
- 发现者：用户反馈
- 相关任务：设置控件改为平面风格
- 严重程度：一般
- 问题现象：设置中的滑动条和部分蓝色按钮带有明显立体高光、投影效果，不符合用户希望的 Apple 常见平面控件风格。
- 原因分析：Slider 轨道和 thumb 使用 inset 高光、渐变和较重投影；默认 Button、Switch 和部分局部蓝色状态也保留了玻璃/立体阴影。
- 解决方案：移除 Slider、默认 Button、Switch、日历选中态、API 默认标签和用量条的立体阴影/内高光，保留平面蓝色与轻量交互反馈。
- 涉及文件：`src/index.css`, `src/components/ui/button.tsx`, `src/components/ui/switch.tsx`, `src/features/settings/SettingsPanel.tsx`, `PROGRESS.md`, `ISSUES.md`
- 经验总结：玻璃质感适合容器背景，但可操作控件需要更克制，主色按钮和滑动条应优先保持清晰平面语义。
- 是否需更新技术文档：否。

## ISSUE-212
- 发现时间：2026-05-10
- 发现者：用户反馈
- 相关任务：Top 软件列表扩展与时间左对齐
- 严重程度：一般
- 问题现象：个人档案 Top 软件右侧时间 label 靠右对齐，视觉上和 bar 关系不够稳定；Top 软件只有 3 条时，高度比右侧全天活跃度图偏矮。
- 原因分析：Top 软件聚合函数只截取前 3 个应用；时间列使用 `text-right`，在固定列宽下显得和 bar 分离。
- 解决方案：Top 软件聚合改为前 4 个；时间 label 改为左对齐并保持不换行。
- 涉及文件：`src/features/settings/SettingsPanel.tsx`, `PROGRESS.md`, `ISSUES.md`
- 经验总结：并排统计卡片应尽量匹配内容密度，数值列与图形列的对齐方式要服务可读性而不是单纯贴边。
- 是否需更新技术文档：否。

## ISSUE-213
- 发现时间：2026-05-10
- 发现者：用户反馈
- 相关任务：AI 对话设置重排与 Coding Provider 开关
- 严重程度：一般
- 问题现象：提醒事项页顶部有重复标题；AI 对话设置顺序不符合当前使用路径，Coding 模式只能选择当前工具和总开关，不能分别控制 Codex / Claude Code 可用性。
- 原因分析：早期 Coding 模式是单 provider 选择模型，后续增加 Claude Code 后没有把 provider 可用性抽象成独立设置；AI 对话里的模型参数、身份设置、语音设置也仍按旧结构分散展示。
- 解决方案：新增 `codingCodexEnabled` / `codingClaudeEnabled` 持久化设置和快速连接测试；重排 AI 设置卡片；右键菜单、Coding 历史入口、大对话框 provider 切换都按可用 provider 过滤。
- 涉及文件：`electron/main.cjs`, `src/App.tsx`, `src/features/pet/PetAvatar.tsx`, `src/features/settings/SettingsPanel.tsx`, `src/features/settings/settingsStore.ts`, `PROGRESS.md`, `ISSUES.md`
- 经验总结：新增 provider 时应区分“当前选中 provider”和“provider 是否可用”，否则设置、菜单和历史入口会互相耦合。
- 是否需更新技术文档：否。

## ISSUE-214
- 发现时间：2026-05-10
- 发现者：用户反馈
- 相关任务：模型设置展开逻辑与开关可见度
- 严重程度：一般
- 问题现象：设置中的开关关闭态颜色太浅，几乎融入背景；AI 对话里的 Chat 模型和语音模型交互不一致，Chat 默认状态仍显示 API 配置列表。
- 原因分析：Switch unchecked 使用 `bg-input/90`，在当前玻璃底色上对比不足；Chat 自定义 API 配置没有受 `chatModelMode` 控制。
- 解决方案：提高 Switch unchecked 灰度；Chat 模型默认只显示当前模型说明，选择自定义后再展开 Base URL / Model / API Key 配置；STT/TTS 默认模型说明也统一放到左侧标题下方。
- 涉及文件：`src/components/ui/switch.tsx`, `src/features/settings/SettingsPanel.tsx`, `PROGRESS.md`, `ISSUES.md`
- 经验总结：设置项应让“默认/自定义”的信息层级一致，默认态展示摘要，自定义态再展示可编辑配置。
- 是否需更新技术文档：否。

## ISSUE-215
- 发现时间：2026-05-10
- 发现者：用户反馈
- 相关任务：设置下拉与 System Prompt 编辑按钮收紧
- 严重程度：一般
- 问题现象：设置中的下拉选择按钮过高过胖；System Prompt 文本框右下角已有修改按钮，同时下方还有保存按钮，交互重复。
- 原因分析：全局 `select` 样式仍使用 40px 最小高度和较大的圆角/阴影；`EditableTextarea` 默认自带编辑按钮，System Prompt 没有接管编辑态。
- 解决方案：压缩全局 select 尺寸并去掉阴影；为 `EditableTextarea` 增加可控编辑态和隐藏内置按钮能力，System Prompt 改由下方第一个按钮控制“修改/保存”。
- 涉及文件：`src/index.css`, `src/features/settings/SettingsPanel.tsx`, `PROGRESS.md`, `ISSUES.md`
- 经验总结：同一编辑区域只能保留一个主要编辑入口，否则用户会分不清“完成”和“保存”的职责。
- 是否需更新技术文档：否。

## ISSUE-216
- 发现时间：2026-05-10
- 发现者：用户反馈
- 相关任务：STT/TTS 自定义配置复用 API 弹窗
- 严重程度：一般
- 问题现象：STT/TTS 选择自定义后仍直接展开 Base URL、Model、API Key 三个输入框，和 Chat 模型的 API 配置弹窗交互不一致。
- 原因分析：语音自定义字段仍保存在 `customStt*` / `customTts*` 设置中，UI 没有复用共享 API 配置列表。
- 解决方案：抽出共享 API 配置列表渲染；STT/TTS 自定义态显示“添加 API Key”按钮和同一套弹窗配置，并通过“使用此配置”同步到实际语音运行字段。
- 涉及文件：`src/features/settings/SettingsPanel.tsx`, `PROGRESS.md`, `ISSUES.md`
- 经验总结：共享 API 凭据应统一入口创建，再由具体模块显式选择使用，避免多个地方维护重复密钥表单。
- 是否需更新技术文档：否。

## ISSUE-217
- 发现时间：2026-05-10
- 发现者：用户反馈
- 相关任务：外观自定义形象与动作说明调整
- 严重程度：轻微
- 问题现象：外观设置中“形象自定义”命名和位置不符合预期；GIF 动图 / 图片数量说明换行后显得松散；灵宠动作没有提示 GIF 动图不会叠加动作。
- 原因分析：外观设置按旧顺序渲染动作与形象卡片；媒体方案按钮把名称和数量拆成两行；动作控制区缺少和运行逻辑一致的说明。
- 解决方案：将“形象自定义”改为“自定义形象”并置于动作前；媒体方案按钮改为单行数量展示；动作区补充 GIF 动图不叠加动作的小字说明。
- 涉及文件：`src/features/settings/SettingsPanel.tsx`, `PROGRESS.md`, `ISSUES.md`
- 经验总结：设置页文案需要和实际运行限制同步，否则用户会误以为 GIF 与 PNG 的动作叠加逻辑相同。
- 是否需更新技术文档：否。

## ISSUE-218
- 发现时间：2026-05-10
- 发现者：用户反馈
- 相关任务：设置开关弹性动效与窗口尺寸收紧
- 严重程度：一般
- 问题现象：设置页开关切换缺少弹性动效；通用、外观、提醒事项、AI 对话中的设置条目外框偏高偏胖；设置窗口默认宽度过大，右侧出现留白。
- 原因分析：Switch 使用普通 `transition-all` 线性观感；设置行统一 `min-h-[56px]` 和较大的外层卡片间距；设置窗口按屏幕比例 `0.74` 取宽，在大屏上超过内容最大宽度。
- 解决方案：Switch 轨道和圆点改为弹性 cubic-bezier；设置行高度、内边距、卡片圆角和阴影收紧；设置窗口改为 980x760 的内容驱动默认尺寸并保留小屏约束。
- 涉及文件：`electron/main.cjs`, `src/components/ui/switch.tsx`, `src/features/settings/SettingsPanel.tsx`, `PROGRESS.md`, `ISSUES.md`
- 经验总结：设置窗口宽度应该跟侧栏和内容最大宽度绑定，避免使用屏幕比例造成不同设备上的空白不一致。
- 是否需更新技术文档：否。

## ISSUE-219
- 发现时间：2026-05-10
- 发现者：用户反馈
- 相关任务：主题选择与隐私按钮背景调整
- 严重程度：轻微
- 问题现象：外观-主题使用独立的自定义浮层菜单，和 Chat 模型选择交互不一致；通用底部三个隐私安全按钮外仍包着白色设置卡片背景。
- 原因分析：主题选择沿用了早期自定义下拉组件；隐私按钮复用了 `SettingsGroup`，导致禁用按钮背后多了一层卡片容器。
- 解决方案：主题选择改为和 Chat 模型一致的紧凑原生 `select`；隐私按钮移出 `SettingsGroup`，只保留按钮本身和纵向间距。
- 涉及文件：`src/features/settings/SettingsPanel.tsx`, `PROGRESS.md`, `ISSUES.md`
- 经验总结：同类设置控件要优先复用同一交互模式；危险操作按钮区域不一定需要和普通设置项共用卡片容器。
- 是否需更新技术文档：否。

## ISSUE-220
- 发现时间：2026-05-10
- 发现者：构建审查
- 相关任务：构建拆包与无效动态导入清理
- 严重程度：一般
- 问题现象：`pnpm build` 报主 chunk 超过 500 kB，并提示 `src/electron-shims/core.ts` 同时被动态和静态导入，导致动态导入无法拆包。
- 原因分析：App 顶层静态导入 `SettingsPanel` 和完整 `ChatDialog`，即使当前窗口只是 pet 也会进入主包；`petStore`、`SettingsPanel`、`HoverInputBar` 里对 `@tauri-apps/api/core` 做了动态 import，但同模块又被 App/Chat/Pet 静态 import。
- 解决方案：将设置页和完整聊天页改为 `React.lazy`；把 compact/coding 需要的聊天基础组件抽到轻量 `ChatPrimitives`；移除无效 core 动态 import。
- 涉及文件：`src/App.tsx`, `src/features/chat/ChatDialog.tsx`, `src/features/chat/ChatPrimitives.tsx`, `src/features/chat/HoverInputBar.tsx`, `src/features/pet/petStore.ts`, `src/features/settings/SettingsPanel.tsx`, `PROGRESS.md`, `ISSUES.md`
- 经验总结：多窗口 Electron 应用的入口应按窗口懒加载页面级模块；共享 shim 不适合在同一图里混用静态和动态 import。
- 是否需更新技术文档：否。

## ISSUE-221
- 发现时间：2026-05-10
- 发现者：用户反馈
- 相关任务：全屏游戏时暂停 Timeline 与取消置顶
- 严重程度：一般
- 问题现象：用户全屏打游戏时，Timeline 仍按 3 秒轮询前台窗口，且置顶灵宠可能穿透到游戏上方，影响性能和体验。
- 原因分析：现有全屏游戏判断只用于置顶抑制，Timeline 采样没有订阅该状态；游戏识别仅靠少量内置关键词，用户无法补充。
- 解决方案：新增可配置游戏关键词列表；把列表传给主进程全屏游戏分类；前端检测到全屏游戏后同时取消置顶并暂停 Timeline 前台采样，结束后恢复。
- 涉及文件：`electron/main.cjs`, `src/App.tsx`, `src/features/settings/settingsStore.ts`, `src/features/settings/SettingsPanel.tsx`, `PROGRESS.md`, `ISSUES.md`
- 经验总结：无法可靠从系统层枚举“所有游戏”时，应使用保守条件和可配置规则，避免误判普通应用。
- 是否需更新技术文档：否。

## ISSUE-222
- 发现时间：2026-05-10
- 发现者：用户反馈
- 相关任务：游戏识别列表说明文案调整
- 严重程度：轻微
- 问题现象：“游戏识别列表”下方说明偏技术化，没有直接说明正在进行游戏时会保护性能。
- 原因分析：原文案描述实现条件“全屏且命中关键词”，但设置页更需要解释用户可感知的结果。
- 解决方案：改为用户语义文案，强调自动取消置顶、暂停 Timeline 刷新监测、保证游戏性能。
- 涉及文件：`src/features/settings/SettingsPanel.tsx`, `PROGRESS.md`, `ISSUES.md`
- 经验总结：设置页说明优先说用户结果，技术条件可以由实现兜底，不必暴露在主文案里。
- 是否需更新技术文档：否。

## ISSUE-223
- 发现时间：2026-05-10
- 发现者：用户反馈
- 相关任务：中英文界面基础支持
- 严重程度：一般
- 问题现象：App 只有中文界面，没有语言选择入口，英文用户无法切换到专业清晰的英文 UI。
- 原因分析：设置模型缺少语言字段；各窗口文案分散在设置页、聊天组件、灵宠右键菜单和个人档案中，没有统一翻译层。
- 解决方案：新增 `appLanguage` 设置并放在通用第一项；增加轻量 i18n 翻译层，在英文模式下统一翻译核心 UI 文案和常见可访问属性；聊天消息正文显式排除，避免误翻译用户内容。
- 涉及文件：`src/App.tsx`, `src/i18n.ts`, `src/features/chat/ChatPrimitives.tsx`, `src/features/settings/SettingsPanel.tsx`, `src/features/settings/settingsStore.ts`, `PROGRESS.md`, `ISSUES.md`
- 经验总结：多窗口 Electron 应用的国际化入口应先落在设置和全局渲染层，保留中文源文案，后续再按模块补充更细粒度 key。
- 是否需更新技术文档：否。

## ISSUE-224
- 发现时间：2026-05-10
- 发现者：用户反馈
- 相关任务：Timeline 采样器重启后续记当前片段
- 严重程度：一般
- 问题现象：用户持续使用 Codex，但设置里的 Timeline 没有更新；日志中反复出现 `start Timeline sampler started min=360s`、`stop Timeline sampler stopped`、`persist:skip no active segment`。
- 原因分析：Timeline 最小时长为 6 分钟时，开发态 HMR、设置窗口重建或采样器 effect 重启会销毁 `TimelineRecorder` 实例；未达阈值的 active 片段只存在内存里，重建后累计时间从 0 开始，导致一直无法跨过阈值落库。
- 解决方案：给 `TimelineRecorder` 增加 `getState()` 和 `initialState` 恢复能力；前端把未完成片段暂存到 localStorage，并在采样器重建后恢复继续累计；新增单元测试覆盖重启续记。
- 涉及文件：`src/App.tsx`, `src/lib/timelineRecorder.ts`, `src/lib/timelineRecorder.test.ts`, `PROGRESS.md`, `ISSUES.md`
- 经验总结：长时间采样器不能只依赖 React effect 内存态，至少要保存“未完成但有价值”的当前片段，避免窗口/HMR/设置变更造成统计断档。
- 是否需更新技术文档：否。

## ISSUE-225
- 发现时间：2026-05-10
- 发现者：用户追问
- 相关任务：Timeline 暂停超过最小时长后断段
- 严重程度：一般
- 问题现象：如果用户先使用某个 App，再让电脑长时间休眠，恢复后继续使用同一个 App，旧逻辑可能把恢复前后拼成一个跨休眠空白的长时间段，Timeline 视觉上会误以为 App 连续占用了整个休眠期间。
- 原因分析：`pauseForeground` 会保存 paused 片段，但 `resumeForeground` 只做清理，没有表达“短暂停顿可续、长暂停应断段”的规则；暂停阈值也需要跟用户设置的 Timeline 最小时长一致。
- 解决方案：`resumeForeground` 增加 `resumedAt` 和 `maxPauseMs` 参数；暂停时长不超过 Timeline 最小时长时继续 active，超过时清空 paused 并让下一次采样重新开始；补充短暂停顿和长暂停两个单元测试。
- 涉及文件：`src/App.tsx`, `src/lib/timelineRecorder.ts`, `src/lib/timelineRecorder.test.ts`, `PROGRESS.md`, `ISSUES.md`
- 经验总结：时间轴展示语义和统计聚合语义要分开处理；长时间系统暂停不能被渲染成连续前台活动。
- 是否需更新技术文档：否。

## ISSUE-226
- 发现时间：2026-05-10
- 发现者：用户反馈
- 相关任务：个人档案英文动态文案补全
- 严重程度：轻微
- 问题现象：切换到英文版后，个人档案中部分卡片和图表仍显示中文，例如统计摘要、Timeline 说明、图表 tooltip、日期和星期。
- 原因分析：这些文本多数是运行时拼接出的动态字符串，不是完整静态文案，原有 exact translation map 无法命中。
- 解决方案：为 i18n 增加英文动态转换规则，覆盖中文日期、小时/分钟、次数、分心次数、段数、task 数、累计/共和星期标签；补充缺失的 Timeline 静态说明翻译。
- 涉及文件：`src/i18n.ts`, `PROGRESS.md`, `ISSUES.md`
- 经验总结：图表和统计卡片里的文案经常是由数字和单位拼接出来的，国际化不能只依赖静态字典，也需要动态模式转换或更细粒度格式化函数。
- 是否需更新技术文档：否。

## ISSUE-227
- 发现时间：2026-05-10
- 发现者：用户反馈
- 相关任务：聊天图片选择与语音输入反馈优化
- 严重程度：一般
- 问题现象：点击图片输入按钮弹出的文件选择框拖动异常；语音输入按钮录音期间缺少明确动效，录音结束后的转写等待也没有加载占位。
- 原因分析：图片选择使用隐藏 DOM `input[type=file]`，在 Electron 浮窗和拖动区域内容易被窗口层级/拖拽逻辑干扰；语音输入只有 boolean listening 状态，无法区分正在录音和正在等待云端转写。
- 解决方案：图片选择改为主进程独立 `showOpenDialog` 并返回 data URL；语音输入拆成 `recording / loading / idle`，录音阶段使用 AudioContext analyser 采集分贝驱动按钮波纹，loading 阶段显示 spinner。
- 涉及文件：`electron/main.cjs`, `src/features/chat/ChatDialog.tsx`, `src/features/chat/ChatPrimitives.tsx`, `src/features/voice/voiceService.ts`, `PROGRESS.md`, `ISSUES.md`
- 经验总结：浮窗里的系统文件选择更适合走主进程原生 dialog；语音交互要把采集和识别两个等待阶段拆开，否则用户会误以为点击没有响应。
- 是否需更新技术文档：否。

## ISSUE-228
- 发现时间：2026-05-10
- 发现者：用户反馈
- 相关任务：全屏图片选择与启动初始位置稳定
- 严重程度：一般
- 问题现象：灵宠悬浮在全屏窗口上时，点击上传图片会把文件选择窗口切到另一个桌面；每次启动时灵宠/悬浮球初始位置偏下，随后抖动上跳。
- 原因分析：图片选择器为了修复拖动问题改成 detached dialog，但 detached dialog 没有继承当前全屏 Space 的置顶/跨全屏属性；pet 窗口在前端按真实设置完成布局前就 `showInactive`，较大缩放或 orb 布局会在首次布局时重新约束位置。
- 解决方案：图片选择器改为以当前浮窗为 parent，并在打开前强制应用全屏置顶行为；pet/orb 首次显示延后到 renderer 完成第一次布局后再通知主进程显示，同时保留 fallback。
- 涉及文件：`electron/main.cjs`, `src/App.tsx`, `PROGRESS.md`, `ISSUES.md`
- 经验总结：全屏 Space 中的系统 dialog 需要继承浮窗父窗口的 fullscreen-visible 属性；透明浮窗首次显示应等待真实布局完成，否则用户会看到布局约束的中间态。
- 是否需更新技术文档：否。

## ISSUE-229
- 发现时间：2026-05-10
- 发现者：用户反馈
- 相关任务：语音输入框内锯齿波与手动结束
- 严重程度：轻微
- 问题现象：录音动效只在麦克风按钮上显示，不够像输入状态；用户也不能主动结束录音，只能等待自动超时。
- 原因分析：语音输入状态只暴露 `recording/loading/idle` 和音量值，没有把当前 MediaRecorder 或系统 SpeechRecognition 的 stop 控制权暴露给 UI。
- 解决方案：语音服务增加 `onStopReady` 回调，录音开始后把 stop 函数交给聊天层；Composer 在录音时用输入框内锯齿波形替代 textarea，并在右侧提供对号按钮调用 stop。
- 涉及文件：`src/features/chat/ChatPrimitives.tsx`, `src/features/chat/ChatDialog.tsx`, `src/features/voice/voiceService.ts`, `src/index.css`, `PROGRESS.md`, `ISSUES.md`
- 经验总结：录音交互要同时提供“正在采集”的可视反馈和“主动结束”的直接控制，自动超时只能作为兜底。
- 是否需更新技术文档：否。

## ISSUE-230
- 发现时间：2026-05-10
- 发现者：用户反馈
- 相关任务：录音波形与轻量滚动条优化
- 严重程度：轻微
- 问题现象：输入框内锯齿线录音动画不够精致；部分 UI 的 overflow/滚动条视觉偏重。
- 原因分析：锯齿 polyline 更像调试波形，缺少系统录音控件常见的克制感；滚动条由各处默认样式决定，在小窗和设置里会显得厚。
- 解决方案：录音波形改成细竖向柱状音频条，透明背景、低对比度、振幅随音量变化；新增全局轻量 scrollbar 样式，统一降低 overflow 视觉重量。
- 涉及文件：`src/features/chat/ChatPrimitives.tsx`, `src/index.css`, `PROGRESS.md`, `ISSUES.md`
- 经验总结：录音状态不需要复杂图形，少量细柱配合振幅变化更接近系统控件；滚动条应全局统一，否则每个容器都会暴露默认浏览器重量。
- 是否需更新技术文档：否。

## ISSUE-231
- 发现时间：2026-05-10
- 发现者：用户反馈
- 相关任务：录音波形流动与铺满修正
- 严重程度：轻微
- 问题现象：录音波形在静音时仍有明显长短差异，流动速度偏快，且横向长度不足，未铺满整个输入区域。
- 原因分析：旧实现直接用固定 pattern 计算每根柱子的高度，即使音量为 0 也会显示错落柱；波形条数量较少，容器宽度在较宽输入框里不够覆盖。
- 解决方案：增加静音阈值，静音时统一短柱；有声音时才乘以 pattern 拉长；扩充到 96 根柱并使用 220% 宽度向左慢速滚动。
- 涉及文件：`src/features/chat/ChatPrimitives.tsx`, `src/index.css`, `PROGRESS.md`, `ISSUES.md`
- 经验总结：音频可视化的静音态要先建立“安静基线”，再叠加音量变化，否则用户会误以为环境一直有波动。
- 是否需更新技术文档：否。

## ISSUE-232
- 发现时间：2026-05-10
- 发现者：用户反馈
- 相关任务：录音波形改为中线采样历史推进
- 严重程度：轻微
- 问题现象：有声音时所有条形仍然一起变高，且高度变化像同步缩放，不像成熟录音控件中“当前采样写入中间、历史向左流动”的效果。
- 原因分析：旧波形仍以当前音量直接计算所有柱子的高度，只是改变了 pattern 和速度，没有保存每个时间点的分贝历史。
- 解决方案：在 `AudioWaveform` 内维护采样历史数组，每 320ms 把当前分贝写入中间柱；左侧柱子读取历史采样，右侧保持静音基线，形成一格一格向左推进的录音历史。
- 涉及文件：`src/features/chat/ChatPrimitives.tsx`, `src/index.css`, `PROGRESS.md`, `ISSUES.md`
- 经验总结：音频录制 UI 的核心不是“按当前音量缩放全部柱子”，而是“时间序列采样可视化”；需要保存历史而不是只渲染当前值。
- 是否需更新技术文档：否。

## ISSUE-233
- 发现时间：2026-05-10
- 发现者：用户反馈
- 相关任务：英文模式自定义形象与灵宠动作翻译补全
- 严重程度：轻微
- 问题现象：英文模式下，设置页 `Custom Avatar` 和 `Pet Motion` 中仍有中文残留，例如 Orb 模式收起说明、动作描述、状态标签、图片/GIF 数量和当前使用说明。
- 原因分析：这些文案有一部分来自运行时组合字符串和外部常量 `STATE_META`，不是完整静态句子；原翻译表只覆盖了标题和部分按钮。
- 解决方案：补充缺失的静态词条，并扩展动态翻译规则，覆盖数量单位、当前使用文案、GIF/图片方案与动作 aria-label。
- 涉及文件：`src/i18n.ts`, `PROGRESS.md`, `ISSUES.md`
- 经验总结：设置页国际化不能只看主标题；状态常量、数量单位、confirm/alert、title/aria-label 和组合字符串都需要纳入检查。
- 是否需更新技术文档：否。

## ISSUE-234
- 发现时间：2026-05-10
- 发现者：用户反馈
- 相关任务：暂停语音唤醒功能入口
- 严重程度：一般
- 问题现象：AI 对话 / Voice Models 中仍展示 `Voice Wake` 和 `Wake Word`，但用户希望该功能暂时不做。
- 原因分析：语音唤醒此前已经有 UI、设置字段和 App 后台监听 effect；仅隐藏 UI 会留下后台语音识别逻辑和本地设置字段。
- 解决方案：删除 Voice Wake / Wake Word 设置行、移除 `wakeWord` / `wakeWordEnabled` 设置字段和默认值，并删除 App 中的 wake word SpeechRecognition effect。
- 涉及文件：`src/App.tsx`, `src/features/settings/SettingsPanel.tsx`, `src/features/settings/settingsStore.ts`, `src/i18n.ts`, `PROGRESS.md`, `ISSUES.md`
- 经验总结：暂缓功能应同时移除入口和运行逻辑，尤其是会占用麦克风或系统权限的后台监听。
- 是否需更新技术文档：否。

## ISSUE-235
- 发现时间：2026-05-10
- 发现者：用户反馈
- 相关任务：修复录音波形采样器被高频音量重置
- 严重程度：一般
- 问题现象：录音波形看起来完全静止，也没有明显随音量变化。
- 原因分析：`AudioWaveform` 的采样 `setInterval` 依赖 `voiceAmount`，而 `voiceAmount` 由 AudioContext 高频更新；React effect 不断清理并重建 interval，导致采样推进经常还没触发就被重置。音量阈值也偏高，小声输入容易被当成静音。
- 解决方案：用 `useRef` 保存最新音量，让 interval 只按 `centerIndex` 建立一次并稳定推进；降低静音阈值，对小音量做视觉增益。
- 涉及文件：`src/features/chat/ChatPrimitives.tsx`, `PROGRESS.md`, `ISSUES.md`
- 经验总结：动画采样器不能依赖高频传感器值创建/销毁；高频值应进 ref，采样时按固定时钟读取。
- 是否需更新技术文档：否。

## ISSUE-236
- 发现时间：2026-05-10
- 发现者：用户反馈
- 相关任务：加快录音波形向左推进速度
- 严重程度：轻微
- 问题现象：录音波形已经能随音量推进，但向左移动速度仍偏慢。
- 原因分析：采样间隔 180ms 和 200ms 过渡更偏稳重，用户希望录音反馈更敏捷。
- 解决方案：将采样间隔缩短到 120ms，并将柱高/透明度过渡缩短到 150ms。
- 涉及文件：`src/features/chat/ChatPrimitives.tsx`, `PROGRESS.md`, `ISSUES.md`
- 经验总结：录音波形的“速度感”主要来自采样时钟和过渡时长，需要两者一起调整。
- 是否需更新技术文档：否。

## ISSUE-237
- 发现时间：2026-05-10
- 发现者：用户反馈
- 相关任务：Timeline 短暂切屏明细与后台进程修正
- 严重程度：一般
- 问题现象：Timeline 靠右片段的 hover 卡片会被遮挡；主片段详情会把短暂切屏造成的同一项目拆得太碎；后台 terminal 有时没记录，暂停状态的音乐软件也可能被误记到时间轴。
- 原因分析：hover 卡片只做了简单右侧偏移；未达最小时长的候选窗口之前直接丢弃，没有成为主片段的附属信息；网易云音乐此前只看进程是否存在，无法确认播放状态。
- 解决方案：hover 卡片按视口动态选择左右位置；将短暂候选窗口写入主片段 `foreground-short` 明细并在详情页单独展示；音乐只记录可确认 `player state is playing` 的 Music/Spotify，并增加音乐软件列表；terminal 额外从系统进程中识别长跑开发命令。
- 涉及文件：`src/App.tsx`, `electron/main.cjs`, `src/features/settings/SettingsPanel.tsx`, `src/features/settings/settingsStore.ts`, `src/lib/timelineRecorder.ts`, `src/lib/timelineRecorder.test.ts`, `PROGRESS.md`, `ISSUES.md`
- 经验总结：Timeline 的主记录和短暂活动应分层保存；“进程存在”不能等同于“后台活动正在发生”，尤其是音乐播放状态。
- 是否需更新技术文档：否。

## ISSUE-238
- 发现时间：2026-05-10
- 发现者：用户反馈
- 相关任务：Timeline Hover 卡片自适应宽度
- 严重程度：轻微
- 问题现象：Timeline hover 详情卡片固定宽度过长，靠右片段仍可能显示不完整。
- 原因分析：上一版虽然会靠右翻到左侧，但卡片宽度仍按固定 300px 渲染和定位，短文本也占用过大横向空间。
- 解决方案：按内容估算 hover 卡片宽度，限制在 156px-248px；定位算法使用该宽度，并将正文限制为 2 行。
- 涉及文件：`src/features/settings/SettingsPanel.tsx`, `PROGRESS.md`, `ISSUES.md`
- 经验总结：浮层定位不能只靠视口夹紧，卡片自身尺寸也要随内容收缩。
- 是否需更新技术文档：否。

## ISSUE-239
- 发现时间：2026-05-10
- 发现者：用户反馈
- 相关任务：设置页信息层级与目录重排
- 严重程度：一般
- 问题现象：设置页功能项过度集中在少数目录里，信息层级主要依赖边框，通用/提醒/AI 等页面同时承载多个沟通线程。
- 原因分析：此前按功能大页组织，后续新增 Timeline、Coding、列表管理、语音模型等功能后，目录没有同步拆分；视觉上卡片和行都依赖 border，空间层级不足。
- 解决方案：侧边栏按大类分组并拆出单一任务入口；设置卡片改用 elevation、模糊和间距建立层级，弱化硬边框；统一侧边栏图标、标签圆角和列表 token 节奏。
- 涉及文件：`src/features/settings/SettingsPanel.tsx`, `src/components/layouts/SettingsLayout.tsx`, `PROGRESS.md`, `ISSUES.md`
- 经验总结：设置页的信息架构应随着功能增长持续拆分，视觉层级优先用空间和 elevation，不应让 border 承担主要沟通。
- 是否需更新技术文档：否。

## ISSUE-240
- 发现时间：2026-05-11
- 发现者：用户反馈
- 相关任务：设置页专注列表合并与英文残留补齐
- 严重程度：一般
- 问题现象：音乐识别、游戏识别仍放在通用设置中；Blocked Apps 和 Blocked Keywords 被拆成两个目录；设置右侧部分卡片仍依赖硬边框；英文模式下设置页仍有中文残留。
- 原因分析：上一轮主要重排了一级目录和整体材质，但没有把同一沟通线程的专注相关列表完全收拢；右侧部分深层组件仍保留旧边框样式；英文映射没有覆盖新拆出的目录标题、说明文字和组合字符串。
- 解决方案：将游戏/音乐识别移动到“专注与提醒”末尾；合并应用/关键词屏蔽页并补说明；继续将 Profile、Timeline、API 配置、历史对话和自定义形象卡片改成 elevation 风格；用脚本扫描设置页中文短文案并补齐静态/动态英文映射。
- 涉及文件：`src/features/settings/SettingsPanel.tsx`, `src/i18n.ts`, `PROGRESS.md`, `ISSUES.md`
- 经验总结：设置页拆目录后要再检查“同一用户意图”是否被拆散；国际化要对最终页面文案做反向扫描，而不是只补新增标题。
- 是否需更新技术文档：否。

## ISSUE-241
- 发现时间：2026-05-11
- 发现者：用户反馈
- 相关任务：通用目录后置与发送快捷键设置
- 严重程度：轻微
- 问题现象：通用分组仍在设置左侧靠前位置；聊天发送快捷键不可配置，只能 Enter 发送。
- 原因分析：设置侧边栏顺序仍沿用此前信息架构；普通聊天、独立大窗和 Coding 输入分别在各自组件里硬编码 Enter 发送。
- 解决方案：将通用分组移动到侧边栏最后；新增 `messageSendShortcut` 设置和统一的 `shouldSubmitMessage` 判断函数，让所有聊天输入入口共用 Enter / Command-Control+Enter 规则。
- 涉及文件：`src/App.tsx`, `src/features/chat/ChatDialog.tsx`, `src/features/chat/HoverInputBar.tsx`, `src/features/chat/sendShortcut.ts`, `src/features/settings/SettingsPanel.tsx`, `src/features/settings/settingsStore.ts`, `src/i18n.ts`, `PROGRESS.md`, `ISSUES.md`
- 经验总结：输入快捷键这类交互偏好必须抽成共享判断，避免普通 chat 和 coding chat 行为分叉。
- 是否需更新技术文档：否。

## ISSUE-242
- 发现时间：2026-05-11
- 发现者：用户反馈
- 相关任务：专注倒计时背景跟随灵宠透明度
- 严重程度：轻微
- 问题现象：专注模式下灵宠下方倒计时是裸文字，没有和灵宠透明度统一的背景承托。
- 原因分析：休息倒计时此前有独立 UI，而专注倒计时只渲染文本，未接入 `petOpacity` 参数。
- 解决方案：给专注倒计时增加轻量磨砂背景和边框，并用 `settings.petOpacity` 计算背景/边框混合比例，文字保持不透明。
- 涉及文件：`src/App.tsx`, `PROGRESS.md`, `ISSUES.md`
- 经验总结：跟随灵宠显示的附属 UI 也应复用同一透明度语义，但不要把文字一起降透明，避免可读性下降。
- 是否需更新技术文档：否。

## ISSUE-243
- 发现时间：2026-05-11
- 发现者：用户反馈
- 相关任务：深色模式改为 macOS 中性灰阶
- 严重程度：一般
- 问题现象：深色模式配色偏脏且不接近 macOS 系统设置；许多文本框和内容卡片顶部有明显白色高光条。
- 原因分析：全局 dark token 混用了蓝黑和暖棕色；设置页大量卡片沿用浅色模式的 `inset 0 1px 0 rgba(255,255,255,...)` 高光，在深色背景上显得像白条。
- 解决方案：重写 dark token 为中性石墨灰；给设置窗口加作用域并统一深色背景/侧栏/卡片色；在设置作用域内覆盖阴影，移除所有 inset 白色高光。
- 涉及文件：`src/index.css`, `src/components/layouts/SettingsLayout.tsx`, `src/features/settings/SettingsPanel.tsx`, `PROGRESS.md`, `ISSUES.md`
- 经验总结：深色模式不能简单复用浅色模式的玻璃高光；macOS 风格更依赖低对比灰阶、细分割和柔和阴影。
- 是否需更新技术文档：否。

## ISSUE-244
- 发现时间：2026-05-11
- 发现者：用户反馈
- 相关任务：深色设置与聊天面板残留白底修正
- 严重程度：一般
- 问题现象：深色模式下设置右侧仍有不少白底/浅灰底内容；大小聊天框也残留浅色模式的 inset 高光条，视觉上和新版 dark palette 不一致。
- 原因分析：此前深色覆盖主要处理了显式 `dark:bg-*` 和设置卡片，但右侧仍有纯 `bg-white/*`、浅灰 hex 背景；聊天组件的 composer 和气泡阴影还使用浅色玻璃高光。
- 解决方案：在 settings 和 chat 作用域中补充深色背景覆盖，统一表单/面板底色，并移除 chat 内部白色 inset shadow，仅保留低透明 focus ring。
- 涉及文件：`src/index.css`, `PROGRESS.md`, `ISSUES.md`
- 经验总结：暗色主题收口时要按作用域扫描“浅色 utility class”和“白色 inset shadow”两类残留，不能只改 design token。
- 是否需更新技术文档：否。

## ISSUE-245
- 发现时间：2026-05-11
- 发现者：用户反馈
- 相关任务：深色模式首帧防闪烁
- 严重程度：一般
- 问题现象：深色模式下打开设置、聊天等窗口时，会先显示一瞬间浅色样式，再切换到深色样式。
- 原因分析：主题 class 原本在 React 挂载后的 `useEffect` 中根据异步加载的设置写入；同时设置/聊天 BrowserWindow 创建后立即 show，导致首帧可能露出浅色默认背景。
- 解决方案：在 HTML 头部同步读取 localStorage 中的设置并预先写入 `.dark`；settings/chat 非透明窗口增加首帧背景；Electron 侧等主页面加载完成后再显示设置和大聊天窗口。
- 涉及文件：`index.html`, `electron/main.cjs`, `PROGRESS.md`, `ISSUES.md`
- 经验总结：主题类必须在首帧前落地，不能依赖 React effect；非透明 Electron 窗口也要避免在 renderer 尚未绘制完成时提前 show。
- 是否需更新技术文档：否。

## ISSUE-246
- 发现时间：2026-05-11
- 发现者：用户反馈
- 相关任务：设置深色右侧背景修正
- 严重程度：一般
- 问题现象：深色主题下设置界面左侧和卡片已经变暗，但右侧大面积内容背景仍显示浅色渐变。
- 原因分析：SettingsLayout root 仍直接挂载浅色 radial/linear background utility；部分 ScrollArea 视口背景未被设置页深色作用域明确覆盖，导致外层内容区仍露出浅色背景。
- 解决方案：将设置窗口背景从 JSX utility 移到 CSS 作用域；深色下同时覆盖 `.settings-window`、`.settings-main` 和 Radix ScrollArea viewport/content。
- 涉及文件：`src/components/layouts/SettingsLayout.tsx`, `src/index.css`, `PROGRESS.md`, `ISSUES.md`
- 经验总结：复杂主题背景不要用浅色 utility 与 dark utility 混在同一个元素上，尤其是窗口级背景；应使用稳定作用域和明确的 dark 覆盖。
- 是否需更新技术文档：否。

## ISSUE-247
- 发现时间：2026-05-11
- 发现者：用户反馈
- 相关任务：深色设置磨砂玻璃质感
- 严重程度：轻微
- 问题现象：深色设置背景修正后整体过于平、过于实心，缺少 macOS 深色设置窗口的磨砂玻璃清透感。
- 原因分析：为了修复浅色漏底，前一版将窗口、卡片和 scroll viewport 都收敛到固定实色，解决了错误但牺牲了材质层次。
- 解决方案：在深色设置作用域内加入低对比暗色渐变与径向光感；侧栏、卡片、内容盒子和表单面板改为半透明深灰并加 blur/saturate，保留暗色但恢复清透层级。
- 涉及文件：`src/index.css`, `PROGRESS.md`, `ISSUES.md`
- 经验总结：修复主题漏底时不要最终停在纯色兜底；macOS 风格需要“低亮度、低饱和、半透明材质”的组合，而不是简单提高亮度。
- 是否需更新技术文档：否。

## ISSUE-248
- 发现时间：2026-05-11
- 发现者：用户反馈
- 相关任务：首帧主题与灵宠初始布局稳定化
- 严重程度：一般
- 问题现象：设置/大聊天窗口仍会先闪出浅色模式再切到深色；灵宠首次加载时会先出现在靠右下位置，再跳动到稳定位置。
- 原因分析：HTML 虽然预置了 `.dark`，但 React theme effect 在设置尚未加载时会用默认 `system` 重新计算主题，导致系统浅色时短暂移除 `.dark`；设置/聊天窗口也只等页面 load 事件而非真实设置完成。灵宠窗口则有 fallback show，且首次显示可能早于真实设置驱动的首个稳定 layout。
- 解决方案：主题 effect 增加 `loaded` 门槛；settings/chat renderer 在设置加载后主动通知 main 再显示窗口；pet 窗口移除 fallback 抢先显示，启动和手动显示都等 `pet_window_layout_ready` 后再显示。
- 涉及文件：`src/App.tsx`, `electron/main.cjs`, `PROGRESS.md`, `ISSUES.md`
- 经验总结：首帧体验要以“真实设置加载完成”为 ready 标准；窗口不能仅靠 DOM load 或 fallback timer 提前显示，否则默认值和真实设置之间的差异会被用户看见。
- 是否需更新技术文档：否。

## ISSUE-249
- 发现时间：2026-05-11
- 发现者：用户反馈
- 相关任务：Timeline 跨日片段裁剪
- 严重程度：一般
- 问题现象：一段昨天 23:51 到今天 00:45 的 Codex 使用记录，在今天 Timeline 上没有显示 00:00-00:45，反而显示为 23:51-24:00。
- 原因分析：Timeline 查询按 `entry.date` 过滤，而 `entry.date` 由结束时间决定；前端拿到跨日记录后直接用原始 `startedAt/endedAt` 计算当天位置，没有按所选日期裁剪。
- 解决方案：数据库查询改为取与所选日期有时间交集的记录；前端渲染前把主记录和后台 marker 都裁剪到当天 00:00-24:00 范围。
- 涉及文件：`src/lib/db.ts`, `src/features/settings/SettingsPanel.tsx`, `PROGRESS.md`, `ISSUES.md`
- 经验总结：时间轴渲染不能假设记录完全落在单日内；查询负责找交集，渲染负责按当前视图窗口裁剪。
- 是否需更新技术文档：否。

## ISSUE-250
- 发现时间：2026-05-11
- 发现者：用户反馈
- 相关任务：启动闪烁与灵宠跳动单测覆盖
- 严重程度：一般
- 问题现象：深色闪烁和灵宠初始跳动此前多次修复仍未稳定消失，缺少可回归验证的测试。
- 原因分析：相关逻辑分散在 React effect 和 Electron main 进程中，依赖窗口 ready、设置 loaded、layout ready 等异步时序；没有单元测试约束时，很容易把“DOM load”误当成“真实设置/布局稳定”。
- 解决方案：抽出可测试的主题决策和窗口显示状态机，新增 startup 测试套件，明确断言 loaded 前不得移除 `.dark`、renderer ready 前不得 show settings/chat、pet layout ready 前不得 show。
- 涉及文件：`src/App.tsx`, `electron/main.cjs`, `src/lib/startupTheme.ts`, `src/lib/startupTheme.test.ts`, `electron/windowLifecycle.cjs`, `electron/windowLifecycle.test.cjs`, `package.json`, `PROGRESS.md`, `ISSUES.md`
- 经验总结：启动首帧和窗口显示问题必须用状态机测试保护；否则视觉 bug 只靠手测很容易反复回归。
- 是否需更新技术文档：否。

## ISSUE-251
- 发现时间：2026-05-11
- 发现者：用户反馈
- 相关任务：Timeline 后台跨日、短暂切换与图例统计口径
- 严重程度：一般
- 问题现象：跨日逻辑修复后，今天 0 点起应显示的 terminal 后台进程没有出现；未达阈值的短暂使用需要出现在详情；图例右侧时长不应使用 `codingMs`，而应统计当前 Timeline 色块。
- 原因分析：`getTimelineEntries(date)` 只判断主前台 entry 是否与当天相交，漏掉“主前台在昨天、后台 marker 跨到今天”的记录；图例统计误接入个人档案 coding 时长，和 Timeline 色块口径不一致。
- 解决方案：查询层把 background marker 的时间交集也纳入；展示层将后台-only 记录标记为 `foregroundVisible: false`，只进入后台轨道；图例按当前可见主色块分类累计；新增 `timelineView` 和 DB 单测覆盖这些场景。
- 涉及文件：`src/lib/db.ts`, `src/lib/timelineView.ts`, `src/lib/timelineView.test.ts`, `src/lib/db.timeline.test.ts`, `src/features/settings/SettingsPanel.tsx`, `package.json`, `PROGRESS.md`, `ISSUES.md`
- 经验总结：Timeline 的前台色块、后台轨道、统计图例必须有清晰分层；后台-only 记录不能靠伪造前台色块显示，否则统计和视觉都会串口径。
- 是否需更新技术文档：否。

## ISSUE-252
- 发现时间：2026-05-11
- 发现者：用户反馈
- 相关任务：启动闪烁与灵宠首帧跳动实链路修复
- 严重程度：一般
- 问题现象：此前新增单测通过，但深色主题仍会从浅色闪到深色，灵宠首次显示仍会跳动一下。
- 原因分析：测试覆盖了抽象状态机，但漏掉实际渲染链路：设置/聊天窗口在 settings 加载前已经渲染完整 UI；main 进程窗口背景仍是浅色硬编码；pet 在 renderer 刚完成 layout 计算后立刻通知 main show，可能早于 React 下一帧绘制。
- 解决方案：settings/chat 在 loaded 前只显示预绘制背景，并把 renderer ready 推迟到 loaded 后两帧；main 进程 opaque window 背景跟随系统深浅；pet 首个 layout 应用后等待两帧再发送 ready。
- 涉及文件：`src/App.tsx`, `src/main.tsx`, `src/lib/startupTheme.ts`, `src/lib/startupTheme.test.ts`, `electron/main.cjs`, `PROGRESS.md`, `ISSUES.md`
- 经验总结：首帧问题不能只测业务状态机，还要覆盖“是否渲染完整 UI”“何时通知 main show”“原生窗口底色”这些真实显示链路。
- 是否需更新技术文档：否。

## ISSUE-253
- 发现时间：2026-05-13
- 发现者：用户反馈
- 相关任务：小聊天框置顶回归与系统知识库占位
- 严重程度：严重
- 问题现象：从 `302fa5b Add system knowledge and compact chat focus fixes` 开始，小聊天框不再稳定置顶穿透全屏；多轮围绕输入法候选窗的窗口层级实验进一步影响小窗跟随、拖拽和 resize 体验；同时普通聊天也会误显示“查询中...”。
- 原因分析：`302fa5b` 将小聊天框从原先稳定的 `panel + showInactive + screen-saver topmost guard` 路径改为 focusable/acceptFirstMouse/show/focus/webContents.focus，破坏了此前已验证的全屏 Space 置顶链路。后续 parent/child window、输入态冻结、重建窗口等尝试没有解决 IME，反而偏离了原小窗交互结构。“查询中...”误触发来自系统知识库判断把 system prompt 也纳入关键词匹配。
- 解决方案：小聊天框创建、显示和 focus handler 精确还原到 `302fa5b^` 之前的稳定逻辑：macOS `panel`、`showInactive()`、不主动 webContents focus、不引入 parent/child window 或输入态窗口状态机；保留后续已打磨的 UI/业务代码。系统知识库触发判断改为只扫描用户消息，并让内部天气/设备/日历分支同样只看用户消息。
- 涉及文件：`electron/main.cjs`, `src/features/chat/ChatPrimitives.tsx`, `src/features/ai/systemKnowledge.ts`, `src/features/chat/ChatDialog.tsx`, `src/features/chat/HoverInputBar.tsx`, `PROGRESS.md`, `ISSUES.md`
- 经验总结：macOS 输入法候选窗问题不能通过反复修改主小聊天框窗口本体来试错；主小窗的置顶/跟随/resize 链路已经验证过，修 IME 应另起独立输入承载方案或原生层方案，并用可回滚分支隔离。
- 是否需更新技术文档：否。

## ISSUE-254
- 发现时间：2026-05-13
- 发现者：用户反馈
- 相关任务：系统知识库日历/提醒事项读取与查询占位
- 严重程度：一般
- 问题现象：用户已经授权 Calendar/Reminders 后，LLM 仍回复无法读取日历和待办事项；同时只要前面问过系统知识库相关问题，后续普通输入也会显示“查询中...”。
- 原因分析：日历和提醒事项读取结果只返回一个合并 `error`，前端 prompt 将任意单边失败描述成“Calendar/Reminders 都无法读取”，容易诱导模型否定已成功的数据源；提醒事项脚本只输出有截止日期的提醒，漏掉无日期待办。查询触发逻辑扫描最近多轮用户消息，历史命中的关键词会污染当前普通输入。
- 解决方案：IPC 返回 `calendarStatus/remindersStatus` 和各自错误；prompt 明确区分“访问成功但没有事项”和“某一数据源失败”，并要求只说明失败的数据源。提醒事项读取改为包含未完成且无截止日期的待办。查询触发收窄到当前最后一条用户输入，占位文案统一改为 `Querying...`。
- 涉及文件：`electron/main.cjs`, `src/features/ai/systemKnowledge.ts`, `src/features/chat/ChatDialog.tsx`, `src/features/chat/HoverInputBar.tsx`, `PROGRESS.md`, `ISSUES.md`
- 经验总结：系统知识库上下文必须保留数据源级状态，不能把部分失败汇总成笼统不可用；聊天查询占位只应由当前输入触发，不能被历史上下文拖住。
- 是否需更新技术文档：否。

## ISSUE-255
- 发现时间：2026-05-13
- 发现者：用户反馈
- 相关任务：灵宠右键菜单二级菜单易消失
- 严重程度：一般
- 问题现象：右键菜单展开二级菜单时，鼠标从一级项移向二级项的容错太小，经常来不及选中二级菜单就消失；用户也希望点击一级项后能固定展开对应二级菜单。
- 原因分析：当前二级菜单主要依赖 `group-hover` 控制显示，关闭条件完全跟随 hover 命中，只有很窄的透明桥接区，没有离开延迟，也没有“点击后锁定”的状态。
- 解决方案：将二级菜单改为 React 状态驱动：hover 打开、离开后延迟关闭、点击一级项后锁定展开；同时加宽一级菜单到二级菜单之间的透明桥接区，放大“交互三角区”的容错。
- 涉及文件：`src/features/pet/PetAvatar.tsx`, `PROGRESS.md`, `ISSUES.md`
- 经验总结：带侧向展开的二级菜单不能只靠纯 CSS hover；需要把“路径容错、关闭延迟、点击锁定”作为一套完整交互来设计。
- 是否需更新技术文档：否。

## ISSUE-256
- 发现时间：2026-05-14
- 发现者：用户反馈
- 相关任务：Timeline 示例数据入口独立化
- 严重程度：一般
- 问题现象：个人档案 Timeline 的预置 mock 数据会在“昨天”无真实数据时自动显示，用户希望 mock 不再出现在昨天，而是在顶部日历中通过“示例 / Example”选项单独查看。
- 原因分析：示例数据被绑定到 `selectedDate === 昨天` 且无真实 timeline/专注数据的兜底分支；这让“昨天”同时承担真实日期和产品演示入口两个职责，容易误导用户以为 mock 是真实历史记录。
- 解决方案：新增 `PROFILE_EXAMPLE_KEY` 作为独立选择状态；顶部日期选择区增加 `示例 / Example` 按钮。只有选择该入口时才生成 mock timeline 和 mock 统计；普通日期包括昨天只读取真实数据并展示空态或真实记录。
- 涉及文件：`src/features/settings/SettingsPanel.tsx`, `PROGRESS.md`, `ISSUES.md`
- 经验总结：演示数据应有显式入口和清晰标签，不能挂靠到真实日期的空态兜底上，否则会混淆真实记录与产品预览。
- 是否需更新技术文档：否。
