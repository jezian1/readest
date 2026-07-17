import React from 'react';
import { MdPushPin } from 'react-icons/md';

import Button from '@/components/Button';
import { useTranslation } from '@/hooks/useTranslation';
import useReaderWindowControls from '../hooks/useReaderWindowControls';

const AlwaysOnTopToggler = () => {
  const _ = useTranslation();
  const { alwaysOnTop, supportsWindowControls, toggleAlwaysOnTop } = useReaderWindowControls();
  if (!supportsWindowControls) return null;

  const tooltip = _(alwaysOnTop ? 'Disable Always on Top' : 'Always on Top');

  return (
    <Button
      icon={<MdPushPin className={alwaysOnTop ? 'text-primary' : 'text-base-content'} />}
      onClick={toggleAlwaysOnTop}
      tooltip={`${tooltip} (Shift+P)`}
      tooltipDirection='bottom'
    />
  );
};

export default AlwaysOnTopToggler;
