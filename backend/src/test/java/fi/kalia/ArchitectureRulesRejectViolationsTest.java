package fi.kalia;

import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.tngtech.archunit.core.domain.JavaClasses;
import com.tngtech.archunit.core.importer.ClassFileImporter;
import com.tngtech.archunit.lang.ArchRule;
import org.junit.jupiter.api.Test;

/**
 * Runs every rule in {@link ArchitectureRules} against a codebase that breaks
 * it, so each is known to catch something. {@link ArchitectureTest} alone
 * cannot show that: a rule whose {@code that()} clause selects nothing — a
 * mistyped package pattern, a predicate matching no class — passes exactly
 * like a rule that holds.
 *
 * <p>Each assertion names the offending fixture type, which is what makes it
 * a proof rather than a "something threw": a rule that failed for an
 * unrelated reason — matching nothing at all, most of all — would not
 * mention that type.
 */
class ArchitectureRulesRejectViolationsTest {

	private static final String FIXTURE = "archfixture";

	private static final JavaClasses FIXTURE_CLASSES = new ClassFileImporter().importPackages(FIXTURE);

	@Test
	void domainDependingOnAnOuterLayer() {
		assertRejects(ArchitectureRules.domainDependsOnNoOuterLayer(FIXTURE),
				"DomainReachingOutward");
	}

	@Test
	void applicationDependingOnWeb() {
		assertRejects(ArchitectureRules.applicationDoesNotDependOnWeb(FIXTURE),
				"ApplicationReachingIntoWeb");
	}

	@Test
	void aControllerOutsideWeb() {
		assertRejects(ArchitectureRules.controllersAndAdviceLiveInWeb(FIXTURE),
				"MisplacedController");
	}

	@Test
	void anEntityOutsideDomain() {
		assertRejects(ArchitectureRules.entitiesLiveInDomain(FIXTURE), "MisplacedEntity");
	}

	@Test
	void aRepositoryOutsideDomain() {
		assertRejects(ArchitectureRules.repositoriesLiveInDomain(FIXTURE), "MisplacedRepository");
	}

	@Test
	void aFilterChainDeclaredOutsideIdentity() {
		assertRejects(ArchitectureRules.theResourceServerChainIsDeclaredByIdentity(FIXTURE),
				"StraySecurityConfig");
	}

	@Test
	void aFilterChainThatValidatesNoBearerToken() {
		assertRejects(ArchitectureRules.theResourceServerChainValidatesBearerTokens(),
				"StraySecurityConfig");
	}

	@Test
	void aModuleOtherThanIdentityConfiguringWebSecurity() {
		assertRejects(ArchitectureRules.onlyIdentityConfiguresWebSecurity(FIXTURE),
				"StraySecurityConfig");
	}

	@Test
	void fieldInjection() {
		assertRejects(ArchitectureRules.noFieldInjection(), "FieldInjected");
	}

	@Test
	void printingToAStandardStream() {
		assertRejects(ArchitectureRules.noStandardStreams(), "StandardStreamUser");
	}

	@Test
	void loggingThroughJavaUtilLogging() {
		assertRejects(ArchitectureRules.noJavaUtilLogging(), "JavaUtilLoggingUser");
	}

	/**
	 * The absent-chain half of the guard, which no violating class can stand
	 * in for: a codebase declaring no filter chain at all leaves both security
	 * rules with nothing to check, and that has to fail rather than pass.
	 */
	@Test
	void aCodebaseDeclaringNoFilterChainAtAll() {
		JavaClasses withoutAnyFilterChain = new ClassFileImporter()
				.importPackages(FIXTURE + ".badmodule");

		assertRejectsAnEmptyCodebase(
				ArchitectureRules.theResourceServerChainIsDeclaredByIdentity(FIXTURE),
				withoutAnyFilterChain);
		assertRejectsAnEmptyCodebase(
				ArchitectureRules.theResourceServerChainValidatesBearerTokens(),
				withoutAnyFilterChain);
	}

	private static void assertRejectsAnEmptyCodebase(ArchRule rule, JavaClasses classes) {
		assertThatThrownBy(() -> rule.check(classes))
				.isInstanceOf(AssertionError.class)
				.hasMessageContaining("failed to check any classes");
	}

	private static void assertRejects(ArchRule rule, String offendingType) {
		assertThatThrownBy(() -> rule.check(FIXTURE_CLASSES))
				.isInstanceOf(AssertionError.class)
				.hasMessageContaining(offendingType);
	}

}
