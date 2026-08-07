package fi.kalia;

import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.classes;
import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.noClasses;
import static com.tngtech.archunit.library.GeneralCodingRules.NO_CLASSES_SHOULD_ACCESS_STANDARD_STREAMS;
import static com.tngtech.archunit.library.GeneralCodingRules.NO_CLASSES_SHOULD_USE_FIELD_INJECTION;
import static com.tngtech.archunit.library.GeneralCodingRules.NO_CLASSES_SHOULD_USE_JAVA_UTIL_LOGGING;

import com.tngtech.archunit.base.DescribedPredicate;
import com.tngtech.archunit.core.domain.JavaClass;
import com.tngtech.archunit.core.importer.ImportOption;
import com.tngtech.archunit.junit.AnalyzeClasses;
import com.tngtech.archunit.junit.ArchTest;
import com.tngtech.archunit.lang.ArchRule;
import com.tngtech.archunit.lang.conditions.ArchConditions;
import jakarta.persistence.Entity;
import org.springframework.context.annotation.Bean;
import org.springframework.data.repository.Repository;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.RestControllerAdvice;

/**
 * Enforces the DDD-lite module layout and dependency direction (ADR-0007) and
 * the one-filter-chain security invariant (ADR-0028). Module *boundaries* are
 * verified separately by {@link ModularityTest}; these rules govern the inside
 * of a module.
 *
 * <p>Most rules here are exercised by the codebase itself — production classes
 * match their {@code that()} clause, so a mistake in the rule shows up as a
 * failure right here. The three that are not, because nothing in production
 * ever triggers them, are checked against a violating fixture instead; see
 * {@link ArchitectureRulesRejectViolationsTest}.
 */
@AnalyzeClasses(packages = ArchitectureTest.BASE_PACKAGE,
		importOptions = ImportOption.DoNotIncludeTests.class)
class ArchitectureTest {

	static final String BASE_PACKAGE = "fi.kalia";

	/**
	 * Matches the class the security filter chain is configured in. Keyed on
	 * the bean rather than on a class name, so renaming or splitting
	 * {@code SecurityConfig} does not silently take the guard with it.
	 */
	private static final DescribedPredicate<JavaClass> DECLARE_A_SECURITY_FILTER_CHAIN_BEAN =
			new DescribedPredicate<>("declare a @Bean method returning a SecurityFilterChain") {
				@Override
				public boolean test(JavaClass type) {
					return type.getMethods().stream()
							.anyMatch(method -> method.isAnnotatedWith(Bean.class)
									&& method.getRawReturnType().isAssignableTo(SecurityFilterChain.class));
				}
			};

	@ArchTest
	static final ArchRule domainDependsOnNoOuterLayer = domainDependsOnNoOuterLayer(BASE_PACKAGE);

	@ArchTest
	static final ArchRule applicationDoesNotDependOnWeb = applicationDoesNotDependOnWeb(BASE_PACKAGE);

	@ArchTest
	static final ArchRule controllersAndAdviceLiveInWeb = classes()
			.that().areAnnotatedWith(RestController.class)
			.or().areAnnotatedWith(RestControllerAdvice.class)
			.should().resideInAnyPackage(BASE_PACKAGE + ".*.web..", BASE_PACKAGE + ".web..")
			.because("HTTP is a web-layer concern (ADR-0007); module-neutral "
					+ "advice lives in the one sanctioned fi.kalia.web location (ADR-0014)")
			.allowEmptyShould(false);

	@ArchTest
	static final ArchRule entitiesLiveInDomain = classes()
			.that().areAnnotatedWith(Entity.class)
			.should().resideInAPackage(BASE_PACKAGE + ".*.domain..")
			.because("JPA entities are the domain model (ADR-0007)")
			.allowEmptyShould(false);

	@ArchTest
	static final ArchRule repositoriesLiveInDomain = classes()
			.that().areAssignableTo(Repository.class)
			.should().resideInAPackage(BASE_PACKAGE + ".*.domain..")
			.because("repositories belong to the domain layer (ADR-0007)")
			.allowEmptyShould(false);

