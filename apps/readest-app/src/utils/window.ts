import { cursorPosition, getCurrentWindow } from '@tauri-apps/api/window';
import { emitTo, TauriEvent } from '@tauri-apps/api/event';
import { exit } from '@tauri-apps/plugin-process';
import { type as osType } from '@tauri-apps/plugin-os';
import { eventDispatcher } from './event';

let ignoreCursorEventsUpdate = Promise.resolve();

export const tauriGetWindowLogicalPosition = async () => {
  const currentWindow = getCurrentWindow();
  const factor = await currentWindow.scaleFactor();
  const physicalPos = await currentWindow.outerPosition();
  return { x: physicalPos.x / factor, y: physicalPos.y / factor };
};

export const tauriHandleMinimize = async () => {
  getCurrentWindow().minimize();
};

export const tauriHandleSetShadow = async (enabled: boolean) => {
  const currentWindow = getCurrentWindow();
  await currentWindow.setShadow(enabled);
};

export const tauriHandleSetIgnoreCursorEvents = (ignore: boolean) => {
  const update = ignoreCursorEventsUpdate
    .catch(() => undefined)
    .then(() => getCurrentWindow().setIgnoreCursorEvents(ignore));
  ignoreCursorEventsUpdate = update;
  return update;
};

export const tauriHandleOnWindowMoved = async (callback: () => void) =>
  getCurrentWindow().onMoved(callback);

export const tauriHandleSetFocus = async () => {
  const currentWindow = getCurrentWindow();
  await currentWindow.setFocus();
};

export const tauriIsCursorInsideWindow = async () => {
  const currentWindow = getCurrentWindow();
  const [cursor, position, size] = await Promise.all([
    cursorPosition(),
    currentWindow.outerPosition(),
    currentWindow.outerSize(),
  ]);

  return (
    cursor.x >= position.x &&
    cursor.x < position.x + size.width &&
    cursor.y >= position.y &&
    cursor.y < position.y + size.height
  );
};

// workaround to reset transparent background when toggling fullscreen/maximize
const linuxWindowRestoreTransparentBg = async () => {
  const currentSize = await getCurrentWindow().innerSize();
  currentSize.width -= 1;
  currentSize.height -= 1;
  await getCurrentWindow().setSize(currentSize);
  setTimeout(async () => {
    const currentSize = await getCurrentWindow().innerSize();
    currentSize.width += 1;
    currentSize.height += 1;
    await getCurrentWindow().setSize(currentSize);
  }, 100);
};

export const tauriHandleToggleMaximize = async () => {
  const currentWindow = getCurrentWindow();
  const isFullscreen = await currentWindow.isFullscreen();
  if (isFullscreen) {
    await currentWindow.setFullscreen(false);
    await currentWindow.unmaximize();
  } else {
    await currentWindow.toggleMaximize();
  }
  if ((await osType()) === 'linux') {
    linuxWindowRestoreTransparentBg();
  }
};

export const tauriHandleClose = async () => {
  getCurrentWindow().close();
};

export const tauriHandleOnCloseWindow = async (callback: () => void) => {
  const currentWindow = getCurrentWindow();
  return currentWindow.listen(TauriEvent.WINDOW_CLOSE_REQUESTED, async () => {
    await callback();
    if (currentWindow.label.startsWith('reader')) {
      await emitTo('main', 'close-reader-window', { label: currentWindow.label });
      setTimeout(() => currentWindow.destroy(), 300);
    } else if (currentWindow.label === 'main') {
      await currentWindow.destroy();
    }
  });
};

export const tauriHandleToggleFullScreen = async () => {
  const currentWindow = getCurrentWindow();
  const isFullscreen = await currentWindow.isFullscreen();
  const isMaximized = await currentWindow.isMaximized();
  if (isMaximized) {
    await currentWindow.unmaximize();
  } else {
    await currentWindow.setFullscreen(!isFullscreen);
  }
  if ((await osType()) === 'linux') {
    linuxWindowRestoreTransparentBg();
  }
};

export const tauriHandleSetAlwaysOnTop = async (isAlwaysOnTop: boolean) => {
  const currentWindow = getCurrentWindow();
  await currentWindow.setAlwaysOnTop(isAlwaysOnTop);
};

export const tauriGetAlwaysOnTop = async () => {
  const currentWindow = getCurrentWindow();
  return await currentWindow.isAlwaysOnTop();
};

export const tauriHandleOnWindowFocus = async (callback: () => void) => {
  const currentWindow = getCurrentWindow();
  return currentWindow.listen(TauriEvent.WINDOW_FOCUS, async () => {
    await callback();
  });
};

export const tauriQuitApp = async () => {
  await eventDispatcher.dispatch('quit-app');
  await exit(0);
};
