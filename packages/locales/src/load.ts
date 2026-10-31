export const loadResource = (language: string, namespace: string) => import(`./${language}/${namespace}.json`);
