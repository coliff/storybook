import { readdir } from 'fs/promises';
import { pathExists } from 'fs-extra';
import {
  allTemplates,
  templatesByCadence,
  type Cadence,
  type Template as TTemplate,
  type SkippableTask,
} from '../code/lib/cli/src/sandbox-templates';
import { SANDBOX_DIRECTORY } from './utils/constants';

const sandboxDir = process.env.SANDBOX_ROOT || SANDBOX_DIRECTORY;

type Template = Pick<TTemplate, 'inDevelopment' | 'skipTasks'>;
export type TemplateKey = keyof typeof allTemplates;
export type Templates = Record<TemplateKey, Template>;

async function getDirectories(source: string) {
  return (await readdir(source, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);
}

export async function getTemplate(
  cadence: Cadence,
  scriptName: string,
  { index, total }: { index: number; total: number }
) {
  let potentialTemplateKeys: TemplateKey[] = [];
  if (await pathExists(sandboxDir)) {
    const sandboxes = await getDirectories(sandboxDir);
    potentialTemplateKeys = sandboxes
      .map((dirName) => {
        return Object.keys(allTemplates).find(
          (templateKey) => templateKey.replace('/', '-') === dirName
        );
      })
      .filter(Boolean) as TemplateKey[];
  }

  if (potentialTemplateKeys.length === 0) {
    const cadenceTemplates = Object.entries(allTemplates).filter(([key]) =>
      templatesByCadence[cadence].includes(key as TemplateKey)
    );
    potentialTemplateKeys = cadenceTemplates.map(([k]) => k) as TemplateKey[];
  }

  potentialTemplateKeys = potentialTemplateKeys.filter((t) => {
    const currentTemplate = allTemplates[t] as Template;
    return (
      currentTemplate.inDevelopment !== true &&
      !currentTemplate.skipTasks?.includes(scriptName as SkippableTask)
    );
  });

  if (potentialTemplateKeys.length !== total) {
    throw new Error(`Circle parallelism set incorrectly.
    
      Parallelism is set to ${total}, but there are ${
      potentialTemplateKeys.length
    } templates to run:
      ${potentialTemplateKeys.join(', ')}
    `);
  }

  return potentialTemplateKeys[index];
}

async function run() {
  const [, , cadence, scriptName] = process.argv;

  if (!cadence) throw new Error('Need to supply cadence to get template script');

  const { CIRCLE_NODE_INDEX = 0, CIRCLE_NODE_TOTAL = 1 } = process.env;

  console.log(
    await getTemplate(cadence as Cadence, scriptName, {
      index: +CIRCLE_NODE_INDEX,
      total: +CIRCLE_NODE_TOTAL,
    })
  );
}

if (require.main === module) {
  run().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
