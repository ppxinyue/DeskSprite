import assert from 'node:assert/strict';
import test from 'node:test';
import {
  firstDraggedImageFile,
  hasDraggedFileItems,
  hasDraggedImageItems,
  isAllowedDraggedImageName,
  isDraggedImageFile,
} from './dragImageFiles.ts';

test('drag image file detection accepts common image MIME types and extensions', () => {
  assert.equal(isDraggedImageFile({ name: 'cat.png', type: '' }), true);
  assert.equal(isDraggedImageFile({ name: 'paste', type: 'image/webp' }), true);
  assert.equal(isDraggedImageFile({ name: 'notes.pdf', type: 'application/pdf' }), false);
  assert.equal(isAllowedDraggedImageName('photo.JPEG'), true);
});

test('drag image item detection ignores non-file drags', () => {
  assert.equal(hasDraggedImageItems([{ kind: 'string', type: 'image/png' }]), false);
  assert.equal(hasDraggedImageItems([{ kind: 'file', type: 'image/png' }]), true);
  assert.equal(hasDraggedImageItems([{ kind: 'file', type: 'text/plain' }]), false);
});

test('drag file item detection accepts unknown file types before drop', () => {
  assert.equal(hasDraggedFileItems([{ kind: 'file', type: '' }]), true);
  assert.equal(hasDraggedFileItems([{ kind: 'string', type: 'text/plain' }]), false);
});

test('first dragged image file returns the first supported image only', () => {
  const image = { name: 'cat.gif', type: '' };
  assert.equal(firstDraggedImageFile([{ name: 'notes.txt', type: 'text/plain' }, image]), image);
  assert.equal(firstDraggedImageFile([{ name: 'notes.txt', type: 'text/plain' }]), null);
});
