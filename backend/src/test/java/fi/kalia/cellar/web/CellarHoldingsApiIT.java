package fi.kalia.cellar.web;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.BDDMockito.given;

import com.jayway.jsonpath.JsonPath;
import fi.kalia.TestTokens;
import fi.kalia.TestcontainersConfiguration;
import fi.kalia.catalog.domain.Beer;
import fi.kalia.catalog.domain.BeerRepository;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.IntStream;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.resttestclient.autoconfigure.AutoConfigureRestTestClient;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.client.RestTestClient;

@Import(TestcontainersConfiguration.class)
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureRestTestClient
class CellarHoldingsApiIT {

	private static final String HOLDINGS = "/api/v1/cellar/holdings";

	@Autowired
	private RestTestClient client;

	@Autowired
	private BeerRepository beerRepository;

	@MockitoBean
	private JwtDecoder jwtDecoder;

	private String owner;

	private String stranger;

	private List<UUID> beerIds;

	@BeforeEach
	void setUp() {
		owner = bearerFor("owner");
		stranger = bearerFor("stranger");
		beerIds = beerRepository.findAll().stream().map(Beer::getId).limit(3).toList();
		assertThat(beerIds).hasSize(3);
	}

	@Test
	void saysWhichOfTheAskedBeersTheCallerHoldsAndTheCellarsTotals() {
		addBottles(owner, beerIds.get(0), 2);
		addBottles(owner, beerIds.get(1), 1);

		client.get().uri(HOLDINGS + "?beerIds={a},{b}", beerIds.get(0), beerIds.get(2))
				.header("Authorization", owner)
				.exchange()
				.expectStatus().isOk()
				.expectBody(String.class)
				.value(body -> {
					assertThat((int) JsonPath.read(body, "$.totalBeers")).isEqualTo(2);
					assertThat((int) JsonPath.read(body, "$.totalBottles")).isEqualTo(3);
					assertThat((List<String>) JsonPath.read(body, "$.held[*].beerId"))
							.containsExactly(beerIds.get(0).toString());
					assertThat((int) JsonPath.read(body, "$.held[0].quantity")).isEqualTo(2);
				});
	}

	@Test
	void withNoBeerIdsItAnswersTheTotalsAlone() {
		addBottles(owner, beerIds.get(0), 3);

		client.get().uri(HOLDINGS)
				.header("Authorization", owner)
				.exchange()
				.expectStatus().isOk()
				.expectBody(String.class)
				.value(body -> {
					assertThat((int) JsonPath.read(body, "$.totalBeers")).isEqualTo(1);
					assertThat((int) JsonPath.read(body, "$.totalBottles")).isEqualTo(3);
					assertThat((List<Object>) JsonPath.read(body, "$.held")).isEmpty();
				});
	}

	@Test
	void anotherUsersBottlesAreNeverCounted() {
		addBottles(owner, beerIds.get(0), 2);

		client.get().uri(HOLDINGS + "?beerIds={a}", beerIds.get(0))
				.header("Authorization", stranger)
				.exchange()
				.expectStatus().isOk()
				.expectBody(String.class)
				.value(body -> {
					assertThat((int) JsonPath.read(body, "$.totalBeers")).isZero();
					assertThat((int) JsonPath.read(body, "$.totalBottles")).isZero();
					assertThat((List<Object>) JsonPath.read(body, "$.held")).isEmpty();
				});
	}

	@Test
	void aBlankBeerIdsParameterAsksAboutNoBeer() {
		client.get().uri(HOLDINGS + "?beerIds=")
				.header("Authorization", owner)
				.exchange()
				.expectStatus().isOk()
				.expectBody(String.class)
				.value(body -> assertThat((List<Object>) JsonPath.read(body, "$.held")).isEmpty());
	}

	@ParameterizedTest
	@ValueSource(strings = { "{a},", ",", ",{a}", "{a},,{b}" })
	void aBlankElementAmongTheBeerIdsIsABadRequestNamingTheParameter(String ids) {
		client.get().uri(HOLDINGS + "?beerIds=" + ids, beerIds.get(0), beerIds.get(1))
				.header("Authorization", owner)
				.exchange()
				.expectStatus().isBadRequest()
				.expectHeader().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON)
				.expectBody(String.class)
				.value(body -> assertThat((String) JsonPath.read(body, "$.errors[0].field")).isEqualTo("beerIds"));
	}

	@Test
	void aBlankRepeatedParameterIsABadRequestNamingTheParameter() {
		client.get().uri(HOLDINGS + "?beerIds=&beerIds={a}", beerIds.get(0))
				.header("Authorization", owner)
				.exchange()
				.expectStatus().isBadRequest()
				.expectHeader().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON)
				.expectBody(String.class)
				.value(body -> assertThat((String) JsonPath.read(body, "$.errors[0].field")).isEqualTo("beerIds"));
	}

	@Test
	void aBeerAskedForTwiceIsAnsweredOnce() {
		addBottles(owner, beerIds.get(0), 2);

		client.get().uri(HOLDINGS + "?beerIds={a},{b}", beerIds.get(0), beerIds.get(0))
				.header("Authorization", owner)
				.exchange()
				.expectStatus().isOk()
				.expectBody(String.class)
				.value(body -> assertThat((int) JsonPath.read(body, "$.held.length()")).isEqualTo(1));
	}

	@Test
	void theBeerIdsAreCappedAtOneSearchPage() {
		assertThat(CellarController.MAX_HOLDINGS_BEER_IDS).isEqualTo(100);

		client.get().uri(HOLDINGS + "?beerIds={ids}", idsParameter(CellarController.MAX_HOLDINGS_BEER_IDS))
				.header("Authorization", owner)
				.exchange()
				.expectStatus().isOk();

		client.get().uri(HOLDINGS + "?beerIds={ids}", idsParameter(CellarController.MAX_HOLDINGS_BEER_IDS + 1))
				.header("Authorization", owner)
				.exchange()
				.expectStatus().isBadRequest()
				.expectHeader().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON)
				.expectBody(String.class)
				.value(body -> assertThat((String) JsonPath.read(body, "$.errors[0].field")).isEqualTo("beerIds"));
	}

	@Test
	void anIdThatIsNotAUuidIsABadRequest() {
		client.get().uri(HOLDINGS + "?beerIds=not-an-id")
				.header("Authorization", owner)
				.exchange()
				.expectStatus().isBadRequest()
				.expectHeader().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON);
	}

	@Test
	void aRequestWithoutATokenIsUnauthorized() {
		client.get().uri(HOLDINGS)
				.exchange()
				.expectStatus().isUnauthorized();
	}

	private static String idsParameter(int count) {
		return String.join(",", IntStream.range(0, count).mapToObj(i -> UUID.randomUUID().toString()).toList());
	}

	private String bearerFor(String name) {
		String token = name + "-" + UUID.randomUUID();
		given(jwtDecoder.decode(token)).willReturn(TestTokens.user(UUID.randomUUID().toString(), name));
		return "Bearer " + token;
	}

	private void addBottles(String bearer, UUID beerId, int quantity) {
		client.post().uri("/api/v1/cellar/bottles")
				.header("Authorization", bearer)
				.contentType(MediaType.APPLICATION_JSON)
				.body(Map.of("beerId", beerId.toString(), "containerType", "BOTTLE", "quantity", quantity))
				.exchange()
				.expectStatus().isCreated();
	}

}
