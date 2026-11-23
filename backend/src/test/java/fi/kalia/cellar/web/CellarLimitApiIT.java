package fi.kalia.cellar.web;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.BDDMockito.given;

import com.jayway.jsonpath.JsonPath;
import fi.kalia.TestTokens;
import fi.kalia.TestcontainersConfiguration;
import fi.kalia.catalog.domain.Beer;
import fi.kalia.catalog.domain.BeerRepository;
import fi.kalia.cellar.application.CellarService;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.resttestclient.autoconfigure.AutoConfigureRestTestClient;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.client.RestTestClient;

@Import(TestcontainersConfiguration.class)
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureRestTestClient
class CellarLimitApiIT {

	private static final int LIMIT = CellarService.MAX_BOTTLES;

	private static final String BEARER = "Bearer limit-user-token";

	@Autowired
	private RestTestClient client;

	@Autowired
	private BeerRepository beerRepository;

	@Autowired
	private JdbcTemplate jdbc;

	@MockitoBean
	private JwtDecoder jwtDecoder;

	private UUID userId;

	private UUID heldBeer;

	private UUID otherBeer;

	@BeforeEach
	void setUp() {
		userId = UUID.randomUUID();
		given(jwtDecoder.decode("limit-user-token")).willReturn(TestTokens.user(userId.toString(), "limit-user"));
		List<UUID> beers = beerRepository.findAll().stream().map(Beer::getId).limit(2).toList();
		heldBeer = beers.get(0);
		otherBeer = beers.get(1);
	}

	@Test
	void anAddUpToTheLimitIsAccepted() {
		seedBottles(heldBeer, LIMIT - 3);

		add(heldBeer, 3).expectStatus().isCreated();

		assertThat(bottlesHeld()).isEqualTo(LIMIT);
	}

	@Test
	void anAddPastTheLimitIsRefusedWhollyWithTheLimitAndWhatStillFits() {
		seedBottles(heldBeer, LIMIT - 2);

		String body = problem(add(heldBeer, 3));

		assertThat((Integer) JsonPath.read(body, "$.status")).isEqualTo(422);
		assertThat((Integer) JsonPath.read(body, "$.limit")).isEqualTo(LIMIT);
		assertThat((Integer) JsonPath.read(body, "$.remaining")).isEqualTo(2);
		assertThat((String) JsonPath.read(body, "$.detail")).contains(String.valueOf(LIMIT)).contains("2 more");
		assertThat(bottlesHeld()).isEqualTo(LIMIT - 2);
	}

	@Test
	void theAddThatCreatesAnEntryIsRefusedToo() {
		seedBottles(heldBeer, LIMIT);

		String body = problem(add(otherBeer, 1));

		assertThat((Integer) JsonPath.read(body, "$.remaining")).isZero();
		assertThat(entriesHeld()).isEqualTo(1);
	}

	@Test
	void theAddThatOnlyRaisesAnExistingEntryIsRefusedToo() {
		seedBottles(heldBeer, LIMIT);

		String body = problem(add(heldBeer, 1));

		assertThat((Integer) JsonPath.read(body, "$.remaining")).isZero();
		assertThat(bottlesHeld()).isEqualTo(LIMIT);
	}

	@Test
	void aCellarAlreadyOverTheLimitStillReadsEditsAndRemovesButDoesNotGrow() {
		seedBottles(heldBeer, LIMIT + 5);

		String listed = client.get().uri("/api/v1/cellar").header("Authorization", BEARER)
				.exchange().expectStatus().isOk().expectBody(String.class).returnResult().getResponseBody();
		assertThat((Integer) JsonPath.read(listed, "$[0].quantity")).isEqualTo(LIMIT + 5);
		UUID bottleId = UUID.fromString(JsonPath.read(listed, "$[0].bottles[0].id"));

		client.method(HttpMethod.PATCH).uri("/api/v1/cellar/bottles/{id}", bottleId)
				.header("Authorization", BEARER)
				.contentType(MediaType.APPLICATION_JSON)
				.body(Map.of("containerType", "CAN"))
				.exchange().expectStatus().isOk();

		problem(add(heldBeer, 1));
		assertThat(bottlesHeld()).isEqualTo(LIMIT + 5);

		client.delete().uri("/api/v1/cellar/bottles/{id}", bottleId)
				.header("Authorization", BEARER)
				.exchange().expectStatus().isNoContent();
		assertThat(bottlesHeld()).isEqualTo(LIMIT + 4);
	}

	@Test
	void theCapIsPerCellarNotPerBeer() {
		seedBottles(heldBeer, LIMIT - 1);
		seedBottles(otherBeer, 1);

		add(heldBeer, 1).expectStatus().isEqualTo(HttpStatus.UNPROCESSABLE_CONTENT);
		add(otherBeer, 1).expectStatus().isEqualTo(HttpStatus.UNPROCESSABLE_CONTENT);
	}

	private RestTestClient.ResponseSpec add(UUID beerId, int quantity) {
		Map<String, Object> request = new LinkedHashMap<>();
		request.put("beerId", beerId.toString());
		request.put("containerType", "BOTTLE");
		request.put("quantity", quantity);
		return client.post().uri("/api/v1/cellar/bottles")
				.header("Authorization", BEARER)
				.contentType(MediaType.APPLICATION_JSON)
				.body(request)
				.exchange();
	}

	private static String problem(RestTestClient.ResponseSpec response) {
		return response.expectStatus().isEqualTo(HttpStatus.UNPROCESSABLE_CONTENT)
				.expectHeader().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON)
				.expectBody(String.class).returnResult().getResponseBody();
	}

	private void seedBottles(UUID beerId, int count) {
		CellarSeeding.bottles(jdbc, userId, beerId, count);
	}

	private int bottlesHeld() {
		return CellarSeeding.bottlesHeld(jdbc, userId);
	}

	private int entriesHeld() {
		return jdbc.queryForObject("select count(*) from cellar.entry where user_id = ?", Integer.class, userId);
	}

}
