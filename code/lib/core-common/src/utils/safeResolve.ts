import resolveFrom from 'resolve-from';

export const safeResolve = (file: string) => {
  try {
    return require.resolve(file);
  } catch (e) {
    return undefined;
  }
};

export const safeResolveFrom = (path: string, file: string) => {
  try {
    return resolveFrom(path, file);
  } catch (e) {
    return undefined;
  }
};
