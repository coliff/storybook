import type { FC } from 'react';
import React, { useState, useCallback } from 'react';
import { useGlobals } from '@storybook/manager-api';
import { deprecate } from '@storybook/client-logger';
import { WithTooltip, TooltipLinkList } from '@storybook/components';
import { ToolbarMenuButton } from './ToolbarMenuButton';
import type { WithKeyboardCycleProps } from '../hoc/withKeyboardCycle';
import { withKeyboardCycle } from '../hoc/withKeyboardCycle';
import { getSelectedIcon, getSelectedTitle } from '../utils/get-selected';
import type { ToolbarMenuProps } from '../types';
import { ToolbarMenuListItem } from './ToolbarMenuListItem';

type ToolbarMenuListProps = ToolbarMenuProps & WithKeyboardCycleProps;

export const ToolbarMenuList: FC<ToolbarMenuListProps> = withKeyboardCycle(
  ({
    id,
    name,
    description,
    toolbar: { icon: _icon, items, title: _title, preventDynamicIcon, dynamicTitle },
  }) => {
    const [globals, updateGlobals] = useGlobals();
    const [isTooltipVisible, setIsTooltipVisible] = useState(false);

    const currentValue = globals[id];
    const hasGlobalValue = !!currentValue;
    let icon = _icon;
    let title = _title;

    if (!preventDynamicIcon) {
      icon = getSelectedIcon({ currentValue, items }) || icon;
    }

    // Deprecation support for old "name of global arg used as title"
    if (!title) {
      title = name;
      deprecate(
        '`showName` is deprecated as `name` will stop having dual purposes in the future. Please specify a `title` in `globalTypes` instead.'
      );
    } else if (!icon && !title) {
      title = name;
      deprecate(
        `Using the \`name\` "${name}" as toolbar title for backward compatibility. \`name\` will stop having dual purposes in the future. Please specify either a \`title\` or an \`icon\` in \`globalTypes\` instead.`
      );
    }

    if (dynamicTitle) {
      title = getSelectedTitle({ currentValue, items }) || title;
    }

    const handleItemClick = useCallback(
      (value: string | undefined) => {
        updateGlobals({ [id]: value });
      },
      [currentValue, updateGlobals]
    );

    return (
      <WithTooltip
        placement="top"
        tooltip={({ onHide }) => {
          const links = items
            // Special case handling for various "type" variants
            .filter(({ type }) => {
              let shouldReturn = true;

              if (type === 'reset' && !currentValue) {
                shouldReturn = false;
              }

              return shouldReturn;
            })
            .map((item) => {
              const listItem = ToolbarMenuListItem({
                ...item,
                currentValue,
                onClick: () => {
                  handleItemClick(item.value);
                  onHide();
                },
              });

              return listItem;
            });
          return <TooltipLinkList links={links} />;
        }}
        closeOnOutsideClick
        onVisibleChange={setIsTooltipVisible}
      >
        <ToolbarMenuButton
          active={isTooltipVisible || hasGlobalValue}
          description={description || ''}
          icon={icon}
          title={title || ''}
        />
      </WithTooltip>
    );
  }
);