	/**
	 * {@code allowEmptyShould(false)} is what makes this fail on an *absent*
	 * chain: with nothing declaring the bean the {@code that()} clause selects
	 * nothing, which has to be a failure rather than a vacuous pass. Deleting
	 * the chain would otherwise leave every endpoint of every module open with
	 * no test objecting (ADR-0028).
	 */
	@ArchTest
	static final ArchRule theResourceServerChainIsDeclaredByIdentity = classes()
			.that(DECLARE_A_SECURITY_FILTER_CHAIN_BEAN)
			.should().resideInAPackage(BASE_PACKAGE + ".identity.web..")
			.because("the identity module owns the application's one filter chain (ADR-0028)")
			.allowEmptyShould(false);

	/**
	 * A chain that authenticates by some other means — or by nothing — would
	 * still satisfy {@link #theResourceServerChainIsDeclaredByIdentity}.
	 */
	@ArchTest
	static final ArchRule theResourceServerChainValidatesBearerTokens = classes()
			.that(DECLARE_A_SECURITY_FILTER_CHAIN_BEAN)
			.should(ArchConditions.callMethod(HttpSecurity.class, "oauth2ResourceServer",
					Customizer.class))
			.because("the backend authenticates callers by validating a bearer token (ADR-0028)")
			.allowEmptyShould(false);

	/**
	 * Keeps a protected module — {@code cellar} and everything after it — from
	 * bringing its own security configuration instead of inheriting the
	 * deny-by-default chain. A second chain does not merely add rules: the
	 * first one whose matcher accepts the request decides it, so a module that
	 * registers its own can open up paths the identity chain would have
	 * required a token for.
	 */
	@ArchTest
	static final ArchRule onlyIdentityConfiguresWebSecurity = noClasses()
			.that().resideOutsideOfPackage(BASE_PACKAGE + ".identity..")
			.should().dependOnClassesThat()
			.belongToAnyOf(HttpSecurity.class, SecurityFilterChain.class, EnableWebSecurity.class)
			.because("web security is configured in exactly one place (ADR-0028)")
			.allowEmptyShould(false);

	@ArchTest
	static final ArchRule noFieldInjection = NO_CLASSES_SHOULD_USE_FIELD_INJECTION;

	@ArchTest
	static final ArchRule noStandardStreams = NO_CLASSES_SHOULD_ACCESS_STANDARD_STREAMS;

	@ArchTest
	static final ArchRule noJavaUtilLogging = NO_CLASSES_SHOULD_USE_JAVA_UTIL_LOGGING;

	/**
	 * Takes a base package, unlike every rule above, so
	 * {@link ArchitectureRulesRejectViolationsTest} can point this same rule
	 * body at a fixture that breaks it — no production class ever will, and a
	 * rule nothing triggers passes whether or not its condition is right. The
	 * fixture cannot live under {@code fi.kalia} (see {@code archfixture}), so
	 * the base package has to be a parameter to reach it. Only that varies:
	 * the pattern built around it is shared with the run over production code.
	 */
	static ArchRule domainDependsOnNoOuterLayer(String basePackage) {
		return noClasses()
				.that().resideInAPackage(basePackage + ".*.domain..")
				.should().dependOnClassesThat()
				.resideInAnyPackage(basePackage + ".*.application..", basePackage + ".*.web..")
				.because("domain is the innermost layer (ADR-0007)")
				.allowEmptyShould(false);
	}

	/** Parameterised for the reason {@link #domainDependsOnNoOuterLayer(String)} gives. */
	static ArchRule applicationDoesNotDependOnWeb(String basePackage) {
		return noClasses()
				.that().resideInAPackage(basePackage + ".*.application..")
				.should().dependOnClassesThat().resideInAPackage(basePackage + ".*.web..")
				.because("dependencies point inward: web → application → domain (ADR-0007)")
				.allowEmptyShould(false);
	}

}
