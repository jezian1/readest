import { describe, expect, it } from 'vitest';

import { DEFAULT_SYSTEM_SETTINGS } from '@/services/constants';

describe('reader window settings', () => {
  it('keeps the entire reader hidden by default', () => {
    expect(DEFAULT_SYSTEM_SETTINGS.hoverHideKeepHeader).toBe(false);
  });
});
