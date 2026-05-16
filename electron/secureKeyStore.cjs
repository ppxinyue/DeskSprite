const fs = require('node:fs');
const path = require('node:path');

const SECURE_KEY_STORE_FILE = 'secure-api-keys-v1.json';

function getSecureKeyStorePath(userDataPath) {
  return path.join(userDataPath, SECURE_KEY_STORE_FILE);
}

function createSecureKeyStore({ userDataPath, safeStorage, now = () => Date.now() }) {
  if (!userDataPath) throw new Error('Missing userData path.');

  const storePath = getSecureKeyStorePath(userDataPath);

  function assertAvailable() {
    if (!safeStorage?.isEncryptionAvailable?.()) {
      throw new Error('系统安全存储不可用，请确认当前系统账户支持 Keychain/DPAPI/Secret Service。');
    }
  }

  function readStore() {
    try {
      const raw = fs.readFileSync(storePath, 'utf8');
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' && parsed.keys && typeof parsed.keys === 'object'
        ? parsed
        : { version: 1, keys: {} };
    } catch {
      return { version: 1, keys: {} };
    }
  }

  function writeStore(store) {
    fs.mkdirSync(userDataPath, { recursive: true });
    fs.writeFileSync(storePath, JSON.stringify(store, null, 2), { mode: 0o600 });
  }

  function save(ref, secret) {
    assertAvailable();
    const keyringRef = String(ref || '').trim();
    if (!keyringRef) throw new Error('Missing key reference.');
    const value = String(secret || '');
    if (!value.trim()) throw new Error('API Key 为空。');
    const encrypted = safeStorage.encryptString(value);
    const store = readStore();
    store.keys[keyringRef] = {
      encoding: 'base64',
      ciphertext: Buffer.from(encrypted).toString('base64'),
      updatedAt: now(),
    };
    writeStore(store);
  }

  function get(ref) {
    assertAvailable();
    const keyringRef = String(ref || '').trim();
    if (!keyringRef) return '';
    const record = readStore().keys[keyringRef];
    if (!record?.ciphertext) return '';
    const encrypted = Buffer.from(String(record.ciphertext), record.encoding === 'base64' ? 'base64' : 'utf8');
    return safeStorage.decryptString(encrypted);
  }

  function remove(ref) {
    const keyringRef = String(ref || '').trim();
    if (!keyringRef) return;
    const store = readStore();
    if (!store.keys[keyringRef]) return;
    delete store.keys[keyringRef];
    writeStore(store);
  }

  function has(ref) {
    const keyringRef = String(ref || '').trim();
    if (!keyringRef) return false;
    return Boolean(readStore().keys[keyringRef]);
  }

  return {
    path: storePath,
    isAvailable: () => Boolean(safeStorage?.isEncryptionAvailable?.()),
    save,
    get,
    remove,
    has,
  };
}

module.exports = {
  createSecureKeyStore,
  getSecureKeyStorePath,
};
