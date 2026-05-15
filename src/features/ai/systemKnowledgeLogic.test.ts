import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createSchedulePermissionGate,
  formatScheduleKnowledge,
  getRequestedScheduleSources,
  isSystemKnowledgePermissionError,
} from './systemKnowledgeLogic.ts';

test('detects calendar, reminders, and default schedule sources from user text', () => {
  assert.deepEqual(getRequestedScheduleSources('今天有什么会议'), { calendar: true, reminders: false });
  assert.deepEqual(getRequestedScheduleSources('我的待办和提醒有哪些'), { calendar: false, reminders: true });
  assert.deepEqual(getRequestedScheduleSources('今天的日程和 todo 都说一下'), { calendar: true, reminders: true });
});

test('does not re-prompt after one successful chat permission request for the same source', async () => {
  const requested: Array<{ calendar: boolean; reminders: boolean }> = [];
  const gate = createSchedulePermissionGate({
    requestPermissions: async (sources) => {
      requested.push(sources);
      return { ok: true, calendar: { ok: true }, reminders: { ok: true } };
    },
  });

  await gate.requestFromChat({ calendar: true, reminders: false });
  await gate.requestFromChat({ calendar: true, reminders: false });

  assert.deepEqual(requested, [{ calendar: true, reminders: false }]);
});

test('keeps denied chat permissions blocked until settings authorization clears the cache', async () => {
  let grant = false;
  const requested: Array<{ calendar: boolean; reminders: boolean }> = [];
  const gate = createSchedulePermissionGate({
    requestPermissions: async (sources) => {
      requested.push(sources);
      return grant
        ? { ok: true, calendar: { ok: true }, reminders: { ok: true } }
        : { ok: false, calendar: { ok: false }, reminders: { ok: false } };
    },
  });

  await assert.rejects(
    () => gate.requestFromChat({ calendar: true, reminders: true }),
    (error) => isSystemKnowledgePermissionError(error) && /日历或提醒事项/.test(error.message),
  );

  grant = true;
  await assert.rejects(
    () => gate.requestFromChat({ calendar: true, reminders: true }),
    (error) => isSystemKnowledgePermissionError(error) && /日历或提醒事项/.test(error.message),
  );

  gate.clear();
  await gate.requestFromChat({ calendar: true, reminders: true });

  assert.deepEqual(requested, [
    { calendar: true, reminders: true },
    { calendar: true, reminders: true },
  ]);
});

test('formats authorized schedule data as usable model context instead of reporting missing access', () => {
  const lines = formatScheduleKnowledge({
    calendarStatus: 'ok',
    remindersStatus: 'ok',
    calendar: [{
      title: 'Design review',
      startsAt: '2026-05-15T10:00:00+08:00',
      endsAt: '2026-05-15T10:30:00+08:00',
      calendar: 'Work',
    }],
    reminders: [{
      title: 'Submit receipt',
      dueAt: '2026-05-16',
      list: 'DeskCat',
    }],
  }, { calendar: true, reminders: true });

  assert.match(lines.join('\n'), /Calendar access: ok/);
  assert.match(lines.join('\n'), /Reminders access: ok/);
  assert.match(lines.join('\n'), /Design review/);
  assert.match(lines.join('\n'), /Submit receipt/);
  assert.doesNotMatch(lines.join('\n'), /inaccessible|unavailable|could not read/i);
});

test('preserves partial data when only one authorized source fails', () => {
  const lines = formatScheduleKnowledge({
    calendarStatus: 'ok',
    remindersStatus: 'error',
    remindersError: 'permission denied',
    calendar: [{ title: 'Standup', startsAt: '2026-05-15T09:00:00+08:00' }],
    reminders: [],
    error: 'Reminders: permission denied',
  }, { calendar: true, reminders: true });

  const text = lines.join('\n');
  assert.match(text, /Calendar access: ok/);
  assert.match(text, /Standup/);
  assert.match(text, /Reminders access error: permission denied/);
});
