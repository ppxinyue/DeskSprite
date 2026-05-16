import assert from 'node:assert/strict';
import test from 'node:test';
import {
  CONTEXT_MENU_ACTION_DEDUPE_MS,
  shouldActivateContextMenuAction,
  shouldRunContextMenuAction,
} from './contextMenuAction.ts';

test('context menu actions activate only for enabled primary pointer events', () => {
  assert.equal(shouldActivateContextMenuAction(), true);
  assert.equal(shouldActivateContextMenuAction({ button: 0 }), true);
  assert.equal(shouldActivateContextMenuAction({ button: 2 }), false);
  assert.equal(shouldActivateContextMenuAction({ currentTarget: { disabled: true } }), false);
});

test('context menu action dedupe suppresses pointerdown and click double fire', () => {
  const last = { action: 'hide', at: 1000 };

  assert.equal(shouldRunContextMenuAction(null, 'hide', 1000), true);
  assert.equal(shouldRunContextMenuAction(last, 'hide', 1000 + CONTEXT_MENU_ACTION_DEDUPE_MS - 1), false);
  assert.equal(shouldRunContextMenuAction(last, 'hide', 1000 + CONTEXT_MENU_ACTION_DEDUPE_MS), true);
  assert.equal(shouldRunContextMenuAction(last, 'settings', 1001), true);
});
