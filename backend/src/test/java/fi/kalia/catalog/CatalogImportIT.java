package fi.kalia.catalog;

import static org.assertj.core.api.Assertions.assertThat;

import com.jayway.jsonpath.JsonPath;
import fi.kalia.TestcontainersConfiguration;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.resttestclient.autoconfigure.AutoConfigureRestTestClient;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.SingleConnectionDataSource;
import org.springframework.test.web.servlet.client.RestTestClient;
import org.testcontainers.postgresql.PostgreSQLContainer;

// The Wikidata import as the running app sees it (ADR-0077).
@Import(TestcontainersConfiguration.class)
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureRestTestClient
class CatalogImportIT {

	// "Grandin", imported from Wikidata and made by Omnipollo, whose row is the seed's.
	private static final String IMPORTED_AT_A_SEEDED_BREWERY = "Q139712150";

	// Moersleutel, a brewery that exists only through the import.
	private static final String IMPORTED_BREWERY = "Q124632565";

	@Autowired
	private RestTestClient client;

	@Autowired
	private JdbcTemplate jdbc;

	@Autowired
	private PostgreSQLContainer postgres;

	@Value("${spring.flyway.locations}")
	private String[] migrationLocations;

	@Test
	void anImportedBeerIsFoundBySearchAndItsDetailShowsItsBrewery() {
		assertFoundAndDetailed(beerWithQid(IMPORTED_AT_A_SEEDED_BREWERY), "Omnipollo");
		assertFoundAndDetailed(jdbc.queryForMap("""
				SELECT b.id::text AS id, b.name FROM catalog.beer b
				JOIN catalog.brewery br ON br.id = b.brewery_id
				WHERE br.wikidata_qid = ? ORDER BY b.name, b.id LIMIT 1""", IMPORTED_BREWERY), "Moersleutel");
	}

	@Test
	void anImportedBeerOfASeededBreweryAttachesToTheSeededRow() {
		assertThat(jdbc.queryForObject("""
				SELECT br.source FROM catalog.beer b JOIN catalog.brewery br ON br.id = b.brewery_id
				WHERE b.wikidata_qid = ?""", String.class, IMPORTED_AT_A_SEEDED_BREWERY)).isEqualTo("SEED");
		assertThat(jdbc.queryForObject("SELECT count(*) FROM catalog.brewery WHERE name = 'Omnipollo'", Long.class))
				.isEqualTo(1);
	}

	@Test
	void everyImportedRowCarriesItsSourceAndQid() {
		for (String table : List.of("catalog.brewery", "catalog.beer")) {
			assertThat(jdbc.queryForObject("SELECT count(*) FROM " + table + " WHERE source = 'WIKIDATA'", Long.class))
					.as(table).isPositive();
			assertThat(jdbc.queryForObject("""
					SELECT count(*) FROM %s WHERE source = 'WIKIDATA' AND wikidata_qid !~ '^Q[1-9][0-9]*$'"""
					.formatted(table), Long.class)).as(table).isZero();
			assertThat(jdbc.queryForObject("SELECT count(*) FROM " + table + " WHERE source = 'USER'", Long.class))
					.as(table).isZero();
		}
		assertThat(jdbc.queryForObject("SELECT count(*) FROM catalog.brewery WHERE source = 'SEED'", Long.class))
				.isEqualTo(20);
		assertThat(jdbc.queryForObject("SELECT count(*) FROM catalog.beer WHERE source = 'SEED'", Long.class))
				.isEqualTo(54);
	}

	// The seed's ids are random, so "kept" is only checkable by migrating a
	// database of its own up to the seed, noting them, and finishing the job.
	@Test
	void everySeededRowKeepsItsIdThroughTheImport() {
		jdbc.execute("DROP DATABASE IF EXISTS seed_ids_survive_import");
		jdbc.execute("CREATE DATABASE seed_ids_survive_import");
		try {
			JdbcTemplate fresh = new JdbcTemplate(new SingleConnectionDataSource(
					postgres.getJdbcUrl().replaceFirst("/[^/?]+(\\?|$)", "/seed_ids_survive_import$1"),
					postgres.getUsername(), postgres.getPassword(), true));
			Flyway flyway = Flyway.configure().dataSource(fresh.getDataSource()).locations(migrationLocations)
					.target("4").load();
			flyway.migrate();
			Map<String, String> seededBeers = idsToNames(fresh, "catalog.beer");
			Map<String, String> seededBreweries = idsToNames(fresh, "catalog.brewery");

			Flyway.configure().configuration(flyway.getConfiguration()).target("latest").load().migrate();

			assertThat(seededBeers).hasSize(54);
			assertThat(seededBreweries).hasSize(20);
			assertThat(idsToNames(fresh, "catalog.beer")).containsAllEntriesOf(seededBeers);
			assertThat(idsToNames(fresh, "catalog.brewery")).containsAllEntriesOf(seededBreweries);
			assertThat(fresh.queryForList("SELECT DISTINCT source FROM catalog.beer WHERE id::text = ANY (?)",
					String.class, (Object) seededBeers.keySet().toArray(String[]::new))).containsExactly("SEED");
			((SingleConnectionDataSource) fresh.getDataSource()).destroy();
		} finally {
			jdbc.execute("DROP DATABASE IF EXISTS seed_ids_survive_import WITH (FORCE)");
		}
	}

	private Map<String, Object> beerWithQid(String qid) {
		return jdbc.queryForMap("SELECT id::text AS id, name FROM catalog.beer WHERE wikidata_qid = ?", qid);
	}

	private void assertFoundAndDetailed(Map<String, Object> beer, String breweryName) {
		String id = (String) beer.get("id");
		client.get().uri("/api/v1/beers?query={name}&size=100", beer.get("name"))
				.exchange()
				.expectStatus().isOk()
				.expectBody(String.class)
				.value(body -> assertThat((List<String>) JsonPath.read(body, "$.content[*].id")).contains(id));
		client.get().uri("/api/v1/beers/{id}", id)
				.exchange()
				.expectStatus().isOk()
				.expectBody(String.class)
				.value(body -> {
					assertThat((String) JsonPath.read(body, "$.name")).isEqualTo(beer.get("name"));
					assertThat((String) JsonPath.read(body, "$.brewery.name")).isEqualTo(breweryName);
				});
	}

	private static Map<String, String> idsToNames(JdbcTemplate db, String table) {
		return db.queryForList("SELECT id::text AS id, name FROM " + table).stream()
				.collect(Collectors.toMap(row -> (String) row.get("id"), row -> (String) row.get("name")));
	}

}
