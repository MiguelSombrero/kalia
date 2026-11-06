package fi.kalia.notification.web;

import io.swagger.v3.oas.annotations.media.Schema;

record UnreadCountDto(
		@Schema(requiredMode = Schema.RequiredMode.REQUIRED, description = "How many notifications the caller has not acknowledged")
		long count) {

}
