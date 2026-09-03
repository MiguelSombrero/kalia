package fi.kalia.cellar.domain;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
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
	@OrderBy("createdAt")
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
		if (quantity <= 0) {
			throw new InvalidBottleException("quantity must be positive");
		}
		List<Bottle> added = IntStream.range(0, quantity)
				.mapToObj(i -> Bottle.create(this, containerType, brewedDate, bestBeforeDate))
				.toList();
		touch();
		return added;
	}

	public List<Bottle> lastBottles(int count) {
		Assert.isTrue(count >= 0 && count <= bottles.size(), "count out of range");
		return List.copyOf(bottles.subList(bottles.size() - count, bottles.size()));
	}

	public Bottle updateBottle(UUID bottleId, ContainerType containerType, @Nullable LocalDate brewedDate,
			@Nullable LocalDate bestBeforeDate) {
		Bottle bottle = bottleWithId(bottleId);
		bottle.update(containerType, brewedDate, bestBeforeDate);
		touch();
		return bottle;
	}

	public void removeBottle(UUID bottleId) {
		removeBottle(bottleWithId(bottleId));
	}

	public void removeBottle(Bottle bottle) {
		bottles.remove(bottle);
		touch();
	}

	private Bottle bottleWithId(UUID bottleId) {
		return bottles.stream()
				.filter(b -> b.getId().equals(bottleId))
				.findFirst()
				.orElseThrow(() -> new IllegalStateException(
						"entry %s does not contain bottle %s".formatted(id, bottleId)));
	}

	private void touch() {
		this.updatedAt = Instant.now();
	}

	void registerBottle(Bottle bottle) {
		bottles.add(bottle);
	}

}
