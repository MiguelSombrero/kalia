// The app's build number, one integer for both platforms. The server's
// minimum is compared against it, so a later build must always be higher, and
// Android's versionCode may not pass 2,100,000,000. Seconds since the start of
// 2026 rise with the build and last until 2092.
const EPOCH_MS = Date.UTC(2026, 0, 1);
const MAX_VERSION_CODE = 2_100_000_000;

const buildNumberAt = (nowMs) => {
  const build = Math.floor((nowMs - EPOCH_MS) / 1000);
  if (!Number.isInteger(build) || build < 1 || build > MAX_VERSION_CODE) {
    throw new Error(`the clock reads ${nowMs} ms, which gives build number ${build}, outside 1..${MAX_VERSION_CODE}`);
  }
  return build;
};

module.exports = { buildNumberAt, MAX_VERSION_CODE };
