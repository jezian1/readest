'use client';

import clsx from 'clsx';
import * as React from 'react';
import { useEffect, Suspense, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

import { useEnv } from '@/context/EnvContext';
import { useTheme } from '@/hooks/useTheme';
import { useThemeStore } from '@/store/themeStore';
import { useReaderStore } from '@/store/readerStore';
import { useLibraryStore } from '@/store/libraryStore';
import { useSidebarStore } from '@/store/sidebarStore';
import { useNotebookStore } from '@/store/notebookStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useDeviceControlStore } from '@/store/deviceStore';
import { useScreenWakeLock } from '@/hooks/useScreenWakeLock';
import { eventDispatcher } from '@/utils/event';
import { interceptWindowOpen } from '@/utils/open';
import { mountAdditionalFonts } from '@/styles/fonts';
import { isTauriAppPlatform } from '@/services/environment';
import { getSysFontsList, setSystemUIVisibility } from '@/utils/bridge';
import { tauriHandleSetAlwaysOnTop, tauriHandleSetShadow } from '@/utils/window';
import useHoverHideWindow from '../hooks/useHoverHideWindow';
import useReaderTransparency from '../hooks/useReaderTransparency';
import useReaderWindowControls from '../hooks/useReaderWindowControls';
import { AboutWindow } from '@/components/AboutWindow';
import { UpdaterWindow } from '@/components/UpdaterWindow';
import { KOSyncSettingsWindow } from './KOSyncSettings';
import { Toast } from '@/components/Toast';
import { getLocale } from '@/utils/misc';
import { initDayjs } from '@/utils/time';
import ReaderContent from './ReaderContent';

/*
Z-Index Layering Guide:
---------------------------------
99 – Window Border (Linux only)
     • Ensures the border stays on top of all UI elements.
50 – Loading Progress / Toast Notifications / Dialogs
     • Includes Settings, About, Updater, and KOSync dialogs.
45 – Sidebar / Notebook (Unpinned)
     • Floats above the content but below global dialogs.
40 – TTS Bar
     • Mini controls for TTS playback on top of the TTS Control.
30 – TTS Control
     • Persistent TTS icon/panel.
20 – Menu / Sidebar / Notebook (Pinned)
     • Docked navigation or note views.
10 – Headerbar / Footbar / Ribbon
     • Top toolbar, bottom footbar and ribbon elements.
 0 – Base Content
     • Main reading area or background content.
*/

const setReaderWindowShadow = (enabled: boolean) => {
  void tauriHandleSetShadow(enabled).catch((error) => {
    console.warn('Failed to update the reader window shadow', error);
  });
};

const Reader: React.FC<{ ids?: string }> = ({ ids }) => {
  const router = useRouter();
  const { envConfig, appService } = useEnv();
  const { setLibrary } = useLibraryStore();
  const { hoveredBookKey } = useReaderStore();
  const { settings, setSettings } = useSettingsStore();
  const { isSideBarVisible, getIsSideBarVisible, setSideBarVisible } = useSidebarStore();
  const { isNotebookVisible, getIsNotebookVisible, setNotebookVisible } = useNotebookStore();
  const { isDarkMode, systemUIAlwaysHidden, isRoundedWindow } = useThemeStore();
  const { showSystemUI, dismissSystemUI } = useThemeStore();
  const { acquireBackKeyInterception, releaseBackKeyInterception } = useDeviceControlStore();
  const [libraryLoaded, setLibraryLoaded] = useState(false);
  const isInitiating = useRef(false);

  const { mode, backgroundOpacity, contentOpacity, supportsTransparency } = useReaderTransparency();
  const transparencyMode = supportsTransparency ? mode : 'off';
  const effectiveBackgroundOpacity = transparencyMode === 'background' ? 0 : backgroundOpacity;
  const { alwaysOnTop, hoverHideWindow, supportsWindowControls, supportsHoverHide } =
    useReaderWindowControls();
  useHoverHideWindow(libraryLoaded && alwaysOnTop && supportsHoverHide && hoverHideWindow);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset['readerTransparency'] = transparencyMode;
    root.style.setProperty('--reader-background-opacity', `${effectiveBackgroundOpacity / 100}`);
    root.style.setProperty('--reader-content-opacity', `${contentOpacity / 100}`);

    return () => {
      delete root.dataset['readerTransparency'];
      root.style.removeProperty('--reader-background-opacity');
      root.style.removeProperty('--reader-content-opacity');
    };
  }, [transparencyMode, effectiveBackgroundOpacity, contentOpacity]);

  useEffect(() => {
    if (!supportsTransparency || !isTauriAppPlatform()) return;
    setReaderWindowShadow(transparencyMode === 'off');
  }, [supportsTransparency, transparencyMode]);

  useEffect(() => {
    if (!supportsTransparency || !isTauriAppPlatform()) return;
    return () => setReaderWindowShadow(true);
  }, [supportsTransparency]);

  useEffect(() => {
    if (!libraryLoaded || !supportsWindowControls || !isTauriAppPlatform()) return;

    void tauriHandleSetAlwaysOnTop(alwaysOnTop).catch((error) => {
      console.warn('Failed to update always-on-top state', error);
    });
  }, [alwaysOnTop, libraryLoaded, supportsWindowControls]);

  useTheme({ systemUIVisible: settings.alwaysShowStatusBar, appThemeColor: 'base-100' });
  useScreenWakeLock(settings.screenWakeLock);

  useEffect(() => {
    mountAdditionalFonts(document);
    interceptWindowOpen();
    if (isTauriAppPlatform()) {
      setTimeout(getSysFontsList, 3000);
    }
    initDayjs(getLocale());
  }, []);

  const handleKeyDown = (event: CustomEvent) => {
    if (event.detail.keyName === 'Back') {
      if (getIsSideBarVisible()) {
        setSideBarVisible(false);
      } else if (getIsNotebookVisible()) {
        setNotebookVisible(false);
      } else {
        eventDispatcher.dispatch('close-reader');
        router.back();
      }
      return true;
    }
    return false;
  };

  useEffect(() => {
    if (!appService?.isAndroidApp) return;
    acquireBackKeyInterception();
    return () => {
      releaseBackKeyInterception();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appService?.isAndroidApp]);

  useEffect(() => {
    if (!appService?.isAndroidApp) return;
    eventDispatcher.onSync('native-key-down', handleKeyDown);
    return () => {
      if (appService?.isAndroidApp) {
        eventDispatcher.offSync('native-key-down', handleKeyDown);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appService?.isAndroidApp, isSideBarVisible, isNotebookVisible]);

  useEffect(() => {
    if (isInitiating.current) return;
    isInitiating.current = true;
    const initLibrary = async () => {
      const appService = await envConfig.getAppService();
      const settings = await appService.loadSettings();
      setSettings(settings);
      setLibrary(await appService.loadLibraryBooks());
      setLibraryLoaded(true);
    };

    initLibrary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!appService?.isMobileApp) return;
    const systemUIVisible = !!hoveredBookKey || settings.alwaysShowStatusBar;
    const visible = systemUIVisible && !systemUIAlwaysHidden;
    setSystemUIVisibility({ visible, darkMode: isDarkMode });
    if (visible) {
      showSystemUI();
    } else {
      dismissSystemUI();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hoveredBookKey]);

  return libraryLoaded && settings.globalReadSettings ? (
    <div
      className={clsx(
        `reader-page bg-base-100 text-base-content select-none overflow-hidden`,
        transparencyMode !== 'off' && 'reader-transparency-active',
        appService?.isIOSApp ? 'h-[100vh]' : 'h-dvh',
        appService?.hasRoundedWindow &&
          isRoundedWindow &&
          transparencyMode === 'off' &&
          'window-border rounded-window',
      )}
    >
      <Suspense fallback={<div className='h-[100vh]'></div>}>
        <ReaderContent ids={ids} settings={settings} />
        <AboutWindow />
        <UpdaterWindow />
        <KOSyncSettingsWindow />
        <Toast />
      </Suspense>
    </div>
  ) : (
    <div className={clsx('h-[100vh]', !appService?.isLinuxApp && 'bg-base-100')}></div>
  );
};

export default Reader;
