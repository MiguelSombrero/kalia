package fi.kalia;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.Map;
import org.junit.jupiter.api.Test;

class RequiredConfigurationValidatorTest {

	@Test
	void namesTheMissingVariableWhenItIsUnset() {
		assertThatThrownBy(() -> RequiredConfigurationValidator.verify(Map.<String, String>of()::get))
				.isInstanceOf(IllegalStateException.class)
				.hasMessageContaining("POSTGRES_PASSWORD");
	}

	@Test
	void namesTheFeedCursorKeyWhenItIsTheOnlyOneMissing() {
		Map<String, String> environment = Map.of("POSTGRES_PASSWORD", "secret");

		assertThatThrownBy(() -> RequiredConfigurationValidator.verify(environment::get))
				.isInstanceOf(IllegalStateException.class)
				.hasMessageContaining("FEED_CURSOR_KEY");
	}

	@Test
	void rejectsABlankValueRatherThanAcceptingItAsConfigured() {
		Map<String, String> environment = Map.of("POSTGRES_PASSWORD", "   ");

		assertThatThrownBy(() -> RequiredConfigurationValidator.verify(environment::get))
				.isInstanceOf(IllegalStateException.class)
				.hasMessageContaining("POSTGRES_PASSWORD");
	}

	@Test
	void passesWhenEveryRequiredVariableIsSet() {
		Map<String, String> environment = Map.of("POSTGRES_PASSWORD", "secret", "FEED_CURSOR_KEY", "0123456789abcdef0123456789abcdef");

		assertThatCode(() -> RequiredConfigurationValidator.verify(environment::get))
				.doesNotThrowAnyException();
	}

}
