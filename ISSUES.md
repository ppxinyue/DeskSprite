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
