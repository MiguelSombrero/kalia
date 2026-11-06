package fi.kalia.notification.domain;

import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface NotificationRepository extends JpaRepository<Notification, UUID> {

	boolean existsByEventId(UUID eventId);

	// The id breaks a tie between decisions made at the same instant, so a page boundary neither
	// repeats nor skips a row.
	Page<Notification> findByRecipientIdOrderByDecidedAtDescIdDesc(UUID recipientId, Pageable pageable);

	long countByRecipientId(UUID recipientId);

	// One statement, so two acknowledgements of one notification cannot both succeed: the count
	// says whether this call deleted it.
	@Modifying
	@Query("delete from Notification n where n.id = :id and n.recipientId = :recipientId")
	int deleteByIdAndRecipientId(@Param("id") UUID id, @Param("recipientId") UUID recipientId);

	// What deleting an account deletes (ADR-0104).
	long deleteByRecipientId(UUID recipientId);

}
