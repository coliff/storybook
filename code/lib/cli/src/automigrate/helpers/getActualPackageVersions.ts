import * as fs from 'fs-extra';
import path from 'path';

export const getActualPackageVersions = async (packages: string[]) => {
  return Promise.all(packages.map(getActualPackageVersion));
};

export const getActualPackageVersion = async (packageName: string) => {
  try {
    const packageJson = await getActualPackageJson(packageName);
    return {
      name: packageName,
      version: packageJson.version,
    };
  } catch (err) {
    return { name: packageName, version: null };
  }
};

export const getActualPackageJson = async (packageName: string) => {
  const resolvedPackageJson = require.resolve(path.join(packageName, 'package.json'), {
    paths: [process.cwd()],
  });
  const packageJson = await fs.readJson(resolvedPackageJson);
  return packageJson;
};
