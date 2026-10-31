package fi.kalia.appconfig.web;

import fi.kalia.appconfig.application.AppConfigService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

// Public, and takes no parameters: an app asks before it has a token it could
// trust, and the answer is the same for every caller.
@RestController
@RequestMapping("/api/v1/app-config")
@RequiredArgsConstructor
@Tag(name = "App config", description = "What the server tells an installed app about itself")
class AppConfigController {

	private final AppConfigService config;

	@GetMapping
	// Do not remove: matches Spring's default, but its absence would silently
	// drop this operation's 200 from /v3/api-docs (backend/README.md traps).
	@ResponseStatus(HttpStatus.OK)
	@Operation(summary = "Read the app's minimum supported build and the maintenance flag",
			description = """
					An app below the minimum build for its platform must stop and ask to be updated, and \
					one that reads maintenance true must stop and say Kalia is down. The same for every \
					caller, signed in or out, and never cached: a change has to be seen at the next check.""")
	ResponseEntity<AppConfigDto> readAppConfig() {
		return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(AppConfigDto.from(config.current()));
	}

}
