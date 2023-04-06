import type { StorybookConfig } from '@storybook/types';

export type SkippableTask =
  | 'smoke-test'
  | 'test-runner'
  | 'test-runner-dev'
  | 'chromatic'
  | 'e2e-tests'
  | 'e2e-tests-dev';
export type TemplateKey = keyof typeof baseTemplates | keyof typeof internalTemplates;
export type Cadence = keyof typeof templatesByCadence;

export type Template = {
  /**
   * Readable name for the template, which will be used for feedback and the status page
   */
  name: string;
  /**
   * Script used to generate the base project of a template.
   * The Storybook CLI will then initialize Storybook on top of that template.
   * This is used to generate projects which are pushed to https://github.com/storybookjs/sandboxes
   */
  script: string;
  /**
   * Used to assert various things about the generated template.
   * If the template is generated with a different expected framework, it will fail, detecting a possible regression.
   */
  expected: {
    framework: string;
    renderer: string;
    builder: string;
  };

  expectedFailures?: Array<{
    feature: string;
    issues: string[];
  }>;

  unsupportedFeatures?: Array<{
    feature: string;
    issues: string[];
  }>;
  /**
   * Some sandboxes might not work properly in specific tasks temporarily, but we might
   * still want to run the other tasks. Set the ones to skip in this property.
   */
  skipTasks?: SkippableTask[];
  /**
   * Set this only while developing a newly created framework, to avoid using it in CI.
   * NOTE: Make sure to always add a TODO comment to remove this flag in a subsequent PR.
   */
  inDevelopment?: boolean;
  /**
   * Some sandboxes might need extra modifications in the initialized Storybook,
   * such as extend main.js, for setting specific feature flags like storyStoreV7, etc.
   */
  modifications?: {
    mainConfig?: Partial<StorybookConfig>;
  };
  /**
   * Flag to indicate that this template is a secondary template, which is used mainly to test rather specific features.
   * This means the template might be hidden from the Storybook status page or the repro CLI command.
   * */
  isInternal?: boolean;
};

