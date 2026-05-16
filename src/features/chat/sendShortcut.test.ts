import assert from 'node:assert/strict';
import test from 'node:test';
import { shouldSubmitMessage } from './sendShortcut.ts';

test('enter shortcut submits plain enter only', () => {
  assert.equal(shouldSubmitMessage({ key: 'Enter', shiftKey: false, metaKey: false, ctrlKey: false }, 'enter'), true);
  assert.equal(shouldSubmitMessage({ key: 'Enter', shiftKey: true, metaKey: false, ctrlKey: false }, 'enter'), false);
  assert.equal(shouldSubmitMessage({ key: 'Enter', shiftKey: false, metaKey: true, ctrlKey: false }, 'enter'), false);
});

test('mod-enter shortcut submits only modified enter', () => {
  assert.equal(shouldSubmitMessage({ key: 'Enter', shiftKey: false, metaKey: false, ctrlKey: false }, 'mod-enter'), false);
  assert.equal(shouldSubmitMessage({ key: 'Enter', shiftKey: false, metaKey: true, ctrlKey: false }, 'mod-enter'), true);
  assert.equal(shouldSubmitMessage({ key: 'Enter', shiftKey: false, metaKey: false, ctrlKey: true }, 'mod-enter'), true);
});

test('IME composition enter never submits', () => {
  assert.equal(shouldSubmitMessage({ key: 'Enter', shiftKey: false, metaKey: false, ctrlKey: false, isComposing: true }, 'enter'), false);
  assert.equal(shouldSubmitMessage({ key: 'Enter', shiftKey: false, metaKey: false, ctrlKey: false, nativeEvent: { isComposing: true } }, 'enter'), false);
  assert.equal(shouldSubmitMessage({ key: 'Enter', shiftKey: false, metaKey: false, ctrlKey: false, keyCode: 229 }, 'enter'), false);
  assert.equal(shouldSubmitMessage({ key: 'Enter', shiftKey: false, metaKey: true, ctrlKey: false, nativeEvent: { keyCode: 229 } }, 'mod-enter'), false);
});
