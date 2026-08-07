package fi.kalia;

import com.tngtech.archunit.core.importer.ImportOption;
import com.tngtech.archunit.junit.AnalyzeClasses;
import com.tngtech.archunit.junit.ArchTest;
import com.tngtech.archunit.lang.ArchRule;

/**
 * Enforces the DDD-lite module layout and dependency direction (ADR-0007)
 * and the one-resource-server-chain invariant (ADR-0028), against production
 * code. Module *boundaries* are verified separately by {@link ModularityTest}.
 *
 * <p>The rules themselves live in {@link ArchitectureRules}, where
 * {@link ArchitectureRulesRejectViolationsTest} can also point them at a
 * codebase that breaks them — a passing run here says nothing on its own
 * about whether a rule would catch anything.
 */
@AnalyzeClasses(packages = ArchitectureRules.BASE_PACKAGE,
		importOptions = ImportOption.DoNotIncludeTests.class)
class ArchitectureTest {

	@ArchTest
	static final ArchRule domainDependsOnNoOuterLayer =
			ArchitectureRules.domainDependsOnNoOuterLayer(ArchitectureRules.BASE_PACKAGE);

	@ArchTest
	static final ArchRule applicationDoesNotDependOnWeb =
			ArchitectureRules.applicationDoesNotDependOnWeb(ArchitectureRules.BASE_PACKAGE);

	@ArchTest
	static final ArchRule controllersAndAdviceLiveInWeb =
			ArchitectureRules.controllersAndAdviceLiveInWeb(ArchitectureRules.BASE_PACKAGE);

	@ArchTest
	static final ArchRule entitiesLiveInDomain =
			ArchitectureRules.entitiesLiveInDomain(ArchitectureRules.BASE_PACKAGE);

	@ArchTest
	static final ArchRule repositoriesLiveInDomain =
			ArchitectureRules.repositoriesLiveInDomain(ArchitectureRules.BASE_PACKAGE);

	@ArchTest
	static final ArchRule theResourceServerChainIsDeclaredByIdentity =
			ArchitectureRules.theResourceServerChainIsDeclaredByIdentity(ArchitectureRules.BASE_PACKAGE);

	@ArchTest
	static final ArchRule theResourceServerChainValidatesBearerTokens =
			ArchitectureRules.theResourceServerChainValidatesBearerTokens();

	@ArchTest
	static final ArchRule onlyIdentityConfiguresWebSecurity =
			ArchitectureRules.onlyIdentityConfiguresWebSecurity(ArchitectureRules.BASE_PACKAGE);

	@ArchTest
	static final ArchRule noFieldInjection = ArchitectureRules.noFieldInjection();

	@ArchTest
	static final ArchRule noStandardStreams = ArchitectureRules.noStandardStreams();

	@ArchTest
	static final ArchRule noJavaUtilLogging = ArchitectureRules.noJavaUtilLogging();

}
