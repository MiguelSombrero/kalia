package fi.kalia.cellar.web;

import static org.assertj.core.api.Assertions.assertThat;

import fi.kalia.cellar.domain.ContainerType;
import java.time.Instant;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.json.JsonTest;
import org.springframework.boot.test.json.JacksonTester;

// Same trap catalog.web.DtoSerializationIT pins: a present "brewedDate":
// null doesn't match the generated `brewedDate?: string` type.
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
