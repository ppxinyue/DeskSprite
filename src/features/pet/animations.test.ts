import assert from 'node:assert/strict';
import test from 'node:test';
import { DEFAULT_MEDIA_CONFIG, getPetFrameSources, isGifAsset, normalizePetMediaConfig } from './animations.ts';

test('preserves disabled built-in image assets after normalization', () => {
  const disabledPath = DEFAULT_MEDIA_CONFIG.idle.defaultAssets[0];
  const customPath = '/Users/test/custom-cat.png';
  const config = normalizePetMediaConfig('idle', {
    ...DEFAULT_MEDIA_CONFIG.idle,
    mediaMode: 'image',
    userFrames: [customPath],
    disabledFrames: [disabledPath],
  });

  assert.deepEqual(config.disabledFrames, [disabledPath]);
  assert.deepEqual(getPetFrameSources(config, [customPath], []), [
    ...DEFAULT_MEDIA_CONFIG.idle.defaultAssets.slice(1),
    customPath,
  ]);
});

test('preserves disabled built-in gif assets after normalization', () => {
  const disabledPath = DEFAULT_MEDIA_CONFIG.rest.defaultGifAssets[0];
  const customPath = '/Users/test/custom-rest.gif';
  const config = normalizePetMediaConfig('rest', {
    ...DEFAULT_MEDIA_CONFIG.rest,
    userGifs: [customPath],
    disabledGifs: [disabledPath],
  });

  assert.equal(config.disabledGifs?.includes(disabledPath), true);
  assert.equal(getPetFrameSources(config, [], [customPath]).includes(disabledPath), false);
});

test('treats built-in animated webp assets like gif assets', () => {
  assert.equal(isGifAsset('assets/idle/gif/grooming.webp'), true);
  assert.equal(isGifAsset('/Users/test/static.png'), false);
});
