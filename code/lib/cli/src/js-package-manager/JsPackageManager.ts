import chalk from 'chalk';
import { gt, satisfies } from 'semver';
import { sync as spawnSync } from 'cross-spawn';
import path from 'path';
import fs from 'fs';

import { commandLog } from '../helpers';
import type { PackageJson, PackageJsonWithDepsAndDevDeps } from './PackageJson';
import storybookPackagesVersions from '../versions';
import type { InstallationMetadata } from './types';
import { HandledError } from '../HandledError';

const logger = console;

export type PackageManagerName = 'npm' | 'yarn1' | 'yarn2' | 'pnpm';

/**
 * Extract package name and version from input
 *
 * @param pkg A string like `@storybook/cli`, `react` or `react@^16`
 * @return A tuple of 2 elements: [packageName, packageVersion]
 */
export function getPackageDetails(pkg: string): [string, string?] {
  const idx = pkg.lastIndexOf('@');
  // If the only `@` is the first character, it is a scoped package
  // If it isn't in the string, it will be -1
  if (idx <= 0) {
    return [pkg, undefined];
  }
  const packageName = pkg.slice(0, idx);
  const packageVersion = pkg.slice(idx + 1);
  return [packageName, packageVersion];
}

interface JsPackageManagerOptions {
  cwd?: string;
}
export abstract class JsPackageManager {
  public abstract readonly type: PackageManagerName;

  public abstract initPackageJson(): void;

  public abstract getRunStorybookCommand(): string;

  public abstract getRunCommand(command: string): string;

  // NOTE: for some reason yarn prefers the npm registry in
  // local development, so always use npm
  setRegistryURL(url: string) {
    if (url) {
      this.executeCommand('npm', ['config', 'set', 'registry', url]);
    } else {
      this.executeCommand('npm', ['config', 'delete', 'registry']);
    }
  }

  getRegistryURL() {
    const url = this.executeCommand('npm', ['config', 'get', 'registry']).trim();
    return url === 'undefined' ? undefined : url;
  }

  public readonly cwd?: string;

  constructor(options?: JsPackageManagerOptions) {
    this.cwd = options?.cwd;
  }

  /**
   * Install dependencies listed in `package.json`
   */
  public installDependencies(): void {
    let done = commandLog('Preparing to install dependencies');
    done();
    logger.log();

    logger.log();
    done = commandLog('Installing dependencies');

    try {
      this.runInstall();
    } catch (e) {
      done('An error occurred while installing dependencies.');
      throw new HandledError(e);
    }
    done();
  }

  packageJsonPath(): string {
    return this.cwd ? path.resolve(this.cwd, 'package.json') : path.resolve('package.json');
  }

  readPackageJson(): PackageJson {
    const packageJsonPath = this.packageJsonPath();
    if (!fs.existsSync(packageJsonPath)) {
      throw new Error(`Could not read package.json file at ${packageJsonPath}`);
    }

    const jsonContent = fs.readFileSync(packageJsonPath, 'utf8');
    return JSON.parse(jsonContent);
  }

  writePackageJson(packageJson: PackageJson) {
    const packageJsonToWrite = { ...packageJson };
    // make sure to not accidentally add empty fields
    if (
      packageJsonToWrite.dependencies &&
      Object.keys(packageJsonToWrite.dependencies).length === 0
    ) {
      delete packageJsonToWrite.dependencies;
    }
    if (
      packageJsonToWrite.devDependencies &&
      Object.keys(packageJsonToWrite.devDependencies).length === 0
    ) {
      delete packageJsonToWrite.devDependencies;
    }
    if (
      packageJsonToWrite.dependencies &&
      Object.keys(packageJsonToWrite.peerDependencies).length === 0
    ) {
      delete packageJsonToWrite.peerDependencies;
    }

    const content = `${JSON.stringify(packageJsonToWrite, null, 2)}\n`;
    fs.writeFileSync(this.packageJsonPath(), content, 'utf8');
  }

  /**
   * Read the `package.json` file available in the directory the command was call from
   * If there is no `package.json` it will create one.
   */
  public retrievePackageJson(): PackageJsonWithDepsAndDevDeps {
    let packageJson;
    try {
      packageJson = this.readPackageJson();
    } catch (err) {
      this.initPackageJson();
      packageJson = this.readPackageJson();
    }

    return {
      ...packageJson,
      dependencies: { ...packageJson.dependencies },
      devDependencies: { ...packageJson.devDependencies },
      peerDependencies: { ...packageJson.peerDependencies },
    };
  }

