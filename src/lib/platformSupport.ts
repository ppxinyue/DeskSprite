export interface AccessibilityPermissionState {
  supported: boolean;
  trusted: boolean;
}

export function supportsForegroundActivityPlatform(platform = '', userAgent = '') {
  const text = `${platform || ''} ${userAgent || ''}`.toLowerCase();
  if (!text.trim()) return true;
  return text.includes('mac') || text.includes('win');
}

export function shouldRequestAccessibilityPermission(
  permission: AccessibilityPermissionState | null | undefined,
  requestedBefore: boolean,
) {
  return Boolean(permission?.supported !== false && !permission?.trusted && !requestedBefore);
}

export function shouldWaitForExistingAccessibilityPermission(
  permission: AccessibilityPermissionState | null | undefined,
  requestedBefore: boolean,
) {
  return Boolean(permission?.supported !== false && !permission?.trusted && requestedBefore);
}
