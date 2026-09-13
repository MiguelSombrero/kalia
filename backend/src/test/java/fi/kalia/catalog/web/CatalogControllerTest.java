package fi.kalia.catalog.web;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import fi.kalia.catalog.application.InvalidSearchParameterException;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.Sort;

class CatalogControllerTest {

	@Test
	void lowercaseAscIsAccepted() {
		Sort.Order order = CatalogController.parseSort("abv,asc").getOrderFor("abv");

		assertThat(order).isNotNull();
		assertThat(order.getDirection()).isEqualTo(Sort.Direction.ASC);
	}

	@Test
	void uppercaseAscIsAcceptedCaseInsensitively() {
		Sort.Order order = CatalogController.parseSort("abv,ASC").getOrderFor("abv");

		assertThat(order).isNotNull();
		assertThat(order.getDirection()).isEqualTo(Sort.Direction.ASC);
	}

	@Test
	void lowercaseDescIsAccepted() {
		Sort.Order order = CatalogController.parseSort("abv,desc").getOrderFor("abv");

		assertThat(order).isNotNull();
		assertThat(order.getDirection()).isEqualTo(Sort.Direction.DESC);
	}

	@Test
	void uppercaseDescIsAcceptedCaseInsensitively() {
		Sort.Order order = CatalogController.parseSort("abv,DESC").getOrderFor("abv");

		assertThat(order).isNotNull();
		assertThat(order.getDirection()).isEqualTo(Sort.Direction.DESC);
	}

	@Test
	void aMisspelledDirectionIsRejectedRatherThanSilentlySortingAscending() {
		assertThatThrownBy(() -> CatalogController.parseSort("abv,dsc"))
				.isInstanceOf(InvalidSearchParameterException.class)
				.hasMessageContaining("dsc");
	}

	@Test
	void propertyOnlyDefaultsToAscending() {
		Sort.Order order = CatalogController.parseSort("abv").getOrderFor("abv");

		assertThat(order).isNotNull();
		assertThat(order.getDirection()).isEqualTo(Sort.Direction.ASC);
	}

	@Test
	void unsupportedPropertyIsRejected() {
		assertThatThrownBy(() -> CatalogController.parseSort("price,asc"))
				.isInstanceOf(InvalidSearchParameterException.class)
				.hasMessageContaining("price");
	}

	@Test
	void moreThanTwoPartsIsRejected() {
		assertThatThrownBy(() -> CatalogController.parseSort("name,asc,extra"))
				.isInstanceOf(InvalidSearchParameterException.class)
				.hasMessageContaining("name,asc,extra");
	}

	@Test
	void nameAndStyleSortIgnoreCase() {
		assertThat(CatalogController.parseSort("name,asc").getOrderFor("name").isIgnoreCase()).isTrue();
		assertThat(CatalogController.parseSort("style,asc").getOrderFor("style").isIgnoreCase()).isTrue();
	}

	@Test
	void abvSortDoesNotIgnoreCaseSinceItIsNumeric() {
		assertThat(CatalogController.parseSort("abv,asc").getOrderFor("abv").isIgnoreCase()).isFalse();
	}

	@Test
	void idIsAlwaysAddedAsAStableSecondarySort() {
		Sort.Order idOrder = CatalogController.parseSort("abv,desc").getOrderFor("id");

		assertThat(idOrder).isNotNull();
		assertThat(idOrder.getDirection()).isEqualTo(Sort.Direction.ASC);
	}

}
