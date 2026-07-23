import { useCallback } from 'react';

import { useEnv } from '@/context/EnvContext';
import { isTauriAppPlatform } from '@/services/environment';
import { useSettingsStore } from '@/store/settingsStore';
import type { SystemSettings } from '@/types/settings';

type ReaderWindowSettingsPatch = Partial<
  Pick<SystemSettings, 'alwaysOnTop' | 'hoverHideWindow' | 'hoverHideKeepHeader'>
>;

const useReaderWindowControls = () => {
  const { envConfig, appService } = useEnv();
  const alwaysOnTop = useSettingsStore((state) => state.settings.alwaysOnTop ?? false);
  const hoverHideWindow = useSettingsStore((state) => state.settings.hoverHideWindow ?? false);
  const hoverHideKeepHeader = useSettingsStore(
    (state) => state.settings.hoverHideKeepHeader ?? false,
  );
  const supportsWindowControls =
    isTauriAppPlatform() && !!appService?.hasWindow && !appService.isMobileApp;
  const supportsHoverHide = supportsWindowControls && !appService?.isMacOSApp;

  const updateWindowSettings = useCallback(
    (patch: ReaderWindowSettingsPatch) => {
      const settingsStore = useSettingsStore.getState();
      const nextSettings = {
        ...settingsStore.settings,
        ...patch,
      };

      settingsStore.setSettings(nextSettings);
      void settingsStore.saveSettings(envConfig, nextSettings);
    },
    [envConfig],
  );

  const toggleAlwaysOnTop = useCallback(() => {
    const { alwaysOnTop = false } = useSettingsStore.getState().settings;
    updateWindowSettings({ alwaysOnTop: !alwaysOnTop, hoverHideWindow: false });
  }, [updateWindowSettings]);

  const toggleHoverHideWindow = useCallback(() => {
    const { alwaysOnTop = false, hoverHideWindow = false } = useSettingsStore.getState().settings;
    if (!alwaysOnTop) return;
    updateWindowSettings({ hoverHideWindow: !hoverHideWindow });
  }, [updateWindowSettings]);

  const setHoverHideKeepHeader = useCallback(
    (enabled: boolean) => updateWindowSettings({ hoverHideKeepHeader: enabled }),
    [updateWindowSettings],
  );

  return {
    alwaysOnTop,
    hoverHideWindow,
    hoverHideKeepHeader,
    supportsWindowControls,
    supportsHoverHide,
    toggleAlwaysOnTop,
    toggleHoverHideWindow,
    setHoverHideKeepHeader,
  };
};

export default useReaderWindowControls;
