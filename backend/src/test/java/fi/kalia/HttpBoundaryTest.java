package fi.kalia;

import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.methods;

import com.tngtech.archunit.base.DescribedPredicate;
import com.tngtech.archunit.core.domain.JavaClass;
import com.tngtech.archunit.core.domain.JavaMethod;
import com.tngtech.archunit.core.domain.JavaParameter;
import com.tngtech.archunit.core.domain.JavaType;
import com.tngtech.archunit.core.importer.ImportOption;
import com.tngtech.archunit.junit.AnalyzeClasses;
import com.tngtech.archunit.junit.ArchTest;
import com.tngtech.archunit.lang.ArchCondition;
import com.tngtech.archunit.lang.ArchRule;
import com.tngtech.archunit.lang.ConditionEvents;
import com.tngtech.archunit.lang.SimpleConditionEvent;
import jakarta.persistence.Entity;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Guards the HTTP boundary named in architecture.md §4 — "JPA entities never
 * serialize directly" — the one that hands entities outward deliberately
 * ({@link ArchitectureTest}'s layer rules) and yet must stop them at the
 * controller. Kept apart from {@link ArchitectureTest}: that class is about
 * layer direction, this one about what a handler method may put on the wire.
 * Neither rule has a production violator, so both are checked against a
 * fixture too — see {@link HttpBoundaryRulesRejectViolationsTest}.
 */
@AnalyzeClasses(packages = HttpBoundaryTest.BASE_PACKAGE, importOptions = ImportOption.DoNotIncludeTests.class)
class HttpBoundaryTest {

	static final String BASE_PACKAGE = "fi.kalia";

	// Restricted to handler methods, not every method a @RestController
	// declares: a private helper is never itself put on the wire, so only a
	// method Spring actually dispatches to is the boundary this rule guards.
	private static final DescribedPredicate<JavaMethod> A_CONTROLLER_HANDLER_METHOD =
			new DescribedPredicate<>("a controller handler method") {
				@Override
				public boolean test(JavaMethod method) {
					return method.getOwner().isAnnotatedWith(RestController.class)
							&& (method.isAnnotatedWith(RequestMapping.class)
									|| method.isMetaAnnotatedWith(RequestMapping.class));
				}
			};

	private static final ArchCondition<JavaMethod> NOT_RETURN_A_JPA_ENTITY =
			new ArchCondition<>("not return a JPA entity, bare or wrapped in a container type") {
				@Override
				public void check(JavaMethod method, ConditionEvents events) {
					for (JavaClass entityType : jpaEntitiesInvolvedIn(method.getReturnType())) {
						events.add(SimpleConditionEvent.violated(method,
								method.getFullName() + " returns " + entityType.getName()
										+ ", a JPA entity, across the HTTP boundary"));
					}
				}
			};

	private static final ArchCondition<JavaMethod> NOT_ACCEPT_A_JPA_ENTITY_AS_REQUEST_BODY =
			new ArchCondition<>("not accept a JPA entity, bare or wrapped, as a @RequestBody") {
				@Override
				public void check(JavaMethod method, ConditionEvents events) {
					for (JavaParameter parameter : method.getParameters()) {
						if (!parameter.isAnnotatedWith(RequestBody.class)) {
							continue;
						}
						for (JavaClass entityType : jpaEntitiesInvolvedIn(parameter.getType())) {
							events.add(SimpleConditionEvent.violated(method,
									method.getFullName() + " accepts " + entityType.getName()
											+ ", a JPA entity, as a @RequestBody"));
						}
					}
				}
			};

	// Detection is annotation-driven, not package-driven, so unlike
	// ArchitectureTest's layer rules these need no basePackage parameter to be
	// re-pointed at the archfixture tree in HttpBoundaryRulesRejectViolationsTest.
	@ArchTest
	static final ArchRule controllerHandlersDoNotReturnJpaEntities = methods()
			.that(A_CONTROLLER_HANDLER_METHOD)
			.should(NOT_RETURN_A_JPA_ENTITY)
			.because("JPA entities never serialize directly across the HTTP boundary (architecture.md §4)")
			.allowEmptyShould(false);

	@ArchTest
	static final ArchRule controllerHandlersDoNotAcceptJpaEntitiesAsRequestBodies = methods()
			.that(A_CONTROLLER_HANDLER_METHOD)
			.should(NOT_ACCEPT_A_JPA_ENTITY_AS_REQUEST_BODY)
			.because("an entity accepted as a request body is mass assignment: a caller could set any "
					+ "field, including ids and ownership (architecture.md §4)")
			.allowEmptyShould(false);

	// getAllInvolvedRawTypes() is what sees through List<Bottle>, Page<Beer>,
	// ResponseEntity<Entry> and Optional<Profile> alike: it walks the whole
	// generic signature, not just the raw return/parameter type.
	private static Set<JavaClass> jpaEntitiesInvolvedIn(JavaType type) {
		return type.getAllInvolvedRawTypes().stream()
				.filter(candidate -> candidate.isAnnotatedWith(Entity.class))
				.collect(Collectors.toSet());
	}

}
