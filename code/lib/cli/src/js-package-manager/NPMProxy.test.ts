import { NPMProxy } from './NPMProxy';

describe('NPM Proxy', () => {
  let npmProxy: NPMProxy;

  beforeEach(() => {
    npmProxy = new NPMProxy();
  });

  it('type should be npm', () => {
    expect(npmProxy.type).toEqual('npm');
  });

  describe('initPackageJson', () => {
    it('should run `npm init -y`', () => {
      const executeCommandSpy = jest.spyOn(npmProxy, 'executeCommand').mockReturnValue('');

      npmProxy.initPackageJson();

      expect(executeCommandSpy).toHaveBeenCalledWith('npm', ['init', '-y']);
    });
  });

  describe('setRegistryUrl', () => {
    it('should run `npm config set registry https://foo.bar`', () => {
      const executeCommandSpy = jest.spyOn(npmProxy, 'executeCommand').mockReturnValue('');

      npmProxy.setRegistryURL('https://foo.bar');

      expect(executeCommandSpy).toHaveBeenCalledWith('npm', [
        'config',
        'set',
        'registry',
        'https://foo.bar',
      ]);
    });
  });

  describe('installDependencies', () => {
    describe('npm6', () => {
      it('should run `npm install`', () => {
        const executeCommandSpy = jest.spyOn(npmProxy, 'executeCommand').mockReturnValue('6.0.0');

        npmProxy.installDependencies();

        expect(executeCommandSpy).toHaveBeenLastCalledWith('npm', ['install'], expect.any(String));
      });
    });
    describe('npm7', () => {
      it('should run `npm install`', () => {
        const executeCommandSpy = jest.spyOn(npmProxy, 'executeCommand').mockReturnValue('7.1.0');

        npmProxy.installDependencies();

        expect(executeCommandSpy).toHaveBeenLastCalledWith('npm', ['install'], expect.any(String));
      });
    });
  });

  describe('runScript', () => {
    describe('npm6', () => {
      it('should execute script `npm exec -- compodoc -e json -d .`', () => {
        const executeCommandSpy = jest.spyOn(npmProxy, 'executeCommand').mockReturnValue('6.0.0');

        npmProxy.runPackageCommand('compodoc', ['-e', 'json', '-d', '.']);

        expect(executeCommandSpy).toHaveBeenLastCalledWith(
          'npm',
          ['exec', '--', 'compodoc', '-e', 'json', '-d', '.'],
          undefined,
          undefined
        );
      });
    });
    describe('npm7', () => {
      it('should execute script `npm run compodoc -- -e json -d .`', () => {
        const executeCommandSpy = jest.spyOn(npmProxy, 'executeCommand').mockReturnValue('7.1.0');

        npmProxy.runPackageCommand('compodoc', ['-e', 'json', '-d', '.']);

        expect(executeCommandSpy).toHaveBeenLastCalledWith(
          'npm',
          ['exec', '--', 'compodoc', '-e', 'json', '-d', '.'],
          undefined,
          undefined
        );
      });
    });
  });

  describe('addDependencies', () => {
    describe('npm6', () => {
      it('with devDep it should run `npm install -D @storybook/preview-api`', () => {
        const executeCommandSpy = jest.spyOn(npmProxy, 'executeCommand').mockReturnValue('6.0.0');

        npmProxy.addDependencies({ installAsDevDependencies: true }, ['@storybook/preview-api']);

        expect(executeCommandSpy).toHaveBeenLastCalledWith(
          'npm',
          ['install', '-D', '@storybook/preview-api'],
          expect.any(String)
        );
      });
    });
    describe('npm7', () => {
      it('with devDep it should run `npm install -D @storybook/preview-api`', () => {
        const executeCommandSpy = jest.spyOn(npmProxy, 'executeCommand').mockReturnValue('7.0.0');

        npmProxy.addDependencies({ installAsDevDependencies: true }, ['@storybook/preview-api']);

        expect(executeCommandSpy).toHaveBeenLastCalledWith(
          'npm',
          ['install', '-D', '@storybook/preview-api'],
          expect.any(String)
        );
      });
    });
  });

  describe('removeDependencies', () => {
    describe('npm6', () => {
      it('with devDep it should run `npm uninstall @storybook/preview-api`', () => {
        const executeCommandSpy = jest.spyOn(npmProxy, 'executeCommand').mockReturnValue('6.0.0');

        npmProxy.removeDependencies({}, ['@storybook/preview-api']);

        expect(executeCommandSpy).toHaveBeenLastCalledWith(
          'npm',
          ['uninstall', '@storybook/preview-api'],
          expect.any(String)
        );
      });
    });
    describe('npm7', () => {
      it('with devDep it should run `npm uninstall @storybook/preview-api`', () => {
        const executeCommandSpy = jest.spyOn(npmProxy, 'executeCommand').mockReturnValue('7.0.0');

        npmProxy.removeDependencies({}, ['@storybook/preview-api']);

        expect(executeCommandSpy).toHaveBeenLastCalledWith(
          'npm',
          ['uninstall', '@storybook/preview-api'],
          expect.any(String)
        );
      });
    });
    describe('skipInstall', () => {
      it('should only change package.json without running install', () => {
        const executeCommandSpy = jest.spyOn(npmProxy, 'executeCommand').mockReturnValue('7.0.0');
        const writePackageSpy = jest
          .spyOn(npmProxy, 'writePackageJson')
          .mockImplementation(jest.fn);

        npmProxy.removeDependencies(
          {
            skipInstall: true,
            packageJson: {
              devDependencies: {
                '@storybook/manager-webpack5': 'x.x.x',
                '@storybook/react': 'x.x.x',
              },
            },
          },
          ['@storybook/manager-webpack5']
        );

        expect(writePackageSpy).toHaveBeenCalledWith({
          devDependencies: {
            '@storybook/react': 'x.x.x',
          },
        });
        expect(executeCommandSpy).not.toHaveBeenCalled();
      });
    });
  });

  describe('latestVersion', () => {
    it('without constraint it returns the latest version', async () => {
      const executeCommandSpy = jest.spyOn(npmProxy, 'executeCommand').mockReturnValue('"5.3.19"');

      const version = await npmProxy.latestVersion('@storybook/preview-api');

      expect(executeCommandSpy).toHaveBeenCalledWith('npm', [
        'info',
        '@storybook/preview-api',
        'version',
        '--json',
      ]);
      expect(version).toEqual('5.3.19');
    });

    it('with constraint it returns the latest version satisfying the constraint', async () => {
      const executeCommandSpy = jest
        .spyOn(npmProxy, 'executeCommand')
        .mockReturnValue('["4.25.3","5.3.19","6.0.0-beta.23"]');

      const version = await npmProxy.latestVersion('@storybook/preview-api', '5.X');

      expect(executeCommandSpy).toHaveBeenCalledWith('npm', [
        'info',
        '@storybook/preview-api',
        'versions',
        '--json',
      ]);
      expect(version).toEqual('5.3.19');
    });

    it('throws an error if command output is not a valid JSON', async () => {
      jest.spyOn(npmProxy, 'executeCommand').mockReturnValue('NOT A JSON');

      await expect(npmProxy.latestVersion('@storybook/preview-api')).rejects.toThrow();
    });
  });

  describe('getVersion', () => {
    it('with a Storybook package listed in versions.json it returns the version', async () => {
      // eslint-disable-next-line global-require
      const storybookAngularVersion = require('../versions').default['@storybook/angular'];
      const executeCommandSpy = jest.spyOn(npmProxy, 'executeCommand').mockReturnValue('"5.3.19"');

      const version = await npmProxy.getVersion('@storybook/angular');

      expect(executeCommandSpy).toHaveBeenCalledWith('npm', [
        'info',
        '@storybook/angular',
        'version',
        '--json',
      ]);
      expect(version).toEqual(`^${storybookAngularVersion}`);
    });

    it('with a Storybook package not listed in versions.json it returns the latest version', async () => {
      const packageVersion = '5.3.19';
      const executeCommandSpy = jest
        .spyOn(npmProxy, 'executeCommand')
        .mockReturnValue(`"${packageVersion}"`);

      const version = await npmProxy.getVersion('@storybook/react-native');

      expect(executeCommandSpy).toHaveBeenCalledWith('npm', [
        'info',
        '@storybook/react-native',
        'version',
        '--json',
      ]);
      expect(version).toEqual(`^${packageVersion}`);
    });
  });

  describe('addPackageResolutions', () => {
    it('adds resolutions to package.json and account for existing resolutions', () => {
      const writePackageSpy = jest.spyOn(npmProxy, 'writePackageJson').mockImplementation(jest.fn);

      jest.spyOn(npmProxy, 'retrievePackageJson').mockImplementation(
        jest.fn(() => ({
          dependencies: {},
          devDependencies: {},
          overrides: {
            bar: 'x.x.x',
          },
        }))
      );

      const versions = {
        foo: 'x.x.x',
      };
      npmProxy.addPackageResolutions(versions);

      expect(writePackageSpy).toHaveBeenCalledWith({
        dependencies: {},
        devDependencies: {},
        overrides: {
          ...versions,
          bar: 'x.x.x',
        },
      });
    });
  });

  describe('mapDependencies', () => {
    it('should display duplicated dependencies based on npm output', async () => {
      // npm ls --depth 10 --json
      jest.spyOn(npmProxy, 'executeCommand').mockReturnValue(`
        {
          "dependencies": {
            "unrelated-and-should-be-filtered": {
              "version": "1.0.0"
            },
            "@storybook/addon-interactions": {
              "version": "7.0.0-rc.7",
              "resolved": "https://registry.npmjs.org/@storybook/addon-interactions/-/addon-interactions-7.0.0-rc.7.tgz",
              "overridden": false,
              "dependencies": {
                "@storybook/instrumenter": {
                  "version": "6.0.0",
                  "resolved": "https://registry.npmjs.org/@storybook/instrumenter/-/instrumenter-7.0.0-rc.7.tgz",
                  "overridden": false,
                  "dependencies": {
                    "@storybook/channels": {
                      "version": "7.0.0-rc.7"
                    }
                  }
                }
              }
            },
            "@storybook/instrumenter": {
              "version": "7.0.0-beta.11",
              "resolved": "https://registry.npmjs.org/@storybook/instrumenter/-/instrumenter-7.0.0-beta.11.tgz",
              "overridden": false,
              "dependencies": {}
            },
            "@storybook/jest": {
              "version": "0.0.11-next.1",
              "resolved": "https://registry.npmjs.org/@storybook/jest/-/jest-0.0.11-next.1.tgz",
              "overridden": false,
              "dependencies": {
                "@storybook/instrumenter": {
                  "version": "7.0.0-alpha.21"
                }
              }
            },
            "@storybook/testing-library": {
              "version": "0.0.14-next.1",
              "resolved": "https://registry.npmjs.org/@storybook/testing-library/-/testing-library-0.0.14-next.1.tgz",
              "overridden": false,
              "dependencies": {
                "@storybook/instrumenter": {
                  "version": "5.4.2-alpha.0"
                }
              }
            }
          }
        }      
      `);

      const installations = await npmProxy.findInstallations();

      expect(installations).toMatchInlineSnapshot(`
        Object {
          "dependencies": Object {
            "@storybook/addon-interactions": Array [
              Object {
                "location": "",
                "version": "7.0.0-rc.7",
              },
            ],
            "@storybook/channels": Array [
              Object {
                "location": "",
                "version": "7.0.0-rc.7",
              },
            ],
            "@storybook/instrumenter": Array [
              Object {
                "location": "",
                "version": "6.0.0",
              },
              Object {
                "location": "",
                "version": "7.0.0-beta.11",
              },
              Object {
                "location": "",
                "version": "7.0.0-alpha.21",
              },
              Object {
                "location": "",
                "version": "5.4.2-alpha.0",
              },
            ],
            "@storybook/jest": Array [
              Object {
                "location": "",
                "version": "0.0.11-next.1",
              },
            ],
            "@storybook/testing-library": Array [
              Object {
                "location": "",
                "version": "0.0.14-next.1",
              },
            ],
          },
          "duplicatedDependencies": Object {
            "@storybook/instrumenter": Array [
              "5.4.2-alpha.0",
              "6.0.0",
              "7.0.0-alpha.21",
              "7.0.0-beta.11",
            ],
          },
          "infoCommand": "npm ls --depth=1",
        }
      `);
    });
  });
});
