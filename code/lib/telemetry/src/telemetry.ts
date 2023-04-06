import originalFetch from 'isomorphic-unfetch';
import retry from 'fetch-retry';
import { nanoid } from 'nanoid';
import type { Options, TelemetryData } from './types';
import { getAnonymousProjectId } from './anonymous-id';
import { set as saveToCache } from './event-cache';

const URL = process.env.STORYBOOK_TELEMETRY_URL || 'https://storybook.js.org/event-log';

const fetch = retry(originalFetch);

let tasks: Promise<any>[] = [];

// getStorybookMetadata -> packagejson + Main.js
// event specific data: sessionId, ip, etc..
// send telemetry
const sessionId = nanoid();

export async function sendTelemetry(
  data: TelemetryData,
  options: Partial<Options> = { retryDelay: 1000, immediate: false }
) {
  // We use this id so we can de-dupe events that arrive at the index multiple times due to the
  // use of retries. There are situations in which the request "5xx"s (or times-out), but
  // the server actually gets the request and stores it anyway.

  // flatten the data before we send it
  const { eventType, payload, metadata, ...rest } = data;
  const context = options.stripMetadata
    ? {}
    : {
        anonymousId: getAnonymousProjectId(),
        inCI: Boolean(process.env.CI),
        isTTY: process.stdout.isTTY,
      };
  const eventId = nanoid();
  const body = { ...rest, eventType, eventId, sessionId, metadata, payload, context };
  let request: Promise<any>;

  try {
    request = fetch(URL, {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' },
      retries: 3,
      retryOn: [503, 504],
      retryDelay: (attempt: number) =>
        2 ** attempt *
        (typeof options?.retryDelay === 'number' && !Number.isNaN(options?.retryDelay)
          ? options.retryDelay
          : 1000),
    });

    tasks.push(request);
    if (options.immediate) {
      await Promise.all(tasks);
    } else {
      await request;
    }

    await saveToCache(eventType, body);
  } catch (err) {
    //
  } finally {
    tasks = tasks.filter((task) => task !== request);
  }
}
