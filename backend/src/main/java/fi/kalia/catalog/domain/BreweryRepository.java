package fi.kalia.catalog.domain;

import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface BreweryRepository extends JpaRepository<Brewery, UUID> {
}
