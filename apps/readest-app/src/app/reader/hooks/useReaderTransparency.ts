import { useCallback } from 'react';

import { useEnv } from '@/context/EnvContext';
import { useSettingsStore } from '@/store/settingsStore';
import {
  getReaderTransparencyState,
  ReaderTransparencyPatch,
  supportsReaderTransparency,
  toggleReaderTransparency,
  updateReaderTransparency,
} from '@/utils/transparency';

const useReaderTransparency = () => {
  const { envConfig, appService } = useEnv();
  const readSettings = useSettingsStore((state) => state.settings.globalReadSettings);
  const transparency = getReaderTransparencyState(readSettings);
  const supportsTransparency = supportsReaderTransparency(appService);

  const updateTransparency = useCallback(
    (patch: ReaderTransparencyPatch) => {
      updateReaderTransparency(envConfig, patch);
    },
    [envConfig],
  );

  const toggleTransparency = useCallback(() => {
    toggleReaderTransparency(envConfig);
  }, [envConfig]);

  return {
    ...transparency,
    supportsTransparency,
    updateTransparency,
    toggleTransparency,
  };
};

export default useReaderTransparency;
