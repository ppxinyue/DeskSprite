function extractTextFromValue(value) {
  if (typeof value === 'string') return value.trim();
  if (Array.isArray(value)) {
    return value
      .map((part) => extractTextFromValue(part?.text ?? part?.content ?? part?.output_text ?? part))
      .filter(Boolean)
      .join('')
      .trim();
  }
  if (value && typeof value === 'object') {
    return extractTextFromValue(
      value.text
      ?? value.content
      ?? value.output_text
      ?? value.summary_text
      ?? value.message
      ?? value.error
      ?? value.detail
      ?? value.reason
      ?? value.cause,
    );
  }
  return '';
}

function compactMessage(text, fallback = '', maxLength = 2400) {
  const normalized = String(text || '')
    .replace(/\s+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  if (!normalized) return fallback;
  return normalized.length > maxLength ? `${normalized.slice(0, maxLength).trim()}...` : normalized;
}

function textList(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => extractTextFromValue(item))
    .map((item) => item.trim())
    .filter(Boolean);
}

function uniqueNonEmpty(values) {
  return Array.from(new Set(values.filter(Boolean).map((value) => String(value).trim()).filter(Boolean)));
}

function extractCommandText(payload = {}) {
  return compactMessage(
    extractTextFromValue(payload.command)
      || extractTextFromValue(payload.cmd)
      || extractTextFromValue(payload.parsed_cmd)
      || extractTextFromValue(payload.arguments)
      || extractTextFromValue(payload.argv)
      || '',
    '',
    360,
  );
}

function extractQuestionText(payload = {}) {
  return compactMessage(
    extractTextFromValue(payload.question)
      || extractTextFromValue(payload.prompt)
      || extractTextFromValue(payload.description)
      || extractTextFromValue(payload.instruction)
      || extractTextFromValue(payload.message)
      || extractTextFromValue(payload.detail)
      || extractTextFromValue(payload.reason)
      || extractTextFromValue(payload.cause)
      || '',
    '',
    600,
  );
}

function extractDetailText(payload = {}) {
  return compactMessage(
    extractTextFromValue(payload.error)
      || extractTextFromValue(payload.detail)
      || extractTextFromValue(payload.reason)
      || extractTextFromValue(payload.cause)
      || extractTextFromValue(payload.message)
      || '',
    '',
    800,
  );
}

function extractCodeText(payload = {}) {
  return compactMessage(
    extractTextFromValue(payload.code)
      || extractTextFromValue(payload.statusCode)
      || extractTextFromValue(payload.status_code)
      || extractTextFromValue(payload.error?.code)
      || extractTextFromValue(payload.error?.status)
      || '',
    '',
    180,
  );
}

function extractToolName(payload = {}) {
  return compactMessage(
    extractTextFromValue(payload.tool)
      || extractTextFromValue(payload.tool_name)
      || extractTextFromValue(payload.name)
      || extractTextFromValue(payload.function)
      || extractTextFromValue(payload.method)
      || '',
    '',
    160,
  );
}

function extractChoiceText(payload = {}) {
  const choices = uniqueNonEmpty([
    ...textList(payload.options),
    ...textList(payload.choices),
    ...textList(payload.buttons),
    ...textList(payload.actions),
  ]);
  return compactMessage(choices.slice(0, 5).join(' / '), '', 240);
}

function problemLabel(kind, method = '', payload = {}) {
  const normalizedMethod = String(method || '').toLowerCase();
  if (kind === 'approval') return '需要批准';
  if (kind === 'input') return '需要输入或确认';
  if (kind === 'guardian') return '需要处理安全确认';
  if (kind === 'blocked') return '请求被阻止';
  if (kind === 'failed') {
    const command = extractCommandText(payload);
    return command ? '命令执行失败' : '执行失败';
  }
  if (kind === 'error') {
    if (/login|auth|reauth|signin/i.test(normalizedMethod)) return '需要重新登录';
    return '出现错误';
  }
  return '需要处理';
}

