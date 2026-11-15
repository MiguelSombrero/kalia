package fi.kalia.web;

import static org.assertj.core.api.Assertions.assertThat;
import static org.awaitility.Awaitility.await;
import static org.mockito.BDDMockito.given;

import fi.kalia.TestTokens;
import fi.kalia.TestcontainersConfiguration;
import fi.kalia.catalog.domain.Beer;
import fi.kalia.catalog.domain.BeerRepository;
import io.opentelemetry.api.common.AttributeKey;
import io.opentelemetry.api.trace.SpanKind;
import io.opentelemetry.sdk.common.CompletableResultCode;
import io.opentelemetry.sdk.trace.data.SpanData;
import io.opentelemetry.sdk.trace.export.SpanExporter;
import java.time.Duration;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CopyOnWriteArrayList;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.resttestclient.autoconfigure.AutoConfigureRestTestClient;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.client.RestTestClient;

// ADR-0114. A request's trace holds a span for each SQL statement it ran,
// without the statement's bound values. Spans are read as the SDK holds them,
// before they are encoded. A statement's parent is a Modulith module span,
// which does not reliably reach this context's exporter while other contexts
// share the JVM, so the tests assert trace membership and the statements
// themselves, never the chain up to the request span.
@Import({ TestcontainersConfiguration.class, SqlSpansIT.Capture.class })
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = {
		"management.opentelemetry.tracing.export.schedule-delay=100ms" })
@AutoConfigureRestTestClient
class SqlSpansIT {

	private static final List<SpanData> SPANS = new CopyOnWriteArrayList<>();

	private static final AttributeKey<String> QUERY = AttributeKey.stringKey("jdbc.query[0]");

	@TestConfiguration
	static class Capture {

		@Bean
		SpanExporter capturingSpanExporter() {
			return new SpanExporter() {

				@Override
				public CompletableResultCode export(Collection<SpanData> spans) {
					SPANS.addAll(spans);
					return CompletableResultCode.ofSuccess();
				}

				@Override
				public CompletableResultCode flush() {
					return CompletableResultCode.ofSuccess();
				}

				@Override
				public CompletableResultCode shutdown() {
					return CompletableResultCode.ofSuccess();
				}

			};
		}

	}

	@Autowired
	private RestTestClient client;

	@Autowired
	private BeerRepository beers;

	@MockitoBean
	private JwtDecoder jwtDecoder;

	private String username;

	private String subject;

	private String traceId;

	@BeforeEach
	void signIn() {
		username = "sql-spans-" + UUID.randomUUID();
		traceId = UUID.randomUUID().toString().replace("-", "");
		subject = UUID.randomUUID().toString();
		given(jwtDecoder.decode("sql-token")).willReturn(TestTokens.user(subject, username));
	}

	@Test
	void aCellarReadsStatementsAreSpansOfTheRequestsTraceWithTheirDurations() {
		get("/api/v1/cellar").expectStatus().isOk();

		awaitServerSpan("http get /api/v1/cellar");
		await().atMost(Duration.ofSeconds(10))
				.until(() -> statementsOf(traceId).stream().anyMatch(span -> queryOf(span).contains("cellar.entry")));
		assertThat(statementsOf(traceId)).allSatisfy(statement -> {
			assertThat(statement.getParentSpanContext().isValid()).as(queryOf(statement)).isTrue();
			assertThat(statement.getEndEpochNanos() - statement.getStartEpochNanos()).isPositive();
		});
	}

	@Test
	void noBoundValueReachesASpan() {
		String searchTerm = "zzqx" + UUID.randomUUID().toString().substring(0, 8);
		get("/api/v1/beers?query=" + searchTerm).expectStatus().isOk();
		awaitServerSpan("http get /api/v1/beers");
		String unknownOwner = "owner-" + UUID.randomUUID();
		String publicCellarTrace = UUID.randomUUID().toString().replace("-", "");
		client.get().uri("/api/v1/cellars/{username}", unknownOwner)
				.header("traceparent", traceparent(publicCellarTrace))
				.exchange().expectStatus().isNotFound();
		await().atMost(Duration.ofSeconds(10)).until(() -> !statementsOf(publicCellarTrace).isEmpty());

		List<SpanData> statements = SPANS.stream()
				.filter(span -> span.getTraceId().equals(traceId) || span.getTraceId().equals(publicCellarTrace))
				.filter(SqlSpansIT::isStatement).toList();
		assertThat(statements).extracting(SqlSpansIT::queryOf)
				.anyMatch(sql -> sql.contains("?") && sql.contains("catalog.beer"))
				.anyMatch(sql -> sql.contains("?") && sql.contains("profile"));
		assertThat(statements).isNotEmpty().allSatisfy(statement -> assertThat(everythingIn(statement))
				.doesNotContain(searchTerm, unknownOwner, username, subject));
	}

