const assert = require('node:assert/strict');
const test = require('node:test');
const {
  describeCodexNotice,
  describeCodexRequest,
  describeCodexSessionProblemEvent,
  describeNoOutput,
  isBlockingProblemText,
  resolveSessionStatus,
} = require('./codingStatus.cjs');

test('describeCodexRequest includes the command and question for approvals', () => {
  const message = describeCodexRequest('requestApproval', {
    command: 'git push origin codex-electron-rewrite',
    question: 'Allow network access for git push?',
    options: ['Approve', 'Deny'],
  });

  assert.match(message, /需要批准/);
  assert.match(message, /git push origin codex-electron-rewrite/);
  assert.match(message, /Allow network access/);
  assert.match(message, /Approve \/ Deny/);
});

test('describeCodexSessionProblemEvent keeps pending approval details red-worthy', () => {
  const message = describeCodexSessionProblemEvent('response_item', {
    type: 'request_approval',
    tool: 'exec_command',
    command: 'git apply --cached .codex-ime-debug.patch',
    question: '需要把精确的 compact chat IME debug hunk 暂存到 git index',
    reason: 'require_escalated',
    options: ['是', '否'],
  });

  assert.match(message, /需要批准/);
  assert.match(message, /git apply --cached \.codex-ime-debug\.patch/);
  assert.match(message, /compact chat IME debug hunk/);
  assert.match(message, /是 \/ 否/);
});

test('describeCodexNotice includes detailed failure context for errors', () => {
  const message = describeCodexNotice('error', {
    message: 'Command failed with exit code 1',
    detail: 'stderr: permission denied',
    command: 'npm publish',
  });

  assert.match(message, /出现错误|执行失败/);
  assert.match(message, /npm publish/);
  assert.match(message, /permission denied/);
});

test('describeCodexSessionProblemEvent treats failed events as actionable and keeps detail', () => {
  const message = describeCodexSessionProblemEvent('event_msg', {
    type: 'task_failed',
    error: { message: 'Python tests failed' },
    reason: 'Exit code 1',
  }, '{"type":"task_failed"}');

  assert.match(message, /执行失败|出现错误/);
  assert.match(message, /Python tests failed/);
  assert.match(message, /Exit code 1/);
});

test('model capacity, interrupted, and permission text are blocking red states', () => {
  assert.equal(isBlockingProblemText('model at capacity'), true);
  assert.equal(isBlockingProblemText('turn interrupted by model provider'), true);
  assert.equal(isBlockingProblemText('permission approval required before running command'), true);
  assert.equal(isBlockingProblemText('system/api_retry reconnecting'), false);
  assert.equal(isBlockingProblemText('{"max_output_tokens":20000}'), false);
});

test('session problem descriptions include explicit error codes', () => {
  const message = describeCodexSessionProblemEvent('event_msg', {
    type: 'error',
    error: { code: 'rate_limit_exceeded', message: 'Model is at capacity' },
  });

  assert.match(message, /出现错误/);
  assert.match(message, /rate_limit_exceeded/);
  assert.match(message, /Model is at capacity/);
});

test('describeNoOutput explains stalled coding work', () => {
  assert.match(describeNoOutput('Codex', 5 * 60_000), /Codex 已经 5 分钟没有新的输出/);
});

test('resolveSessionStatus clears needs-input once later work arrives', () => {
  const status = resolveSessionStatus({
    lastProblemAt: 100,
    lastWorkAt: 120,
    lastAssistantAt: 0,
    lastUserAt: 0,
  });

  assert.equal(status, 'working');
});

test('resolveSessionStatus stays needs-input when the problem is still the latest event', () => {
  const status = resolveSessionStatus({
    lastProblemAt: 140,
    lastWorkAt: 120,
    lastAssistantAt: 0,
    lastUserAt: 0,
  });

  assert.equal(status, 'needs-input');
});

test('resolveSessionStatus keeps a completed turn done after later idle time', () => {
  const status = resolveSessionStatus({
    lastUserAt: 100,
    lastWorkAt: 180,
    lastAssistantAt: 220,
    lastProblemAt: 0,
  });

  assert.equal(status, 'done');
});

test('resolveSessionStatus treats new user input after done as working', () => {
  const status = resolveSessionStatus({
    lastUserAt: 260,
    lastWorkAt: 180,
    lastAssistantAt: 220,
    lastProblemAt: 0,
  });

  assert.equal(status, 'working');
});
