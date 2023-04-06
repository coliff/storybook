/* eslint-disable import/extensions */
import { fail, danger } from 'danger';
import { execSync } from 'child_process';

execSync('npm install lodash ts-dedent');

const flatten = require('lodash/flatten.js');
const intersection = require('lodash/intersection.js');
const isEmpty = require('lodash/isEmpty.js');
const { dedent } = require('ts-dedent');

const pkg = require('../code/package.json'); // eslint-disable-line import/newline-after-import
const prLogConfig = pkg['pr-log'];

const Versions = {
  PATCH: 'PATCH',
  MINOR: 'MINOR',
  MAJOR: 'MAJOR',
};

const branchVersion = Versions.MINOR;

const checkRequiredLabels = (labels: string[]) => {
  if (!labels.includes('patch')) {
    fail(dedent`
      A 'patch' label is required to merge during stabilization.

      Patch PRs are small bug fixes, build updates, and documentation changes.
      They do not include new features or more disruptive bugfixes.
      
      These changes will be first released on 7.1-alpha, then patched back to 'main'
      after they have been verified to be correct and released as 7.0.x patch releases.

      After the stabilization period ends (ETA 2023-04-12), the 'patch' label
      will no longer be required to merge into next, and we will merge ALL accepted
      PRs to 'next' and release them on 7.1-alpha. Patch PRs will be
      patched back to 'main' and released in 7.0.x patch releases.
    `);
  }

  const forbiddenLabels = flatten([
    'ci: do not merge',
    'in progress',
    branchVersion !== Versions.MAJOR ? 'BREAKING CHANGE' : [],
    branchVersion === Versions.PATCH ? 'feature request' : [],
  ]);

  const requiredLabels = flatten([
    prLogConfig.skipLabels || [],
    (prLogConfig.validLabels || []).map((keyVal: string) => keyVal[0]),
  ]);

  const blockingLabels = intersection(forbiddenLabels, labels);
  if (!isEmpty(blockingLabels)) {
    fail(
      `PR is marked with ${blockingLabels.map((label: string) => `"${label}"`).join(', ')} label${
        blockingLabels.length > 1 ? 's' : ''
      }.`
    );
  }

  const foundLabels = intersection(requiredLabels, labels);
  if (isEmpty(foundLabels)) {
    fail(`PR is not labeled with one of: ${JSON.stringify(requiredLabels)}`);
  } else if (foundLabels.length > 1) {
    fail(`Please choose only one of these labels: ${JSON.stringify(foundLabels)}`);
  }
};

if (prLogConfig) {
  const { labels } = danger.github.issue;
  checkRequiredLabels(labels.map((l) => l.name));
}
