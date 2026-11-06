package fi.kalia.catalog.web;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.BDDMockito.given;

import com.jayway.jsonpath.JsonPath;
import fi.kalia.TestTokens;
import fi.kalia.TestcontainersConfiguration;
import fi.kalia.catalog.SuggestionReviewed;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.CyclicBarrier;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.resttestclient.autoconfigure.AutoConfigureRestTestClient;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.client.RestTestClient;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

/**
 * An admin edits a suggestion and approves it in one action (ADR-0102): what the edit may change,
 * what it is refused for, what the review record and the event keep of it and what the contributor
 * then sees. Rows are inserted straight into the tables so each state is exact.
 */
@Import({TestcontainersConfiguration.class, AdminSuggestionEditApiIT.CommittedEvents.class})
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureRestTestClient
class AdminSuggestionEditApiIT {

	private static final String ADMIN = "Bearer admin-token";

	private static final String MEMBER = "Bearer member-token";

	private static final String CONTRIBUTOR = "Bearer contributor-token";

	private static final String BASE = "/api/v1/admin/suggestions/";

	private static final UUID ADMIN_ID = UUID.randomUUID();

	private UUID contributorId;

	@Autowired
	private RestTestClient client;

	@Autowired
	private JdbcTemplate jdbc;

	@Autowired
	private CommittedEvents events;

	@MockitoBean
	private JwtDecoder jwtDecoder;

	@BeforeEach
	void setUp() {
		contributorId = UUID.randomUUID();
		given(jwtDecoder.decode("admin-token")).willReturn(TestTokens.admin(ADMIN_ID.toString(), "admin"));
		given(jwtDecoder.decode("member-token")).willReturn(TestTokens.user(UUID.randomUUID().toString(), "member"));
		given(jwtDecoder.decode("contributor-token"))
				.willReturn(TestTokens.user(contributorId.toString(), "contributor-" + contributorId));
		events.published().clear();
	}

	@Test
	void editingNameStyleAndAbvApprovesTheSuggestionAndTheContributorsCellarAndTheBeersPageShowThem() {
		UUID brewery = brewery("Edit Existing", "FI", null, "APPROVED", null);
		UUID beer = beer(brewery, "Teh Typo Ale", "IPA", "55.0", contributorId);
		client.post().uri("/api/v1/cellar/bottles").header("Authorization", CONTRIBUTOR)
				.contentType(MediaType.APPLICATION_JSON).body(Map.of("beerId", beer.toString(), "containerType", "BOTTLE"))
				.exchange().expectStatus().isCreated();

		edit(beer, body("The Fixed Ale", "Quadrupel", "5.5").with("breweryId", brewery)).expectStatus().isOk()
				.expectHeader().contentType(MediaType.APPLICATION_JSON).expectBody(String.class).value(response -> {
					assertThat((String) JsonPath.read(response, "$.id")).isEqualTo(beer.toString());
					assertThat((String) JsonPath.read(response, "$.outcome")).isEqualTo("APPROVED");
					assertThat((String) JsonPath.read(response, "$.name")).isEqualTo("The Fixed Ale");
					assertThat((String) JsonPath.read(response, "$.style")).isEqualTo("Quadrupel");
					assertThat(((Number) JsonPath.read(response, "$.abv")).doubleValue()).isEqualTo(5.5);
					assertThat((String) JsonPath.read(response, "$.breweryStatus")).isEqualTo("APPROVED");
				});

		assertThat(status("beer", beer)).isEqualTo("APPROVED");
		String cellar = get(CONTRIBUTOR, "/api/v1/cellar");
		assertThat((List<String>) JsonPath.read(cellar, "$[*].beer.name")).containsExactly("The Fixed Ale");
		assertThat((List<String>) JsonPath.read(cellar, "$[*].beer.style")).containsExactly("Quadrupel");
		String details = get(MEMBER, "/api/v1/beers/" + beer);
		assertThat((String) JsonPath.read(details, "$.name")).isEqualTo("The Fixed Ale");
		assertThat(((Number) JsonPath.read(details, "$.abv")).doubleValue()).isEqualTo(5.5);
	}

