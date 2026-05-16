import assert from 'node:assert/strict';
import test from 'node:test';
import {
  decodeLocalApiKey,
  describeApiKey,
  encodeLocalApiKey,
  normalizeApiKeyText,
} from './apiKeyStorage.ts';

test('local legacy API key codec normalizes copied key text', () => {
  assert.equal(normalizeApiKeyText('  Bearer "sk-test 123"\u200B  '), 'sk-test123');
});

test('legacy API key encoding is reversible but not treated as secure storage', () => {
  const encoded = encodeLocalApiKey('sk-legacy-secret');

  assert.equal(encoded.includes('sk-legacy-secret'), false);
  assert.equal(decodeLocalApiKey(encoded), 'sk-legacy-secret');
});

test('secure key references are described without exposing stored key details', () => {
  assert.equal(describeApiKey('sk-should-not-be-described', 'api-key:123'), 'Key: 已保存于系统安全存储');
});
