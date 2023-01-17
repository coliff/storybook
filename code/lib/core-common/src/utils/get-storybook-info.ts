import path from 'path';
import fse from 'fs-extra';
import type { CoreCommon_StorybookInfo, PackageJson } from '@storybook/types';
import { getStorybookConfiguration } from './get-storybook-configuration';

const rendererPackages: Record<string, string> = {
  '@storybook/react': 'react',
  '@storybook/vue': 'vue',
  '@storybook/vue3': 'vue3',
  '@storybook/angular': 'angular',
  '@storybook/html': 'html',
  '@storybook/web-components': 'web-components',
  '@storybook/polymer': 'polymer',
  '@storybook/ember': 'ember',
  '@storybook/marko': 'marko',
  '@storybook/mithril': 'mithril',
  '@storybook/riot': 'riot',
  '@storybook/svelte': 'svelte',
  '@storybook/preact': 'preact',
  '@storybook/rax': 'rax',
  '@storybook/server': 'server',
};

const logger = console;

const findDependency = (
  { dependencies, devDependencies, peerDependencies }: PackageJson,
  predicate: (entry: [string, string | undefined]) => string
) => [
  Object.entries(dependencies || {}).find(predicate),
  Object.entries(devDependencies || {}).find(predicate),
  Object.entries(peerDependencies || {}).find(predicate),
];

const getRendererInfo = (packageJson: PackageJson, frameworkPackage?: string) => {
  // Pull the viewlayer from dependencies in package.json
  let [dep, devDep, peerDep] =
    frameworkPackage && rendererPackages[frameworkPackage]
      ? [
          packageJson.dependencies?.[frameworkPackage]
            ? [frameworkPackage, packageJson.dependencies?.[frameworkPackage]]
            : undefined,
          packageJson.devDependencies?.[frameworkPackage]
            ? [frameworkPackage, packageJson.devDependencies?.[frameworkPackage]]
            : undefined,
          packageJson.peerDependencies?.[frameworkPackage]
            ? [frameworkPackage, packageJson.peerDependencies?.[frameworkPackage]]
            : undefined,
        ]
      : [undefined];
  if (!frameworkPackage || (!dep && !devDep && !peerDep)) {
    const [depF, devDepF, peerDepF] = findDependency(packageJson, ([key]) => rendererPackages[key]);
    dep = depF;
    devDep = devDepF;
    peerDep = peerDepF;
  }

  const [pkg, version] = dep || devDep || peerDep || [];
  const renderer = pkg ? rendererPackages[pkg] : undefined;

  logger.info(`Found renderer "${renderer}" in package.json dependencies`);

  if (dep && devDep && dep[0] === devDep[0]) {
    logger.warn(
      `Found "${dep[0]}" in both "dependencies" and "devDependencies". This is probably a mistake.`
    );
  }
  if (dep && peerDep && dep[0] === peerDep[0]) {
    logger.warn(
      `Found "${dep[0]}" in both "dependencies" and "peerDependencies". This is probably a mistake.`
    );
  }

  return {
    version,
    framework: renderer,
    frameworkPackage: pkg,
    renderer,
    rendererPackage: pkg,
  };
};

const validConfigExtensions = ['ts', 'js', 'tsx', 'jsx', 'mjs', 'cjs'];

const findConfigFile = (prefix: string, configDir: string) => {
  const filePrefix = path.join(configDir, prefix);
  const extension = validConfigExtensions.find((ext: string) =>
    fse.existsSync(`${filePrefix}.${ext}`)
  );
  return extension ? `${filePrefix}.${extension}` : null;
};

const getConfigInfo = (packageJson: PackageJson, configDir?: string) => {
  let storybookConfigDir = configDir ?? '.storybook';
  const storybookScript = packageJson.scripts?.['storybook'];
  if (storybookScript && !configDir) {
    const configParam = getStorybookConfiguration(storybookScript, '-c', '--config-dir');
    if (configParam) storybookConfigDir = configParam;
  }

  return {
    configDir,
    mainConfig: findConfigFile('main', storybookConfigDir),
    previewConfig: findConfigFile('preview', storybookConfigDir),
    managerConfig: findConfigFile('manager', storybookConfigDir),
  };
};

export const getStorybookInfo = (
  packageJson: PackageJson,
  configDir?: string,
  frameworkPackage?: string
) => {
  const rendererInfo = getRendererInfo(packageJson, frameworkPackage);
  const configInfo = getConfigInfo(packageJson, configDir);

  return {
    ...rendererInfo,
    ...configInfo,
  } as CoreCommon_StorybookInfo;
};
