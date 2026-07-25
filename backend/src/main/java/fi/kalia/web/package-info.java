/**
 * Shared, module-neutral web-layer advice: exception handling for
 * generic Spring MVC concerns (validation, malformed requests,
 * unsupported methods) that no single module owns. Business exceptions
 * stay in each module's own web package (ADR-0007); this package never
 * handles a type a module's own advice also handles (ADR-0014).
 */
@NullMarked
package fi.kalia.web;

import org.jspecify.annotations.NullMarked;
