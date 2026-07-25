package fi.kalia;

import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.classes;
import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.noClasses;
import static com.tngtech.archunit.library.GeneralCodingRules.NO_CLASSES_SHOULD_ACCESS_STANDARD_STREAMS;
import static com.tngtech.archunit.library.GeneralCodingRules.NO_CLASSES_SHOULD_USE_FIELD_INJECTION;
import static com.tngtech.archunit.library.GeneralCodingRules.NO_CLASSES_SHOULD_USE_JAVA_UTIL_LOGGING;

import com.tngtech.archunit.core.importer.ImportOption;
import com.tngtech.archunit.junit.AnalyzeClasses;
import com.tngtech.archunit.junit.ArchTest;
import com.tngtech.archunit.lang.ArchRule;
import jakarta.persistence.Entity;
import org.springframework.data.repository.Repository;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.RestControllerAdvice;

/**
 * Enforces the DDD-lite module layout (ADR-0007): domain / application / web
 * layers inside each Spring Modulith module, hexagonal dependency direction
 * web → application → domain. Module *boundaries* are verified separately by
 * {@link ModularityTest}; these rules govern the inside of a module.
 */
@AnalyzeClasses(packages = "fi.kalia", importOptions = ImportOption.DoNotIncludeTests.class)
class ArchitectureTest {

	@ArchTest
	static final ArchRule domainDependsOnNoOuterLayer = noClasses()
			.that().resideInAPackage("fi.kalia.*.domain..")
			.should().dependOnClassesThat()
			.resideInAnyPackage("fi.kalia.*.application..", "fi.kalia.*.web..")
			.because("domain is the innermost layer (ADR-0007)");

	@ArchTest
	static final ArchRule applicationDoesNotDependOnWeb = noClasses()
			.that().resideInAPackage("fi.kalia.*.application..")
			.should().dependOnClassesThat().resideInAPackage("fi.kalia.*.web..")
			.because("dependencies point inward: web → application → domain (ADR-0007)");

	@ArchTest
	static final ArchRule controllersAndAdviceLiveInWeb = classes()
			.that().areAnnotatedWith(RestController.class)
			.or().areAnnotatedWith(RestControllerAdvice.class)
			.should().resideInAnyPackage("fi.kalia.*.web..", "fi.kalia.web..")
			.because("HTTP is a web-layer concern (ADR-0007); module-neutral "
					+ "advice lives in the one sanctioned fi.kalia.web location (ADR-0014)");

	@ArchTest
	static final ArchRule entitiesLiveInDomain = classes()
			.that().areAnnotatedWith(Entity.class)
			.should().resideInAPackage("fi.kalia.*.domain..")
			.because("JPA entities are the domain model (ADR-0007)");

	@ArchTest
	static final ArchRule repositoriesLiveInDomain = classes()
			.that().areAssignableTo(Repository.class)
			.should().resideInAPackage("fi.kalia.*.domain..")
			.because("repositories belong to the domain layer (ADR-0007)");

	@ArchTest
	static final ArchRule noFieldInjection = NO_CLASSES_SHOULD_USE_FIELD_INJECTION;

	@ArchTest
	static final ArchRule noStandardStreams = NO_CLASSES_SHOULD_ACCESS_STANDARD_STREAMS;

	@ArchTest
	static final ArchRule noJavaUtilLogging = NO_CLASSES_SHOULD_USE_JAVA_UTIL_LOGGING;

}
