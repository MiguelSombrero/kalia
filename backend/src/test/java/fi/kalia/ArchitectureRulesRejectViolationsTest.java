package fi.kalia;

import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.tngtech.archunit.core.domain.JavaClasses;
import com.tngtech.archunit.core.importer.ClassFileImporter;
import com.tngtech.archunit.lang.ArchRule;
import org.junit.jupiter.api.Test;

// Covers ArchitectureTest rules no production class ever triggers (see
// backend/README.md). Each assertion names the offending fixture type, so a
// rule failing for an unrelated reason can't pass for one that bites.
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
	void aModuleRootReachingIntoDomainWithoutApplicationInThePath() {
		assertRejects(ArchitectureTest.moduleRootReachesDomainThroughApplication(FIXTURE),
				"ModuleRootReachingIntoDomain");
	}

	@Test
	void aModuleOtherThanIdentityConfiguringWebSecurity() {
		assertRejects(ArchitectureTest.onlyIdentityConfiguresWebSecurity, "StraySecurityConfig");
	}

	@Test
	void aModuleOtherThanIdentityDependingOnCurrentUserService() {
		assertRejects(ArchitectureTest.onlyIdentityDependsOnCurrentUserService,
				"StrayCurrentUserServiceCaller");
	}

	@Test
	void aRepositoryForAnEntityOwnedViaManyToOne() {
		assertRejects(ArchitectureTest.ownedEntitiesHaveNoRepositoryOfTheirOwn(FIXTURE),
				"OwnedChildEntityRepository");
	}

	// Pins allowEmptyShould(false): dropping it turns "the chain was deleted"
	// from a failure into a pass, and no fixture can stand in for an empty codebase.
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
