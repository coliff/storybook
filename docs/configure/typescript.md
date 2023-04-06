---
title: 'TypeScript'
---

Storybook provides an integrated [TypeScript](https://www.typescriptlang.org/) experience, including zero-configuration setup and built-in types for APIs, addons, and stories.

## Configure Storybook with TypeScript

Storybook's configuration file (i.e., `main.ts`) is defined as an ESM module written in TypeScript, providing you with the baseline configuration to support your existing framework while enabling you stricter type-checking and autocompletion in your editor. Below is an abridged configuration file and additional information about the various configuration elements.

<!-- prettier-ignore-start -->

<CodeSnippets
  paths={[
    'common/storybook-main-default-setup.ts.mdx',
  ]}
/>


<!-- prettier-ignore-end -->

| Configuration element | Description                                                                                                                                                                                              |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `stories`             | The array of globs that indicates the [location of your story files](#configure-story-loading), relative to `main.ts`                                                                                    |
| `staticDirs`          | Sets a list of directories of [static files](./images-and-assets.md#serving-static-files-via-storybook-configuration) to be loaded by Storybook <br/> `staticDirs:['../public']`                         |
| `addons`              | Sets the list of [addons](https://storybook.js.org/addons/) loaded by Storybook <br/> `addons: ['@storybook/addon-essentials']`                                                                          |
| `typescript`          | Configures how Storybook handles [TypeScript files](#extending-the-default-configuration) <br/> `typescript: { check: false, checkOptions: {} }`                                                         |
| `framework`           | Configures Storybook based on a set of [framework-specific](./frameworks.md) settings <br/> `framework: { name: '@storybook/svelte-vite', options:{} }`                                                  |
| `core`                | Configures Storybook's internal features.<br/> `core: { disableTelemetry: true, }`                                                                                                                       |
| `docs`                | Configures Storybook's [auto-generated documentation](../writing-docs/docs-page.md)<br/> `docs: { autodocs: 'tag' }`                                                                                     |
| `features`            | Enables Storybook's additional features<br/> See table below for a list of available features `features: { storyStoreV7: true }`                                                                         |
| `refs`                | Configures [Storybook composition](../sharing/storybook-composition.md) <br/> `refs:{ example: { title: 'ExampleStorybook', url:'https://your-url.com' } }`                                              |
| `logLevel`            | Configures Storybook's logs in the browser terminal. Useful for debugging <br/> `logLevel: 'debug'`                                                                                                      |
| `webpackFinal`        | Customize Storybook's [Webpack](../builders/webpack.md) setup <br/> `webpackFinal: async (config:any) => { return config; }`                                                                             |
| `viteFinal`           | Customize Storybook's Vite setup when using the [vite builder](https://github.com/storybookjs/builder-vite) <br/> `viteFinal: async (config: Vite.InlineConfig, options: Options) => { return config; }` |
| `env`                 | Defines custom Storybook [environment variables](./environment-variables.md#using-storybook-configuration). <br/> `env: (config) => ({...config, EXAMPLE_VAR: 'Example var' }),`                         |

<div class="aside">

💡 See the Vite builder [TypeScript documentation](https://github.com/storybookjs/builder-vite#typescript) if using `@storybook/builder-vite`.

</div>

### Extending the default configuration

Out of the box, Storybook is built to work with a wide range of third-party libraries, enabling you to safely access and document metadata (e.g., props, inputs) from your components without any additional configuration. It relies on [`babel-loader`](https://webpack.js.org/loaders/babel-loader/) for TypeScript support and optionally [`fork-ts-checker-webpack-plugin`](https://github.com/TypeStrong/fork-ts-checker-webpack-plugin/blob/v4.1.6/README.md#options) for type checking. Since Storybook supports multiple frameworks, it also includes a set of third-party packages to support each framework (e.g., `ts-loader` and `ngx-template-loader` for Angular, `react-docgen-typescript-plugin` for React). If you need to customize the default configuration for a specific use case scenario, you can extend the default configuration to suit your needs. Listed below are some examples and a table with the available options.

<!-- prettier-ignore-start -->

<CodeSnippets
  paths={[
    'common/storybook-main-add-ts-config.ts.mdx',
  ]}
/>

<!-- prettier-ignore-end -->

| Field                            | Framework | Description                                                                                 | Type                                                                                                              |
| :------------------------------- | :-------- | :------------------------------------------------------------------------------------------ | :---------------------------------------------------------------------------------------------------------------- |
| **check**                        | All       | Optionally run fork-ts-checker-webpack-plugin                                               | boolean                                                                                                           |
| **checkOptions**                 | All       | Options to pass to fork-ts-checker-webpack-plugin if it's enabled                           | <a href="https://github.com/TypeStrong/fork-ts-checker-webpack-plugin/blob/v4.1.6/README.md#options">See Docs</a> |
| **reactDocgen**                  | React     | Which react docgen processor to run: `"react-docgen-typescript"`, `"react-docgen"`, `false` | string or false                                                                                                   |
| **reactDocgenTypescriptOptions** | React     | Options to pass to react-docgen-typescript-plugin if react-docgen-typescript is enabled.    | [See docs](https://github.com/hipstersmoothie/react-docgen-typescript-plugin)                                     |

The above example extends the baseline configuration to remove existing props from third-party libraries. Useful if you want to document only your components. However, if you need to include them, you can do so by adjusting your configuration as follows:

<!-- prettier-ignore-start -->

<CodeSnippets
  paths={[
    'common/storybook-main-extend-ts-config.ts.mdx',
  ]}
/>

<!-- prettier-ignore-end -->

## Write stories with TypeScript

Storybook provides zero-config TypeScript support, allowing you to write stories using this language without additional configuration. You can use this format for improved type safety and code completion. For example, if you're testing a `Button` component, you could do the following in your story file:

<!-- prettier-ignore-start -->

<CodeSnippets
  paths={[
    'angular/button-story-baseline.ts.mdx',
    'web-components/button-story-baseline.ts.mdx',
    'common/button-story-baseline.ts.mdx',
  ]}
/>

<!-- prettier-ignore-end -->

The example above uses the power of TypeScript in combination with the exported generic types (`Meta` and `StoryObj`) to tell Storybook how to infer the component's metadata and the type of the component's inputs (e.g., props). This can greatly improve the developer experience by letting your IDE show you what properties are injected by Storybook.

### TypeScript 4.9 support

Assuming that you're working on a project that uses TypeScript 4.9+, you can update your component stories to use the new [`satisfies`](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-4-9.html) operator to ensure stricter type checking for your component stories. For example:

<!-- prettier-ignore-start -->

<CodeSnippets
  paths={[
    'common/button-story-baseline-with-satisfies.ts-4-9.mdx',
  ]}
/>

<!-- prettier-ignore-end -->

Now, when you define a story or update an existing one, you'll automatically get notified that you're missing a required [`arg`](../writing-stories/args). However, you're not limited to using the `satisfies` operator at the component level. If you need, you can also use it at the story level. For example:

<!-- prettier-ignore-start -->

<CodeSnippets
  paths={[
    'common/button-story-baseline-with-satisfies-story-level.ts-4-9.mdx',
  ]}
/>

<!-- prettier-ignore-end -->

## Troubleshooting

### The `satisfies` operator is not working as expected

Out of the box, Storybook supports the `satisfies` operator for almost every framework already using TypeScript version 4.9 or higher. However, due to the constraints of the Angular and Web Components framework, you might run into issues when applying this operator for additional type safety. This is primarily due to how both frameworks are currently implemented, making it almost impossible for Storybook to determine if the component property is required. If you encounter this issue, we recommend reaching out to the maintainers using the default communication channels (e.g., [Discord server](https://discord.com/channels/486522875931656193/570426522528382976), [GitHub discussion](https://github.com/storybookjs/storybook/discussions/20988)).

### The TypeScript auto-completion is not working on my editor

If you're using Vue single file components and TypeScript, you can add both [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar) and the [TypeScript Vue Plugin](https://marketplace.visualstudio.com/items?itemName=Vue.vscode-typescript-vue-plugin) for editor support, additional type safety and auto-completion. Nevertheless, if you're working with Svelte, you can add the [Svelte for VSCode extension](https://marketplace.visualstudio.com/items?itemName=svelte.svelte-vscode) for similar benefits.
