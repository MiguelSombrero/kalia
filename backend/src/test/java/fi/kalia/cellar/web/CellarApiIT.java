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
class CellarApiIT {

	private static final String USER_A = "Bearer user-a-token";

	private static final String USER_B = "Bearer user-b-token";

	@Autowired
	private RestTestClient client;

	@Autowired
	private BeerRepository beerRepository;

	@MockitoBean
	private JwtDecoder jwtDecoder;

	private UUID beerId;

	@BeforeEach
	void setUp() {
		beerId = beerRepository.findAll().stream().findFirst().map(Beer::getId).orElseThrow();
		given(jwtDecoder.decode("user-a-token")).willReturn(TestTokens.user(UUID.randomUUID().toString(), "user-a"));
		given(jwtDecoder.decode("user-b-token")).willReturn(TestTokens.user(UUID.randomUUID().toString(), "user-b"));
	}

	@Test
	void aRequestCarryingUserAsTokenGets404NeverForbiddenForUserBsEntryOrBottle() {
		String bottleJson = addBottle(USER_A, beerId, "BOTTLE", null, null);
		UUID entryId = entryIdOf(bottleJson);
		UUID bottleId = idOf(bottleJson);

		client.get().uri("/api/v1/cellar/entries/{entryId}/bottles", entryId)
				.header("Authorization", USER_B)
				.exchange()
				.expectStatus().isNotFound()
				.expectHeader().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON);

