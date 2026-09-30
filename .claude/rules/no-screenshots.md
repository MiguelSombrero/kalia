---
paths:
  - "**/*.{png,jpg,jpeg,gif,webp,heic,avif,bmp,tiff}"
---

# A screenshot is never committed, pushed or uploaded

Loads when you open an image, which is how a capture gets looked at. The rule
is in `CLAUDE.md`; it is repeated here because this is the moment it applies.

- **Never `git add`, commit, push, attach to a pull request or upload** a
  screenshot or screen capture — of the app, the browser pane or any other
  screen. It can show something on the product owner's machine that nobody
  noticed, and once pushed it cannot be taken back.
- **Keep it in the scratchpad, outside the repository**, look at it to check
  your own work, and say in words what you saw.
- **Do not route around the ignore.** `git add -f` on a capture is the
  violation this rule exists to name, and `scripts/check-no-raster-images.mjs`
  fails `make verify` and CI on any tracked raster image.
- **An image the project ships on purpose is not a capture** — a logo or an
  illustration that is part of the product. It goes in a directory listed in
  that checker's `ALLOWED_DIRS`, added deliberately in the same change. If you
  are unsure which one you are holding, ask before staging it.

Why, and the alternatives rejected:
[ADR-0062](../../docs/adr/0062-a-design-task-is-a-skill-and-a-marker.md).
