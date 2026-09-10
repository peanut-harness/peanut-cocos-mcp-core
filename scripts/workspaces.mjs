import { dirname } from 'path';
import { fileURLToPath } from 'url';

/** @description peanut-pod-lite 仓库根目录。 */
export const REPOSITORY_ROOT = dirname(fileURLToPath(new URL('.', import.meta.url)));
