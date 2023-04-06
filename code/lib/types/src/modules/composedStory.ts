/* eslint-disable @typescript-eslint/naming-convention */

import type { Renderer } from '@storybook/csf';

import type {
  AnnotatedStoryFn,
  Args,
  ComponentAnnotations,
  Parameters,
  StoryAnnotations,
  StoryContext,
  StoryFn,
} from './csf';

import type { ProjectAnnotations } from './story';

// TODO -- I think the name "CSFExports" overlaps here a bit with the types in csfFile.ts
// we might want to reconcile @yannbf
export type Store_CSFExports<TRenderer extends Renderer = Renderer, TArgs extends Args = Args> = {
  default: ComponentAnnotations<TRenderer, TArgs>;
  __esModule?: boolean;
  __namedExportsOrder?: string[];
};

export type ComposedStoryPlayContext<TRenderer extends Renderer = Renderer, TArgs = Args> = Partial<
  StoryContext<TRenderer, TArgs> & Pick<StoryContext<TRenderer, TArgs>, 'canvasElement'>
>;

export type ComposedStoryPlayFn<TRenderer extends Renderer = Renderer, TArgs = Args> = (
  context: ComposedStoryPlayContext<TRenderer, TArgs>
) => Promise<void> | void;

export type PreparedStoryFn<TRenderer extends Renderer = Renderer, TArgs = Args> = AnnotatedStoryFn<
  TRenderer,
  TArgs
> & { play: ComposedStoryPlayFn<TRenderer, TArgs>; args: TArgs };

export type ComposedStory<TRenderer extends Renderer = Renderer, TArgs = Args> =
  | StoryFn<TRenderer, TArgs>
  | StoryAnnotations<TRenderer, TArgs>;

/**
 * T represents the whole ES module of a stories file. K of T means named exports (basically the Story type)
 * 1. pick the keys K of T that have properties that are Story<AnyProps>
 * 2. infer the actual prop type for each Story
 * 3. reconstruct Story with Partial. Story<Props> -> Story<Partial<Props>>
 */
export type StoriesWithPartialProps<TRenderer extends Renderer, TModule> = {
  // @TODO once we can use Typescript 4.0 do this to exclude nonStory exports:
  // replace [K in keyof TModule] with [K in keyof TModule as TModule[K] extends ComposedStory<any> ? K : never]
  [K in keyof TModule]: TModule[K] extends ComposedStory<infer _, infer TProps>
    ? PreparedStoryFn<TRenderer, Partial<TProps>>
    : unknown;
};

export interface ComposeStoryFn<TRenderer extends Renderer = Renderer, TArgs extends Args = Args> {
  (
    storyAnnotations: AnnotatedStoryFn<TRenderer, TArgs> | StoryAnnotations<TRenderer, TArgs>,
    componentAnnotations: ComponentAnnotations<TRenderer, TArgs>,
    projectAnnotations: ProjectAnnotations<TRenderer>,
    exportsName?: string
  ): {
    (extraArgs: Partial<TArgs>): TRenderer['storyResult'];
    storyName: string;
    args: Args;
    play: ComposedStoryPlayFn<TRenderer, TArgs>;
    parameters: Parameters;
  };
}
