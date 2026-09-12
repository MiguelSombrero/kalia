package fi.kalia.feed.domain;

import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface FeedLineRepository extends JpaRepository<FeedLine, UUID> {

	boolean existsByEventId(UUID eventId);

}
