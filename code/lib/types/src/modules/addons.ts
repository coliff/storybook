/* eslint-disable @typescript-eslint/naming-convention */

import type { RenderData as RouterData } from '../../../router/src/types';
import type { ThemeVars } from '../../../theming/src/types';
import type {
  Args,
  ArgsStoryFn as ArgsStoryFnForFramework,
  DecoratorFunction as DecoratorFunctionForFramework,
  InputType,
  Renderer,
  LegacyStoryFn as LegacyStoryFnForFramework,
  LoaderFunction as LoaderFunctionForFramework,
  Parameters,
  PartialStoryFn as PartialStoryFnForFramework,
  StoryContext as StoryContextForFramework,
  StoryFn as StoryFnForFramework,
  StoryId,
  StoryKind,
  StoryName,
} from './csf';
import type { IndexEntry } from './storyIndex';

export type Addon_Types = Addon_TypesEnum | string;

export interface Addon_ArgType<TArg = unknown> extends InputType {
  defaultValue?: TArg;
}

export type Addons_ArgTypes<TArgs = Args> = {
  [key in keyof Partial<TArgs>]: Addon_ArgType<TArgs[key]>;
} & {
  // for custom defined args
  [key in string]: Addon_ArgType<unknown>;
};

export type Addon_Comparator<T> = ((a: T, b: T) => boolean) | ((a: T, b: T) => number);
export type Addon_StorySortMethod = 'configure' | 'alphabetical';
export interface Addon_StorySortObjectParameter {
  method?: Addon_StorySortMethod;
  order?: any[];
  locales?: string;
  includeNames?: boolean;
}

// The `any` here is the story store's `StoreItem` record. Ideally we should probably only
// pass a defined subset of that full data, but we pass it all so far :shrug:
export type IndexEntryLegacy = [StoryId, any, Parameters, Parameters];
export type Addon_StorySortComparator = Addon_Comparator<IndexEntryLegacy>;
export type Addon_StorySortParameter = Addon_StorySortComparator | Addon_StorySortObjectParameter;
export type Addon_StorySortComparatorV7 = Addon_Comparator<IndexEntry>;
export type Addon_StorySortParameterV7 =
  | Addon_StorySortComparatorV7
  | Addon_StorySortObjectParameter;

// TODO: remove all these types, they belong in the renderer and csf-package

export interface Addon_OptionsParameter extends Object {
  storySort?: Addon_StorySortParameter;
  theme?: {
    base: string;
    brandTitle?: string;
  };
  [key: string]: any;
}

export interface Addon_OptionsParameterV7 extends Object {
  storySort?: Addon_StorySortParameterV7;
  theme?: {
    base: string;
    brandTitle?: string;
  };
  [key: string]: any;
}

export type Addon_StoryContext<TRenderer extends Renderer = Renderer> =
  StoryContextForFramework<TRenderer>;
export type Addon_StoryContextUpdate = Partial<Addon_StoryContext>;

type Addon_ReturnTypeFramework<ReturnType> = {
  component: any;
  storyResult: ReturnType;
  canvasElement: any;
};
export type Addon_PartialStoryFn<ReturnType = unknown> = PartialStoryFnForFramework<
  Addon_ReturnTypeFramework<ReturnType>
>;
export type Addon_LegacyStoryFn<ReturnType = unknown> = LegacyStoryFnForFramework<
  Addon_ReturnTypeFramework<ReturnType>
>;
export type Addon_ArgsStoryFn<ReturnType = unknown> = ArgsStoryFnForFramework<
  Addon_ReturnTypeFramework<ReturnType>
>;
export type Addon_StoryFn<ReturnType = unknown> = StoryFnForFramework<
  Addon_ReturnTypeFramework<ReturnType>
>;

export type Addon_DecoratorFunction<StoryFnReturnType = unknown> = DecoratorFunctionForFramework<
  Addon_ReturnTypeFramework<StoryFnReturnType>
>;
export type Addon_LoaderFunction = LoaderFunctionForFramework<Addon_ReturnTypeFramework<unknown>>;

export interface Addon_WrapperSettings {
  options: object;
  parameters: {
    [key: string]: any;
  };
}

