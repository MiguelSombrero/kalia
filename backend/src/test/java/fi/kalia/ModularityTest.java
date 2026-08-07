package fi.kalia;

import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.tngtech.archunit.core.importer.ImportOption;
import org.junit.jupiter.api.Test;
import org.springframework.modulith.core.ApplicationModules;
import org.springframework.modulith.core.Violations;

class ModularityTest {

	/**
	 * {@code ApplicationModules} imports with {@code DoNotIncludeTests} by
	 * default. That default is what keeps the fixture invisible to the
	 * production check above, and so is also what the fixture check has to
	 * override to see it at all.
	 */
	private static final ImportOption INCLUDING_TEST_CLASSES = location -> true;

	@Test
	void verifiesModuleStructure() {
		ApplicationModules.of(KaliaApplication.class).verify();
	}

	/**
	 * Proves the check above would catch something. A compliant codebase
	 * cannot tell a working boundary check apart from one that inspects no
	 * modules at all — the same gap {@link ArchitectureRulesRejectViolationsTest}
	 * closes for the ArchUnit rules.
	 */
	@Test
	void rejectsAModuleReachingIntoAnothersInternals() {
		assertThatThrownBy(() -> ApplicationModules
				.of("archfixture.boundaries", INCLUDING_TEST_CLASSES)
				.verify())
				.isInstanceOf(Violations.class)
				.hasMessageContaining("AlphaInternal");
	}

}
