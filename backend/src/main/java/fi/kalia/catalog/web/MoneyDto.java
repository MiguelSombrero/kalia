package fi.kalia.catalog.web;

import fi.kalia.catalog.domain.Money;
import io.swagger.v3.oas.annotations.media.Schema;

/**
 * Monetary amount (integer cents + ISO-4217 currency). Named after the
 * concept, not the role: the same shape serves prices, costs and totals.
 */
@Schema(description = "A monetary amount")
public record MoneyDto(
		@Schema(description = "Amount in minor units (cents)", requiredMode = Schema.RequiredMode.REQUIRED) int cents,
		@Schema(description = "ISO-4217 currency code", requiredMode = Schema.RequiredMode.REQUIRED) String currency) {

	static MoneyDto from(Money money) {
		return new MoneyDto(money.cents(), money.currency());
	}

}
