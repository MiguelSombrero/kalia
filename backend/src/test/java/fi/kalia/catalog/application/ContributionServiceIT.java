package fi.kalia.catalog.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import fi.kalia.TestcontainersConfiguration;
import fi.kalia.catalog.domain.Brewery;
import fi.kalia.catalog.domain.BreweryRepository;
import jakarta.persistence.EntityManagerFactory;
import java.math.BigDecimal;
import java.time.Clock;
import java.util.UUID;
import org.hibernate.SessionFactory;
import org.hibernate.stat.Statistics;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.boot.jpa.test.autoconfigure.TestEntityManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.TestPropertySource;

@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Import({ TestcontainersConfiguration.class, ContributionService.class, ContributionServiceIT.Config.class })
@TestPropertySource(properties = "spring.jpa.properties.hibernate.generate_statistics=true")
class ContributionServiceIT {

	// The three statements an add that is refused as a duplicate brewery must run: the style
	// check, the contributor's advisory lock, and one read of the brewery.
	private static final int STATEMENTS_BEFORE_THE_REFUSAL_INCLUDING_ONE_BREWERY_READ = 3;

	@Autowired
	private ContributionService service;

	@Autowired
	private BreweryRepository breweries;

	@Autowired
	private TestEntityManager testEntityManager;

	@Autowired
	private EntityManagerFactory entityManagerFactory;

	@Test
	void aDuplicateBreweryIsRefusedWithItsNameAndCountryAfterOneRead() {
		Brewery existing = testEntityManager.persistFlushFind(
				Brewery.create("Duplicate Fixture Brewery " + UUID.randomUUID(), "FI", null, Clock.systemUTC()));
		testEntityManager.clear();
		Statistics statistics = entityManagerFactory.unwrap(SessionFactory.class).getStatistics();
		statistics.clear();

		assertThatThrownBy(() -> service.addBeer(UUID.randomUUID(),
				new BreweryChoice.New(existing.getName().toUpperCase(), "FI", null), "Some Beer", "IPA",
				new BigDecimal("5.0")))
				.isInstanceOfSatisfying(DuplicateBreweryException.class, refused -> {
					assertThat(refused.getExistingBreweryId()).isEqualTo(existing.getId());
					assertThat(refused.getExistingBreweryName()).isEqualTo(existing.getName());
					assertThat(refused.getExistingBreweryCountryCode()).isEqualTo("FI");
				});

		assertThat(statistics.getPrepareStatementCount()).isEqualTo(STATEMENTS_BEFORE_THE_REFUSAL_INCLUDING_ONE_BREWERY_READ);
	}

	static class Config {

		@Bean
		Clock clock() {
			return Clock.systemUTC();
		}

	}

}