		client.method(HttpMethod.PATCH).uri("/api/v1/cellar/bottles/{id}", bottleId)
				.header("Authorization", USER_B)
				.contentType(MediaType.APPLICATION_JSON)
				.body(updateBody("CAN", null, null))
				.exchange()
				.expectStatus().isNotFound()
				.expectHeader().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON);

		client.delete().uri("/api/v1/cellar/bottles/{id}", bottleId)
				.header("Authorization", USER_B)
				.exchange()
				.expectStatus().isNotFound()
				.expectHeader().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON);

		// Still there — user B's rejected requests changed nothing.
		client.get().uri("/api/v1/cellar/entries/{entryId}/bottles", entryId)
				.header("Authorization", USER_A)
				.exchange()
				.expectStatus().isOk()
				.expectBody(String.class)
				.value(body -> assertThat((int) JsonPath.read(body, "$.length()")).isEqualTo(1));
	}

	@Test
	void listsEntriesWithDerivedQuantityAndNoEmbeddedBottles() {
		addBottle(USER_A, beerId, "BOTTLE", null, null);
		addBottle(USER_A, beerId, "CAN", null, null);

		client.get().uri("/api/v1/cellar")
				.header("Authorization", USER_A)
				.exchange()
				.expectStatus().isOk()
				.expectBody(String.class)
				.value(body -> {
					assertThat((int) JsonPath.read(body, "$.length()")).isEqualTo(1);
					assertThat((String) JsonPath.read(body, "$[0].beerId")).isEqualTo(beerId.toString());
					assertThat((int) JsonPath.read(body, "$[0].quantity")).isEqualTo(2);
					assertThat(body).doesNotContain("\"bottles\"");
				});
	}

	@Test
	void addingASecondBottleOfTheSameBeerExtendsTheExistingEntry() {
		String first = addBottle(USER_A, beerId, "BOTTLE", null, null);
		String second = addBottle(USER_A, beerId, "CAN", null, null);

		assertThat(entryIdOf(first)).isEqualTo(entryIdOf(second));
	}

	@Test
	void aClientSuppliedIdInTheAddBottleRequestIsIgnored() {
		UUID clientId = UUID.randomUUID();
		Map<String, Object> request = new LinkedHashMap<>();
		request.put("id", clientId.toString());
		request.put("beerId", beerId.toString());
		request.put("containerType", "BOTTLE");

		String body = client.post().uri("/api/v1/cellar/bottles")
				.header("Authorization", USER_A)
				.contentType(MediaType.APPLICATION_JSON)
				.body(request)
				.exchange()
				.expectStatus().isCreated()
				.expectBody(String.class)
				.returnResult().getResponseBody();

		assertThat(idOf(body)).isNotEqualTo(clientId);
	}

	@Test
	void aClientSuppliedIdInTheUpdateBottleRequestIsIgnored() {
		String bottleJson = addBottle(USER_A, beerId, "BOTTLE", null, null);
		UUID bottleId = idOf(bottleJson);
		Map<String, Object> request = new LinkedHashMap<>();
		request.put("id", UUID.randomUUID().toString());
		request.put("containerType", "CAN");

		client.method(HttpMethod.PATCH).uri("/api/v1/cellar/bottles/{id}", bottleId)
				.header("Authorization", USER_A)
				.contentType(MediaType.APPLICATION_JSON)
				.body(request)
				.exchange()
				.expectStatus().isOk()
				.expectBody(String.class)
				.value(body -> assertThat((String) JsonPath.read(body, "$.id")).isEqualTo(bottleId.toString()));
	}

	@Test
	void listsOneEntrysBottles() {
		String bottleJson = addBottle(USER_A, beerId, "KEG", null, null);
		UUID entryId = entryIdOf(bottleJson);

		client.get().uri("/api/v1/cellar/entries/{entryId}/bottles", entryId)
				.header("Authorization", USER_A)
				.exchange()
				.expectStatus().isOk()
				.expectBody(String.class)
				.value(body -> {
					assertThat((int) JsonPath.read(body, "$.length()")).isEqualTo(1);
					assertThat((String) JsonPath.read(body, "$[0].containerType")).isEqualTo("KEG");
					assertThat((String) JsonPath.read(body, "$[0].entryId")).isEqualTo(entryId.toString());
				});
	}

	@Test
	void updatesABottlesFieldsAndPersistsTheChange() {
		String bottleJson = addBottle(USER_A, beerId, "BOTTLE", null, null);
		UUID bottleId = idOf(bottleJson);

		client.method(HttpMethod.PATCH).uri("/api/v1/cellar/bottles/{id}", bottleId)
				.header("Authorization", USER_A)
				.contentType(MediaType.APPLICATION_JSON)
				.body(updateBody("KEG", "2024-01-01", "2027-01-01"))
				.exchange()
				.expectStatus().isOk()
				.expectBody(String.class)
				.value(body -> {
					assertThat((String) JsonPath.read(body, "$.containerType")).isEqualTo("KEG");
					assertThat((String) JsonPath.read(body, "$.brewedDate")).isEqualTo("2024-01-01");
					assertThat((String) JsonPath.read(body, "$.bestBeforeDate")).isEqualTo("2027-01-01");
				});
	}

	@Test
	void removingABottleReflectsInTheEntrysDerivedQuantity() {
		String first = addBottle(USER_A, beerId, "BOTTLE", null, null);
		addBottle(USER_A, beerId, "CAN", null, null);
		UUID bottleId = idOf(first);

		client.delete().uri("/api/v1/cellar/bottles/{id}", bottleId)
				.header("Authorization", USER_A)
				.exchange()
				.expectStatus().isNoContent();

		client.get().uri("/api/v1/cellar")
				.header("Authorization", USER_A)
				.exchange()
				.expectStatus().isOk()
				.expectBody(String.class)
				.value(body -> assertThat((int) JsonPath.read(body, "$[0].quantity")).isEqualTo(1));
	}

	@Test
	void removingAnEntrysLastBottleDropsTheBeerFromTheCellarList() {
		UUID bottleId = idOf(addBottle(USER_A, beerId, "BOTTLE", null, null));

		client.delete().uri("/api/v1/cellar/bottles/{id}", bottleId)
				.header("Authorization", USER_A)
				.exchange()
				.expectStatus().isNoContent();

		client.get().uri("/api/v1/cellar")
				.header("Authorization", USER_A)
				.exchange()
				.expectStatus().isOk()
				.expectBody(String.class)
				.value(body -> assertThat((int) JsonPath.read(body, "$.length()")).isZero());
	}

	@Test
	void aBeerCanBeAddedAgainAfterItsEntryEmptied() {
		UUID firstBottleId = idOf(addBottle(USER_A, beerId, "BOTTLE", null, null));
		client.delete().uri("/api/v1/cellar/bottles/{id}", firstBottleId)
				.header("Authorization", USER_A)
				.exchange()
				.expectStatus().isNoContent();

		addBottle(USER_A, beerId, "CAN", null, null);

		client.get().uri("/api/v1/cellar")
				.header("Authorization", USER_A)
				.exchange()
				.expectStatus().isOk()
				.expectBody(String.class)
				.value(body -> {
					assertThat((int) JsonPath.read(body, "$.length()")).isEqualTo(1);
					assertThat((int) JsonPath.read(body, "$[0].quantity")).isEqualTo(1);
				});
	}

	@Test
	void unauthenticatedRequestIsRejectedWhileTheCatalogStaysPublic() {
		client.get().uri("/api/v1/cellar").exchange().expectStatus().isUnauthorized();

		client.get().uri("/api/v1/beers?size=1").exchange().expectStatus().isOk();
	}

	@Test
	void addingABottleOfAnUnknownBeerYieldsProblemJson404() {
		Map<String, Object> request = new LinkedHashMap<>();
		request.put("beerId", UUID.randomUUID().toString());
		request.put("containerType", "BOTTLE");

		client.post().uri("/api/v1/cellar/bottles")
				.header("Authorization", USER_A)
				.contentType(MediaType.APPLICATION_JSON)
				.body(request)
				.exchange()
				.expectStatus().isNotFound()
				.expectHeader().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON);
	}

	@Test
	void addingABottleWithABrewedDateInTheFutureYieldsProblemJson400() {
		Map<String, Object> request = new LinkedHashMap<>();
		request.put("beerId", beerId.toString());
		request.put("containerType", "BOTTLE");
		request.put("brewedDate", "2999-01-01");

		client.post().uri("/api/v1/cellar/bottles")
				.header("Authorization", USER_A)
				.contentType(MediaType.APPLICATION_JSON)
				.body(request)
				.exchange()
				.expectStatus().isBadRequest()
				.expectHeader().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON);
	}

	@Test
	void addingWithAQuantityCreatesThatManyIndependentBottlesAndReturnsThemAll() {
		Map<String, Object> request = new LinkedHashMap<>();
		request.put("beerId", beerId.toString());
		request.put("containerType", "CAN");
		request.put("brewedDate", "2024-03-01");
		request.put("quantity", 5);

		String body = client.post().uri("/api/v1/cellar/bottles")
				.header("Authorization", USER_A)
				.contentType(MediaType.APPLICATION_JSON)
				.body(request)
				.exchange()
				.expectStatus().isCreated()
				.expectBody(String.class)
				.returnResult().getResponseBody();

		assertThat((int) JsonPath.read(body, "$.length()")).isEqualTo(5);
		List<String> ids = JsonPath.read(body, "$[*].id");
		assertThat(ids).doesNotHaveDuplicates();
		List<String> brewedDates = JsonPath.read(body, "$[*].brewedDate");
		assertThat(brewedDates).containsOnly("2024-03-01");

		client.get().uri("/api/v1/cellar")
				.header("Authorization", USER_A)
				.exchange()
				.expectStatus().isOk()
				.expectBody(String.class)
				.value(entries -> assertThat((int) JsonPath.read(entries, "$[0].quantity")).isEqualTo(5));
	}

	@Test
	void anAbsentQuantityAddsExactlyOneBottle() {
		String body = addBottle(USER_A, beerId, "BOTTLE", null, null);

		assertThat((int) JsonPath.read(body, "$.length()")).isEqualTo(1);
	}

	@Test
	void aQuantityOutsideTheAllowedRangeYieldsProblemJson400() {
		for (int quantity : new int[] { 0, 25 }) {
			Map<String, Object> request = new LinkedHashMap<>();
			request.put("beerId", beerId.toString());
			request.put("containerType", "BOTTLE");
			request.put("quantity", quantity);

			client.post().uri("/api/v1/cellar/bottles")
					.header("Authorization", USER_A)
					.contentType(MediaType.APPLICATION_JSON)
					.body(request)
					.exchange()
					.expectStatus().isBadRequest()
					.expectHeader().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON);
		}
	}

	private String addBottle(String bearer, UUID beerId, String containerType, String brewedDate,
			String bestBeforeDate) {
		Map<String, Object> request = new LinkedHashMap<>();
		request.put("beerId", beerId.toString());
		request.put("containerType", containerType);
		if (brewedDate != null) {
			request.put("brewedDate", brewedDate);
		}
		if (bestBeforeDate != null) {
			request.put("bestBeforeDate", bestBeforeDate);
		}
		return client.post().uri("/api/v1/cellar/bottles")
				.header("Authorization", bearer)
				.contentType(MediaType.APPLICATION_JSON)
				.body(request)
				.exchange()
				.expectStatus().isCreated()
				.expectBody(String.class)
				.returnResult().getResponseBody();
	}

	private static UUID idOf(String addBottlesResponse) {
		return UUID.fromString(JsonPath.read(addBottlesResponse, "$[0].id"));
	}

	private static UUID entryIdOf(String addBottlesResponse) {
		return UUID.fromString(JsonPath.read(addBottlesResponse, "$[0].entryId"));
	}

	private static Map<String, Object> updateBody(String containerType, String brewedDate, String bestBeforeDate) {
		Map<String, Object> request = new LinkedHashMap<>();
		request.put("containerType", containerType);
		if (brewedDate != null) {
			request.put("brewedDate", brewedDate);
		}
		if (bestBeforeDate != null) {
			request.put("bestBeforeDate", bestBeforeDate);
		}
		return request;
	}

}
