package fi.kalia.cellar.domain;

import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface BottleRepository extends JpaRepository<Bottle, UUID> {
}
