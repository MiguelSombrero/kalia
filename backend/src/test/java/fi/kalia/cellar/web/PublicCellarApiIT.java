package fi.kalia.cellar.web;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.BDDMockito.given;

import com.jayway.jsonpath.JsonPath;
import fi.kalia.TestTokens;
import fi.kalia.TestcontainersConfiguration;
import fi.kalia.catalog.domain.Beer;
import fi.kalia.catalog.domain.BeerRepository;
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
import org.springframework.http.MediaType;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.client.RestTestClient;

@Import(TestcontainersConfiguration.class)
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureRestTestClient
class PublicCellarApiIT {

	private static final String USER_A = "Bearer user-a-token";

	private static final String USER_B = "Bearer user-b-token";

	@Autowired
	private RestTestClient client;

	@Autowired
	private BeerRepository beerRepository;

	@MockitoBean
	private JwtDecoder jwtDecoder;

	private UUID beerId;

	// Distinct per test: the DB (and any profile rows) outlive each method, and
	// the public read resolves by username, so a fixed name would let one test
	// read another's cellar.
	private String ownerName;

	private String strangerName;

	@BeforeEach
	void setUp() {
		beerId = beerRepository.findAll().stream().findFirst().map(Beer::getId).orElseThrow();
		ownerName = "owner-" + UUID.randomUUID();
		strangerName = "stranger-" + UUID.randomUUID();
		given(jwtDecoder.decode("user-a-token")).willReturn(TestTokens.user(UUID.randomUUID().toString(), ownerName));
		given(jwtDecoder.decode("user-b-token")).willReturn(TestTokens.user(UUID.randomUUID().toString(), strangerName));
	}

	@Test
	void aSignedOutCallerReadsAPublicCellarsBeersAndBottles() {
		addBottle(USER_A, "BOTTLE");
		addBottle(USER_A, "CAN");
		setVisibility(USER_A, true);

		client.get().uri("/api/v1/cellars/{username}", ownerName)
				.exchange()
				.expectStatus().isOk()
				.expectBody(String.class)
				.value(body -> {
					assertThat((String) JsonPath.read(body, "$.username")).isEqualTo(ownerName);
					assertThat((int) JsonPath.read(body, "$.entries.length()")).isEqualTo(1);
					assertThat((String) JsonPath.read(body, "$.entries[0].beerId")).isEqualTo(beerId.toString());
					assertThat((int) JsonPath.read(body, "$.entries[0].quantity")).isEqualTo(2);
					assertThat((int) JsonPath.read(body, "$.entries[0].bottles.length()")).isEqualTo(2);
					List<String> containerTypes = JsonPath.read(body, "$.entries[0].bottles[*].containerType");
					assertThat(containerTypes).containsExactlyInAnyOrder("BOTTLE", "CAN");
				});
	}

	@Test
	void anEmptyResultIsAllowedForAPublicCellarWhoseOwnerHasNoBottles() {
		setVisibility(USER_A, true);

		client.get().uri("/api/v1/cellars/{username}", ownerName)
				.exchange()
				.expectStatus().isOk()
				.expectBody(String.class)
				.value(body -> assertThat((int) JsonPath.read(body, "$.entries.length()")).isZero());
	}

	// Confirmed to fail against an implementation that ignores the visibility
	// flag — every one of these would then read the cellar.
	@Test
	void aPrivateCellarIsUnreadableByAStrangerADifferentUserAndTheOwner() {
		addBottle(USER_A, "BOTTLE");

		expectNotFound(client.get().uri("/api/v1/cellars/{username}", ownerName).exchange());
		expectNotFound(client.get().uri("/api/v1/cellars/{username}", ownerName)
				.header("Authorization", USER_B).exchange());
		expectNotFound(client.get().uri("/api/v1/cellars/{username}", ownerName)
				.header("Authorization", USER_A).exchange());
	}