	@Test
	void editingANewBreweryWithItsBeerApprovesBothTogether() {
		UUID brewery = brewery("Typo Brewry", "FI", "Lahti", "PENDING", contributorId);
		UUID beer = beer(brewery, "Brewry Beer", "IPA", "5.0", contributorId);

		edit(beer, body("Brewry Beer", "IPA", "5.0").with("newBrewery", Map.of("name", "Fixed Brewery",
				"countryCode", "SE", "city", "Malmö"))).expectStatus().isOk().expectBody(String.class)
				.value(response -> {
					assertThat((String) JsonPath.read(response, "$.brewery.name")).isEqualTo("Fixed Brewery");
					assertThat((String) JsonPath.read(response, "$.brewery.countryCode")).isEqualTo("SE");
					assertThat((String) JsonPath.read(response, "$.brewery.id")).isEqualTo(brewery.toString());
					assertThat((String) JsonPath.read(response, "$.breweryStatus")).isEqualTo("APPROVED");
				});

		assertThat(status("brewery", brewery)).isEqualTo("APPROVED");
		assertThat(status("beer", beer)).isEqualTo("APPROVED");
		Map<String, Object> row = jdbc.queryForMap("SELECT name, country_code, city, name_sort_key FROM catalog.brewery WHERE id = ?",
				brewery);
		assertThat(row).containsEntry("name", "Fixed Brewery").containsEntry("country_code", "SE")
				.containsEntry("city", "Malmö");
		assertThat((String) row.get("name_sort_key")).as("the sort key follows the name").doesNotContain("typo");
		List<String> listed = new ArrayList<>();
		client.get().uri(uri -> uri.path("/api/v1/breweries").queryParam("query", "Fixed Brewery").build())
				.header("Authorization", MEMBER).exchange().expectStatus().isOk().expectBody(String.class)
				.value(response -> listed.addAll(JsonPath.read(response, "$.content[*].name")));
		assertThat(listed).contains("Fixed Brewery");
	}

	@Test
	void repointingAtAnExistingBreweryApprovesTheBeerUnderItAndRejectsTheNewBrewery() {
		UUID existing = brewery("Repoint Target", "FI", null, "APPROVED", null);
		UUID added = brewery("Repoint Mistaken New", "FI", null, "PENDING", contributorId);
		UUID beer = beer(added, "Repointed", "IPA", "5.0", contributorId);

		edit(beer, body("Repointed", "IPA", "5.0").with("breweryId", existing)).expectStatus().isOk().expectBody(String.class)
				.value(response -> {
					assertThat((String) JsonPath.read(response, "$.brewery.id")).isEqualTo(existing.toString());
					assertThat((String) JsonPath.read(response, "$.breweryStatus")).isEqualTo("APPROVED");
				});

		assertThat(status("beer", beer)).isEqualTo("APPROVED");
		assertThat(breweryOf(beer)).isEqualTo(existing);
		assertThat(status("brewery", added)).isEqualTo("REJECTED");
		assertThat(status("brewery", existing)).isEqualTo("APPROVED");
	}

	@Test
	void repointingLeavesTheNewBreweryPendingWhileAnotherSuggestionStillNeedsIt() {
		UUID existing = brewery("Repoint Shared Target", "FI", null, "APPROVED", null);
		UUID added = brewery("Repoint Shared New", "FI", null, "PENDING", contributorId);
		UUID beer = beer(added, "Repointed One", "IPA", "5.0", contributorId);
		UUID sibling = beer(added, "Waiting Sibling", "IPA", "5.0", contributorId);

		edit(beer, body("Repointed One", "IPA", "5.0").with("breweryId", existing)).expectStatus().isOk();

		assertThat(breweryOf(beer)).isEqualTo(existing);
		assertThat(status("brewery", added)).isEqualTo("PENDING");
		assertThat(status("beer", sibling)).isEqualTo("PENDING");
	}

	@Test
	void aNameTheCatalogHoldsAnswersTheDocumentedConflictNamingTheExistingBeer() {
		UUID brewery = brewery("Dup Brewery", "FI", null, "APPROVED", null);
		UUID taken = beer(brewery, "Already There", "IPA", "5.0", null, "APPROVED");
		UUID beer = beer(brewery, "Almost There", "IPA", "5.0", contributorId);

		edit(beer, body("  ALREADY there ", "IPA", "5.0").with("breweryId", brewery)).expectStatus().isEqualTo(409)
				.expectHeader().contentType(MediaType.APPLICATION_PROBLEM_JSON).expectBody(String.class)
				.value(response -> assertThat((String) JsonPath.read(response, "$.existingBeerId"))
						.isEqualTo(taken.toString()));

		assertThat(status("beer", beer)).isEqualTo("PENDING");
		assertThat(name("beer", beer)).isEqualTo("Almost There");
		assertThat(reviewCount(beer)).isZero();
	}

