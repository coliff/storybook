import { pathExistsSync } from 'fs-extra';
import { JsPackageManager } from './JsPackageManager';
import type { PackageJson } from './PackageJson';
import type { InstallationMetadata, PackageMetadata } from './types';

type PnpmDependency = {
  from: string;
  version: string;
  resolved: string;
  dependencies?: PnpmDependencies;
};

type PnpmDependencies = {
  [key: string]: PnpmDependency;
};

type PnpmListItem = {
  dependencies: PnpmDependencies;
  peerDependencies: PnpmDependencies;
  devDependencies: PnpmDependencies;
};

export type PnpmListOutput = PnpmListItem[];

export class PNPMProxy extends JsPackageManager {
  readonly type = 'pnpm';

  installArgs: string[] | undefined;

  detectWorkspaceRoot() {
    const CWD = process.cwd();

    const pnpmWorkspaceYaml = `${CWD}/pnpm-workspace.yaml`;
    return pathExistsSync(pnpmWorkspaceYaml);
  }

  initPackageJson() {
    return this.executeCommand('pnpm', ['init', '-y']);
  }

  getRunStorybookCommand(): string {
    return 'pnpm run storybook';
  }

  getRunCommand(command: string): string {
    return `pnpm run ${command}`;
  }

  getPnpmVersion(): string {
    return this.executeCommand('pnpm', ['--version']);
  }

  getInstallArgs(): string[] {
    if (!this.installArgs) {
      this.installArgs = [];

      if (this.detectWorkspaceRoot()) {
        this.installArgs.push('-w');
      }
    }
    return this.installArgs;
  }

  runPackageCommand(command: string, args: string[], cwd?: string): string {
    return this.executeCommand(`pnpm`, ['exec', command, ...args], undefined, cwd);
  }

  public findInstallations(pattern: string[]) {
    const commandResult = this.executeCommand('pnpm', [
      'list',
      pattern.map((p) => `"${p}"`).join(' '),
      '--json',
      '--depth=99',
    ]);

    try {
      const parsedOutput = JSON.parse(commandResult);
      return this.mapDependencies(parsedOutput);
    } catch (e) {
      return undefined;
    }
  }

  protected getResolutions(packageJson: PackageJson, versions: Record<string, string>) {
    return {
      overrides: {
        ...packageJson.overrides,
        ...versions,
      },
    };
  }

  protected runInstall(): void {
    this.executeCommand('pnpm', ['install', ...this.getInstallArgs()], 'inherit');
  }

  protected runAddDeps(dependencies: string[], installAsDevDependencies: boolean): void {
    let args = [...dependencies];

    if (installAsDevDependencies) {
      args = ['-D', ...args];
    }

    this.executeCommand('pnpm', ['add', ...args, ...this.getInstallArgs()], 'inherit');
  }

  protected runRemoveDeps(dependencies: string[]): void {
    const args = [...dependencies];

    this.executeCommand('pnpm', ['remove', ...args, ...this.getInstallArgs()], 'inherit');
  }

  protected runGetVersions<T extends boolean>(
    packageName: string,
    fetchAllVersions: T
  ): Promise<T extends true ? string[] : string> {
    const args = [fetchAllVersions ? 'versions' : 'version', '--json'];

    const commandResult = this.executeCommand('pnpm', ['info', packageName, ...args]);

    try {
      const parsedOutput = JSON.parse(commandResult);

      if (parsedOutput.error) {
        // FIXME: improve error handling
        throw new Error(parsedOutput.error.summary);
      } else {
        return parsedOutput;
      }
    } catch (e) {
      throw new Error(`Unable to find versions of ${packageName} using pnpm`);
    }
  }

  protected mapDependencies(input: PnpmListOutput): InstallationMetadata {
    const acc: Record<string, PackageMetadata[]> = {};
    const existingVersions: Record<string, string[]> = {};
    const duplicatedDependencies: Record<string, string[]> = {};
    const items: PnpmDependencies = input.reduce((curr, item) => {
      const { devDependencies, dependencies, peerDependencies } = item;
      const allDependencies = { ...devDependencies, ...dependencies, ...peerDependencies };
      return Object.assign(curr, allDependencies);
    }, {} as PnpmDependencies);

    const recurse = ([name, packageInfo]: [string, PnpmDependency]): void => {
      if (!name || !name.includes('storybook')) return;

      const value = {
        version: packageInfo.version,
        location: '',
      };

      if (!existingVersions[name]?.includes(value.version)) {
        if (acc[name]) {
          acc[name].push(value);
        } else {
          acc[name] = [value];
        }
        existingVersions[name] = [...(existingVersions[name] || []), value.version];

        if (existingVersions[name].length > 1) {
          duplicatedDependencies[name] = existingVersions[name];
        }
      }

      if (packageInfo.dependencies) {
        Object.entries(packageInfo.dependencies).forEach(recurse);
      }
    };
    Object.entries(items).forEach(recurse);

    return {
      dependencies: acc,
      duplicatedDependencies,
      infoCommand: 'pnpm list --depth=1',
    };
  }
}
