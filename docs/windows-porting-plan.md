# DeskCat Windows 适配计划

本文档基于当前已经上线的 DeskCat 实现编写。当前可运行、可发布的桌面主线是 **Electron + React + Vite**，历史文档中关于 Tauri/Rust 作为主架构的计划已经过时。本次 Windows 适配必须围绕现有 Electron 实现推进，目标是在不破坏 macOS 已上线功能的前提下补齐 Windows 分支。

## 核心原则

1. macOS 已上线功能保持原样。
   - 不重写 macOS 的窗口层级、全屏 Space、权限、Timeline、Calendar/Reminders、Keychain/secure storage 逻辑。
   - 能新增平台分支就新增平台分支，不把 macOS 代码改成未经验证的“通用实现”。

2. Windows 适配只走 Electron 主进程平台分支。
   - Electron 使用 `process.platform === 'win32'` 增加 Windows 实现。
   - 渲染层继续通过统一 `window.deskCat.invoke(...)` 调用能力。
   - 不再把 Tauri/Rust 作为 Windows 首版适配路线。

3. 历史 Tauri/Rust 计划只作为参考，不作为交付项。
   - `src-tauri/` 目录可以暂时保留，但不阻塞 Windows Electron 适配。
   - 不再要求 `cargo check`、Tauri installer、Tauri screenshot、Tauri keychain 通过。
   - 若未来重启 Tauri，需要另开独立计划。

4. 当前分支最终要 merge 回 `main`。
   - Windows 代码必须可被 macOS 安全忽略。
   - 新依赖不能让 macOS install/build/test 失败。
   - 所有 Windows 能力失败时要降级，不影响宠物、聊天和设置页基础体验。

## 当前实现概览

### 当前主线

- `electron/main.cjs`
  - Electron 主进程，负责窗口、托盘、截图、系统能力、AI 请求、语音、Timeline、Focus Guard、Coding Mode、自动更新。
- `electron/preload.cjs`
  - 暴露 `window.deskCat` 给渲染层。
- `src/`
  - React/Vite 渲染层，包含宠物、聊天、设置、Timeline、语音、AI 配置等 UI 和状态。
- `package.json`
  - Electron Builder 已有 Windows NSIS 配置：
    - `build.win.target = "nsis"`
    - `build.win.icon = "src-tauri/icons/icon.ico"`

### 已过时内容

历史 docs 中关于以下内容的规划已经不是当前 Windows 适配主线：

- Tauri 作为主桌面壳。
- Rust `#[cfg(target_os = "windows")]` 实现主功能。
- `src-tauri` 中的截图、窗口、Keychain、desktop bounds 作为首版 Windows 能力。
- `pnpm tauri build` 作为 Windows 打包命令。

保留这些目录和文档不代表本次需要实现它们。Windows 首版以 Electron 成功开发、运行、打包和发布为准。

## 需要适配的功能清单

### 1. Windows 开发环境与构建

#### 当前状态

已在 Windows 上验证：

- `pnpm install --frozen-lockfile`
- `pnpm test`
- `pnpm build`

已补齐：

- `pnpm`
- `libwebp`，提供 `gif2webp.exe`
- `pnpm-workspace.yaml` 允许 `electron-winstaller`
- `scripts/optimize-pet-assets.mjs` 可从 PATH 查找 `gif2webp.exe`

#### 方案

新增或更新 Windows 开发文档：

```powershell
scoop install pnpm libwebp
pnpm install --frozen-lockfile
pnpm test
pnpm build
```

增加 Windows Electron 打包脚本：

```json
"electron:build:win": "pnpm native:build && pnpm build && electron-builder --win nsis --x64 --publish never"
```

说明：`native:build` 当前只在 macOS 编译 `panel-key-fix.mm`，Windows 下会 no-op，因此可以保留在统一脚本中。

#### 验收

- 新 Windows 机器能按文档完成依赖安装。
- `pnpm install --frozen-lockfile` 无 pnpm build approval 错误。
- `pnpm build` 能完成 GIF/WebP 优化。
- `pnpm electron:build:win` 能生成 NSIS 安装包。

### 2. 窗口、桌面宠物与紧凑聊天

#### 当前实现

相关代码主要在 `electron/main.cjs`：

- `createPetWindow()`
- `showCompactChatWindow()`
- `focusCompactChatWindowForInput()`
- `applyFloatingFullscreenBehavior()`
- `ensureTopmostGuard()`

macOS 依赖：

