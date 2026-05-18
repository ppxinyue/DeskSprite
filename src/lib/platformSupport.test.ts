import assert from 'node:assert/strict';
import test from 'node:test';
import {
  shouldRequestAccessibilityPermission,
  shouldWaitForExistingAccessibilityPermission,
  supportsForegroundActivityPlatform,
} from './platformSupport.ts';

test('foreground activity sampling is enabled on macOS and Windows', () => {
  assert.equal(supportsForegroundActivityPlatform('MacIntel', ''), true);
  assert.equal(supportsForegroundActivityPlatform('Win32', ''), true);
  assert.equal(supportsForegroundActivityPlatform('', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'), true);
});

test('foreground activity sampling remains disabled on unrelated browser platforms', () => {
  assert.equal(supportsForegroundActivityPlatform('Linux x86_64', ''), false);
  assert.equal(supportsForegroundActivityPlatform('', 'Mozilla/5.0 (X11; Linux x86_64)'), false);
});

test('unknown platform defaults to enabled for embedded shells', () => {
  assert.equal(supportsForegroundActivityPlatform('', ''), true);
});

test('macOS accessibility permission can be requested once then waited on', () => {
  const missingPermission = { supported: true, trusted: false };

  assert.equal(shouldRequestAccessibilityPermission(missingPermission, false), true);
  assert.equal(shouldWaitForExistingAccessibilityPermission(missingPermission, false), false);
  assert.equal(shouldRequestAccessibilityPermission(missingPermission, true), false);
  assert.equal(shouldWaitForExistingAccessibilityPermission(missingPermission, true), true);
});

test('unsupported accessibility permission does not block Windows timeline sampling', () => {
  const unsupported = { supported: false, trusted: false };

  assert.equal(shouldRequestAccessibilityPermission(unsupported, false), false);
  assert.equal(shouldWaitForExistingAccessibilityPermission(unsupported, true), false);
});

test('trusted accessibility permission does not request or wait', () => {
  const trusted = { supported: true, trusted: true };

  assert.equal(shouldRequestAccessibilityPermission(trusted, false), false);
  assert.equal(shouldWaitForExistingAccessibilityPermission(trusted, true), false);
});
