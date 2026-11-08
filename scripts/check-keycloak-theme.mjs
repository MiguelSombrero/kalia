import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const THEME = "keycloak/themes/kalia/login";
const CSS = `${THEME}/resources/css/login.css`;
const MARK = `${THEME}/resources/img/kalia-mark.svg`;
const APP_MARK = "web/app/icon.svg";
const COLOUR_LITERAL = /#[0-9a-f]{3,8}\b|\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)\(/i;

export function checkKeycloakTheme(root) {
  const failures = [];
  const read = (path) => {
    try {
      return readFileSync(resolve(root, path), "utf8");
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
      failures.push(`${path} not found`);
      return null;
    }
  };
  const css = read(CSS);
  const mark = read(MARK);
  const appMark = read(APP_MARK);
  const properties = read(`${THEME}/theme.properties`);
  if (css !== null) {
    const lines = css.replace(/\/\*[\s\S]*?\*\//g, (text) => text.replace(/[^\n]/g, "")).split("\n");
    lines.forEach((line, index) => {
      const values = [...line.matchAll(/:([^;{}]*)(?:;|$)/g)].map((match) => match[1]).join(" ");
      const literal = values.match(COLOUR_LITERAL);
      if (literal) failures.push(`${CSS}:${index + 1}: colour literal ${literal[0]}`);
      for (const match of line.matchAll(/(?:^|[;{])\s*([\w-]+)\s*:\s*([^;{}]+)/g)) {
        const [, property, value] = match;
        if (/^--kalia-color-/i.test(property)) failures.push(`${CSS}:${index + 1}: ${property} belongs in the generated stylesheet`);
        if (/(?:^|-)color$|^background$/i.test(property) &&
            /^[a-z]+(?:\s*!important)?$/i.test(value.trim()) &&
            !/^(?:transparent|currentcolor|inherit|initial|unset|revert|revert-layer|none)(?:\s*!important)?$/i.test(value.trim())) {
          failures.push(`${CSS}:${index + 1}: colour literal ${value.trim()}`);
        }
      }
    });
  }
  if (mark !== null && appMark !== null && mark.trim() !== appMark.trim()) failures.push(`${MARK} differs from ${APP_MARK}`);
  if (properties !== null) {
    const styles = properties.match(/^styles=(.*)$/m)?.[1].trim().split(/\s+/) ?? [];
    if (styles.indexOf("css/tokens.generated.css") < 0 || styles.indexOf("css/login.css") < 0 || styles.indexOf("css/tokens.generated.css") > styles.indexOf("css/login.css")) {
      failures.push(`${THEME}/theme.properties: generated tokens must load before login.css`);
    }
  }
  return { failures };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { failures } = checkKeycloakTheme(resolve(dirname(fileURLToPath(import.meta.url)), ".."));
  for (const failure of failures) console.error(`FAIL ${failure}`);
  console.log(failures.length ? `${failures.length} failure(s)` : "Keycloak theme OK");
  if (failures.length) process.exitCode = 1;
}