- `type: 'panel'`
- `setVisibleOnAllWorkspaces(... visibleOnFullScreen ...)`
- `setAlwaysOnTop(true, 'screen-saver', ...)`
- macOS 原生 addon `electron/panel-key-fix.mm`

#### Windows 风险

- Windows 没有 macOS Space / NSPanel。
- 透明无边框窗口可能出现黑边或闪烁。
- `alwaysOnTop` level 在 Windows 上表现与 macOS 不同。
- 紧凑聊天需要可聚焦，否则中文输入、IME 候选窗、快捷键会不稳定。
- 高 DPI、多显示器会影响拖拽和定位。

#### 方案

保留 macOS 分支原样，将 Windows 行为明确拆出：

```js
function applyFloatingFullscreenBehavior(win, options = {}) {
  if (process.platform === 'darwin') {
    return applyFloatingFullscreenBehaviorDarwin(win, options);
  }
  if (process.platform === 'win32') {
    return applyFloatingFullscreenBehaviorWindows(win, options);
  }
  return applyFloatingFullscreenBehaviorGeneric(win, options);
}
```

Windows 分支策略：

- pet window：
  - `transparent: true`
  - `frame: false`
  - `focusable: false`
  - `skipTaskbar: true`
  - `alwaysOnTop: true`
  - 优先尝试 `setAlwaysOnTop(true, 'screen-saver')`
  - 若 IME 或系统浮层被遮挡，降级到 `pop-up-menu` 或 `normal`

- compact-chat window：
  - `focusable: true`
  - 输入时 `show()` + `focus()`
  - 非输入展示时可 `showInactive()`
  - 避免长期用最高层级压住 IME 候选窗

- topmost guard：
  - Windows 可以保留，但频率建议从 500ms 调整为 1000ms。
  - 增加 feature flag：`DESKCAT_WINDOWS_TOPMOST_GUARD=0` 可关闭。

#### 验收

- Windows 启动后宠物显示在工作区右下角。
- 宠物可拖拽、右键菜单可用。
- 紧凑聊天能输入中文，IME 候选窗不被遮挡。
- 设置页和完整聊天窗口可正常聚焦。
- 多显示器和 125%/150% 缩放下位置基本准确。

### 3. 托盘、任务栏与图标

#### 当前实现

- `setAppIcon()`
- `updateTrayMenu()`
- `Tray`
- `nativeImage`

#### Windows 风险

- 动态 PNG 托盘图标在 Windows 上可能模糊。
- pet 和 compact-chat 不应出现在任务栏。
- 设置页和完整聊天窗口应正常出现在任务栏。

#### 方案

- macOS Dock 逻辑继续只在 `darwin` 分支运行。
- Windows 默认使用 `src-tauri/icons/icon.ico` 作为 app/installer/window fallback icon。
- 托盘图标优先使用当前宠物图标，但失败时回退到 `.ico`。
- 修复托盘菜单乱码时要谨慎，避免顺手大改所有文案。

#### 验收

- 系统托盘出现 DeskCat 图标。
- 托盘菜单可打开设置、聊天、显示/隐藏宠物、退出。
- pet/compact-chat 不出现在任务栏。
- installer、桌面快捷方式、任务栏图标正确。

### 4. 截图与图片输入

#### 当前实现

Electron 主线使用 `desktopCapturer`：

- `captureScreenRegion(args)`
- 前端截图 overlay 在 `src/features/screenshot/ScreenshotOverlay.tsx`

#### Windows 风险

- 当前 crop 逻辑可能没有正确处理：
  - Windows DPI 缩放。
  - 多显示器。
  - 副屏在主屏左侧或上方导致负坐标。
  - Electron DIP 坐标和物理像素坐标差异。

#### 方案

保留 Electron `desktopCapturer`，新增 Windows 坐标转换：

1. 使用 `screen.getAllDisplays()` 找到截图选区所在 display。
2. 将全局 DIP 坐标转换为 display-relative DIP 坐标。
3. 按 `display.scaleFactor` 转换到物理像素。
4. `thumbnailSize` 使用目标 display 的物理像素尺寸。
5. crop 使用 display-relative physical rect。

macOS 当前截图路径不动。若抽公共函数，只抽纯数学函数并加测试。

#### 验收

- 单屏 100%/125%/150% 截图区域准确。
- 双屏，副屏在左侧/上方时截图区域准确。
- 截图能进入聊天消息并作为 image data URL 发送。

### 5. API Key 安全存储

#### 当前实现

Electron 使用：

