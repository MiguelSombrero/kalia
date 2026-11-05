type Fields = Record<string, string | number | boolean | undefined>;

// A URL's query string, anything shaped like a bearer token or a JWT, and the
// build machine's absolute paths, which a release build's stack frames carry and
// a home directory names its user in (ADR-0013).
export const scrub = (text: string): string =>
  text
    .replace(/(?:file:\/\/)?\/(?:Users|home|private)\/[^\s()]*\/([^\s/()]+)/g, "$1")
    .replace(/(\bhttps?:\/\/[^\s?#"']*|\/[\w./~%-]*)\?[^\s"']*/g, "$1")
    .replace(/\bBearer\s+\S+/gi, "Bearer [removed]")
    .replace(/\beyJ[\w-]+\.[\w-]+\.[\w-]*/g, "[removed]");

/**
 * The one path to the device's log (ADR-0098). React Native's iOS logger writes
 * `console.error` as an os_log error, which the system keeps and Console.app
 * shows by default, and `console.warn` as an info message, which it does not;
 * a line is truncated at about 1 KB, so put what matters first. A development
 * build warns instead, so LogBox does not open its error overlay.
 */
export const logError = (message: string, fields: Fields = {}): void => {
  const line = JSON.stringify({ level: "error", message, ...fields });
  if (__DEV__) {
    // eslint-disable-next-line no-console -- the sanctioned log path
    console.warn(line);
  } else {
    // eslint-disable-next-line no-console -- the sanctioned log path
    console.error(line);
  }
};
