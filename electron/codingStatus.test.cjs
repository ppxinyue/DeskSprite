const assert = require('node:assert/strict');
const test = require('node:test');
const {
  describeCodexNotice,
  describeCodexRequest,
  describeCodexSessionProblemEvent,
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