- `electron/secureKeyStore.cjs`
- Electron `safeStorage`
- app `userData` 下的加密 JSON 文件

Windows 上 `safeStorage` 使用 DPAPI。

#### 方案

- 不迁移存储格式。
- 不引入 Rust keyring。
- Windows 只验证 `safeStorage.isEncryptionAvailable()`、保存、读取、删除。
- 错误文案平台中性化，避免写死 Keychain/macOS。

#### 验收

- Windows 保存 API key 后重启仍可读取。
- 删除 key 后不能再读取。
- 本地文件中不出现明文 key。
- macOS 已有 key 不需要迁移。

### 6. Timeline 与 Focus Guard 前台窗口采样

#### 当前实现

macOS 依赖 AppleScript / System Events：

- `readActiveWindow()`
- `browserUrlScript()`
- `readTimelineActiveWindow()`
- `ensureAccessibilityPermission()`
- `checkAccessibilityPermission()`

非 macOS 当前基本返回 unsupported。

#### Windows 目标

首版最低可用能力：

- 读取前台 app 名称。
- 读取前台窗口标题。
- Timeline 可以记录前台切换。
- Focus Guard 可以按 app/title 规则识别分心。

首版不强求：

- 浏览器真实 URL。
- 所有 UWP/管理员窗口标题。
- 独占全屏游戏精确识别。

#### 方案

新增 Electron 平台模块：

```text
electron/platform/darwinActivity.cjs
electron/platform/windowsActivity.cjs
electron/platform/processMarkers.cjs
```

迁移策略：

1. 先把现有 macOS AppleScript 代码原样复制到 `darwinActivity.cjs`。
2. `electron/main.cjs` 只做分发，不改变 macOS 返回结构。
3. Windows 新增 `readActiveWindowWindows()`。

Windows 前台窗口读取优先方案：

- 使用成熟 npm 包 `active-win`。
- 返回字段映射：
  - `owner.name` -> `appName`
  - `title` -> `windowTitle`
  - `url` 如果包可提供则使用，否则空字符串
  - `bounds` 如果可提供则用于 fullscreen 判断

备选方案：

- PowerShell + Win32 API 临时实现，但不建议作为长期方案。
- 自写 native addon 不作为首版方案。

#### 验收

- Timeline 能记录 VS Code、Windows Terminal、Chrome、WeChat 等前台切换。
- Focus Guard app/title 规则生效。
- 无权限或读取失败时返回 `supported: false` 或带 error 的空结果，不阻塞应用。
- macOS Timeline 相关测试保持通过。

### 7. 浏览器 URL 采样

#### 当前实现

macOS 通过 AppleScript 支持 Safari、Chrome、Chromium、Brave、Edge、Vivaldi、Arc。

#### Windows 策略

Windows 首版不默认读取浏览器 URL。原因：

- Windows 没有统一安全的浏览器 URL 系统 API。
- 读取地址栏通常需要 UI Automation 或浏览器扩展，隐私和稳定性风险较高。
- Focus Guard 可以先靠 app 名和窗口标题满足基础使用。

后续增强路线：

- 浏览器扩展 + Native Messaging。
- 用户显式授权后读取当前 tab URL。
- 或通过浏览器调试协议，但只适合开发环境，不适合作为默认用户功能。

#### 验收

- Windows 上 URL 字段为空时 Timeline/Focus Guard 不崩溃。
- URL 规则 UI 明确提示 Windows 当前未支持浏览器 URL 采样。
- macOS URL 采样保持原样。

### 8. 后台标记：终端、音乐、Coding Mode

#### 当前实现

macOS：

- `readRunningProcessNames()`
- `readShellProcessMarkers()`
- AppleScript 读取 Music/Spotify。
- 网易云音乐读取 macOS container/sqlite/cache。

#### Windows 目标

- 检测 Windows Terminal、PowerShell、cmd、node、pnpm、cargo、python、Codex、Claude 等后台活动。
- 音乐首版只检测应用存在，不强求当前曲目。

#### 方案

Windows 进程读取：

- 使用 PowerShell：

```powershell
Get-CimInstance Win32_Process | Select-Object ProcessId,Name,CommandLine | ConvertTo-Json
```

- Electron 中 `execFile('powershell.exe', ['-NoProfile', '-Command', ...])`。
- 超时 1800ms。
- 失败返回空数组。

复用现有命令识别：

- `isTrackableTerminalCommand()`
- `normalizeTerminalCommand()`
- `compactTerminalCommands()`

