const fs = require('node:fs');
const path = require('node:path');

const WELCOME_PERMISSION_PROMPT_STATE_FILE = 'welcome-permissions-v1.json';

function getWelcomePermissionPromptStatePath(userDataPath) {
  return path.join(userDataPath, WELCOME_PERMISSION_PROMPT_STATE_FILE);
}

function hasSeenWelcomePermissionPrompt(userDataPath) {
  try {
    const raw = fs.readFileSync(getWelcomePermissionPromptStatePath(userDataPath), 'utf8');
    const parsed = JSON.parse(raw);
    return parsed?.seen === true;
  } catch {
    return false;
  }
}

function markWelcomePermissionPromptSeen(userDataPath, now = Date.now()) {
  fs.mkdirSync(userDataPath, { recursive: true });
  fs.writeFileSync(
    getWelcomePermissionPromptStatePath(userDataPath),
    JSON.stringify({ seen: true, version: 1, seenAt: now }, null, 2),
  );
}

function readImageDataUrl(filePath, mimeForPath) {
  try {
    const bytes = fs.readFileSync(filePath);
    return `data:${mimeForPath(filePath)};base64,${bytes.toString('base64')}`;
  } catch {
    return '';
  }
}

module.exports = {
  getWelcomePermissionPromptStatePath,
  hasSeenWelcomePermissionPrompt,
  markWelcomePermissionPromptSeen,
  readImageDataUrl,
};
