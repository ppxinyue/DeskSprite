const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const {
  getWelcomePermissionPromptStatePath,
  hasSeenWelcomePermissionPrompt,
  markWelcomePermissionPromptSeen,
  readImageDataUrl,
} = require('./welcomePermissionPrompt.cjs');

test('welcome permission prompt state is persisted in userData', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'deskcat-welcome-'));

  assert.equal(hasSeenWelcomePermissionPrompt(dir), false);
  markWelcomePermissionPromptSeen(dir, 1234);
  assert.equal(hasSeenWelcomePermissionPrompt(dir), true);

  const persisted = JSON.parse(fs.readFileSync(getWelcomePermissionPromptStatePath(dir), 'utf8'));
  assert.deepEqual(persisted, { seen: true, version: 1, seenAt: 1234 });
});

test('welcome permission prompt image data URL is embedded from file bytes', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'deskcat-icon-'));
  const filePath = path.join(dir, 'icon.png');
  fs.writeFileSync(filePath, Buffer.from([1, 2, 3, 4]));

  assert.equal(readImageDataUrl(filePath, () => 'image/png'), 'data:image/png;base64,AQIDBA==');
  assert.equal(readImageDataUrl(path.join(dir, 'missing.png'), () => 'image/png'), '');
});
