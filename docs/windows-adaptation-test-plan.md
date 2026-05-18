# Windows 适配测试记录

本文档按适配步骤记录自动化测试和开发者人工测试方案。每完成一步，都需要补充对应的单元测试和人工验证方法。

## 平台命名约定

Electron/Node 的 `process.platform` 在 32 位 Windows、64 位 Windows 和 Windows ARM64 上都返回 `win32`。因此本文档和代码里的 `win32` 表示 Windows 操作系统家族，不表示只支持 32 位 Windows。

需要区分架构时使用 `process.arch`：

- `x64`：64 位 Intel/AMD Windows
- `ia32`：32 位 Windows
- `arm64`：Windows on ARM

## Step 1：Windows 前台窗口采样最小接入

### 目标

- Windows 上不再直接把 Timeline / Focus Guard 判定为 unsupported。
- Electron 主进程在 `process.platform === 'win32'` 时通过 PowerShell + Win32 `user32.dll` API 读取当前前台窗口。
- 首版只读取 `appName` 和 `windowTitle`；`url` 和 `background` 暂时为空，后续步骤再做浏览器 URL 和后台 marker。
- macOS AppleScript 路径保持原样。

### 改动范围

- `electron/platform/windowsActivity.cjs`
- `electron/windowsActivity.test.cjs`
- `electron/main.cjs`
- `src/App.tsx`
- `src/lib/platformSupport.ts`
- `src/lib/platformSupport.test.ts`
- `package.json`

### 自动化测试

运行：

```powershell
pnpm test:startup
pnpm test
```

覆盖点：

- Windows `.exe` 进程名规范化。
- PowerShell JSON 输出解析。
- 非 JSON/空输出失败时返回错误 payload，而不是抛出导致采样循环崩溃。
- PowerShell 调用必须使用 `-NoProfile` 和 `-ExecutionPolicy Bypass`，避免用户 profile 干扰。
- PowerShell 失败时记录 `windows-active-window:error`。
- Windows 的 `check_accessibility_permission` 返回 unsupported 时，不会触发 macOS Accessibility 等待逻辑，也不会阻塞 Timeline。

### 开发者人工测试方案

1. 启动开发版：

```powershell
pnpm electron:dev
```

2. 打开设置页，确认 Timeline recording 和 Focus Guard/Distraction Detection 已启用。

3. 依次切换到以下窗口，每个窗口停留 5 秒以上：

- VS Code / Cursor
- Windows Terminal 或 PowerShell
- Chrome / Edge
- 微信或其它普通桌面应用

4. 观察开发者控制台或应用 Timeline：

- Windows 不应再出现 `platform=Win32` 的 unsupported 日志。
- Timeline 采样应出现对应 `appName` 和 `windowTitle`。
- URL 可以为空，这是 Step 1 的预期行为。
- 后台 markers 可以为空，这是 Step 1 的预期行为。

5. Focus Guard 手工验证：

- 在设置中添加一个 blocked app，例如 `chrome` 或 `wechat`。
- 开启专注计时。
- 切到对应 app，等待 grace seconds 后应触发分心提示。

6. 失败记录：

- 如果 Timeline 没有记录，查看日志中是否有 `windows-active-window:error`。
- 如果 PowerShell 被企业策略禁用，记录错误信息；后续需要替换为 npm 原生 active-window 方案或 Electron native addon。

### macOS 回归要求

在 macOS 上运行：

```bash
pnpm test:startup
pnpm test
pnpm electron:dev
```

确认：

- macOS Timeline 仍走 AppleScript。
- Calendar/Reminders/Accessibility 权限行为不变。
- 浏览器 URL 采样不倒退。

## Step 2：Windows 后台进程 markers

### 目标

- Windows Timeline 支持后台 markers。
- 首版识别 terminal/coding 相关后台活动：
  - Windows Terminal
  - PowerShell / pwsh / cmd
  - pnpm/npm/yarn/bun
  - node/python/pytest/cargo
  - Codex / Claude
- 首版识别音乐应用是否运行：
  - Spotify
  - CloudMusic / NeteaseCloudMusic
  - AppleMusic / Music.UI
  - QQMusic
- 不读取 Windows 当前播放曲目；曲目信息后续再通过 GSMTC 或播放器集成实现。

### 改动范围

- `electron/platform/windowsProcesses.cjs`
- `electron/windowsProcesses.test.cjs`
- `electron/main.cjs`
- `package.json`

### 自动化测试

运行：

```powershell
pnpm test:startup
pnpm test
```

覆盖点：

- CIM / PowerShell JSON 解析，兼容数组和单对象输出。
- `.exe` 进程名大小写规范化。
- 终端、Codex、Claude、pnpm、cargo、node 等命令归一化。
- Spotify 等音乐进程转成 `music` marker。
- 用户配置的音乐关键词能识别自定义播放器。
- DeskCat 自身 helper 扫描和当前进程不会污染 Timeline。
- PowerShell/CIM 失败时返回空列表，不阻塞 Timeline。

### 开发者人工测试方案

1. 确认当前系统架构：

```powershell
node -p "process.platform + ' ' + process.arch"
```

预期：

- 64 位 Windows 输出类似 `win32 x64`。
- Windows ARM64 输出类似 `win32 arm64`。
- 这里的 `win32` 是 Node/Electron 的 Windows 平台名，不是 32 位限制。

2. 启动开发版：

```powershell
pnpm electron:dev
```

3. 同时打开以下进程：

- Windows Terminal 或 PowerShell
- 在终端里运行 `pnpm dev`、`cargo test`、`node server.js` 任意一个
- Codex 或 Claude Code
- Spotify 或其它已配置音乐播放器

4. 打开 Timeline 或观察调试日志：

- 应出现 `terminal:<process>:<detail>` marker。
- Codex/Claude/pnpm/cargo/node 等命令应被压缩成可读 detail。
- 音乐播放器应出现 `music:<process>:running` marker。
- 不应出现 `Get-CimInstance Win32_Process` 这类 DeskCat 自身扫描命令。

5. 失败记录：

- 如果后台 markers 为空，先运行：

```powershell
Get-CimInstance Win32_Process | Select-Object -First 5 ProcessId,Name,CommandLine | ConvertTo-Json -Compress
```

- 若该命令被策略禁用，记录错误信息；后续需要切换到原生 npm 包或 Electron native addon。

### macOS 回归要求

- macOS 后台 markers 仍走原 AppleScript/`ps` 路径。
- Music/Spotify 当前曲目读取不变。
- 网易云 macOS container/cache 逻辑不变。