export type Addon_StoryWrapper = (
  storyFn: Addon_LegacyStoryFn,
  context: Addon_StoryContext,
  settings: Addon_WrapperSettings
) => any;

export type Addon_MakeDecoratorResult = (...args: any) => any;

export interface Addon_AddStoryArgs<StoryFnReturnType = unknown> {
  id: StoryId;
  kind: StoryKind;
  name: StoryName;
  storyFn: Addon_StoryFn<StoryFnReturnType>;
  parameters: Parameters;
}

export interface Addon_ClientApiAddon<StoryFnReturnType = unknown> extends Addon_Type {
  apply: (a: Addon_StoryApi<StoryFnReturnType>, b: any[]) => any;
}
export interface Addon_ClientApiAddons<StoryFnReturnType> {
  [key: string]: Addon_ClientApiAddon<StoryFnReturnType>;
}

export type Addon_ClientApiReturnFn<StoryFnReturnType = unknown> = (
  ...args: any[]
) => Addon_StoryApi<StoryFnReturnType>;

export interface Addon_StoryApi<StoryFnReturnType = unknown> {
  kind: StoryKind;
  add: (
    storyName: StoryName,
    storyFn: Addon_StoryFn<StoryFnReturnType>,
    parameters?: Parameters
  ) => Addon_StoryApi<StoryFnReturnType>;
  addDecorator: (
    decorator: Addon_DecoratorFunction<StoryFnReturnType>
  ) => Addon_StoryApi<StoryFnReturnType>;
  addLoader: (decorator: Addon_LoaderFunction) => Addon_StoryApi<StoryFnReturnType>;
  addParameters: (parameters: Parameters) => Addon_StoryApi<StoryFnReturnType>;
  [k: string]: string | Addon_ClientApiReturnFn<StoryFnReturnType>;
}

export interface Addon_ClientStoryApi<StoryFnReturnType = unknown> {
  storiesOf(kind: StoryKind, module: any): Addon_StoryApi<StoryFnReturnType>;
}

export type Addon_LoadFn = () => any;
export type Addon_RequireContext = any; // FIXME
export type Addon_Loadable = Addon_RequireContext | [Addon_RequireContext] | Addon_LoadFn;

// CSF types, to be re-org'ed in 6.1

export type Addon_BaseDecorators<StoryFnReturnType> = Array<
  (story: () => StoryFnReturnType, context: Addon_StoryContext) => StoryFnReturnType
>;

export interface Addon_BaseAnnotations<TArgs, StoryFnReturnType> {
  /**
   * Dynamic data that are provided (and possibly updated by) Storybook and its addons.
   * @see [Arg story inputs](https://storybook.js.org/docs/react/api/csf#args-story-inputs)
   */
  args?: Partial<TArgs>;

  /**
   * ArgTypes encode basic metadata for args, such as `name`, `description`, `defaultValue` for an arg. These get automatically filled in by Storybook Docs.
   * @see [Control annotations](https://github.com/storybookjs/storybook/blob/91e9dee33faa8eff0b342a366845de7100415367/addons/controls/README.md#control-annotations)
   */
  argTypes?: Addons_ArgTypes<TArgs>;

  /**
   * Custom metadata for a story.
   * @see [Parameters](https://storybook.js.org/docs/basics/writing-stories/#parameters)
   */
  parameters?: Parameters;

  /**
   * Wrapper components or Storybook decorators that wrap a story.
   *
   * Decorators defined in Meta will be applied to every story variation.
   * @see [Decorators](https://storybook.js.org/docs/addons/introduction/#1-decorators)
   */
  decorators?: Addon_BaseDecorators<StoryFnReturnType>;

  /**
   * Define a custom render function for the story(ies). If not passed, a default render function by the framework will be used.
   */
  render?: (args: TArgs, context: Addon_StoryContext) => StoryFnReturnType;

  /**
   * Function that is executed after the story is rendered.
   */
  play?: (context: Addon_StoryContext) => Promise<void> | void;
}

