package fi.kalia.catalog.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyChar;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.CriteriaQuery;
import jakarta.persistence.criteria.Expression;
import jakarta.persistence.criteria.Path;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import java.util.Locale;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

// Runs the Specification's predicate-building lambda against mocked JPA
// Criteria types instead of a real EntityManager: the bug under test is in
// plain Java string handling before the value ever reaches the database, and
// a Turkish default locale can't be pinned to a single test in a suite that
// runs against a real, shared Spring context.
@ExtendWith(MockitoExtension.class)
class BeerSpecificationsLocaleTest {

	@Mock
	private Root<Beer> root;

	@Mock
	private CriteriaQuery<?> query;

	@Mock
	private CriteriaBuilder cb;

	@Mock
	private Path<Object> path;

	@Mock
	private Expression<String> lowered;

	@Mock
	private Predicate predicate;

	private Locale originalDefaultLocale;

	@BeforeEach
	void stubCriteriaApi() {
		originalDefaultLocale = Locale.getDefault();
		when(root.get(anyString())).thenReturn(path);
		lenient().when(path.get(anyString())).thenReturn(path);
		when(cb.lower(any())).thenReturn(lowered);
		lenient().when(cb.like(any(), anyString(), anyChar())).thenReturn(predicate);
		lenient().when(cb.equal(any(), any())).thenReturn(predicate);
		when(cb.and(any(Predicate[].class))).thenReturn(predicate);
	}

	@AfterEach
	void restoreDefaultLocale() {
		Locale.setDefault(originalDefaultLocale);
	}

	private void search(BeerSearchCriteria criteria) {
		BeerSpecifications.matching(criteria).toPredicate(root, query, cb);
	}

	@Test
	void nameQueryIsLowercasedTheSameUnderATurkishDefaultLocale() {
		Locale.setDefault(new Locale("tr", "TR"));
		ArgumentCaptor<String> literal = ArgumentCaptor.forClass(String.class);

		search(new BeerSearchCriteria("IPA", null, null, null, null, null));

		verify(cb).like(eq(lowered), literal.capture(), anyChar());
		assertThat(literal.getValue()).isEqualTo("%ipa%");
	}

	@Test
	void styleFilterIsLowercasedTheSameUnderATurkishDefaultLocale() {
		Locale.setDefault(new Locale("tr", "TR"));
		ArgumentCaptor<Object> literal = ArgumentCaptor.forClass(Object.class);

		search(new BeerSearchCriteria(null, "IPA", null, null, null, null));

		verify(cb).equal(eq(lowered), literal.capture());
		assertThat(literal.getValue()).isEqualTo("ipa");
	}

	@Test
	void countryFilterIsLowercasedTheSameUnderATurkishDefaultLocale() {
		Locale.setDefault(new Locale("tr", "TR"));
		ArgumentCaptor<Object> literal = ArgumentCaptor.forClass(Object.class);

		search(new BeerSearchCriteria(null, null, null, "ISTANBUL", null, null));

		verify(cb).equal(eq(lowered), literal.capture());
		assertThat(literal.getValue()).isEqualTo("istanbul");
	}

}
