package fi.kalia.catalog.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.BDDMockito.given;

import fi.kalia.catalog.domain.BeerRepository;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

/** The rules a contributor's add and an admin's edit both answer to, once. */
class CatalogEntryRulesTest {

	private final BeerRepository beers = Mockito.mock(BeerRepository.class);

	private final CatalogEntryRules rules = new CatalogEntryRules(beers);

	@Test
	void aKnownStyleComesBackAsTheCatalogSpellsIt() {
		given(beers.findStylesIgnoringCase("ipa")).willReturn(List.of("IPA"));

		assertThat(rules.knownStyle("  ipa ")).isEqualTo("IPA");
	}

	@Test
	void aStyleTheCatalogLacksIsRefused() {
		given(beers.findStylesIgnoringCase("Gruit")).willReturn(List.of());

		assertThatThrownBy(() -> rules.knownStyle("Gruit")).isInstanceOf(UnknownStyleException.class);
	}

	@Test
	void aListedCountryPassesAndAnUnlistedOneIsRefused() {
		rules.requireListedCountry("FI");

		assertThatThrownBy(() -> rules.requireListedCountry("ZZ")).isInstanceOf(UnknownCountryException.class);
	}

}
