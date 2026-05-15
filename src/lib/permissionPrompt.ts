import { invoke } from '@tauri-apps/api/core';
import { DEFAULT_MEDIA_CONFIG, getPetFrameSources } from '@/features/pet/animations';
import { usePetStore } from '@/features/pet/petStore';

let activePrompt: Promise<boolean> | null = null;

function isChineseLocale() {
  return /^zh\b/i.test(navigator.language || '');
}

function chooseText(zh: string, en?: string) {
  return isChineseLocale() || !en ? zh : en;
}

function getCurrentPetIconPath() {
  const { petState, mediaConfig, userFrames, userGifs } = usePetStore.getState();
  const state = petState || 'idle';
  const config = mediaConfig[state] ?? DEFAULT_MEDIA_CONFIG[state] ?? DEFAULT_MEDIA_CONFIG.idle;
  return getPetFrameSources(config, userFrames[state], userGifs[state])[0] ?? DEFAULT_MEDIA_CONFIG.idle.defaultAssets[0];
}

export function showPermissionPrompt({
  title,
  titleEn,
  feature,
  featureEn,
  confirmLabel,
  cancelLabel,
}: {
  title: string;
  titleEn?: string;
  feature: string;
  featureEn?: string;
  confirmLabel?: string;
  cancelLabel?: string;
}): Promise<boolean> {
  if (typeof document === 'undefined') return Promise.resolve(true);
  if (activePrompt) return activePrompt;

  activePrompt = new Promise<boolean>(async (resolve) => {
    const displayTitle = chooseText(title, titleEn);
    const displayFeature = chooseText(feature, featureEn);
    const displayConfirmLabel = confirmLabel ?? chooseText('继续', 'Continue');
    const displayCancelLabel = cancelLabel ?? chooseText('取消', 'Cancel');
    const privacyText = chooseText(
      '只在相关功能中读取必要信息；默认本地存储，云端备份均作加密处理。',
      'Only needed data is read for this feature. Local by default; cloud backups are encrypted.',
    );
    if (window.deskCat) {
      const accepted = await invoke<boolean>('show_permission_prompt_overlay', {
        title: displayTitle,
        feature: displayFeature,
        privacy: privacyText,
        confirmLabel: displayConfirmLabel,
        cancelLabel: displayCancelLabel,
        iconPath: getCurrentPetIconPath(),
      }).catch(() => null);
      if (typeof accepted === 'boolean') {
        activePrompt = null;
        resolve(accepted);
        return;
      }
    }

    activePrompt = null;
    resolve(window.confirm(`${displayTitle}\n\n${displayFeature}\n\n${privacyText}`));
  });

  return activePrompt;
}

export async function setCurrentPetAsAppIcon() {
  await invoke('set_app_icon', { path: getCurrentPetIconPath() }).catch(() => {});
}
