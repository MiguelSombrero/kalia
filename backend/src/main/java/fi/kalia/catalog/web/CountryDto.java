package fi.kalia.catalog.web;

import fi.kalia.catalog.domain.Country;
import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "A country a brewery can be in")
public record CountryDto(
		@Schema(description = "ISO 3166-1 alpha-2 code, for a client naming the country in its own language",
				requiredMode = Schema.RequiredMode.REQUIRED) String code,
		@Schema(description = "The English name the catalog stores and filters by",
				requiredMode = Schema.RequiredMode.REQUIRED) String name) {

	static CountryDto from(Country country) {
		return new CountryDto(country.code(), country.name());
	}

}
