package fi.kalia.web;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "A request field the API refused, and why")
public record FieldErrorDto(
		@Schema(description = "The refused field's name, as the request spells it",
				requiredMode = Schema.RequiredMode.REQUIRED) String field,
		@Schema(requiredMode = Schema.RequiredMode.REQUIRED) String message) {
}
