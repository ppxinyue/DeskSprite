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

  if (/\bfailed\b|turn\/completed failed|task_failed|command failed|non-zero exit/.test(haystack)) return 'failed';
  if (/\berror\b|exception|timeout|timed out/.test(haystack)) return 'error';
  if (/guardianwarning|guardian|blocked|forbidden|rejected/.test(haystack)) return 'guardian';
  if (/requestapproval|request_approval|approval_request|needs_approval|requires_approval|\bapproval\b|\bapprov/.test(haystack)) return 'approval';
  if (/request_user_input|ask_user|needs_input|requires_action|confirm|question|input required/.test(haystack)) return 'input';
  if (/permission|login|auth|signin|reauth|denied/.test(haystack)) return 'blocked';
  return '';
}

function describeProblem(method = '', payload = {}, raw = '') {
  const kind = classifyProblem(method, payload, raw);
  if (!kind) return '';
  const label = problemLabel(kind, method, payload);
  const question = extractQuestionText(payload);
  const command = extractCommandText(payload);
  const tool = extractToolName(payload);
  const detail = extractDetailText(payload);
  const choices = extractChoiceText(payload);

  const lines = [label];
  if (command) lines.push(`命令：${command}`);
  if (tool && (!command || tool !== command)) lines.push(`工具：${tool}`);
  if (question && question !== detail) lines.push(`内容：${question}`);
  if (detail && detail !== question) lines.push(`详情：${detail}`);
  if (choices) lines.push(`可选项：${choices}`);
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
  extractTextFromValue,
  resolveSessionStatus,
};
