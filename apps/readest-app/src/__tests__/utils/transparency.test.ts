import { describe, expect, it } from 'vitest';

import { getReaderTransparencyState } from '@/utils/transparency';

describe('reader transparency settings', () => {
  it('uses fully opaque text by default', () => {
    expect(getReaderTransparencyState()).toMatchObject({
      backgroundOpacity: 70,
      contentOpacity: 100,
      textOpacity: 100,
    });
  });

  it('clamps every opacity value to the supported range', () => {
    expect(
      getReaderTransparencyState({
        transparencyOpacity: -10,
        transparencyContentOpacity: 120,
        transparencyTextOpacity: 45,
      }),
    ).toMatchObject({
      backgroundOpacity: 0,
      contentOpacity: 100,
      textOpacity: 45,
    });
  });
});