	@Test
	void aRepeatedQueryIsOneSpanPerExecution() {
		get("/test/observability-probe/repeat/4").expectStatus().isOk();
		awaitServerSpan("http get /test/observability-probe/repeat/{times}");
		assertThat(repeatedQuerySpans(traceId)).hasSize(4);

		String secondTrace = UUID.randomUUID().toString().replace("-", "");
		client.get().uri("/test/observability-probe/repeat/7")
				.header("Authorization", "Bearer sql-token").header("traceparent", traceparent(secondTrace))
				.exchange().expectStatus().isOk();
		await().atMost(Duration.ofSeconds(10)).until(() -> repeatedQuerySpans(secondTrace).size() == 7);
	}

	@Test
	void aRequestThatPublishesAnEventShowsTheRegistrysAndTheListenersStatementsInItsTrace() {
		UUID beerId = beers.findAll().stream().findFirst().map(Beer::getId).orElseThrow();
		client.post().uri("/api/v1/cellar/bottles")
				.header("Authorization", "Bearer sql-token").header("traceparent", traceparent(traceId))
				.contentType(MediaType.APPLICATION_JSON)
				.body(Map.of("beerId", beerId.toString(), "containerType", "BOTTLE"))
				.exchange().expectStatus().isCreated();

		awaitServerSpan("http post /api/v1/cellar/bottles");
		// The listener runs after the commit, on another thread; the registry's delete ends last.
		await().atMost(Duration.ofSeconds(10)).until(() -> statementsOf(traceId).stream()
				.anyMatch(span -> queryOf(span).startsWith("DELETE FROM EVENT_PUBLICATION")));
		assertThat(statementsOf(traceId)).extracting(SqlSpansIT::queryOf)
				.anyMatch(sql -> sql.startsWith("INSERT INTO EVENT_PUBLICATION"))
				.anyMatch(sql -> sql.startsWith("insert into feed.line"))
				.anyMatch(sql -> sql.startsWith("UPDATE EVENT_PUBLICATION SET STATUS = 'PROCESSING'"));
	}

	@Test
	void flywaysMigrationsAtStartupAreNotSpans() {
		assertThat(SPANS).filteredOn(SqlSpansIT::isStatement).extracting(SqlSpansIT::queryOf)
				.noneMatch(sql -> sql.toLowerCase().contains("flyway_schema_history"));
	}

	private RestTestClient.ResponseSpec get(String uri) {
		return client.get().uri(uri)
				.header("Authorization", "Bearer sql-token").header("traceparent", traceparent(traceId))
				.exchange();
	}

	private static String traceparent(String traceId) {
		return "00-" + traceId + "-00f067aa0ba902b7-01";
	}

	private SpanData awaitServerSpan(String name) {
		return await().atMost(Duration.ofSeconds(10)).until(() -> SPANS.stream()
				.filter(span -> span.getTraceId().equals(traceId) && span.getKind() == SpanKind.SERVER
						&& span.getName().equals(name))
				.findFirst().orElse(null), span -> span != null);
	}

	private static List<SpanData> statementsOf(String traceId) {
		return SPANS.stream().filter(span -> span.getTraceId().equals(traceId)).filter(SqlSpansIT::isStatement)
				.toList();
	}

	private static List<SpanData> repeatedQuerySpans(String traceId) {
		return statementsOf(traceId).stream()
				.filter(span -> queryOf(span).equals(ObservabilityProbeController.REPEATED_QUERY)).toList();
	}

	private static boolean isStatement(SpanData span) {
		return span.getAttributes().get(QUERY) != null;
	}

	private static String queryOf(SpanData span) {
		return span.getAttributes().get(QUERY);
	}

	private static String everythingIn(SpanData span) {
		return span.getName() + span.getAttributes().asMap() + span.getEvents();
	}

}
