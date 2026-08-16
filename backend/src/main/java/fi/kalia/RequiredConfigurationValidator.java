package fi.kalia;

import java.util.List;
import java.util.function.UnaryOperator;
import org.springframework.util.StringUtils;

/**
 * Verifies configuration with deliberately no default (ADR-0015). Must run
 * before the context starts: Spring's binder resolves an unset placeholder
 * leniently as its literal string, and Flyway connects before our beans
 * construct — later, a missing secret just surfaces as
 * {@code password authentication failed}.
 */
final class RequiredConfigurationValidator {

	private static final List<String> REQUIRED = List.of("POSTGRES_PASSWORD");

	private RequiredConfigurationValidator() {
	}

	static void verify(UnaryOperator<String> environment) {
		List<String> missing = REQUIRED.stream()
				.filter(name -> !StringUtils.hasText(environment.apply(name)))
				.toList();
		if (!missing.isEmpty()) {
			throw new IllegalStateException(
					"Required configuration is missing: %s. Set it as an environment variable - see backend/README.md."
							.formatted(String.join(", ", missing)));
		}
	}

}