const baseTemplates = {
  'cra/default-js': {
    name: 'Create React App (Javascript)',
    script: 'npx create-react-app .',
    expected: {
      // TODO: change this to @storybook/cra once that package is created
      framework: '@storybook/react-webpack5',
      renderer: '@storybook/react',
      builder: '@storybook/builder-webpack5',
    },
    skipTasks: ['e2e-tests-dev'],
  },
  'cra/default-ts': {
    name: 'Create React App (Typescript)',
    script: 'npx create-react-app . --template typescript',
    // Re-enable once https://github.com/storybookjs/storybook/issues/19351 is fixed.
    skipTasks: ['smoke-test'],
    expected: {
      // TODO: change this to @storybook/cra once that package is created
      framework: '@storybook/react-webpack5',
      renderer: '@storybook/react',
      builder: '@storybook/builder-webpack5',
    },
  },
  'nextjs/12-js': {
    name: 'Next.js v12 (JavaScript)',
    script:
      'yarn create next-app {{beforeDir}} -e https://github.com/vercel/next.js/tree/next-12-3-2/examples/hello-world && cd {{beforeDir}} && npm pkg set "dependencies.next"="^12.2.0" && yarn && git add . && git commit --amend --no-edit && cd ..',
    expected: {
      framework: '@storybook/nextjs',
      renderer: '@storybook/react',
      builder: '@storybook/builder-webpack5',
    },
    skipTasks: ['e2e-tests-dev'],
  },
  'nextjs/default-js': {
    name: 'Next.js (JavaScript)',
    script: 'yarn create next-app {{beforeDir}} --javascript --eslint',
    expected: {
      framework: '@storybook/nextjs',
      renderer: '@storybook/react',
      builder: '@storybook/builder-webpack5',
    },
    skipTasks: ['e2e-tests-dev'],
  },
  'nextjs/default-ts': {
    name: 'Next.js (TypeScript)',
    script: 'yarn create next-app {{beforeDir}} --typescript --eslint',
    expected: {
      framework: '@storybook/nextjs',
      renderer: '@storybook/react',
      builder: '@storybook/builder-webpack5',
    },
    skipTasks: ['e2e-tests-dev'],
  },
  'react-vite/default-js': {
    name: 'React Vite (JS)',
    script: 'yarn create vite . --template react',
    expected: {
      framework: '@storybook/react-vite',
      renderer: '@storybook/react',
      builder: '@storybook/builder-vite',
    },
    skipTasks: ['e2e-tests-dev'],
  },
  'react-vite/default-ts': {
    name: 'React Vite (TS)',
    script: 'yarn create vite . --template react-ts',
    expected: {
      framework: '@storybook/react-vite',
      renderer: '@storybook/react',
      builder: '@storybook/builder-vite',
    },
  },
  'react-webpack/18-ts': {
    name: 'React 18 Webpack5 (TS)',
    script: 'yarn create webpack5-react .',
    expected: {
      framework: '@storybook/react-webpack5',
      renderer: '@storybook/react',
      builder: '@storybook/builder-webpack5',
    },
    skipTasks: ['e2e-tests-dev'],
  },
  'react-webpack/17-ts': {
    name: 'React 17 Webpack5 (TS)',
    script: 'yarn create webpack5-react . --version-react="17" --version-react-dom="17"',
    expected: {
      framework: '@storybook/react-webpack5',
      renderer: '@storybook/react',
      builder: '@storybook/builder-webpack5',
    },
    skipTasks: ['e2e-tests-dev'],
  },
  'solid-vite/default-js': {
    name: 'SolidJS Vite (JS)',
    script: 'npx degit solidjs/templates/js .',
    expected: {
      framework: 'storybook-solidjs-vite',
      renderer: 'storybook-solidjs',
      builder: '@storybook/builder-vite',
    },
    // TODO: remove this once solid-vite framework is released
    inDevelopment: true,
    skipTasks: ['e2e-tests-dev'],
  },
  'solid-vite/default-ts': {
    name: 'SolidJS Vite (TS)',
    script: 'npx degit solidjs/templates/ts .',
    expected: {
      framework: 'storybook-solidjs-vite',
      renderer: 'storybook-solidjs',
      builder: '@storybook/builder-vite',
    },
    // TODO: remove this once solid-vite framework is released
    inDevelopment: true,
    skipTasks: ['e2e-tests-dev'],
  },
  'vue3-vite/default-js': {
    name: 'Vue3 Vite (JS)',
    script: 'yarn create vite . --template vue',
    expected: {
      framework: '@storybook/vue3-vite',
      renderer: '@storybook/vue3',
      builder: '@storybook/builder-vite',
    },
    skipTasks: ['e2e-tests-dev'],
  },
  'vue3-vite/default-ts': {
    name: 'Vue3 Vite (TS)',
    script: 'yarn create vite . --template vue-ts',
    expected: {
      framework: '@storybook/vue3-vite',
      renderer: '@storybook/vue3',
      builder: '@storybook/builder-vite',
    },
    skipTasks: ['e2e-tests-dev'],
  },
  'vue2-vite/2.7-js': {
    name: 'Vue2 Vite (vue 2.7 JS)',
    script: 'npx create-vue@2 {{beforeDir}} --default',
    expected: {
      framework: '@storybook/vue-vite',
      renderer: '@storybook/vue',
      builder: '@storybook/builder-vite',
    },
    // Remove smoke-test from the list once https://github.com/storybookjs/storybook/issues/19351 is fixed.
    skipTasks: ['smoke-test', 'e2e-tests-dev'],
  },
  'html-webpack/default': {
    name: 'HTML Webpack5',
    script: 'yarn create webpack5-html .',
    expected: {
      framework: '@storybook/html-webpack5',
      renderer: '@storybook/html',
      builder: '@storybook/builder-webpack5',
    },
    skipTasks: ['e2e-tests-dev'],
  },
  'html-vite/default-js': {
    name: 'HTML Vite JS',
    script: 'yarn create vite . --template vanilla && echo "export default {}" > vite.config.js',
    expected: {
      framework: '@storybook/html-vite',
      renderer: '@storybook/html',
      builder: '@storybook/builder-vite',
    },
    skipTasks: ['e2e-tests-dev'],
  },
  'html-vite/default-ts': {
    name: 'HTML Vite TS',
    script: 'yarn create vite . --template vanilla-ts && echo "export default {}" > vite.config.js',
    expected: {
      framework: '@storybook/html-vite',
      renderer: '@storybook/html',
      builder: '@storybook/builder-vite',
    },
    skipTasks: ['e2e-tests-dev'],
  },
  'svelte-vite/default-js': {
    name: 'Svelte Vite (JS)',
    script: 'yarn create vite . --template svelte',
    expected: {
      framework: '@storybook/svelte-vite',
      renderer: '@storybook/svelte',
      builder: '@storybook/builder-vite',
    },
    skipTasks: ['e2e-tests-dev'],
  },
  'svelte-vite/default-ts': {
    name: 'Svelte Vite (TS)',
    script: 'yarn create vite . --template svelte-ts',
    expected: {
      framework: '@storybook/svelte-vite',
      renderer: '@storybook/svelte',
      builder: '@storybook/builder-vite',
    },
    // Remove smoke-test from the list once https://github.com/storybookjs/storybook/issues/19351 is fixed.
    skipTasks: ['smoke-test', 'e2e-tests-dev'],
  },
  'angular-cli/default-ts': {
    name: 'Angular CLI (latest)',
    script:
      'npx -p @angular/cli ng new angular-latest --directory . --routing=true --minimal=true --style=scss --strict --skip-git --skip-install --package-manager=yarn',
    expected: {
      framework: '@storybook/angular',
      renderer: '@storybook/angular',
      builder: '@storybook/builder-webpack5',
    },
    skipTasks: ['e2e-tests-dev'],
  },
  'angular-cli/14-ts': {
    name: 'Angular CLI (Version 14)',
    script:
      'npx -p @angular/cli@14 ng new angular-v14 --directory . --routing=true --minimal=true --style=scss --strict --skip-git --skip-install --package-manager=yarn',
    expected: {
      framework: '@storybook/angular',
      renderer: '@storybook/angular',
      builder: '@storybook/builder-webpack5',
    },
    skipTasks: ['e2e-tests-dev'],
  },
  'svelte-kit/skeleton-js': {
    name: 'Svelte Kit (JS)',
    script:
      'yarn create svelte-with-args --name=svelte-kit/skeleton-js --directory=. --template=skeleton --types=null --no-prettier --no-eslint --no-playwright --no-vitest',
    expected: {
      framework: '@storybook/sveltekit',
      renderer: '@storybook/svelte',
      builder: '@storybook/builder-vite',
    },
    skipTasks: ['e2e-tests-dev'],
  },
  'svelte-kit/skeleton-ts': {
    name: 'Svelte Kit (TS)',
    script:
      'yarn create svelte-with-args --name=svelte-kit/skeleton-ts --directory=. --template=skeleton --types=typescript --no-prettier --no-eslint --no-playwright --no-vitest',
    expected: {
      framework: '@storybook/sveltekit',
      renderer: '@storybook/svelte',
      builder: '@storybook/builder-vite',
    },
    skipTasks: ['e2e-tests-dev'],
  },
  'lit-vite/default-js': {
    name: 'Lit Vite (JS)',
    script: 'yarn create vite . --template lit',
    expected: {
      framework: '@storybook/web-components-vite',
      renderer: '@storybook/web-components',
      builder: '@storybook/builder-vite',
    },
    // Remove smoke-test from the list once https://github.com/storybookjs/storybook/issues/19351 is fixed.
    skipTasks: ['smoke-test', 'e2e-tests-dev'],
  },
  'lit-vite/default-ts': {
    name: 'Lit Vite (TS)',
    script: 'yarn create vite . --template lit-ts',
    expected: {
      framework: '@storybook/web-components-vite',
      renderer: '@storybook/web-components',
      builder: '@storybook/builder-vite',
    },
    // Remove smoke-test from the list once https://github.com/storybookjs/storybook/issues/19351 is fixed.
    skipTasks: ['smoke-test', 'e2e-tests-dev'],
  },
  'vue-cli/default-js': {
    name: 'Vue-CLI (Default JS)',
    script: 'npx -p @vue/cli vue create . --default --packageManager=yarn --force --merge',
    expected: {
      framework: '@storybook/vue3-webpack5',
      renderer: '@storybook/vue3',
      builder: '@storybook/builder-webpack5',
    },
    // Remove smoke-test from the list once https://github.com/storybookjs/storybook/issues/19351 is fixed.
    skipTasks: ['smoke-test', 'e2e-tests-dev'],
  },
  'vue-cli/vue2-default-js': {
    name: 'Vue-CLI (Vue2 JS)',
    script:
      'npx -p @vue/cli vue create . --default --packageManager=yarn --force --merge --preset="Default (Vue 2)"',
    expected: {
      framework: '@storybook/vue-webpack5',
      renderer: '@storybook/vue',
      builder: '@storybook/builder-webpack5',
    },
    // Remove smoke-test from the list once https://github.com/storybookjs/storybook/issues/19351 is fixed.
    skipTasks: ['smoke-test', 'e2e-tests-dev'],
  },
  'preact-webpack5/default-js': {
    name: 'Preact CLI (Default JS)',
    script: 'npx preact-cli create default {{beforeDir}} --name preact-app --yarn --no-install',
    expected: {
      framework: '@storybook/preact-webpack5',
      renderer: '@storybook/preact',
      builder: '@storybook/builder-webpack5',
    },
    skipTasks: ['e2e-tests-dev'],
  },
  'preact-webpack5/default-ts': {
    name: 'Preact CLI (Default TS)',
    script: 'npx preact-cli create typescript {{beforeDir}} --name preact-app --yarn --no-install',
    expected: {
      framework: '@storybook/preact-webpack5',
      renderer: '@storybook/preact',
      builder: '@storybook/builder-webpack5',
    },
    skipTasks: ['e2e-tests-dev'],
  },
  'preact-vite/default-js': {
    name: 'Preact Vite (JS)',
    script: 'yarn create vite . --template preact',
    expected: {
      framework: '@storybook/preact-vite',
      renderer: '@storybook/preact',
      builder: '@storybook/builder-vite',
    },
    skipTasks: ['e2e-tests-dev'],
  },
  'preact-vite/default-ts': {
    name: 'Preact Vite (TS)',
    script: 'yarn create vite . --template preact-ts',
    expected: {
      framework: '@storybook/preact-vite',
      renderer: '@storybook/preact',
      builder: '@storybook/builder-vite',
    },
    skipTasks: ['e2e-tests-dev'],
  },
  'qwik-vite/default-ts': {
    name: 'Qwik CLI (Default TS)',
    script: 'yarn create qwik basic {{beforeDir}} --no-install',
    // TODO: The community template does not provide standard stories, which is required for e2e tests. Reenable once it does.
    inDevelopment: true,
    expected: {
      framework: 'storybook-framework-qwik',
      renderer: 'storybook-framework-qwik',
      builder: 'storybook-framework-qwik',
    },
    // TODO: The community template does not provide standard stories, which is required for e2e tests.
    skipTasks: ['e2e-tests', 'e2e-tests-dev'],
  },
} satisfies Record<string, Template>;

