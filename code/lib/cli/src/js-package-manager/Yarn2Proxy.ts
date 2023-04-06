import { JsPackageManager } from './JsPackageManager';
import type { PackageJson } from './PackageJson';
import type { InstallationMetadata, PackageMetadata } from './types';
import { parsePackageData } from './util';

// This encompasses both yarn 2 and yarn 3
export class Yarn2Proxy extends JsPackageManager {
  readonly type = 'yarn2';

  installArgs: string[] | undefined;

  getInstallArgs(): string[] {
    if (!this.installArgs) {
      this.installArgs = [];
    }
    return this.installArgs;
  }

  initPackageJson() {
    return this.executeCommand('yarn', ['init']);
  }

  getRunStorybookCommand(): string {
    return 'yarn storybook';
  }

  getRunCommand(command: string): string {
    return `yarn ${command}`;
  }

  runPackageCommand(command: string, args: string[], cwd?: string): string {
    return this.executeCommand(`yarn`, [command, ...args], undefined, cwd);
  }

  public findInstallations(pattern: string[]) {
    const commandResult = this.executeCommand('yarn', [
      'info',
      '--name-only',
      '--recursive',
      pattern.map((p) => `"${p}"`).join(' '),
      `"${pattern}"`,
    ]);

    try {
      return this.mapDependencies(commandResult);
    } catch (e) {
      return undefined;
    }
  }

  protected getResolutions(packageJson: PackageJson, versions: Record<string, string>) {
    return {
      resolutions: {
        ...packageJson.resolutions,
        ...versions,
      },
    };
  }

  protected runInstall(): void {
    this.executeCommand('yarn', ['install', ...this.getInstallArgs()], 'inherit');
  }

  protected runAddDeps(dependencies: string[], installAsDevDependencies: boolean): void {
    let args = [...dependencies];

    if (installAsDevDependencies) {
      args = ['-D', ...args];
    }

    this.executeCommand('yarn', ['add', ...this.getInstallArgs(), ...args], 'inherit');
  }

  protected runRemoveDeps(dependencies: string[]): void {
    const args = [...dependencies];

    this.executeCommand('yarn', ['remove', ...this.getInstallArgs(), ...args], 'inherit');
  }

  protected runGetVersions<T extends boolean>(
    packageName: string,
    fetchAllVersions: T
  ): Promise<T extends true ? string[] : string> {
    const field = fetchAllVersions ? 'versions' : 'version';
    const args = ['--fields', field, '--json'];

    const commandResult = this.executeCommand('yarn', ['npm', 'info', packageName, ...args]);

    try {
      const parsedOutput = JSON.parse(commandResult);
      return parsedOutput[field];
    } catch (e) {
      throw new Error(`Unable to find versions of ${packageName} using yarn 2`);
    }
  }

  protected mapDependencies(input: string): InstallationMetadata {
    const lines = input.split('\n');
    const acc: Record<string, PackageMetadata[]> = {};
    const existingVersions: Record<string, string[]> = {};
    const duplicatedDependencies: Record<string, string[]> = {};

    lines.forEach((packageName) => {
      if (!packageName || !packageName.includes('storybook')) {
        return;
      }

      const { name, value } = parsePackageData(packageName.replaceAll(`"`, ''));
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
    });

    return {
      dependencies: acc,
      duplicatedDependencies,
      infoCommand: 'yarn why',
    };
  }
}