	@Test
	void aFullwidthTwinOfAnExistingNameIsADuplicateToo() {
		UUID brewery = brewery("Fold Brewery", "FI", null, "APPROVED", null);
		UUID taken = beer(brewery, "Guinness Folded", "IPA", "5.0", null, "APPROVED");
		UUID beer = beer(brewery, "Other Name", "IPA", "5.0", contributorId);

		edit(beer, body("Ｇuinness Folded", "IPA", "5.0").with("breweryId", brewery)).expectStatus().isEqualTo(409)
				.expectBody(String.class).value(response -> assertThat((String) JsonPath.read(response, "$.existingBeerId"))
						.isEqualTo(taken.toString()));
	}

	@Test
	void aNameAnotherContributorHoldsAsPendingAnswersTheConflictNamingItAndTheAdminCanOpenIt() {
		UUID brewery = brewery("Pending Dup Brewery", "FI", null, "APPROVED", null);
		UUID others = beer(brewery, "Held By Someone Else", "IPA", "5.0", UUID.randomUUID());
		UUID beer = beer(brewery, "Mine To Fix", "IPA", "5.0", contributorId);

		edit(beer, body("Held By Someone Else", "IPA", "5.0").with("breweryId", brewery)).expectStatus().isEqualTo(409)
				.expectBody(String.class).value(response -> assertThat((String) JsonPath.read(response, "$.existingBeerId"))
						.isEqualTo(others.toString()));

		client.get().uri(BASE + others).header("Authorization", ADMIN).exchange().expectStatus().isOk();
	}

	@Test
	void aBreweryNameAndCountryTheCatalogHoldsAnswersTheConflictNamingTheBreweryWhateverItsStatus() {
		UUID approved = brewery("Taken Brewery", "FI", null, "APPROVED", null);
		UUID pendingElsewhere = brewery("Held Brewery", "SE", null, "PENDING", UUID.randomUUID());
		UUID mine = brewery("Typo Mine", "FI", null, "PENDING", contributorId);
		UUID beer = beer(mine, "Brewery Dup Beer", "IPA", "5.0", contributorId);

		edit(beer, body("Brewery Dup Beer", "IPA", "5.0").with("newBrewery", Map.of("name", "taken  BREWERY", "countryCode", "FI")))
				.expectStatus().isEqualTo(409).expectHeader().contentType(MediaType.APPLICATION_PROBLEM_JSON)
				.expectBody(String.class).value(response -> {
					assertThat((String) JsonPath.read(response, "$.existingBreweryId")).isEqualTo(approved.toString());
					assertThat((String) JsonPath.read(response, "$.existingBreweryName")).isEqualTo("Taken Brewery");
				});
		edit(beer, body("Brewery Dup Beer", "IPA", "5.0").with("newBrewery", Map.of("name", "Held Brewery", "countryCode", "SE")))
				.expectStatus().isEqualTo(409).expectBody(String.class)
				.value(response -> assertThat((String) JsonPath.read(response, "$.existingBreweryId"))
						.isEqualTo(pendingElsewhere.toString()));

		assertThat(name("brewery", mine)).isEqualTo("Typo Mine");
		assertThat(status("beer", beer)).isEqualTo("PENDING");
	}

	@Test
	void aSuggestionIsNeverADuplicateOfItself() {
		UUID mine = brewery("Self Brewery", "FI", null, "PENDING", contributorId);
		UUID beer = beer(mine, "Self Beer", "IPA", "5.0", contributorId);

		edit(beer, body("Self Beer", "IPA", "5.1").with("newBrewery", Map.of("name", "Self Brewery", "countryCode", "FI")))
				.expectStatus().isOk();

		assertThat(status("beer", beer)).isEqualTo("APPROVED");
	}

	@Test
	void anUnknownStyleIsRefusedAndNothingChanges() {
		UUID mine = brewery("Style Brewery", "FI", null, "PENDING", contributorId);
		UUID beer = beer(mine, "Style Beer", "IPA", "5.0", contributorId);

		edit(beer, body("Style Beer", "Nonexistent Style", "5.0").with("newBrewery", Map.of("name", "Style Brewery", "countryCode", "FI")))
				.expectStatus().isBadRequest().expectHeader().contentType(MediaType.APPLICATION_PROBLEM_JSON)
				.expectBody(String.class)
				.value(response -> assertThat((String) JsonPath.read(response, "$.errors[0].field")).isEqualTo("style"));

		assertNothingDecided(beer, mine);
	}

