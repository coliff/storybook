/* eslint-disable @typescript-eslint/naming-convention */

import type { RenderData } from '../../../router/src/types';
import type { Channel } from '../../../channels/src';
import type { ThemeVars } from '../../../theming/src/types';
import type { ViewMode } from './csf';
import type { DocsOptions } from './core-common';
import type { API_HashEntry, API_IndexHash } from './api-stories';
import type { SetStoriesStory, SetStoriesStoryData } from './channelApi';
import type { Addon_Type } from './addons';
import type { StoryIndex } from './storyIndex';

export type API_ViewMode = 'story' | 'info' | 'settings' | 'page' | undefined | string;

export interface API_RenderOptions {
  active: boolean;
  key: string;
}

export interface API_RouteOptions {
  storyId: string;
  viewMode: API_ViewMode;
  location: RenderData['location'];
  path: string;
}
export interface API_MatchOptions {
  storyId: string;
  viewMode: API_ViewMode;
  location: RenderData['location'];
  path: string;
}

export type API_Addon = Addon_Type;

export interface API_Collection<T = API_Addon> {
  [key: string]: T;
}

export type API_Panels = API_Collection<API_Addon>;

export type API_StateMerger<S> = (input: S) => S;

export interface API_ProviderData<API> {
  provider: API_Provider<API>;
  docsOptions: DocsOptions;
}

export interface API_Provider<API> {
  channel?: Channel;
  serverChannel?: Channel;
  renderPreview?: API_IframeRenderer;
  handleAPI(api: API): void;
  getConfig(): {
    sidebar?: API_SidebarOptions;
    theme?: ThemeVars;
    StoryMapper?: API_StoryMapper;
    [k: string]: any;
  } & Partial<API_UIOptions>;
  [key: string]: any;
}

export type API_IframeRenderer = (
  storyId: string,
  viewMode: ViewMode,
  id: string,
  baseUrl: string,
  scale: number,
  queryParams: Record<string, any>
) => any;

export interface API_UIOptions {
  name?: string;
  url?: string;
  goFullScreen: boolean;
  showStoriesPanel: boolean;
  showAddonPanel: boolean;
  addonPanelInRight: boolean;
  theme?: ThemeVars;
  selectedPanel?: string;
}

export interface API_Layout {
  initialActive: API_ActiveTabsType;
  isFullscreen: boolean;
  showPanel: boolean;
  panelPosition: API_PanelPositions;
  showNav: boolean;
  showTabs: boolean;
  showToolbar: boolean;
  /**
   * @deprecated
   */
  isToolshown?: boolean;
}

export interface API_UI {
  name?: string;
  url?: string;
  enableShortcuts: boolean;
}

export type API_PanelPositions = 'bottom' | 'right';
export type API_ActiveTabsType = 'sidebar' | 'canvas' | 'addons';

export interface API_SidebarOptions {
  showRoots?: boolean;
  collapsedRoots?: string[];
  renderLabel?: (item: API_HashEntry) => any;
}

export interface API_Notification {
  id: string;
  link: string;
  content: {
    headline: string;
    subHeadline?: string | any;
  };

  icon?: {
    name: string;
    color?: string;
  };
  onClear?: () => void;
}

type API_Versions = Record<string, string>;

export type API_SetRefData = Partial<
  API_ComposedRef & {
    setStoriesData: SetStoriesStoryData;
    storyIndex: StoryIndex;
  }
>;

export type API_StoryMapper = (ref: API_ComposedRef, story: SetStoriesStory) => SetStoriesStory;

export interface API_LoadedRefData {
  index?: API_IndexHash;
  indexError?: Error;
  previewInitialized: boolean;
}

export interface API_ComposedRef extends API_LoadedRefData {
  id: string;
  title?: string;
  url: string;
  type?: 'auto-inject' | 'unknown' | 'lazy' | 'server-checked';
  expanded?: boolean;
  versions?: API_Versions;
  loginUrl?: string;
  version?: string;
}

export type API_ComposedRefUpdate = Partial<
  Pick<
    API_ComposedRef,
    | 'title'
    | 'type'
    | 'expanded'
    | 'index'
    | 'versions'
    | 'loginUrl'
    | 'version'
    | 'indexError'
    | 'previewInitialized'
  >
>;

export type API_Refs = Record<string, API_ComposedRef>;
export type API_RefId = string;
export type API_RefUrl = string;
