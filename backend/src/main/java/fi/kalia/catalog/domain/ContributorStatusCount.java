package fi.kalia.catalog.domain;

import java.util.UUID;

public record ContributorStatusCount(UUID contributorId, ModerationStatus status, long count) {
}
