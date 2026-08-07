/**
 * Deliberately violating classes, for the {@code ArchitectureTest} rules that
 * no production class ever triggers — see
 * {@code ArchitectureRulesRejectViolationsTest} for which those are and why
 * the rest need no fixture.
 *
 * <p>Do not move this tree under {@code fi.kalia}. Spring's component scan
 * starts at the application's base package and covers test classes on the
 * classpath, so {@code StraySecurityConfig} — a real {@code @Configuration}
 * declaring a chain that permits every request — would be registered into
 * every {@code @SpringBootTest}, and the failure would not name this package.
 * The same goes for anything with a stereotype or {@code @Entity} added here
 * later. Living outside {@code fi.kalia} is the whole reason two rules in
 * {@code ArchitectureTest} take a base package rather than hard-coding one.
 *
 * <p>Runs of those rules over production code never reach this tree:
 * ArchUnit's {@code DoNotIncludeTests} excludes test output.
 */
package archfixture;
