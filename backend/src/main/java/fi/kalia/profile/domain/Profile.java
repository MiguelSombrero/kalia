package fi.kalia.profile.domain;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PostLoad;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import jakarta.persistence.Transient;
import java.time.Clock;
import java.time.Instant;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.springframework.data.domain.Persistable;
import org.springframework.util.Assert;

@Entity
@Table(name = "profile", schema = "profile")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Profile implements Persistable<UUID> {

	// The Keycloak sub itself, not a separately generated id (ADR-0049): a
	// profile is keyed by it, so there is exactly one row per subject.
	@Id
	private UUID id;

	private String username;

	private boolean cellarPublic;

	private Instant createdAt;

	private Instant updatedAt;

	// A manually assigned id is never null, so Spring Data's default isNew()
	// check would route every save() through merge() instead of persist() —
	// an extra existence SELECT, and a race on first creation would let two
	// concurrent inserts both pass it and collide on the primary key.
	@Transient
	private boolean isNew = true;

	private Profile(UUID id, String username, Instant now) {
		this.id = id;
		this.username = username;
		this.cellarPublic = false;
		this.createdAt = now;
		this.updatedAt = now;
	}

	public static Profile create(UUID id, String username, Clock clock) {
		Assert.notNull(id, "id must not be null");
		Assert.hasText(username, "username must not be blank");
		return new Profile(id, username, clock.instant());
	}

	public void changeCellarVisibility(boolean cellarPublic, Clock clock) {
		if (this.cellarPublic != cellarPublic) {
			this.cellarPublic = cellarPublic;
			this.updatedAt = clock.instant();
		}
	}

	@Override
	public boolean isNew() {
		return isNew;
	}

	@PrePersist
	@PostLoad
	void markNotNew() {
		isNew = false;
	}

}
