import { join } from 'path';

export const AFTER_DIR_NAME = 'after-storybook';
export const BEFORE_DIR_NAME = 'before-storybook';

export const CODE_DIRECTORY = join(__dirname, '..', '..', 'code');
export const REPROS_DIRECTORY = join(__dirname, '..', '..', 'repros');
export const SANDBOX_DIRECTORY = join(__dirname, '..', '..', 'sandbox');
export const JUNIT_DIRECTORY = join(__dirname, '..', '..', 'test-results');

export const LOCAL_REGISTRY_URL = 'http://localhost:6001';
export const SCRIPT_TIMEOUT = 5 * 60 * 1000;
