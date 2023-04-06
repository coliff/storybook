# Getting started

- Ensure you have node version 16 installed (suggestion: v16.5).
- Ensure if you are using Windows to use the Windows Subsystem for Linux (WSL).
- Run `yarn start` in the root directory to run a basic test Storybook "sandbox".

The `yarn start` script will generate a React Vite TypeScript sandbox with a set of test stories inside it, as well as taking all steps required to get it running (building the various packages we need etc). There is no need to run `yarn` or `yarn install` as `yarn start` will do this for you.

# Running against different sandbox templates

You can also pick a specific template to use as your sandbox by running `yarn task`, which will prompt you to make further choices about which template you want and which task you want to run.

# Making code changes

If you want to make code changes to Storybook packages while running a sandbox, you'll need to do the following:

1. In a second terminal run `yarn build --watch <package-1> <package-2>` in the `code/` directory. The package names is the bit after the `@storybook/` in the published package. For instance, to build the `@storybook/react @storybook/core-server @storybook/api @storybook/addon-docs` packages at the same time in watch mode:

```bash
cd code
yarn build --watch react core-server api addon-docs
```

2. If you are running the sandbox in "linked" mode (the default), you should see the changes reflected on a refresh (you may need to restart it if changing server packages)

3. If you are running the sandbox in "unlinked" mode you'll need to re-run the sandbox from the `publish` step to see the changes:

```
yarn task --task dev --template <your template> --start-from=publish
```

# Contributing to Storybook

For further advice on how to contribute, please refer to our [NEW contributing guide on the Storybook website](https://storybook.js.org/docs/next/react/contribute/how-to-contribute).
