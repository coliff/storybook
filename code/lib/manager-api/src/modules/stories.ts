import { global } from '@storybook/global';
import { toId, sanitize } from '@storybook/csf';
import type {
  StoryKind,
  ComponentTitle,
  StoryName,
  StoryId,
  Args,
  API_ComposedRef,
  API_HashEntry,
  API_LeafEntry,
  API_PreparedStoryIndex,
  SetStoriesPayload,
  API_StoryEntry,
  StoryIndex,
  API_LoadedRefData,
  API_IndexHash,
} from '@storybook/types';
import {
  PRELOAD_ENTRIES,
  STORY_PREPARED,
  UPDATE_STORY_ARGS,
  RESET_STORY_ARGS,
  STORY_ARGS_UPDATED,
  STORY_CHANGED,
  SELECT_STORY,
  SET_STORIES,
  SET_INDEX,
  STORY_SPECIFIED,
  STORY_INDEX_INVALIDATED,
  CONFIG_ERROR,
  CURRENT_STORY_WAS_SET,
  STORY_MISSING,
} from '@storybook/core-events';
import { logger } from '@storybook/client-logger';

// eslint-disable-next-line import/no-cycle
import { getEventMetadata } from '../lib/events';

import {
  denormalizeStoryParameters,
  transformStoryIndexToStoriesHash,
  getComponentLookupList,
  getStoriesLookupList,
  addPreparedStories,
} from '../lib/stories';

import type { ComposedRef, ModuleFn } from '../index';

const { FEATURES, fetch } = global;
const STORY_INDEX_PATH = './index.json';

type Direction = -1 | 1;
type ParameterName = string;

type ViewMode = 'story' | 'info' | 'settings' | string | undefined;
type StoryUpdate = Pick<API_StoryEntry, 'parameters' | 'initialArgs' | 'argTypes' | 'args'>;

export interface SubState extends API_LoadedRefData {
  storyId: StoryId;
  viewMode: ViewMode;
}

export interface SubAPI {
  storyId: typeof toId;
  resolveStory: (storyId: StoryId, refsId?: string) => API_HashEntry;
  selectFirstStory: () => void;
  selectStory: (
    kindOrId?: string,
    story?: string,
    obj?: { ref?: string; viewMode?: ViewMode }
  ) => void;
  getCurrentStoryData: () => API_LeafEntry;
  setIndex: (index: API_PreparedStoryIndex) => Promise<void>;
  jumpToComponent: (direction: Direction) => void;
  jumpToStory: (direction: Direction) => void;
  getData: (storyId: StoryId, refId?: string) => API_LeafEntry;
  isPrepared: (storyId: StoryId, refId?: string) => boolean;
  getParameters: (
    storyId: StoryId | { storyId: StoryId; refId: string },
    parameterName?: ParameterName
  ) => API_StoryEntry['parameters'] | any;
  getCurrentParameter<S>(parameterName?: ParameterName): S;
  updateStoryArgs(story: API_StoryEntry, newArgs: Args): void;
  resetStoryArgs: (story: API_StoryEntry, argNames?: string[]) => void;
  findLeafEntry(index: API_IndexHash, storyId: StoryId): API_LeafEntry;
  findLeafStoryId(index: API_IndexHash, storyId: StoryId): StoryId;
  findSiblingStoryId(
    storyId: StoryId,
    index: API_IndexHash,
    direction: Direction,
    toSiblingGroup: boolean // when true, skip over leafs within the same group
  ): StoryId;
  fetchIndex: () => Promise<void>;
  updateStory: (storyId: StoryId, update: StoryUpdate, ref?: API_ComposedRef) => Promise<void>;
  setPreviewInitialized: (ref?: ComposedRef) => Promise<void>;
}

const removedOptions = ['enableShortcuts', 'theme', 'showRoots'];

function removeRemovedOptions<T extends Record<string, any> = Record<string, any>>(options?: T): T {
  if (!options || typeof options === 'string') {
    return options;
  }
  const result: T = { ...options } as T;

  removedOptions.forEach((option) => {
    if (option in result) {
      delete result[option];
    }
  });

  return result;
}