Windows 需补充识别：

- `powershell.exe`
- `pwsh.exe`
- `cmd.exe`
- `WindowsTerminal.exe`
- `Code.exe`
- `codex.exe`
- `claude.exe`

音乐：

- 首版检测 `Spotify.exe`、`CloudMusic.exe`、`Music.UI.exe` 等进程存在。
- 当前曲目信息后续考虑 Windows GSMTC。

#### 验收

- Timeline background markers 能显示 terminal/coding/music。
- 后台扫描失败不影响前台窗口采样。
- macOS 音乐和终端采样保持原样。

### 9. 系统知识

#### 当前实现

- 设备信息：Electron `os` + `screen`，跨平台。
- 天气：IP 定位 + Open-Meteo，跨平台。
- Calendar/Reminders：macOS AppleScript。

#### Windows 策略

设备和天气保留。

Calendar/Reminders 在 Windows 首版明确 unsupported：

```js
{
  calendar: [],
  reminders: [],
  calendarStatus: 'unsupported',
  remindersStatus: 'unsupported',
  error: 'Calendar and Reminders integration is not available on Windows yet.'
}
```

不要弹 macOS Automation 权限，不要打开 macOS 系统设置。

后续路线：

- Microsoft Graph OAuth 读取 Outlook Calendar / To Do。
- 本地 Outlook COM 仅作为可选增强，不作为默认。

#### 验收

- Windows 问设备、天气可返回信息。
- Windows 问日程时明确说明暂不支持。
- macOS Calendar/Reminders 权限流程不变。

### 10. 语音输入与输出

#### 当前实现

- 云 STT/TTS：`src/features/voice/voiceService.ts`
- 系统语音：浏览器 Web APIs
- Electron 主进程提供 `transcribe_audio`、`synthesize_speech`、builtin proxy 等 IPC。

#### Windows 风险

- Electron/Chromium 中系统 `SpeechRecognition` 可用性不稳定。
- `MediaRecorder` MIME type 可能与 macOS 不同。
- 麦克风权限由 Windows/Chromium 管理，体验不同于 macOS Info.plist。

#### 方案

- 云 STT/TTS 作为 Windows 推荐路径。
- 系统 STT 不可用时 UI 降级提示切换云 STT。
- `can_start_speech_recognition`：
  - macOS 继续执行 Info.plist 防闪退检查。
  - Windows 返回 true，但前端实际检测 `SpeechRecognition`、`navigator.mediaDevices`、`MediaRecorder`。
- 保持 `pickRecordingMimeType()` 的多格式 fallback。

#### 验收

- Windows 可录音并通过云 STT 得到文本。
- Windows 可播放云 TTS。
- 系统语音不可用时不崩溃。
- macOS 语音权限保护不变。

### 11. 开机自启、更新、安装包

#### 当前实现

- `app.setLoginItemSettings(...)`
- `electron-updater`
- `electron-builder`
- GitHub Releases publish 配置

#### 方案

开机自启：

- Electron API 可跨平台保留。
- 设置页文案改为“登录系统后自动启动 DeskCat”。
- 验证开发版和安装版差异。

安装包：

- 新增 Windows 打包脚本 `electron:build:win`。
- 输出 NSIS installer。
- 验证安装、覆盖安装、卸载。

自动更新：

- Windows 发布时上传：
  - `.exe` installer
  - `latest.yml`
- macOS 发布继续上传：
  - `.dmg`
  - `latest-mac.yml`

#### 验收

- 安装版可启动。
- 自动更新开发环境跳过，打包环境状态正常。
- 开机自启开关有效。

### 12. 前端平台文案和设置页

#### 当前风险

设置页和提示中存在 macOS 固定文案，例如：

- “跟随 macOS 外观设置”
- “登录 macOS 后自动启动 DeskCat”
- “保存时 macOS 可能弹出系统安全存储确认”
- macOS System Events / Automation 权限说明

#### 方案

- 改成平台中性文案：
  - “跟随系统外观”
  - “登录系统后自动启动 DeskCat”
  - “系统可能弹出安全存储确认”
- macOS 专属权限说明只在 macOS 显示。
- Windows unsupported 能力显示灰态说明，不隐藏。

#### 验收

- Windows 设置页没有 macOS 专属错误引导。
- macOS 用户看到的权限含义不变。

## 实施顺序

### M1：基础可运行

- 保持 `pnpm install/test/build` 通过。
- 增加 `electron:build:win`。
- 启动 `pnpm electron:dev`，修复 Windows 启动阻断问题。

