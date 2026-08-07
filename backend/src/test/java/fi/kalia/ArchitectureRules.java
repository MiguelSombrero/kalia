package fi.kalia;

import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.classes;
import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.noClasses;
import static com.tngtech.archunit.library.GeneralCodingRules.NO_CLASSES_SHOULD_ACCESS_STANDARD_STREAMS;
import static com.tngtech.archunit.library.GeneralCodingRules.NO_CLASSES_SHOULD_USE_FIELD_INJECTION;
import static com.tngtech.archunit.library.GeneralCodingRules.NO_CLASSES_SHOULD_USE_JAVA_UTIL_LOGGING;

import com.tngtech.archunit.base.DescribedPredicate;
import com.tngtech.archunit.core.domain.JavaClass;
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
 * The rules {@link ArchitectureTest} enforces, each built around a base
 * package.
 *
 * <p>The base package is a parameter rather than a constant so
 * {@link ArchitectureRulesRejectViolationsTest} can run these same rule
 * bodies against the deliberately violating {@code archfixture} tree, which
 * has to sit outside {@code fi.kalia} (see that package's documentation).
 * Only the base package varies: the pattern built around it is shared, so a
 * mistake in the pattern itself — the kind that leaves a rule matching no
 * class at all — breaks the fixture test rather than passing silently here.
 */
final class ArchitectureRules {

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

	private ArchitectureRules() {
	}

	static ArchRule domainDependsOnNoOuterLayer(String basePackage) {
		return noClasses()
				.that().resideInAPackage(basePackage + ".*.domain..")
				.should().dependOnClassesThat()
				.resideInAnyPackage(basePackage + ".*.application..", basePackage + ".*.web..")
				.because("domain is the innermost layer (ADR-0007)")
				.allowEmptyShould(false);
	}

	static ArchRule applicationDoesNotDependOnWeb(String basePackage) {
		return noClasses()
				.that().resideInAPackage(basePackage + ".*.application..")
				.should().dependOnClassesThat().resideInAPackage(basePackage + ".*.web..")
				.because("dependencies point inward: web → application → domain (ADR-0007)")
				.allowEmptyShould(false);
	}

	static ArchRule controllersAndAdviceLiveInWeb(String basePackage) {
		return classes()
				.that().areAnnotatedWith(RestController.class)
				.or().areAnnotatedWith(RestControllerAdvice.class)
				.should().resideInAnyPackage(basePackage + ".*.web..", basePackage + ".web..")
				.because("HTTP is a web-layer concern (ADR-0007); module-neutral advice lives "
						+ "in the one sanctioned base-package web location (ADR-0014)")
				.allowEmptyShould(false);
	}

	static ArchRule entitiesLiveInDomain(String basePackage) {
		return classes()
				.that().areAnnotatedWith(Entity.class)
				.should().resideInAPackage(basePackage + ".*.domain..")
				.because("JPA entities are the domain model (ADR-0007)")
				.allowEmptyShould(false);
	}

	static ArchRule repositoriesLiveInDomain(String basePackage) {
		return classes()
				.that().areAssignableTo(Repository.class)
				.should().resideInAPackage(basePackage + ".*.domain..")
				.because("repositories belong to the domain layer (ADR-0007)")
				.allowEmptyShould(false);
	}

	/**
	 * The half of the security guard that fails on an *absent* filter chain:
	 * with no class declaring the bean the {@code that()} clause selects
	 * nothing, and {@code allowEmptyShould(false)} turns that into a failure
	 * rather than a pass. Deleting the chain would otherwise leave every
	 * endpoint of every module open with no test objecting (ADR-0028).
	 */
	static ArchRule theResourceServerChainIsDeclaredByIdentity(String basePackage) {
		return classes()
				.that(DECLARE_A_SECURITY_FILTER_CHAIN_BEAN)
				.should().resideInAPackage(basePackage + ".identity.web..")
				.because("the identity module owns the application's one filter chain (ADR-0028)")
				.allowEmptyShould(false);
	}

	/**
	 * A chain that authenticates by some other means — or by nothing — would
	 * still satisfy {@link #theResourceServerChainIsDeclaredByIdentity}.
	 */
	static ArchRule theResourceServerChainValidatesBearerTokens() {
		return classes()
				.that(DECLARE_A_SECURITY_FILTER_CHAIN_BEAN)
				.should(ArchConditions.callMethod(HttpSecurity.class, "oauth2ResourceServer",
						Customizer.class))
				.because("the backend authenticates callers by validating a bearer token (ADR-0028)")
				.allowEmptyShould(false);
	}

	/**
	 * Keeps a protected module — {@code cellar} and everything after it —
	 * from bringing its own security configuration instead of inheriting the
	 * deny-by-default chain. A second chain does not merely add rules: the
	 * first one whose matcher accepts the request decides it, so a module
	 * that registers its own can open up paths the identity chain would have
	 * required a token for.
	 */
	static ArchRule onlyIdentityConfiguresWebSecurity(String basePackage) {
		return noClasses()
				.that().resideOutsideOfPackage(basePackage + ".identity..")
				.should().dependOnClassesThat()
				.belongToAnyOf(HttpSecurity.class, SecurityFilterChain.class, EnableWebSecurity.class)
				.because("web security is configured in exactly one place (ADR-0028)")
				.allowEmptyShould(false);
	}

	static ArchRule noFieldInjection() {
		return NO_CLASSES_SHOULD_USE_FIELD_INJECTION;
	}

	static ArchRule noStandardStreams() {
		return NO_CLASSES_SHOULD_ACCESS_STANDARD_STREAMS;
	}

	static ArchRule noJavaUtilLogging() {
		return NO_CLASSES_SHOULD_USE_JAVA_UTIL_LOGGING;
	}

}
