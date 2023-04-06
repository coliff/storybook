import React, { useState } from 'react';
import { addons, types, useChannel } from '@storybook/manager-api';
import { STORY_CHANGED } from '@storybook/core-events';
import ActionLogger from './containers/ActionLogger';
import { ADDON_ID, CLEAR_ID, EVENT_ID, PANEL_ID, PARAM_KEY } from './constants';

function Title({ count }: { count: { current: number } }) {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  const [_, setRerender] = useState(false);

  // Reactivity hack - force re-render on STORY_CHANGED, EVENT_ID and CLEAR_ID events
  useChannel({
    [EVENT_ID]: () => {
      setRerender((r) => !r);
    },
    [STORY_CHANGED]: () => {
      setRerender((r) => !r);
    },
    [CLEAR_ID]: () => {
      setRerender((r) => !r);
    },
  });

  const suffix = count.current === 0 ? '' : ` (${count.current})`;
  return <>Actions{suffix}</>;
}

addons.register(ADDON_ID, (api) => {
  const countRef = { current: 0 };

  api.on(STORY_CHANGED, (id) => {
    countRef.current = 0;
  });

  api.on(EVENT_ID, () => {
    countRef.current += 1;
  });

  api.on(CLEAR_ID, () => {
    countRef.current = 0;
  });

  addons.addPanel(PANEL_ID, {
    title: <Title count={countRef} />,
    id: 'actions',
    type: types.PANEL,
    render: ({ active, key }) => <ActionLogger key={key} api={api} active={!!active} />,
    paramKey: PARAM_KEY,
  });
});
