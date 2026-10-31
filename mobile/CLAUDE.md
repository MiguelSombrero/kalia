@README.md

# This is NOT the Expo you know

Expo, React Native and Expo Router postdate model training, and a wrong guess
fails silently rather than erroring. Check docs.expo.dev at the SDK version in
`mobile/package.json` before relying on memory — the unversioned pages describe
a different SDK.

The conventions imported above are binding for every change under `mobile/`.
Each links the ADR holding its rationale — read that before proposing a change
to the convention itself ([ADR-0035](../docs/adr/0035-agent-context-layout.md)).
