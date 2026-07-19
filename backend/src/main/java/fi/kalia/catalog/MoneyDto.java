package fi.kalia.catalog;

/**
 * Monetary amount (integer cents + ISO-4217 currency). Named after the
 * concept, not the role — the same shape serves prices, purchase costs
 * and order totals; the field name carries the role.
 */
public record MoneyDto(int cents, String currency) {
}
