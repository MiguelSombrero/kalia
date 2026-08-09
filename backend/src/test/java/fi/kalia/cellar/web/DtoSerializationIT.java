package fi.kalia.cellar.web;

import static org.assertj.core.api.Assertions.assertThat;

import fi.kalia.cellar.domain.ContainerType;
import java.time.Instant;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.json.JsonTest;
import org.springframework.boot.test.json.JacksonTester;

/**
 * A present {@code "brewedDate": null} does not match the
 * {@code brewedDate?: string} the generated frontend types promise
 * (backend/README.md). Verifies the configured ObjectMapper omits null
 * fields entirely, the same trap catalog.web.DtoSerializationIT pins.
 */
@JsonTest
class DtoSerializationIT {

	@Autowired
	private JacksonTester<BottleDto> bottleJson;

	@Test
	void omitsNullDatesFromBottleJson() throws Exception {
		BottleDto bottle = new BottleDto(UUID.randomUUID(), UUID.randomUUID(), ContainerType.CAN, null, null,
				Instant.now(), Instant.now());

		String json = bottleJson.write(bottle).getJson();

		assertThat(json).doesNotContain("brewedDate").doesNotContain("bestBeforeDate");
	}

}
