# Compact Chat IME Handoff

## Goal

Fix IME input in the pet's compact chat when:

- the pet is pinned above fullscreen windows
- compact chat is shown above fullscreen windows
- IME candidate UI still needs to appear and work normally

Without changing the visible product behavior of:

- the pet
- compact chat's floating / fullscreen-overlay presentation

## Final Direction Chosen

The old double-window approach has been removed.

We now use:

- the original single `compact-chat` window
- macOS native panel configuration via a small `.node` addon

The reasoning is:

- IME follows the key window's text input context
- a separate floating input BrowserWindow created focus loops and unstable IME behavior
- the correct macOS-native fix is to make the **existing compact-chat panel** behave like a key-capable fullscreen auxiliary panel

## What Changed

### 1. Removed the double-window input host architecture

Deleted in practice:

- `compact-chat-input` BrowserWindow route
- `sync_native_compact_input`
- `focus_native_compact_input`
- `hide_native_compact_input`
- read-only visible textarea workaround
- mirrored text/submit/paste bridge used by the second window

The compact chat renderer is now back to a normal single textarea path.

Relevant files restored to the normal single-window path:

- [src/App.tsx](/Users/pp/home/happy_coding/DeskCat/src/App.tsx)
- [src/features/chat/ChatPrimitives.tsx](/Users/pp/home/happy_coding/DeskCat/src/features/chat/ChatPrimitives.tsx)
- [src/features/chat/ChatDialog.tsx](/Users/pp/home/happy_coding/DeskCat/src/features/chat/ChatDialog.tsx)

### 2. Added a native macOS panel fix addon

New files:

- [electron/panel-key-fix.mm](/Users/pp/home/happy_coding/DeskCat/electron/panel-key-fix.mm)
- [scripts/build-panel-key-fix.mjs](/Users/pp/home/happy_coding/DeskCat/scripts/build-panel-key-fix.mjs)

What the addon does:

- takes Electron's native window handle
- resolves the underlying `NSView` / `NSWindow`
- applies panel/window behaviors:
  - `NSWindowCollectionBehaviorCanJoinAllSpaces`
  - `NSWindowCollectionBehaviorFullScreenAuxiliary`
  - `NSWindowCollectionBehaviorStationary`
  - `NSWindowCollectionBehaviorIgnoresCycle`
- for `NSPanel`, also sets:
  - `setFloatingPanel:YES`
  - `setBecomesKeyOnlyIfNeeded:NO`
  - `setWorksWhenModal:YES`
  - `setHidesOnDeactivate:NO`

This is the key design change: the compact chat panel itself is now configured to behave like a fullscreen auxiliary panel that can become key.

### 3. Wired the addon into Electron startup/use

Main-process changes are in:

- [electron/main.cjs](/Users/pp/home/happy_coding/DeskCat/electron/main.cjs)

Main additions:

- `loadPanelKeyFix()`
- `configureCompactChatPanel(win)`

The addon is applied when:

- compact chat is created
- compact chat is repositioned
- compact chat is focused

### 4. Added build integration

Updated in:

- [package.json](/Users/pp/home/happy_coding/DeskCat/package.json)

New script:

- `pnpm native:build`

And it now runs automatically before:

- `pnpm electron:dev`
- `pnpm electron:start`
- `pnpm electron:build`

So the user does not need to manually compile the addon before rerunning Electron.

### 5. Added composition-based panel level switching

Current change set:

- [electron/panel-key-fix.mm](/Users/pp/home/happy_coding/DeskCat/electron/panel-key-fix.mm)
- [electron/main.cjs](/Users/pp/home/happy_coding/DeskCat/electron/main.cjs)
- [src/features/chat/ChatPrimitives.tsx](/Users/pp/home/happy_coding/DeskCat/src/features/chat/ChatPrimitives.tsx)

What changed:

- the native addon now also exports:
  - `setPanelLevelFloating`
  - `setPanelLevelScreenSaver`
- main process now tracks whether compact chat is currently inside IME composition
- compact chat drops from `screen-saver` level to `floating` level on:
  - `compact-chat:ime-composition-start`
- compact chat returns to `screen-saver` level on:
  - `compact-chat:ime-composition-end`
  - textarea `blur` as a fallback

This is meant to preserve the existing fullscreen overlay behavior while avoiding the compact chat panel visually covering the system IME candidate UI during composition.

## Key Files

- [electron/main.cjs](/Users/pp/home/happy_coding/DeskCat/electron/main.cjs)
- [electron/panel-key-fix.mm](/Users/pp/home/happy_coding/DeskCat/electron/panel-key-fix.mm)
- [scripts/build-panel-key-fix.mjs](/Users/pp/home/happy_coding/DeskCat/scripts/build-panel-key-fix.mjs)
- [src/App.tsx](/Users/pp/home/happy_coding/DeskCat/src/App.tsx)
- [src/features/chat/ChatPrimitives.tsx](/Users/pp/home/happy_coding/DeskCat/src/features/chat/ChatPrimitives.tsx)
- [src/features/chat/ChatDialog.tsx](/Users/pp/home/happy_coding/DeskCat/src/features/chat/ChatDialog.tsx)

## What Is Already Verified

The new implementation passes:

- `pnpm native:build`
- `node -e "const addon=require('./electron/native/panel_key_fix.node'); console.log(Object.keys(addon))"`
- `node --check electron/main.cjs`
- `pnpm exec tsc -b --pretty false`
- `pnpm test`
- `pnpm build`
- `git diff --check`

