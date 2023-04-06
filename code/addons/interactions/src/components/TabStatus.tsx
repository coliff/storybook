import { styled } from '@storybook/theming';
import ReactDOM from 'react-dom';

import { StatusIcon } from './StatusIcon';

export const TabStatus = ({ children }: { children: React.ReactChild }) => {
  const container = global.document.getElementById('tabbutton-storybook-interactions-panel');
  return container && ReactDOM.createPortal(children, container);
};

export const TabIcon = styled(StatusIcon)({
  marginLeft: 5,
});
