import type { Fix } from '../types';

import { cra5 } from './cra5';
import { webpack5 } from './webpack5';
import { angular12 } from './angular12';
import { vue3 } from './vue3';
import { mdxgfm } from './mdx-gfm';
import { eslintPlugin } from './eslint-plugin';
import { builderVite } from './builder-vite';
import { sbScripts } from './sb-scripts';
import { sbBinary } from './sb-binary';
import { newFrameworks } from './new-frameworks';
import { removedGlobalClientAPIs } from './remove-global-client-apis';
import { mdx1to2 } from './mdx-1-to-2';
import { autodocsTrue } from './autodocs-true';
import { addReact } from './add-react';
import { nodeJsRequirement } from './nodejs-requirement';
import { missingBabelRc } from './missing-babelrc';
import { angularBuilders } from './angular-builders';
import { incompatibleAddons } from './incompatible-addons';
import { angularBuildersMultiproject } from './angular-builders-multiproject';

export * from '../types';

export const allFixes: Fix[] = [
  nodeJsRequirement,
  cra5,
  webpack5,
  angular12,
  vue3,
  eslintPlugin,
  builderVite,
  sbBinary,
  sbScripts,
  newFrameworks,
  incompatibleAddons,
  removedGlobalClientAPIs,
  mdx1to2,
  mdxgfm,
  autodocsTrue,
  addReact,
  missingBabelRc,
  angularBuildersMultiproject,
  angularBuilders,
];

export const initFixes: Fix[] = [missingBabelRc, eslintPlugin];