export const init: ModuleFn<SubAPI, SubState, true> = ({
  fullAPI,
  store,
  navigate,
  provider,
  storyId: initialStoryId,
  viewMode: initialViewMode,
  docsOptions = {},
}) => {
  const api: SubAPI = {
    storyId: toId,
    getData: (storyId, refId) => {
      const result = api.resolveStory(storyId, refId);
      if (result?.type === 'story' || result?.type === 'docs') {
        return result;
      }
      return undefined;
    },
    isPrepared: (storyId, refId) => {
      const data = api.getData(storyId, refId);
      return data.type === 'story' ? data.prepared : true;
    },
    resolveStory: (storyId, refId) => {
      const { refs, index } = store.getState();
      if (refId && !refs[refId]) {
        return null;
      }
      if (refId) {
        return refs[refId].index ? refs[refId].index[storyId] : undefined;
      }
      return index ? index[storyId] : undefined;
    },
    getCurrentStoryData: () => {
      const { storyId, refId } = store.getState();

      return api.getData(storyId, refId);
    },
    getParameters: (storyIdOrCombo, parameterName) => {
      const { storyId, refId } =
        typeof storyIdOrCombo === 'string'
          ? { storyId: storyIdOrCombo, refId: undefined }
          : storyIdOrCombo;
      const data = api.getData(storyId, refId);

      if (data?.type === 'story') {
        const { parameters } = data;

        if (parameters) {
          return parameterName ? parameters[parameterName] : parameters;
        }
      }

      return null;
    },
    getCurrentParameter: (parameterName) => {
      const { storyId, refId } = store.getState();
      const parameters = api.getParameters({ storyId, refId }, parameterName);
      // FIXME Returning falsey parameters breaks a bunch of toolbars code,
      // so this strange logic needs to be here until various client code is updated.
      return parameters || undefined;
    },
    jumpToComponent: (direction) => {
      const { index, storyId, refs, refId } = store.getState();
      const story = api.getData(storyId, refId);

      // cannot navigate when there's no current selection
      if (!story) {
        return;
      }

      const hash = refId ? refs[refId].index || {} : index;
      const result = api.findSiblingStoryId(storyId, hash, direction, true);

      if (result) {
        api.selectStory(result, undefined, { ref: refId });
      }
    },
    jumpToStory: (direction) => {
      const { index, storyId, refs, refId } = store.getState();
      const story = api.getData(storyId, refId);

      // cannot navigate when there's no current selection
      if (!story) {
        return;
      }

      const hash = story.refId ? refs[story.refId].index : index;
      const result = api.findSiblingStoryId(storyId, hash, direction, false);

      if (result) {
        api.selectStory(result, undefined, { ref: refId });
      }
    },
    selectFirstStory: () => {
      const { index } = store.getState();
      const firstStory = Object.keys(index).find((id) => index[id].type === 'story');

      if (firstStory) {
        api.selectStory(firstStory);
        return;
      }

      navigate('/');
    },
    selectStory: (titleOrId = undefined, name = undefined, options = {}) => {
      const { ref } = options;
      const { storyId, index, refs } = store.getState();

      const hash = ref ? refs[ref].index : index;

      const kindSlug = storyId?.split('--', 2)[0];

      if (!name) {
        // Find the entry (group, component or story) that is referred to
        const entry = titleOrId ? hash[titleOrId] || hash[sanitize(titleOrId)] : hash[kindSlug];

        if (!entry) throw new Error(`Unknown id or title: '${titleOrId}'`);

        // We want to navigate to the first ancestor entry that is a leaf
        const leafEntry = api.findLeafEntry(hash, entry.id);
        const fullId = leafEntry.refId ? `${leafEntry.refId}_${leafEntry.id}` : leafEntry.id;
        navigate(`/${leafEntry.type}/${fullId}`);
      } else if (!titleOrId) {
        // This is a slugified version of the kind, but that's OK, our toId function is idempotent
        const id = toId(kindSlug, name);

        api.selectStory(id, undefined, options);
      } else {
        const id = ref ? `${ref}_${toId(titleOrId, name)}` : toId(titleOrId, name);
        if (hash[id]) {
          api.selectStory(id, undefined, options);
        } else {
          // Support legacy API with component permalinks, where kind is `x/y` but permalink is 'z'
          const entry = hash[sanitize(titleOrId)];
          if (entry?.type === 'component') {
            const foundId = entry.children.find((childId) => hash[childId].name === name);
            if (foundId) {
              api.selectStory(foundId, undefined, options);
            }
          }
        }
      }
    },
    findLeafEntry(index, storyId) {
      const entry = index[storyId];
      if (entry.type === 'docs' || entry.type === 'story') {
        return entry;
      }

      const childStoryId = entry.children[0];
      return api.findLeafEntry(index, childStoryId);
    },
    findLeafStoryId(index, storyId) {
      return api.findLeafEntry(index, storyId)?.id;
    },
    findSiblingStoryId(storyId, index, direction, toSiblingGroup) {
      if (toSiblingGroup) {
        const lookupList = getComponentLookupList(index);
        const position = lookupList.findIndex((i) => i.includes(storyId));

        // cannot navigate beyond fist or last
        if (position === lookupList.length - 1 && direction > 0) {
          return;
        }
        if (position === 0 && direction < 0) {
          return;
        }

        if (lookupList[position + direction]) {
          // eslint-disable-next-line consistent-return
          return lookupList[position + direction][0];
        }
        return;
      }
      const lookupList = getStoriesLookupList(index);
      const position = lookupList.indexOf(storyId);

      // cannot navigate beyond fist or last
      if (position === lookupList.length - 1 && direction > 0) {
        return;
      }
      if (position === 0 && direction < 0) {
        return;
      }

      // eslint-disable-next-line consistent-return
      return lookupList[position + direction];
    },
    updateStoryArgs: (story, updatedArgs) => {
      const { id: storyId, refId } = story;
      fullAPI.emit(UPDATE_STORY_ARGS, {
        storyId,
        updatedArgs,
        options: { target: refId },
      });
    },
    resetStoryArgs: (story, argNames?: [string]) => {
      const { id: storyId, refId } = story;
      fullAPI.emit(RESET_STORY_ARGS, {
        storyId,
        argNames,
        options: { target: refId },
      });
    },
    fetchIndex: async () => {
      try {
        const result = await fetch(STORY_INDEX_PATH);
        if (result.status !== 200) throw new Error(await result.text());

        const storyIndex = (await result.json()) as StoryIndex;

        // We can only do this if the stories.json is a proper storyIndex
        if (storyIndex.v < 3) {
          logger.warn(`Skipping story index with version v${storyIndex.v}, awaiting SET_STORIES.`);
          return;
        }

        await fullAPI.setIndex(storyIndex);
      } catch (err) {
        await store.setState({ indexError: err });
      }
    },
    // The story index we receive on SET_INDEX is "prepared" in that it has parameters
    // The story index we receive on fetchStoryIndex is not, but all the prepared fields are optional
    // so we can cast one to the other easily enough
    setIndex: async (storyIndex: API_PreparedStoryIndex) => {
      const newHash = transformStoryIndexToStoriesHash(storyIndex, {
        provider,
        docsOptions,
      });

      // Now we need to patch in the existing prepared stories
      const oldHash = store.getState().index;

      await store.setState({ index: addPreparedStories(newHash, oldHash), indexError: undefined });
    },
    updateStory: async (
      storyId: StoryId,
      update: StoryUpdate,
      ref?: API_ComposedRef
    ): Promise<void> => {
      if (!ref) {
        const { index } = store.getState();
        index[storyId] = {
          ...index[storyId],
          ...update,
        } as API_StoryEntry;
        await store.setState({ index });
      } else {
        const { id: refId, index } = ref;
        index[storyId] = {
          ...index[storyId],
          ...update,
        } as API_StoryEntry;
        await fullAPI.updateRef(refId, { index });
      }
    },
    setPreviewInitialized: async (ref?: ComposedRef): Promise<void> => {
      if (!ref) {
        store.setState({ previewInitialized: true });
      } else {
        fullAPI.updateRef(ref.id, { previewInitialized: true });
      }
    },
  };

  const initModule = async () => {
    // On initial load, the local iframe will select the first story (or other "selection specifier")
    // and emit STORY_SPECIFIED with the id. We need to ensure we respond to this change.
    fullAPI.on(
      STORY_SPECIFIED,
      function handler({
        storyId,
        viewMode,
      }: {
        storyId: string;
        viewMode: ViewMode;
        [k: string]: any;
      }) {
        const { sourceType } = getEventMetadata(this, fullAPI);

        if (sourceType === 'local') {
          if (fullAPI.isSettingsScreenActive()) return;

          // Special case -- if we are already at the story being specified (i.e. the user started at a given story),
          // we don't need to change URL. See https://github.com/storybookjs/storybook/issues/11677
          const state = store.getState();
          if (state.storyId !== storyId || state.viewMode !== viewMode) {
            navigate(`/${viewMode}/${storyId}`);
          }
        }
      }
    );

    // The CURRENT_STORY_WAS_SET event is the best event to use to tell if a ref is ready.
    // Until the ref has a selection, it will not render anything (e.g. while waiting for
    // the preview.js file or the index to load). Once it has a selection, it will render its own
    // preparing spinner.
    fullAPI.on(CURRENT_STORY_WAS_SET, function handler() {
      const { ref } = getEventMetadata(this, fullAPI);
      fullAPI.setPreviewInitialized(ref);
    });

    fullAPI.on(STORY_CHANGED, function handler() {
      const { sourceType } = getEventMetadata(this, fullAPI);

      if (sourceType === 'local') {
        const options = fullAPI.getCurrentParameter('options');

        if (options) {
          fullAPI.setOptions(removeRemovedOptions(options));
        }
      }
    });

    fullAPI.on(STORY_PREPARED, function handler({ id, ...update }) {
      const { ref, sourceType } = getEventMetadata(this, fullAPI);
      fullAPI.updateStory(id, { ...update, prepared: true }, ref);

      if (!ref) {
        if (!store.getState().hasCalledSetOptions) {
          const { options } = update.parameters;
          fullAPI.setOptions(removeRemovedOptions(options));
          store.setState({ hasCalledSetOptions: true });
        }
      }

      if (sourceType === 'local') {
        const { storyId, index, refId } = store.getState();

        // create a list of related stories to be preloaded
        const toBePreloaded = Array.from(
          new Set([
            api.findSiblingStoryId(storyId, index, 1, true),
            api.findSiblingStoryId(storyId, index, -1, true),
          ])
        ).filter(Boolean);

        fullAPI.emit(PRELOAD_ENTRIES, {
          ids: toBePreloaded,
          options: { target: refId },
        });
      }
    });

    fullAPI.on(SET_INDEX, function handler(index: API_PreparedStoryIndex) {
      const { ref } = getEventMetadata(this, fullAPI);

      if (!ref) {
        fullAPI.setIndex(index);
        const options = fullAPI.getCurrentParameter('options');
        fullAPI.setOptions(removeRemovedOptions(options));
      } else {
        fullAPI.setRef(ref.id, { ...ref, storyIndex: index }, true);
      }
    });

    // For composition back-compatibilty
    fullAPI.on(SET_STORIES, function handler(data: SetStoriesPayload) {
      const { ref } = getEventMetadata(this, fullAPI);
      const setStoriesData = data.v ? denormalizeStoryParameters(data) : data.stories;

      if (!ref) {
        throw new Error('Cannot call SET_STORIES for local frame');
      } else {
        fullAPI.setRef(ref.id, { ...ref, setStoriesData }, true);
      }
    });

    fullAPI.on(
      SELECT_STORY,
      function handler({
        kind,
        title = kind,
        story,
        name = story,
        storyId,
        ...rest
      }: {
        kind?: StoryKind;
        title?: ComponentTitle;
        story?: StoryName;
        name?: StoryName;
        storyId: string;
        viewMode: ViewMode;
      }) {
        const { ref } = getEventMetadata(this, fullAPI);

        if (!ref) {
          fullAPI.selectStory(storyId || title, name, rest);
        } else {
          fullAPI.selectStory(storyId || title, name, { ...rest, ref: ref.id });
        }
      }
    );

    fullAPI.on(
      STORY_ARGS_UPDATED,
      function handleStoryArgsUpdated({ storyId, args }: { storyId: StoryId; args: Args }) {
        const { ref } = getEventMetadata(this, fullAPI);
        fullAPI.updateStory(storyId, { args }, ref);
      }
    );

    // When there's a preview error, we don't show it in the manager, but simply
    fullAPI.on(CONFIG_ERROR, function handleConfigError(err) {
      const { ref } = getEventMetadata(this, fullAPI);
      fullAPI.setPreviewInitialized(ref);
    });

    fullAPI.on(STORY_MISSING, function handleConfigError(err) {
      const { ref } = getEventMetadata(this, fullAPI);
      fullAPI.setPreviewInitialized(ref);
    });

    if (FEATURES?.storyStoreV7) {
      provider.serverChannel?.on(STORY_INDEX_INVALIDATED, () => fullAPI.fetchIndex());
      await fullAPI.fetchIndex();
    }
  };

  return {
    api,
    state: {
      storyId: initialStoryId,
      viewMode: initialViewMode,
      hasCalledSetOptions: false,
      previewInitialized: false,
    },
    init: initModule,
  };
};
