package fi.kalia.catalog.domain;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface BreweryRepository extends JpaRepository<Brewery, UUID> {

	List<Brewery> findByNameContainingIgnoreCase(String name);

	// Do not change these expressions apart from brewery_folded_name_country_idx (V003).
	@Query(value = """
			SELECT id FROM catalog.brewery
			WHERE catalog.fold_name(name) = catalog.fold_name(:name) AND lower(country) = lower(:country)""",
			nativeQuery = true)
	Optional<UUID> findIdBySameNameAndCountry(String name, String country);

}
