import { resolveImports } from 'resolve-pkg-maps';
import { sync as readUpSync } from 'read-pkg-up';
import { dirname, join } from 'path';
import slash from 'slash';
import enhancedResolve from 'enhanced-resolve';
import { safeResolve, safeResolveFrom } from './safeResolve';

export const nodeResolver = (() => {
  const main = enhancedResolve.create.sync({
    extensions: ['.cjs', '.js'],
    mainFields: ['node', 'require', 'main'],
    conditionNames: ['node', 'require', 'default'],
    exportsFields: ['node', 'require', 'main'],
  });

  return (input: string, from: string = process.cwd()) => {
    try {
      return main({}, from, input);
    } catch (e) {
      return false;
    }
  };
})();

export const browserResolver = (() => {
  const main = enhancedResolve.create.sync({
    extensions: ['.mjs', '.js', '.jsx', '.ts', '.tsx', '.json'],
    mainFields: ['browser', 'module', 'main'],
    conditionNames: ['browser', 'import', 'default'],
    exportsFields: ['browser', 'module', 'main'],
    symlinks: true,
  });

  return (input: string, from: string = process.cwd()) => {
    try {
      return main({}, from, input);
    } catch (e) {
      return false;
    }
  };
})();

export const safeResolveAll = (
  name: string,
  configDir: string
):
  | undefined
  | {
      managerFile: string | false;
      registerFile: string | false;
      fallback: string | false;
      previewFile: string | false;
      previewFileAbsolute: string | false;
      presetFile: string | false;
    } => {
  const defaults = {
    managerFile: false,
    fallback: false,
    registerFile: false,
    previewFile: false,
    previewFileAbsolute: false,
    presetFile: false,
  } as const;

  const resolve = name.startsWith('/') ? safeResolve : safeResolveFrom.bind(null, configDir);
  const path = resolve(name);

  if (!path) {
    return undefined;
  }

  const pkg = readUpSync({ cwd: dirname(path) });

  if (!pkg) {
    return { ...defaults, fallback: path };
  }

  const resolvedNode = nodeResolver(name, configDir);
  const resolvedBrowser = browserResolver(name, configDir);

  if (
    resolvedBrowser &&
    resolvedBrowser.match(/\/(manager|register(-panel)?)(\.(js|mjs|ts|tsx|jsx))?$/)
  ) {
    return {
      ...defaults,
      managerFile: resolvedBrowser,
    };
  }
  if (resolvedNode && resolvedNode.match(/\/(preset)(\.(js|mjs|ts|tsx|jsx))?$/)) {
    return {
      ...defaults,
      presetFile: resolvedNode,
    };
  }

  const dir = dirname(pkg?.path);
  const pkgMap = pkg.packageJson?.exports;

  const resolveFromExportsBrowser = (input: string) => {
    try {
      const conditions = ['browser', 'import', 'default'];
      const paths = resolveImports(pkgMap, input, conditions);
      return slash(join(dir, paths[0]));
    } catch (e) {
      return false;
    }
  };
  const resolveFromExportsNode = (input: string) => {
    try {
      const conditions = ['node', 'require', 'default'];
      const paths = resolveImports(pkgMap, input, conditions);
      return browserResolver(slash(join(name, paths[0])));
    } catch (e) {
      return false;
    }
  };

  const resolveBrowser = (input: string) => {
    return browserResolver(`${name}/${input}`, dir) || resolveFromExportsBrowser(`./${input}`);
  };
  const resolveNode = (input: string) => {
    return nodeResolver(`${name}/${input}`, dir) || resolveFromExportsNode(`./${input}`);
  };

  const managerFile = resolveBrowser('manager');
  const registerFile = resolveBrowser('register') || resolveBrowser('register-panel');
  const previewFile = resolveBrowser('preview');

  const previewFileAbsolute = browserResolver(`${name}/preview`, dir);
  const presetFile = resolveNode(`preset`);

  return {
    ...defaults,
    managerFile,
    registerFile,
    previewFile,
    previewFileAbsolute,
    presetFile,
    fallback: path,
  };
};
