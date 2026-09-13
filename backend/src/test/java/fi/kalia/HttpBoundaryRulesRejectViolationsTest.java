package fi.kalia;

import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.tngtech.archunit.core.domain.JavaClasses;
import com.tngtech.archunit.core.importer.ClassFileImporter;
import com.tngtech.archunit.lang.ArchRule;
import org.junit.jupiter.api.Test;

// Covers HttpBoundaryTest's rules: neither has a production violator, so a
// wrong condition would pass silently (see backend/README.md). Fixture lives
// at archfixture.httpboundary.EntityLeakingController; each assertion names
// the offending method, so a rule failing for an unrelated reason can't pass
// for one that bites.
class HttpBoundaryRulesRejectViolationsTest {

	private static final JavaClasses FIXTURE_CLASSES =
			new ClassFileImporter().importPackages("archfixture.httpboundary");

	@Test
	void aControllerReturningAJpaEntityDirectly() {
		assertRejects(HttpBoundaryTest.controllerHandlersDoNotReturnJpaEntities, "returnsEntityDirectly");
	}

	@Test
	void aControllerReturningAListOfJpaEntities() {
		assertRejects(HttpBoundaryTest.controllerHandlersDoNotReturnJpaEntities, "returnsListOfEntities");
	}

	@Test
	void aControllerReturningAPageOfJpaEntities() {
		assertRejects(HttpBoundaryTest.controllerHandlersDoNotReturnJpaEntities, "returnsPageOfEntities");
	}

	@Test
	void aControllerReturningAnOptionalJpaEntity() {
		assertRejects(HttpBoundaryTest.controllerHandlersDoNotReturnJpaEntities, "returnsOptionalOfEntity");
	}

	@Test
	void aControllerReturningAResponseEntityOfAJpaEntity() {
		assertRejects(HttpBoundaryTest.controllerHandlersDoNotReturnJpaEntities, "returnsResponseEntityOfEntity");
	}

	@Test
	void aControllerAcceptingAJpaEntityAsARequestBody() {
		assertRejects(HttpBoundaryTest.controllerHandlersDoNotAcceptJpaEntitiesAsRequestBodies,
				"acceptsEntityAsRequestBody");
	}

	private static void assertRejects(ArchRule rule, String offendingMethod) {
		assertThatThrownBy(() -> rule.check(FIXTURE_CLASSES))
				.isInstanceOf(AssertionError.class)
				.hasMessageContaining(offendingMethod);
	}

}
