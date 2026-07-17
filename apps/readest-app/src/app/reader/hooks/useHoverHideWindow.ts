import { useEffect } from 'react';

import { isTauriAppPlatform } from '@/services/environment';
import { eventDispatcher } from '@/utils/event';
import {
  tauriHandleOnWindowMoved,
  tauriHandleSetFocus,
  tauriHandleSetIgnoreCursorEvents,
  tauriIsCursorInsideWindow,
} from '@/utils/window';

const CURSOR_POLL_INTERVAL_MS = 120;
const DRAG_START_GRACE_MS = 800;
const DRAG_MOVE_GRACE_MS = 250;

const useHoverHideWindow = (enabled: boolean) => {
  useEffect(() => {
    if (!enabled || !isTauriAppPlatform()) return;

    const root = document.documentElement;
    let isHidden = false;
    let isPolling = false;
    let hasLoggedError = false;
    let isActive = true;
    let isDragging = false;
    let dragEndTimer: ReturnType<typeof setTimeout> | undefined;
    let unlistenWindowMoved: (() => void) | undefined;

    const reportError = (error: unknown) => {
      if (hasLoggedError) return;
      hasLoggedError = true;
      console.warn('Failed to update hover-hide window state', error);
    };

    const showWindow = () => {
      if (!isActive || !isHidden) return;

      isHidden = false;
      delete root.dataset['readerHoverHidden'];
      void tauriHandleSetFocus().catch(reportError);
    };

    const hideWindow = () => {
      if (!isActive || isHidden || isDragging) return;

      isHidden = true;
      root.dataset['readerHoverHidden'] = 'true';
    };

    const clearDragEndTimer = () => {
      if (dragEndTimer) {
        clearTimeout(dragEndTimer);
        dragEndTimer = undefined;
      }
    };

    const finishWindowDragging = () => {
      clearDragEndTimer();
      isDragging = false;
    };

    const markWindowDragging = (releaseDelay: number) => {
      isDragging = true;
      showWindow();
      clearDragEndTimer();
      dragEndTimer = setTimeout(finishWindowDragging, releaseDelay);
    };

    const handleWindowDragState = (event: CustomEvent) => {
      if (event.detail?.dragging) {
        markWindowDragging(DRAG_START_GRACE_MS);
      } else {
        finishWindowDragging();
      }
      return false;
    };

    const syncWindowVisibility = async () => {
      if (isPolling) return;
      isPolling = true;

      try {
        if (isDragging) return;
        const isCursorInside = await tauriIsCursorInsideWindow();
        if (!isActive) return;
        if (isCursorInside) {
          showWindow();
        } else {
          hideWindow();
        }
      } catch (error) {
        reportError(error);
      } finally {
        isPolling = false;
      }
    };

    void tauriHandleSetIgnoreCursorEvents(false).catch(reportError);
    eventDispatcher.onSync('window-drag-state', handleWindowDragState);
    void tauriHandleOnWindowMoved(() => markWindowDragging(DRAG_MOVE_GRACE_MS))
      .then((unlisten) => {
        if (isActive) {
          unlistenWindowMoved = unlisten;
        } else {
          unlisten();
        }
      })
      .catch(reportError);
    void syncWindowVisibility();
    const pollTimer = setInterval(() => {
      void syncWindowVisibility();
    }, CURSOR_POLL_INTERVAL_MS);

    return () => {
      isActive = false;
      eventDispatcher.offSync('window-drag-state', handleWindowDragState);
      clearInterval(pollTimer);
      unlistenWindowMoved?.();
      isHidden = false;
      clearDragEndTimer();
      delete root.dataset['readerHoverHidden'];
      void tauriHandleSetIgnoreCursorEvents(false).catch(reportError);
    };
  }, [enabled]);
};

export default useHoverHideWindow;
