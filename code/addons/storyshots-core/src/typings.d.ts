/* eslint-disable no-underscore-dangle */
/* eslint-disable @typescript-eslint/naming-convention */
declare module 'jest-preset-angular/*';
declare module 'preact-render-to-string/jsx';
declare module 'react-test-renderer*';
declare module 'rax-test-renderer*';

declare module '@storybook/babel-plugin-require-context-hook/register';

declare var STORYBOOK_ENV: any;
declare var STORIES: any;

declare var FEATURES:
  | {
      storyStoreV7?: boolean;
      argTypeTargetsV7?: boolean;
    }
  | undefined;

declare var __STORYBOOK_STORY_STORE__: any;
declare var __requireContext: any;