The addon exports:

- `setPanelKeyable`
- `setPanelLevelFloating`
- `setPanelLevelScreenSaver`

## Latest Confirmed Runtime Result Before The Newest Patch

Before the composition-level patch, the newest confirmed runtime result was:

1. compact chat can now receive keyboard input normally
2. compact chat no longer jumps Spaces
3. the normal textarea path is working again
4. **IME candidate UI is still wrong**

Observed behavior:

- on fullscreen windows:
  - compact chat can sit above the fullscreen app
  - text can be entered
  - IME candidate UI is still not visible
- on non-fullscreen windows:
  - text can be entered
  - IME candidate UI appears to be **under** compact chat
  - in other words, the compact chat window is still visually covering the candidate UI

This is an important narrowing:

- the native panel fix solved the **text input / key window** part well enough to allow typing
- the remaining problem now looks like **candidate window layering**, not "cannot type at all"

## Current Remaining Problem

The remaining bug is now:

> compact chat can type, but the IME candidate window is still visually below the compact chat window.

That means:

- the addon successfully improved text-input ownership
- but the compact chat panel is still above the candidate UI in z-order

## Updated Hypothesis

The strongest current hypothesis is now:

1. `compact-chat` now has a valid-enough input context to accept typing
2. but `applyFloatingFullscreenBehavior()` pushes the compact chat window to a very high topmost level:
   - `setAlwaysOnTop(true, 'screen-saver', 1)`
3. macOS IME candidate UI is lower than that topmost level
4. the right fix is therefore **dynamic native level switching during composition**, not more focus rewrites

This matches the newest observation:

- in non-fullscreen mode, the candidate is also below compact chat
- so this is no longer specific to fullscreen Space membership
- it is now much more clearly a **window level / stacking** problem

## Why This Matters

This is a materially different state from the old double-window bug:

- before: focus loop, host blur, no stable input context
- now: input works, but candidate UI is visually occluded

So the next fix should be aimed at:

- the compact chat panel's native level / stacking behavior during IME composition
- not another rewrite of the input ownership model

## Most Relevant Current Code

The most suspicious code path now is:

- [electron/main.cjs](/Users/pp/home/happy_coding/DeskCat/electron/main.cjs)
  - `applyFloatingFullscreenBehavior(win, options)`
  - this still sets compact chat to `screen-saver` level outside composition
  - it now also needs to respect composition-active state so later reposition calls do not silently restore the high level

The addon side that already solved the input-context part and now owns level switching is:

- [electron/panel-key-fix.mm](/Users/pp/home/happy_coding/DeskCat/electron/panel-key-fix.mm)

The renderer side that triggers composition state is:

- [src/features/chat/ChatPrimitives.tsx](/Users/pp/home/happy_coding/DeskCat/src/features/chat/ChatPrimitives.tsx)

## Expected Outcome Of The Newest Patch

When the newest patch works as intended:

1. compact chat remains at high `screen-saver` level when not composing
2. compact chat drops to `floating` level during IME composition
3. macOS candidate UI appears above compact chat
4. on composition end or blur, compact chat returns to its original topmost behavior

## Suggested Next Direction If It Still Fails

The next agent should treat this as:

**"dynamic level switching is still not producing the expected macOS stacking result"**

More specifically, investigate:

1. whether Electron re-applies `screen-saver` level after composition start because of later reposition/layout calls
2. whether `NSFloatingWindowLevel` is low enough relative to the IME candidate layer on the target macOS version
3. whether `NSPopUpMenuWindowLevel` or another closer native level is needed instead of `NSFloatingWindowLevel`
4. whether the compact chat panel needs logging of its live native level before/after composition events to verify the switch actually sticks

## Prior Paths That Were Abandoned

These were tried earlier and then removed/replaced:

1. raising IME candidate windows directly
2. external Cocoa helper process
3. second BrowserWindow input host (`compact-chat-input`)
4. read-only visible textarea + mirrored hidden host input

Those approaches created either:

- no IME
- focus loops
- fullscreen Space jumping
- or clone/focus regressions

## Summary

The codebase is now aligned with the intended macOS-native solution:

- keep the compact chat as one window
- make that window's underlying panel key-capable and fullscreen-auxiliary
- let the normal textarea own the text input context again

This is the cleanest implementation attempted so far and the first one that follows the native fullscreen auxiliary panel model directly.

It also established an important new fact:

- **typing works**
- **candidate UI is still below the panel**

So the problem has narrowed from "input context is broken" to "candidate stacking is broken".

## Progress

Current progress reached:

1. compact chat is back to a single-window architecture
2. compact chat can receive keyboard input normally again
3. compact chat no longer jumps away from the fullscreen Space
4. a native macOS panel addon is in place and built automatically
5. the addon now supports dynamic panel level switching during IME composition
6. renderer and main process are wired so composition start lowers the panel and composition end restores it

## Issues

Current remaining issues:

1. this newest composition-level patch is implemented, but still needs real GUI verification from the running Electron app
2. if IME candidate UI is still hidden after this patch, the remaining problem is almost certainly native stacking behavior, not focus or text input ownership
3. the most likely next checks would be:
   - whether the panel level change is actually sticking at runtime
   - whether `NSFloatingWindowLevel` is still too high or otherwise not the right layer for the active macOS IME implementation
   - whether a closer native level such as `NSPopUpMenuWindowLevel` is needed during composition
