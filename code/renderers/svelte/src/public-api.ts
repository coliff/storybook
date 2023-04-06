import { start } from '@storybook/preview-api';
import { decorateStory } from './decorators';

import type { SvelteRenderer } from './types';
import { render, renderToCanvas } from './render';

const {
  configure: coreConfigure,
  clientApi,
  forceReRender,
} = start<SvelteRenderer>(renderToCanvas, {
  decorateStory,
  render,
});

export const { raw } = clientApi;

const RENDERER = 'svelte';
export const storiesOf = (kind: string, m: any) =>
  clientApi.storiesOf(kind, m).addParameters({ renderer: RENDERER });
export const configure = (...args: any[]) => coreConfigure(RENDERER, ...args);

export { forceReRender };