function classifyProblem(method = '', payload = {}, raw = '') {
  const structured = [
    method,
    payload?.type,
    payload?.subtype,
    payload?.status,
    payload?.name,
    payload?.method,
    payload?.code,
    payload?.reason,
    payload?.error?.code,
  ].filter(Boolean).join(' ').toLowerCase();
  const text = [
    extractQuestionText(payload),
    extractDetailText(payload),
    typeof raw === 'string' ? raw : '',
  ].filter(Boolean).join(' ').toLowerCase();
  const haystack = `${structured} ${text}`;

  if (/\bfailed\b|turn\/completed failed|task_failed|command failed|non-zero exit|interrupted|interrupt|cancelled|canceled|aborted/.test(haystack)) return 'failed';
  if (/model (?:is )?at capa(?:c|t)ity|capacity|usage limit|rate limit|rate_limit|quota|too many requests|\b429\b|\b529\b|overloaded|temporarily unavailable|server_error|internal server error|maximum output tokens|max output tokens|context length|context_length_exceeded/.test(haystack)) return 'error';
  if (/\berror\b|exception|timeout|timed out/.test(haystack)) return 'error';
  if (/guardianwarning|guardian|blocked|forbidden|rejected/.test(haystack)) return 'guardian';
  if (/requestapproval|request_approval|approval_request|needs_approval|requires_approval|\bapproval\b|\bapprov/.test(haystack)) return 'approval';
  if (/request_user_input|ask_user|needs_input|requires_action|confirm|question|input required/.test(haystack)) return 'input';
  if (/permission|login|auth|signin|reauth|denied/.test(haystack)) return 'blocked';
  return '';
}

function isBlockingProblemText(value = '') {
  const text = extractTextFromValue(value) || String(value || '');
  return Boolean(classifyProblem('', { message: text }, text));
}

function isTransientProgressText(value = '') {
  const text = String(value || '');
  return /Reconnecting|Falling back|retrying sampling request|system\/api_retry/i.test(text)
    && !isBlockingProblemText(text);
}

function describeNoOutput(providerLabel = 'Coding agent', elapsedMs = 0) {
  const minutes = Math.max(1, Math.floor(elapsedMs / 60_000));
  return `${providerLabel} 已经 ${minutes} 分钟没有新的输出，可能卡在模型容量、网络、权限或后台进程上。请检查终端/账号状态，或重新发起任务。`;
}

function describeProblem(method = '', payload = {}, raw = '') {
  const kind = classifyProblem(method, payload, raw);
  if (!kind) return '';
  const label = problemLabel(kind, method, payload);
  const question = extractQuestionText(payload);
  const command = extractCommandText(payload);
  const tool = extractToolName(payload);
  const detail = extractDetailText(payload);
  const code = extractCodeText(payload);
  const choices = extractChoiceText(payload);

  const lines = [label];
  if (command) lines.push(`命令：${command}`);
  if (tool && (!command || tool !== command)) lines.push(`工具：${tool}`);
  if (code) lines.push(`代码：${code}`);
  if (question && question !== detail) lines.push(`内容：${question}`);
  if (detail && detail !== question) lines.push(`详情：${detail}`);
  if (choices) lines.push(`可选项：${choices}`);
  if (lines.length === 1 && typeof raw === 'string' && raw.trim()) {
    lines.push(`详情：${compactMessage(raw, '', 800)}`);
  }
  return compactMessage(lines.join('\n'), label, 1800);
}

function describeCodexRequest(method = '', params = {}) {
  return describeProblem(method, params, method) || `需要处理：${method || 'request'}`;
}

function describeCodexNotice(method = '', params = {}) {
  return describeProblem(method, params, method);
}

function describeCodexSessionProblemEvent(type = '', payload = {}, raw = '') {
  return describeProblem(type, payload, raw);
}

function resolveSessionStatus({ lastUserAt = 0, lastWorkAt = 0, lastAssistantAt = 0, lastProblemAt = 0 } = {}) {
  if (lastProblemAt && lastProblemAt >= lastAssistantAt && lastProblemAt >= lastUserAt && lastProblemAt >= lastWorkAt) {
    return 'needs-input';
  }
  if (lastAssistantAt && lastAssistantAt >= lastUserAt && lastAssistantAt >= lastWorkAt && lastAssistantAt >= lastProblemAt) {
    return 'done';
  }
  return 'working';
}

module.exports = {
  compactMessage,
  describeCodexNotice,
  describeCodexRequest,
  describeCodexSessionProblemEvent,
  describeNoOutput,
  extractTextFromValue,
  isBlockingProblemText,
  isTransientProgressText,
  resolveSessionStatus,
};
