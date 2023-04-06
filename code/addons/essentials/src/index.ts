import { isAbsolute, join } from 'path';
import { pathExists, pathExistsSync } from 'fs-extra';
import { serverRequire } from '@storybook/core-common';
import type { StorybookConfig } from '@storybook/types';

const subAddons = [
  'docs',
  'controls',
  'actions',
  'backgrounds',
  'viewport',
  'toolbars',
  'measure',
  'outline',
  'highlight',
] as const;

type SubAddons = keyof typeof subAddons;

type PresetOptions = {
  configDir: string;
} & Record<SubAddons, boolean>;

const requireMain = (configDir: string): StorybookConfig => {
  const absoluteConfigDir = isAbsolute(configDir) ? configDir : join(process.cwd(), configDir);
  const mainFile = join(absoluteConfigDir, 'main');

  return serverRequire(mainFile) ?? {};
};

const checkIsDefineInMainAlready = (addonName: SubAddons, main: any) => {
  const addon = `@storybook/addon-${String(addonName)}`;
  const existingAddon = main.addons?.find((entry: string | { name: string }) => {
    const name = typeof entry === 'string' ? entry : entry.name;
    return name?.startsWith(addon);
  });
  return !!existingAddon;
};

const filter = (entry: SubAddons, options: PresetOptions, main: StorybookConfig) => {
  if (options[entry] === false) {
    return false;
  }
  if (checkIsDefineInMainAlready(entry, main)) {
    return false;
  }

  return true;
};

export async function managerEntries(entry: string[], options: PresetOptions) {
  const main = requireMain(options.configDir);
  const list = await Promise.all(
    subAddons
      .filter((e: any) => filter(e, options, main))
      .map(async (key) => {
        const p = join(__dirname, key, 'manager.mjs');
        const exists = await pathExists(p);

        return exists ? p : null;
      })
  );

  return [...entry, ...list].filter(Boolean);
}

export async function previewEntries(entry: string[], options: PresetOptions) {
  const main = requireMain(options.configDir);
  const list = await Promise.all(
    subAddons
      .filter((e: any) => filter(e, options, main))
      .map(async (key) => {
        const p = join(__dirname, key, 'preview.mjs');
        const exists = await pathExists(p);

        return exists ? p : null;
      })
  );

  return [...entry, ...list].filter(Boolean);
}

export function addons(options: PresetOptions) {
  const main = requireMain(options.configDir);
  const list = subAddons
    .filter((e: any) => filter(e, options, main))
    .map((key) => {
      const p = join(__dirname, key, 'preset.js');
      const exists = pathExistsSync(p);

      return exists ? p : null;
    });

  return list.filter(Boolean);
}
