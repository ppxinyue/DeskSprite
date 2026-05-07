# 默认 STT/TTS 高级功能方案

日期：2026-05-07

## 结论

已把云端 STT/TTS 做成“高级语音体验”，但不替代当前系统语音输入/输出。

原因：

- 当前系统语音输入依赖 WebView 暴露 `SpeechRecognition` / `webkitSpeechRecognition`，不同 macOS 运行方式差异很大。
- 系统语音识别需要麦克风和语音识别权限，缺 `Info.plist` 声明时 macOS 会直接 TCC 崩溃。
- 系统 TTS `speechSynthesis` 可用性高，但声音质量和语言选择受系统影响。
- 云端 STT/TTS 可以提供稳定质量，但有成本、隐私和默认 key 暴露风险。

当前策略：

1. 默认使用“云端增强”，优先走内置 STT/TTS 体验额度。
2. 超出额度、网络失败或服务端拒绝时，自动回退系统语音输入/输出。
3. 用户也可以手动切换到系统语音输入/输出。
4. 用户选择“用户默认模型 Key”时，使用设置中默认 API 配置的 key；语音模型名仍使用内置 STT/TTS 模型。

## 默认模型

默认语音服务商使用 CloseAI OpenAI-compatible 接口：

- base URL: `https://api.openai-proxy.org/v1`
- STT model: `gpt-4o-mini-transcribe`
- TTS model: `tts-1`

注意：默认 API Key 不应写入文档、日志、错误信息或可搜索的源码注释。客户端内置 key 天然可被逆向提取，只适合作为体验额度，不适合作为真正安全的免费额度系统。

## 推荐架构

### 语音模式

新增设置：

- `voiceInputProvider`: `system | cloud-auto | user-cloud`
- `voiceOutputProvider`: `system | cloud-auto | user-cloud`
- `builtinCloseAiSttSecondsUsage`: number，本机内置 STT 已用秒数
- `builtinCloseAiTtsCharsUsage`: number，本机内置 TTS 已用字符数

语义：

- `system`: 始终使用当前系统 `SpeechRecognition` / `speechSynthesis`。
- `cloud-auto`: 优先使用内置云端 STT/TTS，失败或超额自动回退系统。
- `user-cloud`: 使用用户自己配置的语音 API Key 和模型。

### STT 调用

前端：

1. 点击语音输入。
2. 使用 `navigator.mediaDevices.getUserMedia({ audio: true })` 获取麦克风权限。
3. 使用 `MediaRecorder` 录制音频。
4. 停止后把音频 blob 转为 bytes / data URL。
5. 调用 Rust 后端 `transcribe_audio`。

后端：

1. 归一化 base URL 和 API Key。
2. 请求：
   - `POST {baseUrl}/audio/transcriptions`
   - multipart:
     - `model`
     - `file`
3. 返回文本。

失败处理：

- 权限失败：提示用户允许麦克风。
- 模型/鉴权失败：展示服务端错误，回退系统 STT。
- 网络失败：回退系统 STT。

### TTS 调用

前端：

1. AI 回复完成后，若启用自动朗读，调用 `synthesize_speech`。
2. 后端返回音频 data URL 或临时文件路径。
3. 前端用 `<audio>` 播放。

后端：

1. 请求：
   - `POST {baseUrl}/audio/speech`
   - JSON:
     - `model`
     - `input`
     - `voice`
     - `format`
2. 返回音频 bytes。

失败处理：

- 云端失败时，直接调用当前 `speechSynthesis`。
- 用户不应因为云端语音失败而失去基础语音能力。

## 额度设计

如果没有服务端，只能做本地估算额度：

- STT: 按录音秒数估算。
- TTS: 按输出字符数估算。
- 本地记录在 `settings` 或新表 `voice_usage_logs`。

本地额度只能提升体验，不能防滥用。真正可控的免费额度需要服务端代理：

1. DeskSprite 客户端请求自有额度服务。
2. 额度服务保存默认 API Key。
3. 额度服务按设备/用户/安装 ID 限额。
4. 超额后返回“请配置自己的 API Key”。

如果默认 key 直接打包进客户端，任何人都可以提取并绕过本地额度。

## 与现有系统语音的关系

当前系统能力继续保留：

- 输入：`SpeechRecognition` / `webkitSpeechRecognition`
- 输出：`speechSynthesis`
- 权限检查：`can_start_speech_recognition`

云端语音只作为增强路径：

```text
用户点击语音
  -> cloud-auto 可用且未超额？
    -> 使用云端 STT/TTS
    -> 失败则回退 system
  -> 否则 system
```

## 实施步骤

当前已完成：

1. 新增后端命令：
   - `transcribe_audio`
   - `synthesize_speech`
2. 为 `reqwest` 增加 multipart 支持。
3. 前端新增 `voiceService.ts`：
   - 录音
   - 云端 STT 调用
   - 云端 TTS 播放
   - 系统回退
4. 设置页增加“语音模型”高级区域：
   - Chat：默认 / 自定义
   - STT：默认 / 自定义 / 系统输入
   - TTS：默认 / 自定义 / 系统朗读
   - 显示额度使用情况
5. 聊天窗口语音按钮接入新 service。
6. 自动朗读接入云端 TTS，失败回退 `speechSynthesis`。

## 当前实现细节

- 内置 STT 额度：每台设备本地记录 3600 秒。
- 内置 TTS 额度：每台设备本地记录 100000 字符。
- 内置 Chat 额度：每台设备本地记录 100000 token 估算值。
- 设置页 `AI 对话` 中展示 Chat/STT/TTS 三类内置额度使用百分比。
- Chat、STT、TTS 在设置页分开配置：Chat 自定义复用 API 配置中的默认模型，STT/TTS 自定义各自保存 base URL、模型名和 API Key。
- 当前没有账户系统，因此额度独立跟随设备；重新安装、迁移数据或手动清理本地数据库会影响本地额度记录。
- 云端 STT 使用 `MediaRecorder` 录音并发送到 OpenAI-compatible `/audio/transcriptions`。
- 云端 TTS 使用 OpenAI-compatible `/audio/speech`，返回 data URL 后由前端播放。

## 安全边界

- 不在日志或 UI 中展示完整 API Key。
- 测试/错误信息只展示 provider、endpoint、状态码和安全摘要。
- 内置 key 若必须放客户端，只能视为可泄露的体验 key。
- 真正的免费额度必须由服务端控制。
