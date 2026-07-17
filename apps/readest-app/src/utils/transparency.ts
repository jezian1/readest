import type { EnvConfigType } from '@/services/environment';
import type {
  ActiveReaderTransparencyMode,
  ReaderTransparencyMode,
  ReadSettings,
} from '@/types/settings';
import type { AppService } from '@/types/system';
import { useReaderStore } from '@/store/readerStore';
import { useSettingsStore } from '@/store/settingsStore';
import { getStyles } from '@/utils/style';

const clampOpacity = (opacity: number) => Math.min(100, Math.max(0, opacity));

export type ReaderTransparencyPatch = Partial<
  Pick<
    ReadSettings,
    | 'transparencyMode'
    | 'transparencyLastMode'
    | 'transparencyOpacity'
    | 'transparencyContentOpacity'
  >
>;

export interface ReaderTransparencyState {
  mode: ReaderTransparencyMode;
  lastMode: ActiveReaderTransparencyMode;
  backgroundOpacity: number;
  contentOpacity: number;
}

export const supportsReaderTransparency = (appService?: AppService | null) =>
  !!appService?.hasWindow && !appService.isMobileApp && !appService.isMacOSApp;

export const getReaderTransparencyState = (
  readSettings?: Partial<ReadSettings>,
): ReaderTransparencyState => ({
  mode: readSettings?.transparencyMode ?? 'off',
  lastMode: readSettings?.transparencyLastMode ?? 'background',
  backgroundOpacity: clampOpacity(readSettings?.transparencyOpacity ?? 70),
  contentOpacity: clampOpacity(readSettings?.transparencyContentOpacity ?? 100),
});

const refreshReaderStyles = (readSettings: ReadSettings) => {
  Object.values(useReaderStore.getState().viewStates).forEach(({ view, viewSettings }) => {
    if (view && viewSettings) {
      view.renderer.setStyles?.(getStyles(viewSettings, undefined, readSettings));
    }
  });
};

export const updateReaderTransparency = (
  envConfig: EnvConfigType,
  patch: ReaderTransparencyPatch,
) => {
  const settingsStore = useSettingsStore.getState();
  const settings = settingsStore.settings;
  const readSettings = settings.globalReadSettings;
  if (!readSettings) return;

  const current = getReaderTransparencyState(readSettings);
  const mode = patch.transparencyMode ?? current.mode;
  const lastMode = patch.transparencyLastMode ?? (mode === 'off' ? current.lastMode : mode);
  const nextReadSettings: ReadSettings = {
    ...readSettings,
    transparencyMode: mode,
    transparencyLastMode: lastMode,
    transparencyOpacity: clampOpacity(patch.transparencyOpacity ?? current.backgroundOpacity),
    transparencyContentOpacity: clampOpacity(
      patch.transparencyContentOpacity ?? current.contentOpacity,
    ),
  };
  const nextSettings = {
    ...settings,
    globalReadSettings: nextReadSettings,
  };

  settingsStore.setSettings(nextSettings);
  void settingsStore.saveSettings(envConfig, nextSettings);
  refreshReaderStyles(nextReadSettings);
};

export const toggleReaderTransparency = (envConfig: EnvConfigType) => {
  const readSettings = useSettingsStore.getState().settings.globalReadSettings;
  if (!readSettings) return;

  const { mode, lastMode } = getReaderTransparencyState(readSettings);
  updateReaderTransparency(envConfig, {
    transparencyMode: mode === 'off' ? lastMode : 'off',
  });
};
