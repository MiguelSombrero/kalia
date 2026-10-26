package fi.kalia.catalog.web;

import static org.assertj.core.api.Assertions.assertThat;

import com.jayway.jsonpath.JsonPath;
import fi.kalia.TestcontainersConfiguration;
import fi.kalia.catalog.domain.Beer;
import fi.kalia.catalog.domain.BeerRepository;
import fi.kalia.catalog.domain.Brewery;
import fi.kalia.catalog.domain.BreweryRepository;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.IntStream;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.resttestclient.autoconfigure.AutoConfigureRestTestClient;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.client.RestTestClient;

// A fixture brewery with more beers than one page of the search can hold, so
// the beer being looked for sorts past the page-size cap.
@Import(TestcontainersConfiguration.class)
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureRestTestClient
class SimilarBeersApiIT {

	private static final int FILLER_BEERS = 120;

	private static final String LAST_BY_NAME = "Zeta Ruosniemen Special";

	@Autowired
	private RestTestClient client;

	@Autowired
	private BreweryRepository breweries;

	@Autowired
	private BeerRepository beers;

	private Brewery brewery;

	@BeforeEach
	void setUp() {
		brewery = breweries.save(Brewery.create("Similar Beers Fixture Brewery", "FI", null));
		List<Beer> catalog = new ArrayList<>(IntStream.rangeClosed(1, FILLER_BEERS)
				.mapToObj(n -> Beer.create(brewery, "Filler %03d".formatted(n), "IPA", new BigDecimal("5.0")))
				.toList());
		catalog.add(Beer.create(brewery, LAST_BY_NAME, "IPA", new BigDecimal("5.0")));
		beers.saveAll(catalog);
	}

	@AfterEach
	void tearDown() {
		beers.deleteAll(beers.findAll((root, query, cb) -> cb.equal(root.get("brewery").get("id"), brewery.getId())));
		breweries.delete(brewery);
	}

	@Test
	void findsAMatchPastTheBreweryFirstHundredBeers() {
		client.get().uri("/api/v1/beers?breweryId={id}&similarTo={name}&size=5", brewery.getId(), "Ruosniemen-Panimo")
				.exchange()
				.expectStatus().isOk()
				.expectBody(String.class)
				.value(body -> assertThat((List<String>) JsonPath.read(body, "$.content[*].name"))
						.containsExactly(LAST_BY_NAME));
	}

	@Test
	void anyWordOfTheTypedNameMatches() {
		client.get().uri("/api/v1/beers?breweryId={id}&similarTo={name}&size=5", brewery.getId(), "Filler 007 Stout")
				.exchange()
				.expectStatus().isOk()
				.expectBody(String.class)
				.value(body -> assertThat((int) JsonPath.read(body, "$.totalElements")).isEqualTo(FILLER_BEERS));
	}

	@Test
	void aNameWithoutAUsableWordMatchesNothing() {
		client.get().uri("/api/v1/beers?breweryId={id}&similarTo={name}", brewery.getId(), "- &")
				.exchange()
				.expectStatus().isOk()
				.expectBody(String.class)
				.value(body -> assertThat((int) JsonPath.read(body, "$.totalElements")).isZero());
	}

	@Test
	void aNameMatchesOnlyTheGivenBrewery() {
		client.get().uri("/api/v1/beers?breweryId={id}&similarTo=westvleteren", brewery.getId())
				.exchange()
				.expectStatus().isOk()
				.expectBody(String.class)
				.value(body -> assertThat((int) JsonPath.read(body, "$.totalElements")).isZero());
	}

	@Test
	void withoutABreweryIsProblemJson400() {
		client.get().uri("/api/v1/beers?similarTo=westvleteren")
				.exchange()
				.expectStatus().isBadRequest()
				.expectHeader().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON)
				.expectBody(String.class)
				.value(body -> assertThat((String) JsonPath.read(body, "$.detail")).contains("breweryId"));
	}

	@Test
	void overlongIsAFieldLevel400() {
		client.get().uri("/api/v1/beers?breweryId={id}&similarTo={name}", brewery.getId(), "a".repeat(101))
				.exchange()
				.expectStatus().isBadRequest()
				.expectBody(String.class)
				.value(body -> assertThat((String) JsonPath.read(body, "$.errors[0].field")).isEqualTo("similarTo"));
	}

}
