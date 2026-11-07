// Shared by web/ and mobile/ lint (ADR-0093). CommonJS because mobile's ESLint
// config is, and a CommonJS file is the one form both configs can load.
const FROM_THE_API = /^@kalia\/api\/generated\/|^(\.|@\/)[^ ]*\/(types|api)$/;

const MESSAGE =
  "A map keyed by an API enum is closed: a value this build has not seen reads `undefined`. Build it with enumLookup() from @kalia/api, which takes a fallback (ADR-0093).";

const keyTypeNames = (node) => {
  if (!node) return [];
  if (node.type === "TSTypeReference" && node.typeName.type === "Identifier") return [node.typeName.name];
  if (node.type === "TSUnionType") return node.types.flatMap(keyTypeNames);
  return [];
};

const noClosedEnumMap = {
  meta: { type: "problem", schema: [], messages: { closed: MESSAGE } },
  create(context) {
    const fromTheApi = new Set();
    const flagIfApiKey = (node, keyType) => {
      if (keyTypeNames(keyType).some((name) => fromTheApi.has(name))) {
        context.report({ node, messageId: "closed" });
      }
    };
    return {
      ImportDeclaration(node) {
        if (!FROM_THE_API.test(node.source.value)) return;
        for (const specifier of node.specifiers) fromTheApi.add(specifier.local.name);
      },
      TSTypeReference(node) {
        if (node.typeName.type !== "Identifier" || node.typeName.name !== "Record") return;
        flagIfApiKey(node, (node.typeArguments ?? node.typeParameters)?.params[0]);
      },
      TSMappedType(node) {
        flagIfApiKey(node, node.constraint ?? node.typeParameter?.constraint);
      },
    };
  },
};

module.exports = { plugin: { rules: { "no-closed-enum-map": noClosedEnumMap } } };
