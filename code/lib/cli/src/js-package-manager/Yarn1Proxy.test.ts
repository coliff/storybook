import { Yarn1Proxy } from './Yarn1Proxy';

describe('Yarn 1 Proxy', () => {
  let yarn1Proxy: Yarn1Proxy;

  beforeEach(() => {
    yarn1Proxy = new Yarn1Proxy();
  });

  it('type should be yarn1', () => {
    expect(yarn1Proxy.type).toEqual('yarn1');
  });

  describe('initPackageJson', () => {
    it('should run `yarn init -y`', () => {
      const executeCommandSpy = jest.spyOn(yarn1Proxy, 'executeCommand').mockReturnValue('');

      yarn1Proxy.initPackageJson();

      expect(executeCommandSpy).toHaveBeenCalledWith('yarn', ['init', '-y']);
    });
  });

  describe('setRegistryUrl', () => {
    it('should run `yarn config set npmRegistryServer https://foo.bar`', () => {
      const executeCommandSpy = jest.spyOn(yarn1Proxy, 'executeCommand').mockReturnValue('');

      yarn1Proxy.setRegistryURL('https://foo.bar');

      expect(executeCommandSpy).toHaveBeenCalledWith('npm', [
        'config',
        'set',
        'registry',
        'https://foo.bar',
      ]);
    });
  });

  describe('installDependencies', () => {
    it('should run `yarn`', () => {
      const executeCommandSpy = jest.spyOn(yarn1Proxy, 'executeCommand').mockReturnValue('');

      yarn1Proxy.installDependencies();

      expect(executeCommandSpy).toHaveBeenCalledWith(
        'yarn',
        ['install', '--ignore-workspace-root-check'],
        expect.any(String)
      );
    });
  });

  describe('runScript', () => {
    it('should execute script `yarn compodoc -- -e json -d .`', () => {
      const executeCommandSpy = jest.spyOn(yarn1Proxy, 'executeCommand').mockReturnValue('7.1.0');

      yarn1Proxy.runPackageCommand('compodoc', ['-e', 'json', '-d', '.']);

      expect(executeCommandSpy).toHaveBeenLastCalledWith(
        'yarn',
        ['compodoc', '-e', 'json', '-d', '.'],
        undefined,
        undefined
      );
    });
  });

  describe('addDependencies', () => {
    it('with devDep it should run `yarn install -D --ignore-workspace-root-check @storybook/preview-api`', () => {
      const executeCommandSpy = jest.spyOn(yarn1Proxy, 'executeCommand').mockReturnValue('');

      yarn1Proxy.addDependencies({ installAsDevDependencies: true }, ['@storybook/preview-api']);

      expect(executeCommandSpy).toHaveBeenCalledWith(
        'yarn',
        ['add', '--ignore-workspace-root-check', '-D', '@storybook/preview-api'],
        expect.any(String)
      );
    });
  });

  describe('removeDependencies', () => {
    it('should run `yarn remove --ignore-workspace-root-check @storybook/preview-api`', () => {
      const executeCommandSpy = jest.spyOn(yarn1Proxy, 'executeCommand').mockReturnValue('');

      yarn1Proxy.removeDependencies({}, ['@storybook/preview-api']);

      expect(executeCommandSpy).toHaveBeenCalledWith(
        'yarn',
        ['remove', '--ignore-workspace-root-check', '@storybook/preview-api'],
        expect.any(String)
      );
    });

    it('skipInstall should only change package.json without running install', () => {
      const executeCommandSpy = jest.spyOn(yarn1Proxy, 'executeCommand').mockReturnValue('7.0.0');
      const writePackageSpy = jest
        .spyOn(yarn1Proxy, 'writePackageJson')
        .mockImplementation(jest.fn);

      yarn1Proxy.removeDependencies(
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

  describe('latestVersion', () => {
    it('without constraint it returns the latest version', async () => {
      const executeCommandSpy = jest
        .spyOn(yarn1Proxy, 'executeCommand')
        .mockReturnValue('{"type":"inspect","data":"5.3.19"}');

      const version = await yarn1Proxy.latestVersion('@storybook/preview-api');

      expect(executeCommandSpy).toHaveBeenCalledWith('yarn', [
        'info',
        '@storybook/preview-api',
        'version',
        '--json',
      ]);
      expect(version).toEqual('5.3.19');
    });

    it('with constraint it returns the latest version satisfying the constraint', async () => {
      const executeCommandSpy = jest
        .spyOn(yarn1Proxy, 'executeCommand')
        .mockReturnValue('{"type":"inspect","data":["4.25.3","5.3.19","6.0.0-beta.23"]}');

      const version = await yarn1Proxy.latestVersion('@storybook/preview-api', '5.X');

      expect(executeCommandSpy).toHaveBeenCalledWith('yarn', [
        'info',
        '@storybook/preview-api',
        'versions',
        '--json',
      ]);
      expect(version).toEqual('5.3.19');
    });

    it('throws an error if command output is not a valid JSON', async () => {
      jest.spyOn(yarn1Proxy, 'executeCommand').mockReturnValue('NOT A JSON');

      await expect(yarn1Proxy.latestVersion('@storybook/preview-api')).rejects.toThrow();
    });
  });

  describe('addPackageResolutions', () => {
    it('adds resolutions to package.json and account for existing resolutions', () => {
      const writePackageSpy = jest
        .spyOn(yarn1Proxy, 'writePackageJson')
        .mockImplementation(jest.fn);

      jest.spyOn(yarn1Proxy, 'retrievePackageJson').mockImplementation(
        jest.fn(() => ({
          dependencies: {},
          devDependencies: {},
          resolutions: {
            bar: 'x.x.x',
          },
        }))
      );

      const versions = {
        foo: 'x.x.x',
      };
      yarn1Proxy.addPackageResolutions(versions);

      expect(writePackageSpy).toHaveBeenCalledWith({
        dependencies: {},
        devDependencies: {},
        resolutions: {
          ...versions,
          bar: 'x.x.x',
        },
      });
    });
  });

  describe('mapDependencies', () => {
    it('should display duplicated dependencies based on yarn output', async () => {
      // yarn list --pattern "@storybook/*" "@storybook/react" --recursive --json
      jest.spyOn(yarn1Proxy, 'executeCommand').mockReturnValue(`
        {
          "type": "tree",
          "data": {
            "type": "list",
            "trees": [
              {
                "name": "unrelated-and-should-be-filtered@1.0.0",
                "children": []
              },
              {
                "name": "@storybook/instrumenter@7.0.0-beta.12",
                "children": [
                  {
                    "name": "@storybook/types@7.0.0-beta.12",
                    "children": []
                  }
                ]
              },
              {
                "name": "@storybook/addon-interactions@7.0.0-beta.19",
                "children": [
                  {
                    "name": "@storybook/instrumenter@7.0.0-beta.19",
                    "children": []
                  }
                ]
              }
            ]
          }
        }
      `);

      const installations = await yarn1Proxy.findInstallations(['@storybook/*']);

      expect(installations).toMatchInlineSnapshot(`
        Object {
          "dependencies": Object {
            "@storybook/addon-interactions": Array [
              Object {
                "location": "",
                "version": "7.0.0-beta.19",
              },
            ],
            "@storybook/instrumenter": Array [
              Object {
                "location": "",
                "version": "7.0.0-beta.12",
              },
              Object {
                "location": "",
                "version": "7.0.0-beta.19",
              },
            ],
            "@storybook/types": Array [
              Object {
                "location": "",
                "version": "7.0.0-beta.12",
              },
            ],
          },
          "duplicatedDependencies": Object {
            "@storybook/instrumenter": Array [
              "7.0.0-beta.12",
              "7.0.0-beta.19",
            ],
          },
          "infoCommand": "yarn why",
        }
      `);
    });
  });
});