	@Test
	void anUnlistedCountryIsRefusedAndNothingChanges() {
		UUID mine = brewery("Country Brewery", "FI", null, "PENDING", contributorId);
		UUID beer = beer(mine, "Country Beer", "IPA", "5.0", contributorId);

		edit(beer, body("Country Beer", "IPA", "5.0").with("newBrewery", Map.of("name", "Country Brewery", "countryCode", "ZZ")))
				.expectStatus().isBadRequest().expectBody(String.class)
				.value(response -> assertThat((String) JsonPath.read(response, "$.errors[0].field"))
						.isEqualTo("newBrewery.countryCode"));

		assertNothingDecided(beer, mine);
	}

	@Test
	void anInvisibleFormattingCharacterInABeerOrBreweryNameIsRefusedAndNothingChanges() {
		UUID mine = brewery("Invisible Brewery", "FI", null, "PENDING", contributorId);
		UUID beer = beer(mine, "Invisible Beer", "IPA", "5.0", contributorId);

		edit(beer, body("Invi\u200Bsible Beer", "IPA", "5.0").with("newBrewery", Map.of("name", "Invisible Brewery", "countryCode", "FI")))
				.expectStatus().isBadRequest();
		edit(beer, body("Invisible Beer", "IPA", "5.0")
				.with("newBrewery", Map.of("name", "Invi\u202Esible Brewery", "countryCode", "FI"))).expectStatus().isBadRequest();

		assertNothingDecided(beer, mine);
	}

	@Test
	void anAbvOutOfRangeAndANameOfSymbolsAreRefusedAndBothOrNeitherBreweryIsRefused() {
		UUID mine = brewery("Shape Brewery", "FI", null, "PENDING", contributorId);
		UUID beer = beer(mine, "Shape Beer", "IPA", "5.0", contributorId);
		Map<String, Object> newBrewery = Map.of("name", "Shape Brewery", "countryCode", "FI");

		edit(beer, body("Shape Beer", "IPA", "100.5").with("newBrewery", newBrewery)).expectStatus().isBadRequest();
		edit(beer, body("Shape Beer", "IPA", "5.55").with("newBrewery", newBrewery)).expectStatus().isBadRequest();
		edit(beer, body("!!!", "IPA", "5.0").with("newBrewery", newBrewery)).expectStatus().isBadRequest();
		edit(beer, body("Shape Beer", "IPA", "5.0")).expectStatus().isBadRequest();
		edit(beer, body("Shape Beer", "IPA", "5.0").with("newBrewery", newBrewery).with("breweryId", UUID.randomUUID()))
				.expectStatus().isBadRequest();

		assertNothingDecided(beer, mine);
	}

	@Test
	void aSuggestionDecidedAlreadyAnswersConflictAsAnApprovalDoes() {
		UUID brewery = brewery("Decided Brewery", "FI", null, "APPROVED", null);
		UUID approved = beer(brewery, "Decided Approved", "IPA", "5.0", contributorId);
		UUID rejected = beer(brewery, "Decided Rejected", "IPA", "5.0", contributorId);
		client.post().uri(BASE + approved + "/approval").header("Authorization", ADMIN).exchange().expectStatus().isOk();
		client.post().uri(BASE + rejected + "/rejection").header("Authorization", ADMIN)
				.contentType(MediaType.APPLICATION_JSON).body("{\"reason\":\"INAPPROPRIATE\"}").exchange().expectStatus().isOk();

		edit(approved, body("Decided Approved Edited", "IPA", "5.0").with("breweryId", brewery)).expectStatus().isEqualTo(409)
				.expectHeader().contentType(MediaType.APPLICATION_PROBLEM_JSON).expectBody(String.class).value(response -> {
					assertThat((String) JsonPath.read(response, "$.outcome")).isEqualTo("APPROVED");
					assertThat(Instant.parse(JsonPath.read(response, "$.decidedAt"))).isNotNull();
				});
		edit(rejected, body("Decided Rejected Edited", "IPA", "5.0").with("breweryId", brewery)).expectStatus().isEqualTo(409)
				.expectBody(String.class)
				.value(response -> assertThat((String) JsonPath.read(response, "$.outcome")).isEqualTo("REJECTED"));
		assertThat(name("beer", approved)).isEqualTo("Decided Approved");
		assertThat(reviewCount(approved)).isEqualTo(1);
	}

