package fi.kalia.identity.web;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.DynamicTest.dynamicTest;

import fi.kalia.TestcontainersConfiguration;
import java.util.Set;
import java.util.SortedSet;
import java.util.TreeSet;
import java.util.stream.Stream;
import org.junit.jupiter.api.DynamicTest;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.resttestclient.autoconfigure.AutoConfigureRestTestClient;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.ApplicationContext;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpMethod;
import org.springframework.test.web.servlet.client.RestTestClient;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.servlet.handler.AbstractUrlHandlerMapping;
import org.springframework.web.servlet.mvc.method.RequestMappingInfoHandlerMapping;

@Import(TestcontainersConfiguration.class)
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureRestTestClient
class PublicRoutesIT {

	// The documented home of this list is docs/architecture.md §6; change both together.
	private static final Set<String> PUBLIC_ROUTES = Set.of(
			"GET /api/v1/beers",
			"GET /api/v1/beers/batch",
			"GET /api/v1/beers/{id}",
			"GET /api/v1/breweries",
			"GET /api/v1/breweries/countries",
			"GET /api/v1/styles",
			"GET /api/v1/countries",
			"GET /api/v1/cellars/{username}",
			"GET /api/v1/feed",
			"GET /actuator/health",
			"GET /actuator/health/**",
			"GET /v3/api-docs",
			"GET /v3/api-docs/swagger-config",
			"GET /swagger-ui.html",
			"GET /swagger-ui/**",
			"GET /swagger-ui/*index.html",
			"GET /swagger-ui/*swagger-initializer.js");

	private static final String PATH_VARIABLE = "8f14e45f-ceea-467a-9a3c-1b2d4f6a8c90";

	@Autowired
	private RestTestClient client;

	@Autowired
	private ApplicationContext context;

	// Probes the handlers rather than comparing them with SecurityConfig's
	// matchers: a matcher that reaches further than intended only shows up in
	// what a request actually gets back.
	@TestFactory
	Stream<DynamicTest> everyMappedRouteAnswersWithoutATokenOnlyIfListed() {
		return mappedRoutes().stream().map(route -> dynamicTest(route, () -> {
			int status = statusWithoutToken(route);
			if (PUBLIC_ROUTES.contains(route)) {
				assertThat(status).as("%s is listed as public", route).isNotIn(401, 403);
			}
			else {
				assertThat(status).as("%s is not listed as public", route).isEqualTo(401);
			}
		}));
	}

	@Test
	void everyListedRouteIsStillMapped() {
		assertThat(mappedRoutes()).containsAll(PUBLIC_ROUTES);
	}

	private SortedSet<String> mappedRoutes() {
		SortedSet<String> routes = new TreeSet<>();
		context.getBeansOfType(RequestMappingInfoHandlerMapping.class).values().forEach(mapping ->
				mapping.getHandlerMethods().keySet().forEach(info -> {
					Set<RequestMethod> methods = info.getMethodsCondition().getMethods();
					for (RequestMethod method : methods.isEmpty() ? Set.of(RequestMethod.GET) : methods) {
						info.getPatternValues().forEach(pattern -> routes.add(method + " " + pattern));
					}
				}));
		context.getBeansOfType(AbstractUrlHandlerMapping.class).values().forEach(mapping ->
				mapping.getHandlerMap().keySet().forEach(pattern -> routes.add("GET " + pattern)));
		return routes;
	}

	private int statusWithoutToken(String route) {
		String[] methodAndPattern = route.split(" ", 2);
		return client.method(HttpMethod.valueOf(methodAndPattern[0]))
				.uri(concretePath(methodAndPattern[1]))
				.exchange()
				.returnResult()
				.getStatus()
				.value();
	}

	private static String concretePath(String pattern) {
		return pattern
				.replaceAll("\\{\\*[^}]+}", "x")
				.replaceAll("\\{[^}]+}", PATH_VARIABLE)
				.replace("**", "x")
				.replaceAll("(?<=/)\\*(?=/|$)", "x")
				.replace("*", "");
	}

}
