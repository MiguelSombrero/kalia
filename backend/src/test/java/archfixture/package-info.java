/**
 * Deliberately violating classes. {@code ArchitectureRulesRejectViolationsTest}
 * and {@code ModularityTest} run the real rules against this tree to prove
 * they fail on a real violation; nothing here is production code.
 *
 * <p>Do not move this tree under {@code fi.kalia}. Spring's component scan
 * and Hibernate's entity scan both start at the application's base package
 * and cover test classes on the classpath, so a fixture {@code @Entity} or
 * {@code @RestController} sitting under {@code fi.kalia} would be registered
 * into every {@code @SpringBootTest} — the entity failing schema validation,
 * the controller quietly serving requests — and neither failure would name
 * this package. That constraint is the whole reason
 * {@code ArchitectureRules} takes a base package instead of hard-coding one.
 *
 * <p>Runs of those rules over production code never reach this tree: ArchUnit's
 * {@code DoNotIncludeTests} and Spring Modulith's identical default both
 * exclude test output.
 */
package archfixture;