	@Test
	void anEditRacingARejectionLeavesOneDecisionOneRecordOneEventAndTheLoserAConflict() throws Exception {
		UUID brewery = brewery("Racing Edit Brewery", "FI", null, "APPROVED", null);
		UUID beer = beer(brewery, "Racing Edit Beer", "IPA", "5.0", contributorId);
		CyclicBarrier together = new CyclicBarrier(2);
		ExecutorService pool = Executors.newFixedThreadPool(2);
		try {
			Future<Integer> edited = pool.submit(() -> {
				together.await(10, TimeUnit.SECONDS);
				return edit(beer, body("Racing Edit Beer Fixed", "IPA", "5.0").with("breweryId", brewery))
						.returnResult(String.class).getStatus().value();
			});
			Future<Integer> rejected = pool.submit(() -> {
				together.await(10, TimeUnit.SECONDS);
				return client.post().uri(BASE + beer + "/rejection").header("Authorization", ADMIN)
						.contentType(MediaType.APPLICATION_JSON).body("{\"reason\":\"INAPPROPRIATE\"}").exchange()
						.returnResult(String.class).getStatus().value();
			});

			assertThat(List.of(edited.get(30, TimeUnit.SECONDS), rejected.get(30, TimeUnit.SECONDS)))
					.containsExactlyInAnyOrder(200, 409);
		}
		finally {
			pool.shutdownNow();
		}

		assertThat(reviewCount(beer)).isEqualTo(1);
		assertThat(events.published()).filteredOn(event -> event.beerId().equals(beer)).hasSize(1);
	}

	@Test
	void aBeerNobodySuggestedAnswersNotFoundANonAdminForbiddenAndAnAnonymousCallerUnauthorized() {
		UUID imported = jdbc.queryForObject("SELECT id FROM catalog.beer WHERE contributor_id IS NULL LIMIT 1", UUID.class);
		UUID brewery = brewery("Guarded Brewery", "FI", null, "APPROVED", null);
		UUID beer = beer(brewery, "Guarded Edit", "IPA", "5.0", contributorId);
		Body request = body("Whatever", "IPA", "5.0").with("breweryId", brewery);

		edit(imported, request).expectStatus().isNotFound();
		edit(UUID.randomUUID(), request).expectStatus().isNotFound();
		client.post().uri(BASE + beer + "/edited-approval").header("Authorization", MEMBER)
				.contentType(MediaType.APPLICATION_JSON).body(request.fields).exchange().expectStatus().isForbidden();
		client.post().uri(BASE + beer + "/edited-approval").contentType(MediaType.APPLICATION_JSON).body(request.fields)
				.exchange().expectStatus().isUnauthorized();

		assertThat(status("beer", beer)).isEqualTo("PENDING");
		assertThat(status("beer", imported)).isEqualTo("APPROVED");
	}

	@Test
	void anEditedApprovalRecordsTheValuesAsSuggestedAndPublishesTheEditedOnesWithTheSuggestedName() {
		UUID mine = brewery("Suggested Brewery", "FI", "Espoo", "PENDING", contributorId);
		UUID beer = beer(mine, "Suggested Name", "IPA", "55.0", contributorId);

		edit(beer, body("Decided Name", "Quadrupel", "5.5")
				.with("newBrewery", Map.of("name", "Decided Brewery", "countryCode", "SE", "city", "Lund")))
				.expectStatus().isOk();

		Map<String, Object> record = jdbc.queryForMap("SELECT * FROM catalog.review WHERE beer_id = ?", beer);
		assertThat(record).containsEntry("decided_by", ADMIN_ID).containsEntry("outcome", "APPROVED")
				.containsEntry("suggested_name", "Suggested Name").containsEntry("suggested_style", "IPA")
				.containsEntry("suggested_brewery_id", mine).containsEntry("suggested_brewery_name", "Suggested Brewery")
				.containsEntry("suggested_brewery_country_code", "FI").containsEntry("suggested_brewery_city", "Espoo");
		assertThat(((Number) record.get("suggested_abv")).doubleValue()).isEqualTo(55.0);
		assertThat(events.published()).filteredOn(event -> event.beerId().equals(beer)).singleElement().satisfies(event -> {
			assertThat(event.outcome()).isEqualTo(SuggestionReviewed.Outcome.APPROVED);
			assertThat(event.edited()).isTrue();
			assertThat(event.beerName()).isEqualTo("Decided Name");
			assertThat(event.suggestedName()).isEqualTo("Suggested Name");
			assertThat(event.contributorId()).isEqualTo(contributorId);
		});
	}