export interface Addon_Annotations<TArgs, StoryFnReturnType>
  extends Addon_BaseAnnotations<TArgs, StoryFnReturnType> {
  /**
   * Used to only include certain named exports as stories. Useful when you want to have non-story exports such as mock data or ignore a few stories.
   * @example
   * includeStories: ['SimpleStory', 'ComplexStory']
   * includeStories: /.*Story$/
   *
   * @see [Non-story exports](https://storybook.js.org/docs/formats/component-story-format/#non-story-exports)
   */
  includeStories?: string[] | RegExp;

  /**
   * Used to exclude certain named exports. Useful when you want to have non-story exports such as mock data or ignore a few stories.
   * @example
   * excludeStories: ['simpleData', 'complexData']
   * excludeStories: /.*Data$/
   *
   * @see [Non-story exports](https://storybook.js.org/docs/formats/component-story-format/#non-story-exports)
   */
  excludeStories?: string[] | RegExp;
}

export interface Addon_BaseMeta<ComponentType> {
  /**
   * Title of the story which will be presented in the navigation. **Should be unique.**
   *
   * Stories can be organized in a nested structure using "/" as a separator.
   *
   * Since CSF 3.0 this property is optional.
   *
   * @example
   * export default {
   *   ...
   *   title: 'Design System/Atoms/Button'
   * }
   *
   * @see [Story Hierarchy](https://storybook.js.org/docs/basics/writing-stories/#story-hierarchy)
   */
  title?: string;

  /**
   * Manually set the id of a story, which in particular is useful if you want to rename stories without breaking permalinks.
   *
   * Storybook will prioritize the id over the title for ID generation, if provided, and will prioritize the story.storyName over the export key for display.
   *
   * @see [Sidebar and URLs](https://storybook.js.org/docs/react/configure/sidebar-and-urls#permalinking-to-stories)
   */
  id?: string;

  /**
   * The primary component for your story.
   *
   * Used by addons for automatic prop table generation and display of other component metadata.
   */
  component?: ComponentType;

  /**
   * Auxiliary subcomponents that are part of the stories.
   *
   * Used by addons for automatic prop table generation and display of other component metadata.
   *
   * @example
   * import { Button, ButtonGroup } from './components';
   *
   * export default {
   *   ...
   *   subcomponents: { Button, ButtonGroup }
   * }
   *
   * By defining them each component will have its tab in the args table.
   *
   * @deprecated
   */
  subcomponents?: Record<string, ComponentType>;
}

export type Addon_BaseStoryObject<TArgs, StoryFnReturnType> = {
  /**
   * Override the display name in the UI
   */
  storyName?: string;
};

export type Addon_BaseStoryFn<TArgs, StoryFnReturnType> = {
  (args: TArgs, context: Addon_StoryContext): StoryFnReturnType;
} & Addon_BaseStoryObject<TArgs, StoryFnReturnType>;

export type BaseStory<TArgs, StoryFnReturnType> =
  | Addon_BaseStoryFn<TArgs, StoryFnReturnType>
  | Addon_BaseStoryObject<TArgs, StoryFnReturnType>;

export interface Addon_RenderOptions {
  active?: boolean;
  key?: string;
}

export type ReactJSXElement = {
  type: any;
  props: any;
  key: any;
};

export interface Addon_Type {
  title: (() => string) | string | ReactJSXElement;
  type?: Addon_Types;
  id?: string;
  route?: (routeOptions: RouterData) => string;
  match?: (matchOptions: RouterData) => boolean;
  render: (renderOptions: Addon_RenderOptions) => any | null;
  paramKey?: string;
  disabled?: boolean;
  hidden?: boolean;
}

export type Addon_Loader<API> = (api: API) => void;

export interface Addon_Loaders<API> {
  [key: string]: Addon_Loader<API>;
}
export interface Addon_Collection {
  [key: string]: Addon_Type;
}
export interface Addon_Elements {
  [key: string]: Addon_Collection;
}
export interface Addon_ToolbarConfig {
  hidden?: boolean;
}
export interface Addon_Config {
  theme?: ThemeVars;
  toolbar?: {
    [id: string]: Addon_ToolbarConfig;
  };
  [key: string]: any;
}

export enum Addon_TypesEnum {
  TAB = 'tab',
  PANEL = 'panel',
  TOOL = 'tool',
  TOOLEXTRA = 'toolextra',
  PREVIEW = 'preview',
  NOTES_ELEMENT = 'notes-element',
}
