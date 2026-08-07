/**
 * Identity module: turns an authenticated request into the current user
 * (ADR-0028). This root package is the inter-module API and stays empty of
 * types until the first consumer arrives — the cellar module, iteration 5
 * (ADR-0007).
 */
@NullMarked
package fi.kalia.identity;

import org.jspecify.annotations.NullMarked;
