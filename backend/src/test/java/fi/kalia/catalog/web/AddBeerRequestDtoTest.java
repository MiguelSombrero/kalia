package fi.kalia.catalog.web;

import static org.assertj.core.api.Assertions.assertThat;

import jakarta.validation.Validation;
import jakarta.validation.Validator;
import java.math.BigDecimal;
import java.util.UUID;
import java.util.stream.Stream;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.MethodSource;

class AddBeerRequestDtoTest {

	private static final Validator VALIDATOR = Validation.buildDefaultValidatorFactory().getValidator();

	// Zero-width space and joiner, a right-to-left override, an isolate, a byte order mark, a soft hyphen.
	static Stream<String> invisibleCharacters() {
		return Stream.of("\u200B", "\u200D", "\u202E", "\u2066", "\u2069", "\uFEFF", "\u00AD");
	}

	@ParameterizedTest
	@MethodSource("invisibleCharacters")
	void aNameWithAnInvisibleFormattingCharacterIsRefused(String invisible) {
		assertThat(VALIDATOR.validate(request("Abt" + invisible + "12"))).extracting(violation -> violation.getMessage())
				.containsExactly(AddBeerRequestDto.NO_CONTROL_CHARACTERS_MESSAGE);
	}

	@ParameterizedTest
	@MethodSource("invisibleCharacters")
	void aNewBreweryNameOrCityWithOneIsRefused(String invisible) {
		AddBeerRequestDto inName = withBrewery(new NewBreweryRequestDto("Pani" + invisible + "mo", "FI", null));
		AddBeerRequestDto inCity = withBrewery(new NewBreweryRequestDto("Panimo", "FI", "Lah" + invisible + "ti"));

		assertThat(VALIDATOR.validate(inName)).extracting(violation -> violation.getPropertyPath().toString())
				.containsExactly("newBrewery.name");
		assertThat(VALIDATOR.validate(inCity)).extracting(violation -> violation.getPropertyPath().toString())
				.containsExactly("newBrewery.city");
	}

	@ParameterizedTest
	@MethodSource("ordinaryNames")
	void ordinaryNamesInAnyScriptAreAccepted(String name) {
		assertThat(VALIDATOR.validate(request(name))).isEmpty();
	}

	static Stream<String> ordinaryNames() {
		return Stream.of("Öö", "Brasserie d'Achouffe", "Ｇuinness", "ビール 2", "Zwickel (unfiltered) 5.2%");
	}

	private static AddBeerRequestDto request(String name) {
		return new AddBeerRequestDto(name, "Quadrupel", new BigDecimal("10.5"), UUID.randomUUID(), null);
	}

	private static AddBeerRequestDto withBrewery(NewBreweryRequestDto brewery) {
		return new AddBeerRequestDto("Abt 12", "Quadrupel", new BigDecimal("10.5"), null, brewery);
	}

}
