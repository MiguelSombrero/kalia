package fi.kalia;

import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.tngtech.archunit.core.domain.JavaClasses;
import com.tngtech.archunit.core.importer.ClassFileImporter;
import com.tngtech.archunit.lang.ArchRule;
import org.junit.jupiter.api.Test;

/**
 * Covers the {@link ArchitectureTest} rules that no production class ever
 * triggers, by running them against a codebase that breaks them.
 *
 * <p>Only those rules. A rule like {@code entitiesLiveInDomain} is exercised
 * every run — {@code Beer} is an {@code @Entity}, so a mistake in the rule
 * fails {@code ArchitectureTest} loudly, and a fixture would add nothing. A
 * {@code noClasses()} rule is the opposite: passing means its condition was
 * never evaluated against a real candidate, so a wrong condition and a
 * satisfied one look identical. Measured, not assumed — mistyping
 * {@code domainDependsOnNoOuterLayer}'s forbidden-package list leaves
 * {@code ArchitectureTest} green at 11/11 and fails only the test below.
 *
 * <p>Each assertion names the offending fixture type, so a rule failing for
 * some unrelated reason cannot pass for a rule that bites.
 */
class ArchitectureRulesRejectViolationsTest {

	private static final String FIXTURE = "archfixture";

	private static final JavaClasses FIXTURE_CLASSES = new ClassFileImporter().importPackages(FIXTURE);

	@Test
	void domainDependingOnAnOuterLayer() {
		assertRejects(ArchitectureTest.domainDependsOnNoOuterLayer(FIXTURE), "DomainReachingOutward");
	}

	@Test
	void applicationDependingOnWeb() {
		assertRejects(ArchitectureTest.applicationDoesNotDependOnWeb(FIXTURE),
				"ApplicationReachingIntoWeb");
	}

	@Test
	void aModuleOtherThanIdentityConfiguringWebSecurity() {
		assertRejects(ArchitectureTest.onlyIdentityConfiguresWebSecurity, "StraySecurityConfig");
	}

	/**
	 * Pins the {@code allowEmptyShould(false)} on the two chain rules, not
	 * ArchUnit's implementation of it: dropping that call is an innocuous-
	 * looking edit that would turn "the filter chain was deleted" from a build
	 * failure into a pass. No violating class can stand in for this — the
	 * failure mode is a codebase with nothing to violate.
	 */
	@Test
	void aCodebaseDeclaringNoFilterChainAtAll() {
		JavaClasses withoutAnyFilterChain = new ClassFileImporter()
				.importPackages(FIXTURE + ".badmodule");

		assertRejectsAnEmptyCodebase(ArchitectureTest.theResourceServerChainIsDeclaredByIdentity,
				withoutAnyFilterChain);
		assertRejectsAnEmptyCodebase(ArchitectureTest.theResourceServerChainValidatesBearerTokens,
				withoutAnyFilterChain);
	}

	private static void assertRejects(ArchRule rule, String offendingType) {
		assertThatThrownBy(() -> rule.check(FIXTURE_CLASSES))
				.isInstanceOf(AssertionError.class)
				.hasMessageContaining(offendingType);
	}

	private static void assertRejectsAnEmptyCodebase(ArchRule rule, JavaClasses classes) {
		assertThatThrownBy(() -> rule.check(classes))
				.isInstanceOf(AssertionError.class)
				.hasMessageContaining("failed to check any classes");
	}

}
