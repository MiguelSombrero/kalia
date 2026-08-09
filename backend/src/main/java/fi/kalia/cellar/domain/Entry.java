package fi.kalia.cellar.domain;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.stream.IntStream;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.Hibernate;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.SourceType;
import org.hibernate.annotations.UpdateTimestamp;
import org.jspecify.annotations.Nullable;
import org.springframework.util.Assert;

@Entity
@Table(name = "entry", schema = "cellar")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Entry {

	@Id
	@GeneratedValue
	private UUID id;

	private UUID userId;

	private UUID beerId;

	@Getter(AccessLevel.NONE)
	@OneToMany(mappedBy = "entry", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
	private final List<Bottle> bottles = new ArrayList<>();

	// source = VM: see Bottle.createdAt.
	@CreationTimestamp(source = SourceType.VM)
	private Instant createdAt;

	@UpdateTimestamp(source = SourceType.VM)
	private Instant updatedAt;

	private Entry(UUID userId, UUID beerId) {
		this.userId = userId;
		this.beerId = beerId;
	}

	public static Entry create(UUID userId, UUID beerId) {
		Assert.notNull(userId, "userId must not be null");
		Assert.notNull(beerId, "beerId must not be null");
		return new Entry(userId, beerId);
	}

	public int quantity() {
		return bottles.size();
	}

	public List<Bottle> getBottles() {
		return List.copyOf(bottles);
	}

	public List<Bottle> addBottles(int quantity, ContainerType containerType, @Nullable LocalDate brewedDate,
			@Nullable LocalDate bestBeforeDate) {
		Assert.isTrue(quantity > 0, "quantity must be positive");
		return IntStream.range(0, quantity)
				.mapToObj(i -> Bottle.create(this, containerType, brewedDate, bestBeforeDate))
				.toList();
	}

	/**
	 * Do not call this alone to delete a bottle's row. On an uninitialized
	 * {@code bottles} it is a no-op by design — touching the collection here
	 * would load every bottle for this entry just to find the one to remove
	 * — so deleting the row for real also requires the explicit repository
	 * delete in {@link fi.kalia.cellar.application.CellarService#removeBottle},
	 * which every current caller goes through.
	 */
	public void removeBottle(Bottle bottle) {
		if (Hibernate.isInitialized(bottles)) {
			bottles.remove(bottle);
		}
	}

	void registerBottle(Bottle bottle) {
		bottles.add(bottle);
	}

}
