package archfixture.httpboundary;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import java.util.UUID;

/** The {@code @Entity} {@link EntityLeakingController} leaks across the HTTP boundary, bare and wrapped. */
@Entity
public class FixtureEntity {

	@Id
	private UUID id;

}
