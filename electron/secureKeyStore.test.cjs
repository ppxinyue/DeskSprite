const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { createSecureKeyStore, getSecureKeyStorePath } = require('./secureKeyStore.cjs');

function mockSafeStorage(available = true) {
  return {
    isEncryptionAvailable: () => available,
    encryptString: (value) => Buffer.from(`encrypted:${value}`, 'utf8'),
    decryptString: (buffer) => Buffer.from(buffer).toString('utf8').replace(/^encrypted:/, ''),
  };
}

test('secure key store encrypts keys before writing them to disk', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'deskcat-secure-'));
  const store = createSecureKeyStore({ userDataPath: dir, safeStorage: mockSafeStorage(), now: () => 1234 });

  store.save('api:1', 'sk-secret-value');

  assert.equal(store.get('api:1'), 'sk-secret-value');
  const raw = fs.readFileSync(getSecureKeyStorePath(dir), 'utf8');
  assert.equal(raw.includes('sk-secret-value'), false);
  assert.equal(raw.includes(Buffer.from('encrypted:sk-secret-value').toString('base64')), true);
});

test('secure key store can delete references without exposing other keys', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'deskcat-secure-'));
  const store = createSecureKeyStore({ userDataPath: dir, safeStorage: mockSafeStorage() });

  store.save('api:1', 'sk-one');
  store.save('api:2', 'sk-two');
  store.remove('api:1');

  assert.equal(store.get('api:1'), '');
  assert.equal(store.get('api:2'), 'sk-two');
});

test('secure key store fails closed when OS encryption is unavailable', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'deskcat-secure-'));
  const store = createSecureKeyStore({ userDataPath: dir, safeStorage: mockSafeStorage(false) });

  assert.throws(() => store.save('api:1', 'sk-secret'), /安全存储不可用/);
  assert.throws(() => store.get('api:1'), /安全存储不可用/);
});
