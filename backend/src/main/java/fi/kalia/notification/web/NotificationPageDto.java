package fi.kalia.notification.web;

import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;
import org.springframework.data.domain.Page;

/** Pagination envelope per docs/architecture.md §4. */
record NotificationPageDto(
		@Schema(requiredMode = Schema.RequiredMode.REQUIRED) List<NotificationDto> content,
		@Schema(requiredMode = Schema.RequiredMode.REQUIRED) long totalElements,
		@Schema(requiredMode = Schema.RequiredMode.REQUIRED) int totalPages,
		@Schema(requiredMode = Schema.RequiredMode.REQUIRED) int page) {

	static NotificationPageDto from(Page<NotificationDto> page) {
		return new NotificationPageDto(page.getContent(), page.getTotalElements(), page.getTotalPages(),
				page.getNumber());
	}

}
