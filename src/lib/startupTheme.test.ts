import assert from 'node:assert/strict';
import test from 'node:test';
import { getThemeClassAction, readStoredThemeFromRawStore, resolveInitialTheme, shouldDeferWindowContent } from './startupTheme.ts';

test('keeps pre-painted dark class untouched until persisted settings are loaded', () => {
  assert.equal(getThemeClassAction({ loaded: false, theme: 'system', prefersDark: false }), 'defer');
  assert.equal(getThemeClassAction({ loaded: false, theme: 'light', prefersDark: false }), 'defer');
  assert.equal(getThemeClassAction({ loaded: false, theme: 'dark', prefersDark: false }), 'defer');
});

test('applies persisted dark theme even when the macOS system theme is light', () => {
  assert.equal(getThemeClassAction({ loaded: true, theme: 'dark', prefersDark: false }), 'add-dark');
});

test('removes dark only after loaded settings explicitly resolve to light', () => {
  assert.equal(getThemeClassAction({ loaded: true, theme: 'light', prefersDark: true }), 'remove-dark');
  assert.equal(getThemeClassAction({ loaded: true, theme: 'system', prefersDark: false }), 'remove-dark');
});

test('resolves system theme from the current media query only after loading', () => {
  assert.equal(resolveInitialTheme('system', true), true);
  assert.equal(resolveInitialTheme('system', false), false);
  assert.equal(resolveInitialTheme('dark', false), true);
  assert.equal(resolveInitialTheme('light', true), false);
});

test('reads both JSON encoded and legacy raw theme values from the local store', () => {
  assert.equal(readStoredThemeFromRawStore(JSON.stringify({ settings: { theme: JSON.stringify('dark') } })), 'dark');
  assert.equal(readStoredThemeFromRawStore(JSON.stringify({ settings: { theme: 'dark' } })), 'dark');
  assert.equal(readStoredThemeFromRawStore(JSON.stringify({ settings: { theme: JSON.stringify('light') } })), 'light');
  assert.equal(readStoredThemeFromRawStore(JSON.stringify({ settings: { theme: JSON.stringify('system') } })), 'system');
  assert.equal(readStoredThemeFromRawStore(JSON.stringify({ settings: { theme: JSON.stringify('invalid') } })), 'system');
  assert.equal(readStoredThemeFromRawStore('{broken'), 'system');
});

test('defers opaque shell window content until settings are loaded', () => {
  assert.equal(shouldDeferWindowContent('settings', false), true);
  assert.equal(shouldDeferWindowContent('chat', false), true);
  assert.equal(shouldDeferWindowContent('settings', true), false);
  assert.equal(shouldDeferWindowContent('pet', false), false);
  assert.equal(shouldDeferWindowContent('compact-chat', false), false);
});
