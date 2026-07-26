package fi.kalia;

import java.util.List;
import java.util.function.UnaryOperator;
import org.springframework.util.StringUtils;

/**
 * Verifies configuration that deliberately has no default (ADR-0015). Must
 * run before the context starts, for two framework reasons: Spring's
 * configuration-properties binder resolves placeholders leniently, so an
 * unset {@code ${POSTGRES_PASSWORD}} binds as that literal string rather
 * than failing, and Flyway opens its connection before any bean of ours is
 * constructed. Later, a missing secret surfaces as
 * {@code password authentication failed} instead.
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
