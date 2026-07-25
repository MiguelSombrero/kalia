package fi.kalia.web;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Test-only endpoint exercising @Valid @RequestBody validation for
 * GlobalExceptionHandlerIT — no real endpoint accepts a request body yet.
 */
@RestController
@RequestMapping("/test/validation-probe")
class ValidationProbeController {

	@PostMapping
	String probe(@Valid @RequestBody ProbeRequest request) {
		return "ok";
	}

	record ProbeRequest(@NotBlank String name) {
	}

}