/**
 * Internal templates reuse config from other templates and add extra config on top.
 * They must contain an id that starts with 'internal/' and contain "isInternal: true".
 * They will be hidden by default in the Storybook status page.
 */
const internalTemplates = {
  'internal/ssv6-vite': {
    ...baseTemplates['react-vite/default-ts'],
    name: 'StoryStore v6 (react-vite/default-ts)',
    isInternal: true,
    modifications: {
      mainConfig: {
        features: {
          storyStoreV7: false,
          storyStoreV7MdxErrors: false,
        },
      },
    },
  },
  'internal/ssv6-webpack': {
    ...baseTemplates['cra/default-ts'],
    name: 'StoryStore v6 (cra/default-ts)',
    isInternal: true,
    modifications: {
      mainConfig: {
        features: {
          storyStoreV7: false,
          storyStoreV7MdxErrors: false,
        },
      },
    },
  },
  // 'internal/pnp': {
  //   ...baseTemplates['cra/default-ts'],
  //   name: 'PNP (cra/default-ts)',
  //   script: 'yarn create react-app . --use-pnp',
  //   isInternal: true,
  //   inDevelopment: true,
  // },
} satisfies Record<`internal/${string}`, Template & { isInternal: true }>;

export const allTemplates: Record<TemplateKey, Template> = {
  ...baseTemplates,
  ...internalTemplates,
};

