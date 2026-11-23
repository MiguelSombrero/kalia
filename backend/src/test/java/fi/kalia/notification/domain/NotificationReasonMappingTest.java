package fi.kalia.notification.domain;

import static org.assertj.core.api.Assertions.assertThat;

import fi.kalia.catalog.RejectionReason;
import java.util.Arrays;
import java.util.Set;
import java.util.stream.Collectors;
import org.junit.jupiter.api.Test;

class NotificationReasonMappingTest {

	// A reason added to catalog and not here still reaches the contributor, stored under its own
	// name; this fails first so the module's list, and the spec's enum, are extended on purpose.
	@Test
	void everyReasonCatalogPublishesHasACopyHere() {
		Set<String> known = Arrays.stream(Notification.Reason.values()).map(Enum::name)
				.collect(Collectors.toSet());

		assertThat(Arrays.stream(RejectionReason.values()).map(Enum::name)).allSatisfy(
				name -> assertThat(known).as("Notification.Reason has no %s", name).contains(name));
	}

}
