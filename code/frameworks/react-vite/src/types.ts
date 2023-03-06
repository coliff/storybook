import type {
  StorybookConfig as StorybookConfigBase,
  TypescriptOptions as TypescriptOptionsBase,
} from '@storybook/types';
import type { StorybookConfigVite, BuilderOptions } from '@storybook/builder-vite';
import type docgenTypescript from '@joshwooding/vite-plugin-react-docgen-typescript';

type FrameworkName = '@storybook/react-vite';
type BuilderName = '@storybook/builder-vite';

export type FrameworkOptions = {
  builder?: BuilderOptions;
};

type StorybookConfigFramework = {
  framework:
    | FrameworkName
    | {
        name: FrameworkName;
        options: FrameworkOptions;
      };
  core?: StorybookConfigBase['core'] & {
    builder?:
      | BuilderName
      | {
          name: BuilderName;
          options: BuilderOptions;
        };
  };
};

type TypescriptOptions = TypescriptOptionsBase & {
  /**
   * Sets the type of Docgen when working with React and TypeScript
   *
   * @default `'react-docgen-typescript'`
   */
  reactDocgen: 'react-docgen-typescript' | 'react-docgen' | false;
  /**
   * Configures `@joshwooding/vite-plugin-react-docgen-typescript`
   */
  reactDocgenTypescriptOptions: Parameters<typeof docgenTypescript>[0];
};

/**
 * The interface for Storybook configuration in `main.ts` files.
 */
export type StorybookConfig = Omit<
  StorybookConfigBase,
  keyof StorybookConfigVite | keyof StorybookConfigFramework
> &
  StorybookConfigVite &
  StorybookConfigFramework & {
    typescript?: Partial<TypescriptOptions>;
  };
