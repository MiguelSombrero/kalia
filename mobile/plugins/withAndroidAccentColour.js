const { AndroidConfig, withAndroidColors, withAndroidColorsNight, withAndroidStyles } = require("expo/config-plugins");

const { assignStylesValue, getAppThemeGroup } = AndroidConfig.Styles;
const { assignColorValue } = AndroidConfig.Colors;

// Do not narrow this to the date dialog with `android:datePickerDialogTheme`:
// a theme of its own draws the dialog white, its days unreadable, in dark mode,
// and no check sees it (docs/design.md "Mobile bottle form").
const COLOUR_NAME = "kaliaAccent";

const applyToColors = (colors, value) => assignColorValue(colors, { name: COLOUR_NAME, value });

const applyToStyles = (styles) => assignStylesValue(styles, { add: true, parent: getAppThemeGroup(), name: "colorAccent", value: `@color/${COLOUR_NAME}` });

module.exports = (config, { light, dark }) => {
  let next = withAndroidColors(config, (mod) => {
    mod.modResults = applyToColors(mod.modResults, light);
    return mod;
  });
  next = withAndroidColorsNight(next, (mod) => {
    mod.modResults = applyToColors(mod.modResults, dark);
    return mod;
  });
  return withAndroidStyles(next, (mod) => {
    mod.modResults = applyToStyles(mod.modResults);
    return mod;
  });
};
module.exports.applyToColors = applyToColors;
module.exports.applyToStyles = applyToStyles;
