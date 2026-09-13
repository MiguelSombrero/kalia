package fi.kalia.catalog.application;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;

class CatalogServiceTest {

	private static final List<String> FIVE_ITEMS = List.of("a", "b", "c", "d", "e");

	@Test
	void middlePageReturnsItsOwnSlice() {
		Page<String> page = CatalogService.paginate(FIVE_ITEMS, PageRequest.of(1, 2));

		assertThat(page.getContent()).containsExactly("c", "d");
		assertThat(page.getTotalElements()).isEqualTo(5);
	}

	@Test
	void lastPartialPageIsClampedAtTheUpperEnd() {
		Page<String> page = CatalogService.paginate(FIVE_ITEMS, PageRequest.of(2, 2));

		assertThat(page.getContent()).containsExactly("e");
		assertThat(page.getTotalElements()).isEqualTo(5);
	}

	@Test
	void pageIndexPastTheEndIsClampedAtTheLowerEndInsteadOfThrowing() {
		Page<String> page = CatalogService.paginate(FIVE_ITEMS, PageRequest.of(10, 2));

		assertThat(page.getContent()).isEmpty();
		assertThat(page.getTotalElements()).isEqualTo(5);
	}

	@Test
	void aPageSizeCoveringEverythingReturnsTheWholeList() {
		Page<String> page = CatalogService.paginate(FIVE_ITEMS, PageRequest.of(0, 100));

		assertThat(page.getContent()).containsExactlyElementsOf(FIVE_ITEMS);
	}

	@Test
	void emptySourceListNeverThrowsRegardlessOfRequestedPage() {
		Page<String> page = CatalogService.paginate(List.of(), PageRequest.of(3, 10));

		assertThat(page.getContent()).isEmpty();
		assertThat(page.getTotalElements()).isZero();
	}

}
