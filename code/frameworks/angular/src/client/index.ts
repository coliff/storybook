/// <reference types="webpack-env" />

import './globals';

// eslint-disable-next-line import/export
export * from './public-api';
// eslint-disable-next-line import/export
export * from './public-types';

export type { StoryFnAngularReturnType as IStory } from './types';

export { moduleMetadata, componentWrapperDecorator, applicationConfig } from './decorators';

// optimization: stop HMR propagation in webpack
module?.hot?.decline();
