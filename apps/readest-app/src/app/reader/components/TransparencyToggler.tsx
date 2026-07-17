import React from 'react';
import { MdOpacity } from 'react-icons/md';

import { useTranslation } from '@/hooks/useTranslation';
import Button from '@/components/Button';
import useReaderTransparency from '../hooks/useReaderTransparency';

const TransparencyToggler = () => {
  const _ = useTranslation();
  const { mode, supportsTransparency, toggleTransparency } = useReaderTransparency();
  if (!supportsTransparency) return null;

  const isTransparent = mode !== 'off';
  const tooltip = _(isTransparent ? 'Turn Transparency Off' : 'Restore Transparency');

  return (
    <Button
      icon={<MdOpacity className={isTransparent ? 'text-primary' : 'text-base-content'} />}
      onClick={toggleTransparency}
      tooltip={`${tooltip} (Shift+O)`}
      tooltipDirection='bottom'
    />
  );
};

export default TransparencyToggler;
