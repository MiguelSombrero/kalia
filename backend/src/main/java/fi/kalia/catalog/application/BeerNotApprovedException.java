package fi.kalia.catalog.application;

import fi.kalia.catalog.domain.ModerationStatus;
import java.util.Locale;

/** The beer cannot be removed because it is not approved: still waiting, rejected, or removed already (ADR-0102). */
public class BeerNotApprovedException extends RuntimeException {

	private final ModerationStatus moderationStatus;

	BeerNotApprovedException(ModerationStatus moderationStatus) {
		super("Only an approved beer can be removed; this one is " + moderationStatus.name().toLowerCase(Locale.ROOT));
		this.moderationStatus = moderationStatus;
	}

	public ModerationStatus getModerationStatus() {
		return moderationStatus;
	}

}
