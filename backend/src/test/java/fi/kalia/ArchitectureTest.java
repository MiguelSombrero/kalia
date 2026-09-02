package fi.kalia;

import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.classes;
import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.noClasses;
import static com.tngtech.archunit.library.GeneralCodingRules.NO_CLASSES_SHOULD_ACCESS_STANDARD_STREAMS;
import static com.tngtech.archunit.library.GeneralCodingRules.NO_CLASSES_SHOULD_USE_FIELD_INJECTION;
import static com.tngtech.archunit.library.GeneralCodingRules.NO_CLASSES_SHOULD_USE_JAVA_UTIL_LOGGING;

import com.tngtech.archunit.base.DescribedPredicate;
import com.tngtech.archunit.core.domain.Dependency;
import com.tngtech.archunit.core.domain.JavaClass;
import com.tngtech.archunit.core.domain.JavaField;
import com.tngtech.archunit.core.importer.ImportOption;
import com.tngtech.archunit.junit.AnalyzeClasses;
import com.tngtech.archunit.junit.ArchTest;
import com.tngtech.archunit.lang.ArchRule;
import com.tngtech.archunit.lang.conditions.ArchConditions;
import jakarta.persistence.Entity;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import org.springframework.context.annotation.Bean;
import org.springframework.data.repository.Repository;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.RestControllerAdvice;

/**
 * Enforces module layout (ADR-0007) and the one-filter-chain invariant
 * (ADR-0028); module boundaries are {@link ModularityTest}'s job. Rules with
 * no production violator are checked against a fixture instead — see
 * {@link ArchitectureRulesRejectViolationsTest}.
 */
@AnalyzeClasses(packages = ArchitectureTest.BASE_PACKAGE,
		importOptions = ImportOption.DoNotIncludeTests.class)
class ArchitectureTest {

	static final String BASE_PACKAGE = "fi.kalia";

	// Keyed on the bean, not a class name, so renaming SecurityConfig doesn't
	// silently take the guard with it.
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
	static final ArchRule moduleRootReachesDomainThroughApplication =
			moduleRootReachesDomainThroughApplication(BASE_PACKAGE);

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

	@ArchTest
	static final ArchRule ownedEntitiesHaveNoRepositoryOfTheirOwn =
			ownedEntitiesHaveNoRepositoryOfTheirOwn(BASE_PACKAGE);

	// allowEmptyShould(false) turns an absent chain into a failure instead of
	// a vacuous pass — otherwise deleting it opens every endpoint unnoticed.
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

	// A second chain doesn't merely add rules: the first matching chain
	// decides the request, so a module's own chain can open paths identity's
	// would have required a token for.
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

	// Parameterised so {@link ArchitectureRulesRejectViolationsTest} can point
	// this same rule body at a fixture that breaks it — a rule no production
	// class ever triggers passes whether or not its condition is right.
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

	// The other layer rules only constrain classes inside .domain/.application/
	// .web; a module-root class (the inter-module API) sits outside all three.
	// A root class touching a domain type must also touch application, so a
	// straight-to-repository dependency is what fails; a domain type handed
	// back through an application call is fine. allowEmptyShould is true here
	// unlike the siblings: no root class touching domain is the clean end
	// state, and ArchitectureRulesRejectViolationsTest proves the rule bites.
	// Parameterised for the reason {@link #domainDependsOnNoOuterLayer(String)} gives.
	static ArchRule moduleRootReachesDomainThroughApplication(String basePackage) {
		return classes()
				.that(JavaClass.Predicates.resideInAPackage(basePackage + ".*")
						.and(dependOnClassesIn(basePackage + ".*.domain..")))
				.should().dependOnClassesThat().resideInAPackage(basePackage + ".*.application..")
				.because("a module-root API reaches domain through application, "
						+ "like every other class in the module: web → application → domain (ADR-0007)")
				.allowEmptyShould(true);
	}

	// A bottle is created, changed and removed only through the entry that owns
	// it (ADR-0052): an entity a @OneToMany with orphan removal owns is reached
	// through that aggregate root, the only side with a repository. No production
	// class violates this, so ArchitectureRulesRejectViolationsTest points it at
	// a fixture. Parameterised for the reason {@link #domainDependsOnNoOuterLayer(String)} gives.
	static ArchRule ownedEntitiesHaveNoRepositoryOfTheirOwn(String basePackage) {
		return noClasses()
				.that().areAssignableTo(Repository.class)
				.and().resideInAPackage(basePackage + "..")
				.should().dependOnClassesThat(anEntityOwnedViaManyToOne())
				.because("an owned entity is written through its aggregate root, not its own repository (ADR-0052)")
				.allowEmptyShould(true);
	}

	private static DescribedPredicate<JavaClass> anEntityOwnedViaManyToOne() {
		return new DescribedPredicate<>("an entity a @OneToMany aggregate root owns via orphan removal") {
			@Override
			public boolean test(JavaClass target) {
				return target.isAnnotatedWith(Entity.class)
						&& target.getAllFields().stream()
								.filter(field -> field.isAnnotatedWith(ManyToOne.class))
								.map(JavaField::getRawType)
								.anyMatch(ArchitectureTest::ownsChildrenByOrphanRemoval);
			}
		};
	}

	private static boolean ownsChildrenByOrphanRemoval(JavaClass parent) {
		return parent.getAllFields().stream()
				.filter(field -> field.isAnnotatedWith(OneToMany.class))
				.anyMatch(field -> field.getAnnotationOfType(OneToMany.class).orphanRemoval());
	}

	private static DescribedPredicate<JavaClass> dependOnClassesIn(String packageIdentifier) {
		return new DescribedPredicate<>("depend on classes in '" + packageIdentifier + "'") {
			@Override
			public boolean test(JavaClass javaClass) {
				return javaClass.getDirectDependenciesFromSelf().stream()
						.map(Dependency::getTargetClass)
						.anyMatch(JavaClass.Predicates.resideInAPackage(packageIdentifier));
			}
		};
	}

}