### M2：基础桌面体验

- Windows pet/compact-chat 窗口稳定。
- 托盘、任务栏、图标正常。
- 设置页和聊天页正常。

### M3：核心能力

- API key 保存/读取/删除。
- 截图发送到聊天。
- 云 STT/TTS。
- 文件上传 PDF/DOCX 和图片。

### M4：Timeline 与 Focus Guard

- 引入 Windows active window 读取。
- 实现 app/title 规则。
- 实现后台进程 markers。
- URL 采样暂缓。

### M5：安装包与发布验证

- NSIS installer。
- 开机自启。
- GitHub Releases Windows 更新元数据。
- Windows QA 矩阵。

### M6：macOS 回归与合并

- macOS install/test/build/dev 全部通过。
- macOS 已上线关键路径手工回归。
- 合并回 `main`。

## 测试矩阵

### Windows 自动化

```powershell
pnpm install --frozen-lockfile
pnpm test
pnpm build
pnpm electron:build:win
```

### Windows 手工测试

- Windows 11，100%/125%/150% DPI。
- Windows 10 22H2，100%/125% DPI。
- 单屏、双屏、副屏在左侧/上方。
- 首次启动。
- 宠物显示、拖拽、右键菜单。
- 紧凑聊天中文输入和 IME。
- 设置页、完整聊天页。
- 截图发送 AI。
- 图片/PDF/DOCX 上传。
- 自定义 API key 保存、重启读取、删除。
- 云 STT/TTS。
- Timeline 记录 VS Code、Terminal、Chrome、WeChat。
- Focus Guard app/title 规则。
- 托盘显示/隐藏/退出。
- 开机自启。
- 安装、覆盖安装、卸载。

### macOS 回归

合并回 `main` 前必须验证：

```bash
pnpm install --frozen-lockfile
pnpm test
pnpm build
pnpm electron:dev
```

手工回归：

- 宠物在普通桌面和 fullscreen Space 中表现不倒退。
- 紧凑聊天 IME 行为不倒退。
- Accessibility / Automation / Calendar / Reminders 权限流程不变。
- Timeline 前台窗口和浏览器 URL 采样正常。
- API key 读取已有数据正常。
- 自动更新行为不变。

## 合并保护清单

- 是否只在 `process.platform === 'win32'` 下新增 Windows 行为？
- 是否避免修改 macOS `darwin` 分支行为？
- 是否避免更改已有用户数据格式？
- 是否避免把 Tauri/Rust 作为 Windows 首版阻塞项？
- 是否新增 Windows 依赖后 macOS 仍可 install/build/test？
- 是否给 Windows parser/normalizer 增加单测？
- Windows 能力失败时是否优雅降级？
- macOS 回归是否完成？

## 优先级总表

| 优先级 | 功能 | Windows 方案 | macOS 保护 |
| --- | --- | --- | --- |
| P0 | 开发/构建 | pnpm + Electron Builder + NSIS | 不改 macOS build |
| P0 | 宠物窗口 | Electron `win32` 窗口分支 | 保留 macOS panel/Space |
| P0 | 紧凑聊天 | Windows focus/IME 专项处理 | 保留 macOS IME 修复 |
| P0 | API key | Electron safeStorage/DPAPI | 不迁移 macOS 存储 |
| P0 | 截图 | desktopCapturer + DPI/多屏修正 | 不改 macOS 截图行为 |
| P1 | Timeline | active window app/title | AppleScript 不动 |
| P1 | Focus Guard | app/title 规则 | macOS URL 规则不动 |
| P1 | 托盘/安装包 | Tray + NSIS | Dock/DMG 不动 |
| P1 | 语音 | 云 STT/TTS 优先 | Info.plist 检查不动 |
| P2 | 浏览器 URL | 后续扩展/插件 | macOS AppleScript 不动 |
| P2 | 日历/提醒 | Windows 首版 unsupported | macOS Calendar/Reminders 不动 |
| P2 | 音乐曲目 | 后续 GSMTC | macOS Music/Spotify 不动 |

## 近期下一步

1. 新增 `electron:build:win` 脚本并生成首个 NSIS 包。
2. 启动 `pnpm electron:dev`，记录 Windows 运行时问题。
3. 优先修窗口、托盘、截图、API key、语音这些 P0 能力。
4. 再拆平台 activity 模块，实现 Timeline/Focus Guard 的 Windows app/title 最小可用版本。
