import { execaCommand } from '../../utils/exec';
// eslint-disable-next-line import/no-cycle
import { logger } from '../publish';

export async function commitAllToGit(cwd: string) {
  try {
    logger.log(`💪 Committing everything to the repository`);

    await execaCommand('git add .', { cwd });

    const currentCommitSHA = await execaCommand('git rev-parse HEAD');
    await execaCommand(
      `git commit -m "Update examples - ${new Date().toDateString()} - ${currentCommitSHA.stdout
        .toString()
        .slice(0, 12)}"`,
      {
        shell: true,
        cwd,
      }
    );
  } catch (e) {
    logger.log(
      `🤷 Git found no changes between previous versions so there is nothing to commit. Skipping publish!`
    );
  }
}
