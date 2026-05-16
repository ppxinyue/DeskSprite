import assert from 'node:assert/strict';
import test from 'node:test';
import {
  isDroppedChatImagePayload,
  parseDroppedChatImage,
  serializeDroppedChatImage,
} from './dropImageHandoff.ts';

test('dropped chat image handoff accepts only image data URLs', () => {
  assert.equal(isDroppedChatImagePayload({ kind: 'image', dataUrl: 'data:image/png;base64,abc' }), true);
  assert.equal(isDroppedChatImagePayload({ kind: 'document', dataUrl: 'data:image/png;base64,abc' }), false);
  assert.equal(isDroppedChatImagePayload({ kind: 'image', dataUrl: 'file:///tmp/cat.png' }), false);
});

test('dropped chat image handoff serializes a safe compact payload', () => {
  const raw = serializeDroppedChatImage({
    path: '/tmp/cat.png',
    name: 'cat.png',
    kind: 'image',
    dataUrl: 'data:image/png;base64,abc',
  });

  assert.deepEqual(parseDroppedChatImage(raw), {
    path: '/tmp/cat.png',
    name: 'cat.png',
    kind: 'image',
    dataUrl: 'data:image/png;base64,abc',
  });
  assert.equal(parseDroppedChatImage('{bad json'), null);
});