export const ci: TemplateKey[] = ['cra/default-ts', 'react-vite/default-ts'];
export const pr: TemplateKey[] = [
  ...ci,
  'angular-cli/default-ts',
  'vue3-vite/default-ts',
  'vue-cli/vue2-default-js',
  'lit-vite/default-ts',
  'svelte-vite/default-ts',
  'svelte-kit/skeleton-ts',
  'nextjs/default-ts',
];
export const merged: TemplateKey[] = [
  ...pr,
  'react-webpack/18-ts',
  'react-webpack/17-ts',
  'angular-cli/14-ts',
  'preact-webpack5/default-ts',
  'preact-vite/default-ts',
  'html-webpack/default',
  'html-vite/default-ts',
  'internal/ssv6-vite',
  'internal/ssv6-webpack',
];
export const daily: TemplateKey[] = [
  ...merged,
  'cra/default-js',
  'react-vite/default-js',
  'vue3-vite/default-js',
  'vue2-vite/2.7-js',
  'vue-cli/default-js',
  'lit-vite/default-js',
  'svelte-kit/skeleton-js',
  'svelte-vite/default-js',
  'nextjs/12-js',
  'nextjs/default-js',
  'qwik-vite/default-ts',
  'preact-webpack5/default-js',
  'preact-vite/default-js',
  'html-vite/default-js',
];

export const templatesByCadence = { ci, pr, merged, daily };