  public getAllDependencies(): Record<string, string> {
    const { dependencies, devDependencies, peerDependencies } = this.retrievePackageJson();

    return {
      ...dependencies,
      ...devDependencies,
      ...peerDependencies,
    };
  }

  /**
   * Add dependencies to a project using `yarn add` or `npm install`.
   *
   * @param {Object} options contains `skipInstall`, `packageJson` and `installAsDevDependencies` which we use to determine how we install packages.
   * @param {Array} dependencies contains a list of packages to add.
   * @example
   * addDependencies(options, [
   *   `@storybook/react@${storybookVersion}`,
   *   `@storybook/addon-actions@${actionsVersion}`,
   *   `@storybook/addon-links@${linksVersion}`,
   *   `@storybook/preview-api@${addonsVersion}`,
   * ]);
   */
  public addDependencies(
    options: {
      skipInstall?: boolean;
      installAsDevDependencies?: boolean;
      packageJson?: PackageJson;
    },
    dependencies: string[]
  ): void {
    const { skipInstall } = options;

    if (skipInstall) {
      const { packageJson } = options;

      const dependenciesMap = dependencies.reduce((acc, dep) => {
        const [packageName, packageVersion] = getPackageDetails(dep);
        return { ...acc, [packageName]: packageVersion };
      }, {});

      if (options.installAsDevDependencies) {
        packageJson.devDependencies = {
          ...packageJson.devDependencies,
          ...dependenciesMap,
        };
      } else {
        packageJson.dependencies = {
          ...packageJson.dependencies,
          ...dependenciesMap,
        };
      }
      this.writePackageJson(packageJson);
    } else {
      try {
        this.runAddDeps(dependencies, options.installAsDevDependencies);
      } catch (e) {
        logger.error('An error occurred while installing dependencies.');
        logger.log(e.message);
        throw new HandledError(e);
      }
    }
  }

  /**
   * Remove dependencies from a project using `yarn remove` or `npm uninstall`.
   *
   * @param {Object} options contains `skipInstall`, `packageJson` and `installAsDevDependencies` which we use to determine how we install packages.
   * @param {Array} dependencies contains a list of packages to remove.
   * @example
   * removeDependencies(options, [
   *   `@storybook/react`,
   *   `@storybook/addon-actions`,
   * ]);
   */
  public removeDependencies(
    options: {
      skipInstall?: boolean;
      packageJson?: PackageJson;
    },
    dependencies: string[]
  ): void {
    const { skipInstall } = options;

    if (skipInstall) {
      const { packageJson } = options;

      dependencies.forEach((dep) => {
        if (packageJson.devDependencies) {
          delete packageJson.devDependencies[dep];
        }
        if (packageJson.dependencies) {
          delete packageJson.dependencies[dep];
        }
      });

      this.writePackageJson(packageJson);
    } else {
      try {
        this.runRemoveDeps(dependencies);
      } catch (e) {
        logger.error('An error occurred while removing dependencies.');
        logger.log(e.message);
        throw new HandledError(e);
      }
    }
  }

  /**
   * Return an array of strings matching following format: `<package_name>@<package_latest_version>`
   *
   * @param packages
   */
  public getVersionedPackages(packages: string[]): Promise<string[]> {
    return Promise.all(
      packages.map(async (pkg) => {
        const [packageName, packageVersion] = getPackageDetails(pkg);
        return `${packageName}@${await this.getVersion(packageName, packageVersion)}`;
      })
    );
  }

  /**
   * Return an array of string standing for the latest version of the input packages.
   * To be able to identify which version goes with which package the order of the input array is keep.
   *
   * @param packageNames
   */
  public getVersions(...packageNames: string[]): Promise<string[]> {
    return Promise.all(
      packageNames.map((packageName) => {
        return this.getVersion(packageName);
      })
    );
  }

