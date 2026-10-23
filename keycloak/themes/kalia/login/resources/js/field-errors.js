// ADR-0074. keycloak.v2 renders a field's error line as #input-error-<field id>
// but never points the field at it, so a screen reader reads the field alone.
document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll('[id^="input-error-"]:not([id^="input-error-container-"])').forEach((line) => {
    const field = document.getElementById(line.id.slice("input-error-".length));
    if (field && field.getAttribute("aria-invalid") === "true") {
      field.setAttribute("aria-describedby", line.id);
    }
  });
});
