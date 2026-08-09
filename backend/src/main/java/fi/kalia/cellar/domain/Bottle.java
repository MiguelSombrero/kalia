package fi.kalia.cellar.domain;

import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.SourceType;
import org.hibernate.annotations.UpdateTimestamp;
import org.jspecify.annotations.Nullable;
import org.springframework.util.Assert;

@Entity
@Table(name = "bottle", schema = "cellar")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Bottle {

	@Id
	@GeneratedValue
	private UUID id;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "entry_id")
	private Entry entry;

	@Enumerated(EnumType.STRING)
	private ContainerType containerType;

	private @Nullable LocalDate brewedDate;

	private @Nullable LocalDate bestBeforeDate;

	// source = VM: generated in Java before the INSERT runs, so the value is
	// on the object immediately after save() rather than only after a flush
	// re-reads a database-generated default.
	@CreationTimestamp(source = SourceType.VM)
	private Instant createdAt;

	@UpdateTimestamp(source = SourceType.VM)
	private Instant updatedAt;

	private Bottle(Entry entry, ContainerType containerType, @Nullable LocalDate brewedDate,
			@Nullable LocalDate bestBeforeDate) {
		this.entry = entry;
		this.containerType = containerType;
		this.brewedDate = brewedDate;
		this.bestBeforeDate = bestBeforeDate;
	}

	public static Bottle create(Entry entry, ContainerType containerType, @Nullable LocalDate brewedDate,
			@Nullable LocalDate bestBeforeDate) {
		Assert.notNull(entry, "entry must not be null");
		Assert.notNull(containerType, "containerType must not be null");
		requireValidDates(brewedDate, bestBeforeDate);
		Bottle bottle = new Bottle(entry, containerType, brewedDate, bestBeforeDate);
		entry.registerBottle(bottle);
		return bottle;
	}

	public void update(ContainerType containerType, @Nullable LocalDate brewedDate,
			@Nullable LocalDate bestBeforeDate) {
		Assert.notNull(containerType, "containerType must not be null");
		requireValidDates(brewedDate, bestBeforeDate);
		this.containerType = containerType;
		this.brewedDate = brewedDate;
		this.bestBeforeDate = bestBeforeDate;
	}

	private static void requireValidDates(@Nullable LocalDate brewedDate, @Nullable LocalDate bestBeforeDate) {
		Assert.isTrue(brewedDate == null || !brewedDate.isAfter(LocalDate.now()),
				"brewedDate must not be in the future");
		Assert.isTrue(brewedDate == null || bestBeforeDate == null || bestBeforeDate.isAfter(brewedDate),
				"bestBeforeDate must be after brewedDate");
	}

}
