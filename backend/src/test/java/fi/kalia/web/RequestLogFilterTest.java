package fi.kalia.web;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;

import ch.qos.logback.classic.Level;
import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

// ADR-0013. A path carries user names, so the request line names the route
// that served it, never the path.
class RequestLogFilterTest {

	private final Logger filterLogger = (Logger) LoggerFactory.getLogger(RequestLogFilter.class);

	private final ListAppender<ILoggingEvent> lines = new ListAppender<>();

	private Level before;

	private MockMvc mvc;

	@BeforeEach
	void captureTheRequestLog() {
		before = filterLogger.getLevel();
		filterLogger.setLevel(Level.INFO);
		lines.start();
		filterLogger.addAppender(lines);
		mvc = MockMvcBuilders.standaloneSetup(new CellarProbe()).addFilters(new RequestLogFilter()).build();
	}

	@AfterEach
	void restoreTheLogger() {
		filterLogger.detachAppender(lines);
		filterLogger.setLevel(before);
	}

	@Test
	void aRequestIsLoggedUnderTheRouteTemplateNotThePath() throws Exception {
		mvc.perform(get("/api/v1/cellars/jouni?page=0&token=secret")).andReturn();

		assertThat(lines.list).singleElement().satisfies(line -> {
			assertThat(line.getFormattedMessage()).startsWith("GET /api/v1/cellars/{username} -> 200 in ");
			assertThat(line.getFormattedMessage()).doesNotContain("jouni").doesNotContain("secret");
		});
	}

	@Test
	void aMisspelledNameAnsweredNotFoundIsLoggedUnderTheSameTemplate() throws Exception {
		mvc.perform(get("/api/v1/cellars/missing")).andReturn();

		assertThat(lines.list).singleElement()
				.satisfies(line -> assertThat(line.getFormattedMessage())
						.startsWith("GET /api/v1/cellars/{username} -> 404 in ")
						.doesNotContain("missing"));
	}

	@Test
	void aPathNoRouteOwnsIsLoggedAsUnmatchedNeverAsItself() throws Exception {
		mvc.perform(get("/api/v1/nonesuch/jouni")).andReturn();

		assertThat(lines.list).singleElement()
				.satisfies(line -> assertThat(line.getFormattedMessage())
						.startsWith("GET unmatched -> 404 in ")
						.doesNotContain("jouni"));
	}

	@RestController
	static class CellarProbe {

		@GetMapping("/api/v1/cellars/{username}")
		ResponseEntity<String> cellar(@PathVariable String username) {
			return "missing".equals(username) ? ResponseEntity.notFound().build()
					: ResponseEntity.ok(username);
		}

	}

}
