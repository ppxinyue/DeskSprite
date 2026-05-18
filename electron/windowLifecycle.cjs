function createDeferredWindowShowController({ setTimeoutFn = setTimeout, clearTimeoutFn = clearTimeout } = {}) {
  const readyWindows = new WeakSet();
  const pendingShows = new WeakMap();

  const requestShow = (win, { focus = false, timeoutMs = 3500 } = {}) => {
    if (!win || win.isDestroyed?.()) return;
    if (readyWindows.has(win)) {
      win.show();
      if (focus) win.focus?.();
      return;
    }

    const existing = pendingShows.get(win);
    if (existing?.timer) clearTimeoutFn(existing.timer);

    let shown = false;
    const show = () => {
      if (shown || win.isDestroyed?.()) return;
      shown = true;
      pendingShows.delete(win);
      win.show();
      if (focus) win.focus?.();
    };
    const timer = setTimeoutFn(show, timeoutMs);
    pendingShows.set(win, { show, timer });
  };

  const markReady = (win) => {
    if (!win || win.isDestroyed?.()) return;
    readyWindows.add(win);
    const pending = pendingShows.get(win);
    if (!pending) return;
    if (pending.timer) clearTimeoutFn(pending.timer);
    setTimeoutFn(pending.show, 0);
  };

  const isReady = (win) => readyWindows.has(win);

  return { requestShow, markReady, isReady };
}

function createPetVisibilityController({ setTimeoutFn = setTimeout, clearTimeoutFn = clearTimeout } = {}) {
  let layoutReady = false;
  let pendingShow = true;
  let fallbackTimer = null;

  const clearFallbackTimer = () => {
    if (!fallbackTimer) return;
    clearTimeoutFn(fallbackTimer);
    fallbackTimer = null;
  };

  const showInactive = (win, applyTopmost) => {
    if (!win || win.isDestroyed?.() || win.isVisible?.() || !pendingShow) return false;
    pendingShow = false;
    clearFallbackTimer();
    applyTopmost?.(win);
    win.showInactive();
    applyTopmost?.(win);
    win.moveTop?.();
    return true;
  };

  const reset = () => {
    clearFallbackTimer();
    layoutReady = false;
    pendingShow = true;
  };

  const hide = (win) => {
    clearFallbackTimer();
    pendingShow = false;
    win?.hide?.();
  };

  const requestShow = (win, { requestLayout, applyTopmost, fallbackShowMs = 0 } = {}) => {
    if (!win || win.isDestroyed?.()) return false;
    applyTopmost?.(win);
    pendingShow = true;
    if (!layoutReady) {
      requestLayout?.(win);
      clearFallbackTimer();
      if (fallbackShowMs > 0) {
        fallbackTimer = setTimeoutFn(() => {
          fallbackTimer = null;
          showInactive(win, applyTopmost);
        }, fallbackShowMs);
      }
      return false;
    }
    return showInactive(win, applyTopmost);
  };

  const markLayoutReady = (win, { applyTopmost } = {}) => {
    layoutReady = true;
    return showInactive(win, applyTopmost);
  };

  const getState = () => ({ layoutReady, pendingShow });

  return { reset, hide, requestShow, markLayoutReady, getState };
}

module.exports = {
  createDeferredWindowShowController,
  createPetVisibilityController,
};
