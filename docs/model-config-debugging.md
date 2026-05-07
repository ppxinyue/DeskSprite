# 模型配置与 API Key 排查复盘

日期：2026-05-07

这份文档记录 API Key 保存、模型测试和用户自定义模型调用反复失败的排查过程。后续再改 AI 配置相关代码时，先读这里，避免重复踩同一个坑。

## 背景

DeskSprite 目前有两条模型路径：

- 内置默认 CloseAI 模型：用户没有配置模型时自动使用。
- 用户自定义模型：用户在“设置 -> AI 对话”里新增。

问题是：内置默认 CloseAI 可以正常对话，但用户手动新增同样 base URL、同样 model 的 CloseAI 配置时，测试和调用多次失败，先后出现过：

- `No matching entry found in secure storage`
- `未找到已保存的 API Key`
- `TypeError`
- `HTTP 400: invalid token: HTTP 401: invalid token`

最终通过的用户配置是：

- provider: `closeai`
- base URL: `https://api.openai-proxy.org/v1`
- model: `gpt-4o-mini`

注意：任何文档、日志、UI 诊断、提交信息都不能记录完整 API Key 明文。

## 失败链路

### 1. 把 Keychain 当作唯一可信来源

最初实现只在 SQLite 里保存 `keyring_ref`，真正的 API Key 依赖系统 Keychain 读取。

在当前开发/运行环境里，Keychain 读取并不稳定。结果是数据库里有配置，但运行时拿不到对应 key，报出 `No matching entry found in secure storage`。

经验：模型配置必须有一个运行时可验证的数据源。存储越不透明，UI 越需要能安全证明“这把 key 确实存在并被当前请求使用”。

### 2. 内部错误文本混进了凭证字段

部分失败路径会返回 `未找到已保存的 API Key` 这类给人看的错误文案。后续逻辑又把这个非空字符串当成 token，塞进 `Authorization` 请求头发给服务商。

这会让服务商返回 `invalid token`，但真正错误其实发生在应用内部。

经验：错误文本绝不能进入凭证数据流。API Key 解码、读取、保存时都要过滤已知内部错误标记。

### 3. 前端 fetch 掩盖真实错误

早期模型测试通过 WebView 前端 `fetch` 直连服务商。很多服务商不会给桌面 WebView 源设置 CORS 许可，于是前端只得到 `TypeError`。

`TypeError` 无法判断是 key 错、模型错、base URL 错，还是浏览器安全层拦截。

经验：桌面 App 的模型测试和模型调用应走 Rust 后端网络层，由后端返回真实 HTTP 状态与服务商错误信息。

### 4. 用户 provider 列表缺少内置默认模型对应服务商

内置默认模型使用 CloseAI proxy base URL，但用户可选服务商里一开始没有 CloseAI。用户很容易误选 OpenAI 官方 base URL，再填 proxy key，必然报鉴权错误。

经验：内置默认模型使用的 provider/base URL，也必须作为用户可选项暴露出来。

### 5. `invalid token` 缺少安全诊断

`HTTP 401 invalid token` 只能说明请求已经到达某个服务端，并且服务端拒绝 token。它不能证明应用使用的是用户刚保存的那把 key。

最终修复是增加安全摘要：

- 实际请求 endpoint
- API Key 长度
- API Key 尾号，只显示最后 4 位
- 非密钥短指纹

经验：凭证问题必须可观测，但绝不能泄露明文。长度、尾号和短指纹足够判断是否用了旧 key、空 key 或错误 key。

## 当前正确流程

### 保存

1. 用户填写 provider、base URL、model、API Key。
2. 应用统一归一化 API Key：
   - 去掉 `Bearer `
   - 去掉外层引号或反引号
   - 去掉零宽不可见字符
   - 去掉误粘贴的空格和换行
3. 归一化后的 key 写入本地 `api_configs.api_key` 字段。
4. UI 不展示完整 key 明文。
5. 设置列表展示安全摘要：长度、尾号、短指纹。

### 测试

1. 前端读取当前配置对象。
2. `resolveStoredApiKey` 解码并归一化本地 key。
3. 前端调用 Rust `test_ai_connection`。
4. Rust 发送最小模型请求：
   - OpenAI-compatible provider: `POST {baseUrl}/chat/completions`
   - Anthropic: `POST {baseUrl}/messages`
5. 失败时，Rust 返回 HTTP 状态、服务商错误、endpoint 和安全 key 摘要。

### 对话

1. 聊天 UI 使用同一套 key 解析逻辑。
2. 前端调用 Rust `chat_completion`。
3. Rust 发起真实模型请求。

因此，用户新增模型和内置默认模型现在共享同样的实际语义：后端用明确的 `base_url + model + api_key` 发请求。

## 错误含义

### `No matching entry found in secure storage`

这是旧 Keychain 路径读取失败。当前用户模型主路径不应再依赖它。

如果再次出现，优先搜索是否有 Keychain fallback 回流，或是否又把错误文本写进 `api_key`。

### `TypeError`

通常是 WebView/browser 请求层失败，服务商还没机会返回结构化错误。

模型测试和聊天调用不应走前端直连 fetch。

### `HTTP 400/401 invalid token`

说明 endpoint 有响应，并且服务端拒绝 token。

判断顺序：

- endpoint 不对：provider 或 base URL 选错。
- key 长度、尾号、指纹不对：本地保存/读取到了旧 key 或错误 key。
- endpoint 和 key 摘要都对：服务商确实拒绝这把 key，继续查服务商账号、额度、权限或 key 本身。

### `model not found` / 权限错误

key 可能是有效的，但 model name 写错，或该账号没有模型权限。

## Debug Checklist

1. 确认 provider preset 是否映射到预期 base URL。
2. 确认设置列表显示 `Key: 已保存`，并检查长度、尾号、指纹。
3. 点击测试，确认返回的 endpoint。
4. 如果 endpoint 正确但 token 失败，先比较 key 摘要，不要急着改请求代码。
5. 再检查请求头：
   - OpenAI-compatible: `Authorization: Bearer <key>`
   - Anthropic: `x-api-key: <key>`
6. 任何时候都不要打印或展示完整 API Key。

## 关键经验

- 内置默认模型能用，不代表用户配置走的是同一条数据链路。
- Keychain 这类不透明存储一旦失败，必须有可恢复、可观测的降级路径。
- 保存、读取、测试、聊天必须共用同一套 API Key 归一化逻辑。
- 服务商错误要原样展示，但应用层也要说明这次请求用了哪个 endpoint 和哪把本地 key 的安全摘要。
- 错误文本是凭证链路里的污染源，必须过滤。
- 凭证诊断只能用长度、尾号、短指纹，不能用明文。