	@Test
	void flippingACellarFromPublicToPrivateMakesAnIdenticalRequestStopWorking() {
		addBottle(USER_A, "BOTTLE");
		setVisibility(USER_A, true);

		client.get().uri("/api/v1/cellars/{username}", ownerName).exchange().expectStatus().isOk();

		setVisibility(USER_A, false);

		expectNotFound(client.get().uri("/api/v1/cellars/{username}", ownerName).exchange());
	}

	// The anti-enumeration property (ADR-0050): nothing in the response tells a
	// private cellar, an unknown username and the owner's own private cellar
	// apart. Confirmed to fail against an implementation that answers 403 for
	// any of them.
	@Test
	void aPrivateCellarAnUnknownUsernameAndTheOwnersOwnPrivateCellarAreOneResponse() {
		addBottle(USER_A, "BOTTLE");

		String privateToStranger = bodyOf(client.get().uri("/api/v1/cellars/{username}", ownerName).exchange());
		String ownersOwnPrivate = bodyOf(client.get().uri("/api/v1/cellars/{username}", ownerName)
				.header("Authorization", USER_A).exchange());
		String unknownUsername = bodyOf(client.get().uri("/api/v1/cellars/{username}", strangerName).exchange());

		// Same URL, different caller: not one byte may differ.
		assertThat(ownersOwnPrivate).isEqualTo(privateToStranger);
		// Different URL by necessity, so compare everything the caller did not choose.
		assertThat(JsonPath.<Integer>read(unknownUsername, "$.status")).isEqualTo(404);
		assertThat(JsonPath.<String>read(unknownUsername, "$.title"))
				.isEqualTo(JsonPath.read(privateToStranger, "$.title"));
		assertThat(JsonPath.<String>read(unknownUsername, "$.detail"))
				.isEqualTo(JsonPath.read(privateToStranger, "$.detail"));
	}

	@Test
	void theNewPathIsReadOnlyAndTheOwnersOwnEndpointsAreUnchanged() {
		addBottle(USER_A, "BOTTLE");
		setVisibility(USER_A, true);

		// No write verb is routed on the public path.
		client.method(HttpMethod.DELETE).uri("/api/v1/cellars/{username}", ownerName)
				.header("Authorization", USER_A)
				.exchange()
				.expectStatus().isEqualTo(405);
		client.method(HttpMethod.PATCH).uri("/api/v1/cellars/{username}", ownerName)
				.header("Authorization", USER_A)
				.contentType(MediaType.APPLICATION_JSON)
				.body(Map.of("cellarPublic", false))
				.exchange()
				.expectStatus().isEqualTo(405);

		// The owner still reads their own cellar through their own endpoint.
		client.get().uri("/api/v1/cellar")
				.header("Authorization", USER_A)
				.exchange()
				.expectStatus().isOk()
				.expectBody(String.class)
				.value(body -> assertThat((int) JsonPath.read(body, "$.length()")).isEqualTo(1));
	}

	private void addBottle(String bearer, String containerType) {
		Map<String, Object> request = new LinkedHashMap<>();
		request.put("beerId", beerId.toString());
		request.put("containerType", containerType);
		client.post().uri("/api/v1/cellar/bottles")
				.header("Authorization", bearer)
				.contentType(MediaType.APPLICATION_JSON)
				.body(request)
				.exchange()
				.expectStatus().isCreated();
	}

	private void setVisibility(String bearer, boolean cellarPublic) {
		client.method(HttpMethod.PATCH).uri("/api/v1/profile/visibility")
				.header("Authorization", bearer)
				.contentType(MediaType.APPLICATION_JSON)
				.body(Map.of("cellarPublic", cellarPublic))
				.exchange()
				.expectStatus().isOk();
	}

	private static void expectNotFound(RestTestClient.ResponseSpec response) {
		response.expectStatus().isNotFound()
				.expectHeader().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON);
	}

	private static String bodyOf(RestTestClient.ResponseSpec response) {
		return response.expectStatus().isNotFound()
				.expectBody(String.class)
				.returnResult().getResponseBody();
	}

}
