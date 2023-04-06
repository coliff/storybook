import type { FC, Context, PropsWithChildren } from 'react';
import React, { createContext, useEffect, useState } from 'react';

import { dequal as deepEqual } from 'dequal';
import type { Channel } from '@storybook/channels';

import { SNIPPET_RENDERED } from '@storybook/docs-tools';
import type { SyntaxHighlighterFormatTypes } from '@storybook/components';
import type { StoryId, Args } from '@storybook/types';

import { stringify } from 'telejson';

type ArgsHash = string;
export function argsHash(args: Args): ArgsHash {
  return stringify(args);
}

export interface SourceItem {
  code: string;
  format?: SyntaxHighlighterFormatTypes;
}

export type StorySources = Record<StoryId, Record<ArgsHash, SourceItem>>;

export interface SourceContextProps {
  sources: StorySources;
  setSource?: (id: StoryId, item: SourceItem) => void;
}

export const SourceContext: Context<SourceContextProps> = createContext({ sources: {} });

type SnippetRenderedEvent = {
  id: StoryId;
  source: string;
  args?: Args;
  format?: SyntaxHighlighterFormatTypes;
};

export const UNKNOWN_ARGS_HASH = '--unknown--';

export const SourceContainer: FC<PropsWithChildren<{ channel: Channel }>> = ({
  children,
  channel,
}) => {
  const [sources, setSources] = useState<StorySources>({});

  useEffect(() => {
    const handleSnippetRendered = (
      idOrEvent: StoryId | SnippetRenderedEvent,
      inputSource: string = null,
      inputFormat: SyntaxHighlighterFormatTypes = false
    ) => {
      const {
        id,
        args = undefined,
        source,
        format,
      } = typeof idOrEvent === 'string'
        ? {
            id: idOrEvent,
            source: inputSource,
            format: inputFormat,
          }
        : idOrEvent;

      const hash = args ? argsHash(args) : UNKNOWN_ARGS_HASH;

      // optimization: if the source is the same, ignore the incoming event
      if (sources[id] && sources[id][hash] && sources[id][hash].code === source) {
        return;
      }

      setSources((current) => {
        const newSources = {
          ...current,
          [id]: {
            ...current[id],
            [hash]: { code: source, format },
          },
        };

        if (!deepEqual(current, newSources)) {
          return newSources;
        }
        return current;
      });
    };

    channel.on(SNIPPET_RENDERED, handleSnippetRendered);

    return () => channel.off(SNIPPET_RENDERED, handleSnippetRendered);
  }, []);

  return <SourceContext.Provider value={{ sources }}>{children}</SourceContext.Provider>;
};
