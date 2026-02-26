/**
 * Suppress console output in production on web.
 * This file is only bundled for web (suppressConsole.web.ts).
 * Import at the top of the web layout so it runs before any other code.
 */
if (typeof __DEV__ !== 'undefined' && !__DEV__) {
  const noop = () => {};
  // eslint-disable-next-line no-console
  console.log = noop;
  // eslint-disable-next-line no-console
  console.info = noop;
  // eslint-disable-next-line no-console
  console.warn = noop;
  // eslint-disable-next-line no-console
  console.debug = noop;
  // eslint-disable-next-line no-console
  console.error = noop;
}
