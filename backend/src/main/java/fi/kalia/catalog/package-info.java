/**
 * Catalog module. This root package is the module's inter-module API and is
 * intentionally empty of types until the first consumer (cellar) arrives —
 * see ADR-0007. HTTP concerns live in {@code web}, use cases in
 * {@code application}, the model in {@code domain}.
 */
@NullMarked
package fi.kalia.catalog;

import org.jspecify.annotations.NullMarked;