  /**
   * Return the latest version of the input package available on npmjs registry.
   * If constraint are provided it return the latest version matching the constraints.
   *
   * For `@storybook/*` packages the latest version is retrieved from `cli/src/versions.json` file directly
   *
   * @param packageName The name of the package
   * @param constraint A valid semver constraint, example: '1.x || >=2.5.0 || 5.0.0 - 7.2.3'
   */
  public async getVersion(packageName: string, constraint?: string): Promise<string> {
    let current: string;

    if (/(@storybook|^sb$|^storybook$)/.test(packageName)) {
      // @ts-expect-error (Converted from ts-ignore)
      current = storybookPackagesVersions[packageName];
    }

    let latest;
    try {
      latest = await this.latestVersion(packageName, constraint);
    } catch (e) {
      if (current) {
        logger.warn(`\n     ${chalk.yellow(e.message)}`);
        return current;
      }

      logger.error(`\n     ${chalk.red(e.message)}`);
      throw new HandledError(e);
    }

    const versionToUse =
      current && (!constraint || satisfies(current, constraint)) && gt(current, latest)
        ? current
        : latest;
    return `^${versionToUse}`;
  }

  /**
   * Get the latest version of the package available on npmjs.com.
   * If constraint is set then it returns a version satisfying it, otherwise the latest version available is returned.
   *
   * @param packageName Name of the package
   * @param constraint Version range to use to constraint the returned version
   */
  public async latestVersion(packageName: string, constraint?: string): Promise<string> {
    if (!constraint) {
      return this.runGetVersions(packageName, false);
    }

    const versions = await this.runGetVersions(packageName, true);

    // Get the latest version satisfying the constraint
    return versions.reverse().find((version) => satisfies(version, constraint));
  }

  public addStorybookCommandInScripts(options?: { port: number; preCommand?: string }) {
    const sbPort = options?.port ?? 6006;
    const storybookCmd = `storybook dev -p ${sbPort}`;

    const buildStorybookCmd = `storybook build`;

    const preCommand = options?.preCommand ? this.getRunCommand(options.preCommand) : undefined;
    this.addScripts({
      storybook: [preCommand, storybookCmd].filter(Boolean).join(' && '),
      'build-storybook': [preCommand, buildStorybookCmd].filter(Boolean).join(' && '),
    });
  }

  public addESLintConfig() {
    const packageJson = this.retrievePackageJson();
    this.writePackageJson({
      ...packageJson,
      eslintConfig: {
        ...packageJson.eslintConfig,
        overrides: [
          ...(packageJson.eslintConfig?.overrides || []),
          {
            files: ['**/*.stories.*'],
            rules: {
              'import/no-anonymous-default-export': 'off',
            },
          },
        ],
      },
    });
  }

  public addScripts(scripts: Record<string, string>) {
    const packageJson = this.retrievePackageJson();
    this.writePackageJson({
      ...packageJson,
      scripts: {
        ...packageJson.scripts,
        ...scripts,
      },
    });
  }

  public addPackageResolutions(versions: Record<string, string>) {
    const packageJson = this.retrievePackageJson();
    const resolutions = this.getResolutions(packageJson, versions);
    this.writePackageJson({ ...packageJson, ...resolutions });
  }

  protected abstract runInstall(): void;

  protected abstract runAddDeps(dependencies: string[], installAsDevDependencies: boolean): void;

  protected abstract runRemoveDeps(dependencies: string[]): void;

  protected abstract getResolutions(
    packageJson: PackageJson,
    versions: Record<string, string>
  ): Record<string, any>;

  /**
   * Get the latest or all versions of the input package available on npmjs.com
   *
   * @param packageName Name of the package
   * @param fetchAllVersions Should return
   */
  protected abstract runGetVersions<T extends boolean>(
    packageName: string,
    fetchAllVersions: T
  ): // Use generic and conditional type to force `string[]` if fetchAllVersions is true and `string` if false
  Promise<T extends true ? string[] : string>;

  public abstract runPackageCommand(command: string, args: string[], cwd?: string): string;
  public abstract findInstallations(pattern?: string[]): InstallationMetadata | undefined;

  public executeCommand(
    command: string,
    args: string[],
    stdio?: 'pipe' | 'inherit',
    cwd?: string
  ): string {
    const commandResult = spawnSync(command, args, {
      cwd: cwd ?? this.cwd,
      stdio: stdio ?? 'pipe',
      encoding: 'utf-8',
      shell: true,
    });

    if (commandResult.status !== 0) {
      throw new Error(commandResult.stderr ?? '');
    }

    return commandResult.stdout ?? '';
  }
}
