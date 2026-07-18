package fi.kalia.catalog.internal;

import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

interface BreweryRepository extends JpaRepository<Brewery, UUID> {
}
