export interface ScheduleKnowledge {
  calendar?: Array<{
    calendar?: string;
    title?: string;
    startsAt?: string;
    endsAt?: string;
    location?: string;
  }>;
  reminders?: Array<{
    list?: string;
    title?: string;
    dueAt?: string;
  }>;
  calendarStatus?: 'ok' | 'error';
  remindersStatus?: 'ok' | 'error';
  calendarError?: string;
  remindersError?: string;
  error?: string;
}

export interface ScheduleSources {
  calendar: boolean;
  reminders: boolean;
}

export interface SchedulePermissionResult {
  ok?: boolean;
  calendar?: { ok?: boolean };
  reminders?: { ok?: boolean };
}

const CALENDAR_TRIGGER = /(日历|日程|会议|安排|calendar|schedule|event|meeting)/i;
const REMINDERS_TRIGGER = /(待办|提醒|todo|task|reminder)/i;

export class SystemKnowledgePermissionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SystemKnowledgePermissionError';
  }
}

export function isSystemKnowledgePermissionError(error: unknown): error is SystemKnowledgePermissionError {
  return error instanceof SystemKnowledgePermissionError;
}

export function getRequestedScheduleSources(queryText: string): ScheduleSources {
  const wantsCalendar = CALENDAR_TRIGGER.test(queryText);
  const wantsReminders = REMINDERS_TRIGGER.test(queryText);
  return {
    calendar: wantsCalendar || !wantsReminders,
    reminders: wantsReminders,
  };
}

export function schedulePermissionErrorMessage(sources: ScheduleSources): string {
  if (sources.calendar && !sources.reminders) return '无法获取日历授权，请在设置中开启。';
  if (sources.reminders && !sources.calendar) return '无法获取提醒事项授权，请在设置中开启。';
  return '无法获取日历或提醒事项授权，请在设置中开启。';
}

export function createSchedulePermissionGate({
  requestPermissions,
  preparePermissionPrompt,
}: {
  requestPermissions: (sources: ScheduleSources) => Promise<SchedulePermissionResult>;
  preparePermissionPrompt?: () => Promise<void>;
}) {
  let requested = { calendar: false, reminders: false };
  let denied = { calendar: false, reminders: false };

  return {
    clear() {
      requested = { calendar: false, reminders: false };
      denied = { calendar: false, reminders: false };
    },

    async requestFromChat(sources: ScheduleSources): Promise<void> {
      if ((sources.calendar && denied.calendar) || (sources.reminders && denied.reminders)) {
        throw new SystemKnowledgePermissionError(schedulePermissionErrorMessage(sources));
      }

      const needsCalendarRequest = sources.calendar && !requested.calendar;
      const needsRemindersRequest = sources.reminders && !requested.reminders;
      if (!needsCalendarRequest && !needsRemindersRequest) return;

      requested = {
        calendar: requested.calendar || sources.calendar,
        reminders: requested.reminders || sources.reminders,
      };

      await preparePermissionPrompt?.();

      let result: SchedulePermissionResult;
      try {
        result = await requestPermissions(sources);
      } catch {
        denied = {
          calendar: denied.calendar || sources.calendar,
          reminders: denied.reminders || sources.reminders,
        };
        throw new SystemKnowledgePermissionError(schedulePermissionErrorMessage(sources));
      }

      const calendarDenied = sources.calendar && result?.calendar?.ok === false;
      const remindersDenied = sources.reminders && result?.reminders?.ok === false;
      const genericDenied = result && result.ok === false && !result.calendar && !result.reminders;
      if (calendarDenied || remindersDenied || genericDenied) {
        denied = {
          calendar: denied.calendar || calendarDenied || (sources.calendar && genericDenied),
          reminders: denied.reminders || remindersDenied || (sources.reminders && genericDenied),
        };
        throw new SystemKnowledgePermissionError(schedulePermissionErrorMessage(sources));
      }
    },
  };
}

export function formatScheduleKnowledge(schedule: ScheduleKnowledge | null, sources: ScheduleSources): string[] {
  if (!schedule) return [
    'Schedule integration status: unavailable. Do not claim to know the user calendar or reminders. Briefly say DeskCat could not read the schedule integration status.',
  ];
  const calendarStatus = schedule.calendarStatus || (schedule.calendarError ? 'error' : 'ok');
  const remindersStatus = schedule.remindersStatus || (schedule.remindersError ? 'error' : 'ok');
  const lines = [
    'Schedule: next 7 days calendar events and next 14 days incomplete reminders, including undated reminders.',
    sources.calendar ? `Calendar access: ${calendarStatus}.` : '',
    sources.reminders ? `Reminders access: ${remindersStatus}.` : '',
    'If access is ok and no items are listed, say no matching items were found. Do not say an ok source lacks access.',
  ].filter(Boolean);
  const calendar = (schedule.calendar || []).slice(0, 8);
  const reminders = (schedule.reminders || []).slice(0, 8);

  if (sources.calendar && calendarStatus === 'error') {
    lines.push(`Calendar access error: ${schedule.calendarError || schedule.error || 'unknown error'}.`);
  } else if (sources.calendar && calendar.length === 0) {
    lines.push('Calendar events: none found in the next 7 days.');
  } else if (sources.calendar && calendar.length > 0) {
    lines.push('Calendar events:');
    for (const item of calendar) {
      lines.push(`- ${item.title || 'Untitled'}; ${item.startsAt || 'unknown time'}${item.endsAt ? ` - ${item.endsAt}` : ''}${item.location ? `; location: ${item.location}` : ''}${item.calendar ? `; calendar: ${item.calendar}` : ''}`);
    }
  }

  if (sources.reminders && remindersStatus === 'error') {
    lines.push(`Reminders access error: ${schedule.remindersError || schedule.error || 'unknown error'}.`);
  } else if (sources.reminders && reminders.length === 0) {
    lines.push('Incomplete reminders: none found in the next 14 days or without a due date.');
  } else if (sources.reminders && reminders.length > 0) {
    lines.push('Incomplete reminders:');
    for (const item of reminders) {
      lines.push(`- ${item.title || 'Untitled'}; due: ${item.dueAt || 'undated'}${item.list ? `; list: ${item.list}` : ''}`);
    }
  }

  if (schedule.error && ((sources.calendar && calendarStatus === 'error') || (sources.reminders && remindersStatus === 'error'))) {
    lines.push(`Schedule access note: ${schedule.error}. Mention only the source marked error; continue using any source marked ok.`);
  }
  return lines;
}
