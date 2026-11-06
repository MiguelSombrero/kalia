package fi.kalia.catalog.web;

import static org.assertj.core.api.Assertions.assertThat;

import jakarta.validation.Validation;
import jakarta.validation.Validator;
import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;
import java.util.function.BiFunction;
import java.util.stream.Stream;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;

/**
 * A beer's name, style and ABV are held to one set of constraints whether a contributor adds the
 * beer or an admin edits the suggestion, so each case runs against both request types and a
 * type that stopped carrying a constraint fails here.
 */
class SharedBeerConstraintsTest {

	private static final Validator VALIDATOR = Validation.buildDefaultValidatorFactory().getValidator();

	private static final UUID BREWERY = UUID.randomUUID();

	private static final BiFunction<String, BigDecimal, Object> ADD = (name, abv) -> new AddBeerRequestDto(name,
			"Quadrupel", abv, BREWERY, null);

	private static final BiFunction<String, BigDecimal, Object> EDIT = (name, abv) -> new EditSuggestionRequestDto(name,
			"Quadrupel", abv, BREWERY, null);

	static Stream<Arguments> requestTypes() {
		return Stream.of(Arguments.of("add", ADD), Arguments.of("edit", EDIT));
	}

	@ParameterizedTest(name = "{0}")
	@MethodSource("requestTypes")
	void aNameWithAnInvisibleFormattingCharacterIsRefused(String type, BiFunction<String, BigDecimal, Object> request) {
		for (String invisible : List.of("​", "‍", "‮", "⁦", "﻿", "­")) {
			assertThat(VALIDATOR.validate(request.apply("Abt" + invisible + "12", new BigDecimal("10.5"))))
					.extracting(violation -> violation.getMessage())
					.containsExactly(AddBeerRequestDto.NO_CONTROL_CHARACTERS_MESSAGE);
		}
	}

	@ParameterizedTest(name = "{0}")
	@MethodSource("requestTypes")
	void aBlankTooLongOrSymbolOnlyNameIsRefusedAndAnOrdinaryOneIsNot(String type,
			BiFunction<String, BigDecimal, Object> request) {
		assertThat(VALIDATOR.validate(request.apply("  ", new BigDecimal("5")))).isNotEmpty();
		assertThat(VALIDATOR.validate(request.apply("x".repeat(AddBeerRequestDto.MAX_NAME_LENGTH + 1), new BigDecimal("5"))))
				.isNotEmpty();
		assertThat(VALIDATOR.validate(request.apply("!!!", new BigDecimal("5")))).isNotEmpty();
		assertThat(VALIDATOR.validate(request.apply("Brasserie d'Achouffe 2", new BigDecimal("5")))).isEmpty();
	}

	@ParameterizedTest(name = "{0}")
	@MethodSource("requestTypes")
	void anAbvOutsideZeroToOneHundredOrWithTwoDecimalsIsRefused(String type,
			BiFunction<String, BigDecimal, Object> request) {
		for (String abv : List.of("-0.1", "100.1", "5.55", "1000")) {
			assertThat(VALIDATOR.validate(request.apply("Abt 12", new BigDecimal(abv)))).as(abv).isNotEmpty();
		}
		for (String abv : List.of("0", "5.5", "100")) {
			assertThat(VALIDATOR.validate(request.apply("Abt 12", new BigDecimal(abv)))).as(abv).isEmpty();
		}
		assertThat(VALIDATOR.validate(request.apply("Abt 12", null))).isNotEmpty();
	}

	@ParameterizedTest(name = "{0}")
	@MethodSource("requestTypes")
	void aBlankStyleIsRefused(String type, BiFunction<String, BigDecimal, Object> request) {
		Object blank = type.equals("add") ? new AddBeerRequestDto("Abt 12", " ", new BigDecimal("5"), BREWERY, null)
				: new EditSuggestionRequestDto("Abt 12", " ", new BigDecimal("5"), BREWERY, null);

		assertThat(VALIDATOR.validate(blank)).isNotEmpty();
	}

}
