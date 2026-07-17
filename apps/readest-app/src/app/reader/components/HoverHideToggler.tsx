import React from 'react';
import { MdVisibilityOff } from 'react-icons/md';

import Button from '@/components/Button';
import { useTranslation } from '@/hooks/useTranslation';
import useReaderWindowControls from '../hooks/useReaderWindowControls';

const HoverHideToggler = () => {
  const _ = useTranslation();
  const { alwaysOnTop, hoverHideWindow, supportsHoverHide, toggleHoverHideWindow } =
    useReaderWindowControls();
  if (!supportsHoverHide) return null;

  const isHoverHideActive = alwaysOnTop && hoverHideWindow;
  const tooltip = _(
    !alwaysOnTop
      ? 'Pin Window to Enable Hover Hide'
      : isHoverHideActive
        ? 'Disable Hover Hide'
        : 'Enable Hover Hide',
  );

  return (
    <Button
      icon={
        <MdVisibilityOff className={isHoverHideActive ? 'text-primary' : 'text-base-content'} />
      }
      onClick={toggleHoverHideWindow}
      disabled={!alwaysOnTop}
      tooltip={`${tooltip}${alwaysOnTop ? ' (Shift+I)' : ''}`}
      tooltipDirection='bottom'
    />
  );
};

export default HoverHideToggler;