	@Test
	void aRequestEqualToTheSuggestedValuesIsRecordedAndPublishedAsAPlainApproval() {
		UUID mine = brewery("Unchanged Brewery", "FI", "Espoo", "PENDING", contributorId);
		UUID beer = beer(mine, "Unchanged Beer", "IPA", "5.0", contributorId);

		edit(beer, body(" Unchanged Beer ", "ipa", "5").with("newBrewery",
				Map.of("name", "Unchanged Brewery", "countryCode", "FI", "city", "Espoo"))).expectStatus().isOk();

		Map<String, Object> record = jdbc.queryForMap("SELECT * FROM catalog.review WHERE beer_id = ?", beer);
		assertThat(record).containsEntry("outcome", "APPROVED").containsEntry("suggested_name", null)
				.containsEntry("suggested_style", null).containsEntry("suggested_brewery_id", null);
		assertThat(events.published()).filteredOn(event -> event.beerId().equals(beer)).singleElement().satisfies(event -> {
			assertThat(event.edited()).isFalse();
			assertThat(event.suggestedName()).isNull();
		});
	}

	@Test
	void aBreweryThatIsNotApprovedCannotBeRepointedAt() {
		UUID mine = brewery("Repoint Source", "FI", null, "PENDING", contributorId);
		UUID beer = beer(mine, "Repoint Refused", "IPA", "5.0", contributorId);
		UUID pending = brewery("Someone Elses Pending", "FI", null, "PENDING", UUID.randomUUID());
		UUID rejected = brewery("Rejected Target", "FI", null, "REJECTED", UUID.randomUUID());

		for (UUID target : List.of(pending, rejected, mine, UUID.randomUUID())) {
			edit(beer, body("Repoint Refused", "IPA", "5.0").with("breweryId", target)).expectStatus().isNotFound()
					.expectHeader().contentType(MediaType.APPLICATION_PROBLEM_JSON);
		}
		assertThat(status("beer", beer)).isEqualTo("PENDING");
		assertThat(breweryOf(beer)).isEqualTo(mine);
		assertThat(status("brewery", mine)).isEqualTo("PENDING");
	}

	@Test
	void editingABreweryAfterASiblingsApprovalApprovedItAnswersConflict() {
		UUID shared = brewery("Sibling Approved", "FI", null, "PENDING", contributorId);
		UUID first = beer(shared, "Sibling First", "IPA", "5.0", contributorId);
		UUID second = beer(shared, "Sibling Second", "IPA", "5.0", contributorId);
		client.post().uri(BASE + first + "/approval").header("Authorization", ADMIN).exchange().expectStatus().isOk();

		edit(second, body("Sibling Second", "IPA", "5.0").with("newBrewery", Map.of("name", "Edited After", "countryCode", "FI")))
				.expectStatus().isEqualTo(409).expectHeader().contentType(MediaType.APPLICATION_PROBLEM_JSON);

		assertThat(name("brewery", shared)).isEqualTo("Sibling Approved");
		assertThat(status("beer", second)).isEqualTo("PENDING");
		edit(second, body("Sibling Second Fixed", "IPA", "5.0").with("breweryId", shared)).expectStatus().isOk();
		assertThat(name("beer", second)).isEqualTo("Sibling Second Fixed");
	}

