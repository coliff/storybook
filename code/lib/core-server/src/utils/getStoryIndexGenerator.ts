import type { DocsOptions, Options } from '@storybook/types';
import { normalizeStories } from '@storybook/core-common';
import { useStoriesJson } from './stories-json';
import type { ServerChannel } from './get-server-channel';
import { StoryIndexGenerator } from './StoryIndexGenerator';
import { router } from './router';

export async function getStoryIndexGenerator(
  features: {
    buildStoriesJson?: boolean;
    storyStoreV7?: boolean;
    argTypeTargetsV7?: boolean;
    warnOnLegacyHierarchySeparator?: boolean;
  },
  options: Options,
  serverChannel: ServerChannel
) {
  let initializedStoryIndexGenerator: Promise<StoryIndexGenerator> = Promise.resolve(undefined);
  if (features?.buildStoriesJson || features?.storyStoreV7) {
    const workingDir = process.cwd();
    const directories = {
      configDir: options.configDir,
      workingDir,
    };
    const stories = options.presets.apply('stories');
    const storyIndexers = options.presets.apply('storyIndexers', []);
    const docsOptions = options.presets.apply<DocsOptions>('docs', {});
    const normalizedStories = normalizeStories(await stories, directories);

    const generator = new StoryIndexGenerator(normalizedStories, {
      ...directories,
      storyIndexers: await storyIndexers,
      docs: await docsOptions,
      workingDir,
      storiesV2Compatibility: !features?.storyStoreV7,
      storyStoreV7: features?.storyStoreV7,
    });

    initializedStoryIndexGenerator = generator.initialize().then(() => generator);

    useStoriesJson({
      router,
      initializedStoryIndexGenerator,
      normalizedStories,
      serverChannel,
      workingDir,
    });
  }
  return initializedStoryIndexGenerator;
}
