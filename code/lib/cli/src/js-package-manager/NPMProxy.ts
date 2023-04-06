import sort from 'semver/functions/sort';
import { platform } from 'os';
import { JsPackageManager } from './JsPackageManager';
import type { PackageJson } from './PackageJson';
import type { InstallationMetadata, PackageMetadata } from './types';

type NpmDependency = {
  version: string;
  resolved?: string;
  overridden?: boolean;
  dependencies?: NpmDependencies;
};

type NpmDependencies = {
  [key: string]: NpmDependency;
};

export type NpmListOutput = {
  dependencies: NpmDependencies;
};

export class NPMProxy extends JsPackageManager {
  readonly type = 'npm';

  installArgs: string[] | undefined;

  initPackageJson() {
    return this.executeCommand('npm', ['init', '-y']);
  }

  getRunStorybookCommand(): string {
    return 'npm run storybook';
  }

  getRunCommand(command: string): string {
    return `npm run ${command}`;
  }

  getNpmVersion(): string {
    return this.executeCommand('npm', ['--version']);
  }

  getInstallArgs(): string[] {
    if (!this.installArgs) {
      this.installArgs = [];
    }
    return this.installArgs;
  }

  public runPackageCommand(command: string, args: string[], cwd?: string): string {
    return this.executeCommand(`npm`, ['exec', '--', command, ...args], undefined, cwd);
  }

  public findInstallations() {
    const pipeToNull = platform() === 'win32' ? '2>NUL' : '2>/dev/null';
    const commandResult = this.executeCommand('npm', ['ls', '--json', '--depth=99', pipeToNull]);

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
    this.executeCommand('npm', ['install', ...this.getInstallArgs()], 'inherit');
  }

  protected runAddDeps(dependencies: string[], installAsDevDependencies: boolean): void {
    let args = [...dependencies];

    if (installAsDevDependencies) {
      args = ['-D', ...args];
    }

    this.executeCommand('npm', ['install', ...this.getInstallArgs(), ...args], 'inherit');
  }

  protected runRemoveDeps(dependencies: string[]): void {
    const args = [...dependencies];

    this.executeCommand('npm', ['uninstall', ...this.getInstallArgs(), ...args], 'inherit');
  }

  protected runGetVersions<T extends boolean>(
    packageName: string,
    fetchAllVersions: T
  ): Promise<T extends true ? string[] : string> {
    const args = [fetchAllVersions ? 'versions' : 'version', '--json'];

    const commandResult = this.executeCommand('npm', ['info', packageName, ...args]);

    try {
      const parsedOutput = JSON.parse(commandResult);

      if (parsedOutput.error) {
        // FIXME: improve error handling
        throw new Error(parsedOutput.error.summary);
      } else {
        return parsedOutput;
      }
    } catch (e) {
      throw new Error(`Unable to find versions of ${packageName} using npm`);
    }
  }

  protected mapDependencies(input: NpmListOutput): InstallationMetadata {
    const acc: Record<string, PackageMetadata[]> = {};
    const existingVersions: Record<string, string[]> = {};
    const duplicatedDependencies: Record<string, string[]> = {};

    const recurse = ([name, packageInfo]: [string, NpmDependency]): void => {
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
        existingVersions[name] = sort([...(existingVersions[name] || []), value.version]);

        if (existingVersions[name].length > 1) {
          duplicatedDependencies[name] = existingVersions[name];
        }
      }

      if (packageInfo.dependencies) {
        Object.entries(packageInfo.dependencies).forEach(recurse);
      }
    };

    Object.entries(input.dependencies).forEach(recurse);

    return {
      dependencies: acc,
      duplicatedDependencies,
      infoCommand: 'npm ls --depth=1',
    };
  }
}
