/**
 * Identity module: turns an authenticated request into the current user
 * (ADR-0028). This root package is the inter-module API (ADR-0007);
 * {@link IdentityApi} is its first member, added for {@code cellar}.
 */
@NullMarked
package fi.kalia.identity;

import org.jspecify.annotations.NullMarked;