	@Test
	void addingABreweryToASuggestionThatCameWithAnExistingOneAnswersBadRequest() {
		UUID existing = brewery("Came With", "FI", null, "APPROVED", null);
		UUID own = brewery("Contributors Own Earlier", "FI", null, "PENDING", contributorId);
		UUID earlier = beer(own, "Earlier Beer", "IPA", "5.0", contributorId);
		client.post().uri(BASE + earlier + "/approval").header("Authorization", ADMIN).exchange().expectStatus().isOk();
		UUID plain = beer(existing, "Plain Existing", "IPA", "5.0", contributorId);
		UUID underOwn = beer(own, "Under Own Approved", "IPA", "5.0", contributorId);
		Map<String, Object> added = Map.of("name", "Brand New", "countryCode", "FI");

		for (UUID suggestion : List.of(plain, underOwn)) {
			edit(suggestion, body("Whatever Beer", "IPA", "5.0").with("newBrewery", added)).expectStatus().isBadRequest()
					.expectHeader().contentType(MediaType.APPLICATION_PROBLEM_JSON).expectBody(String.class)
					.value(response -> assertThat((String) JsonPath.read(response, "$.errors[0].field"))
							.isEqualTo("newBrewery"));
			assertThat(status("beer", suggestion)).isEqualTo("PENDING");
		}
		assertThat(jdbc.queryForObject("SELECT count(*) FROM catalog.brewery WHERE name = 'Brand New'", Integer.class)).isZero();
	}

	@Test
	void theOperationIsInTheSpecWithItsErrors() {
		String docs = client.get().uri("/v3/api-docs").exchange().expectStatus().isOk().returnResult(String.class)
				.getResponseBody();

		assertThat((Map<String, Object>) JsonPath.read(docs, "$.paths['/api/v1/admin/suggestions/{id}/edited-approval'].post.responses"))
				.containsKeys("200", "400", "401", "403", "404", "409");
	}

	private RestTestClient.ResponseSpec edit(UUID id, Body request) {
		return client.post().uri(BASE + id + "/edited-approval").header("Authorization", ADMIN)
				.contentType(MediaType.APPLICATION_JSON).body(request.fields).exchange();
	}

	private static Body body(String name, String style, String abv) {
		return new Body().with("name", name).with("style", style).with("abv", new java.math.BigDecimal(abv));
	}

	private String get(String bearer, String uri) {
		return client.get().uri(uri).header("Authorization", bearer).exchange().expectStatus().isOk()
				.expectBody(String.class).returnResult().getResponseBody();
	}

	private void assertNothingDecided(UUID beer, UUID brewery) {
		assertThat(status("beer", beer)).isEqualTo("PENDING");
		assertThat(status("brewery", brewery)).isEqualTo("PENDING");
		assertThat(reviewCount(beer)).isZero();
	}

	private String status(String table, UUID id) {
		return jdbc.queryForObject("SELECT moderation_status FROM catalog." + table + " WHERE id = ?", String.class, id);
	}

	private String name(String table, UUID id) {
		return jdbc.queryForObject("SELECT name FROM catalog." + table + " WHERE id = ?", String.class, id);
	}

	private UUID breweryOf(UUID beer) {
		return jdbc.queryForObject("SELECT brewery_id FROM catalog.beer WHERE id = ?", UUID.class, beer);
	}

	private int reviewCount(UUID beer) {
		return jdbc.queryForObject("SELECT count(*) FROM catalog.review WHERE beer_id = ?", Integer.class, beer);
	}

	private UUID brewery(String name, String country, String city, String status, UUID contributor) {
		return jdbc.queryForObject("""
				INSERT INTO catalog.brewery (name, name_sort_key, country_code, city, source, contributor_id, moderation_status)
				VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING id""", UUID.class,
				name, name.toLowerCase(), country, city, contributor == null ? "SEED" : "USER", contributor, status);
	}

	private UUID beer(UUID brewery, String name, String style, String abv, UUID contributor) {
		return beer(brewery, name, style, abv, contributor, "PENDING");
	}

	private UUID beer(UUID brewery, String name, String style, String abv, UUID contributor, String status) {
		return jdbc.queryForObject("""
				INSERT INTO catalog.beer (brewery_id, name, style, abv, source, contributor_id, moderation_status, created_at)
				VALUES (?, ?, ?, ?::numeric, ?, ?, ?, ?) RETURNING id""", UUID.class,
				brewery, name, style, new java.math.BigDecimal(abv), contributor == null ? "SEED" : "USER", contributor,
				status, Timestamp.from(Instant.now()));
	}

	private static final class Body {

		private final Map<String, Object> fields = new LinkedHashMap<>();

		Body with(String key, Object value) {
			fields.put(key, value);
			return this;
		}

	}

	static class CommittedEvents {

		private final List<SuggestionReviewed> published = new CopyOnWriteArrayList<>();

		List<SuggestionReviewed> published() {
			return published;
		}

		@TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
		void on(SuggestionReviewed event) {
			published.add(event);
		}

	}

}
