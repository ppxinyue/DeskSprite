const assert = require('node:assert/strict');
const test = require('node:test');
const { createDeferredWindowShowController, createPetVisibilityController } = require('./windowLifecycle.cjs');

function fakeWindow() {
  const calls = [];
  let destroyed = false;
  let visible = false;
  return {
    calls,
    isDestroyed: () => destroyed,
    isVisible: () => visible,
    destroy: () => { destroyed = true; },
    show: () => {
      calls.push('show');
      visible = true;
    },
    showInactive: () => {
      calls.push('showInactive');
      visible = true;
    },
    hide: () => {
      calls.push('hide');
      visible = false;
    },
    focus: () => calls.push('focus'),
    moveTop: () => calls.push('moveTop'),
  };
}

function fakeTimers() {
  const timers = [];
  return {
    timers,
    setTimeoutFn: (fn) => {
      timers.push(fn);
      return fn;
    },
    clearTimeoutFn: (fn) => {
      const index = timers.indexOf(fn);
      if (index >= 0) timers.splice(index, 1);
    },
    flushOne: () => {
      const fn = timers.shift();
      if (fn) fn();
    },
    flushAll: () => {
      while (timers.length > 0) timers.shift()();
    },
  };
}

test('settings/chat windows do not show until the renderer reports loaded settings', () => {
  const timers = fakeTimers();
  const controller = createDeferredWindowShowController(timers);
  const win = fakeWindow();

  controller.requestShow(win, { focus: true });

  assert.deepEqual(win.calls, []);
  assert.equal(controller.isReady(win), false);

  controller.markReady(win);
  assert.deepEqual(win.calls, []);

  timers.flushOne();
  assert.deepEqual(win.calls, ['show', 'focus']);
  assert.equal(controller.isReady(win), true);
});

test('settings/chat windows still show through the fallback if renderer ready never arrives', () => {
  const timers = fakeTimers();
  const controller = createDeferredWindowShowController(timers);
  const win = fakeWindow();

  controller.requestShow(win, { focus: true });
  timers.flushOne();

  assert.deepEqual(win.calls, ['show', 'focus']);
});

test('pet window never shows before the first stable layout is ready', () => {
  const controller = createPetVisibilityController();
  const win = fakeWindow();
  const calls = [];

  const shown = controller.requestShow(win, {
    requestLayout: () => calls.push('requestLayout'),
    applyTopmost: () => calls.push('topmost'),
  });

  assert.equal(shown, false);
  assert.deepEqual(win.calls, []);
  assert.deepEqual(calls, ['topmost', 'requestLayout']);
  assert.deepEqual(controller.getState(), { layoutReady: false, pendingShow: true });
});

test('pet window shows exactly once after layout ready and does not jump through a fallback', () => {
  const controller = createPetVisibilityController();
  const win = fakeWindow();
  const calls = [];

  controller.requestShow(win, {
    requestLayout: () => calls.push('requestLayout'),
    applyTopmost: () => calls.push('topmost'),
  });
  const firstReady = controller.markLayoutReady(win, {
    applyTopmost: () => calls.push('topmost'),
  });
  const secondReady = controller.markLayoutReady(win, {
    applyTopmost: () => calls.push('topmost'),
  });

  assert.equal(firstReady, true);
  assert.equal(secondReady, false);
  assert.deepEqual(win.calls, ['showInactive', 'moveTop']);
  assert.deepEqual(calls, ['topmost', 'requestLayout', 'topmost', 'topmost']);
  assert.deepEqual(controller.getState(), { layoutReady: true, pendingShow: false });
});

test('hiding pet cancels a pending initial show even if layout ready arrives later', () => {
  const controller = createPetVisibilityController();
  const win = fakeWindow();

  controller.requestShow(win, { requestLayout: () => {} });
  controller.hide(win);
  const shown = controller.markLayoutReady(win);

  assert.equal(shown, false);
  assert.deepEqual(win.calls, ['hide']);
  assert.deepEqual(controller.getState(), { layoutReady: true, pendingShow: false });
});

test('after pet layout is ready, manual show is immediate and stable', () => {
  const controller = createPetVisibilityController();
  const win = fakeWindow();
  const calls = [];

  controller.markLayoutReady(win);
  controller.hide(win);
  win.calls.length = 0;
  const shown = controller.requestShow(win, {
    requestLayout: () => calls.push('requestLayout'),
    applyTopmost: () => calls.push('topmost'),
  });

  assert.equal(shown, true);
  assert.deepEqual(calls, ['topmost', 'topmost']);
  assert.deepEqual(win.calls, ['showInactive', 'moveTop']);
});
