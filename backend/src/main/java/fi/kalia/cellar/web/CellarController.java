package fi.kalia.cellar.web;

import fi.kalia.cellar.application.CellarService;
import fi.kalia.identity.IdentityApi;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/**
 * Every endpoint here resolves the caller through {@code identity} and
 * operates only on that user's rows. A bottle is addressed by its own id,
 * never nested under its entry: an {@code entryId} in that path could not be
 * trusted any more than a caller-supplied user id, so it would buy no
 * isolation guarantee — {@link fi.kalia.cellar.application.CellarService}
 * enforces ownership by querying on the caller's id regardless of what the
 * path claims. The one endpoint that nests is the entry-scoped bottles read,
 * the one genuinely entry-scoped collection.
 */
@RestController
@RequestMapping("/api/v1/cellar")
@RequiredArgsConstructor
@Tag(name = "Cellar", description = "The signed-in caller's own cellar")
class CellarController {

	private final CellarService cellar;

	private final IdentityApi identity;

	@GetMapping
	@Operation(summary = "List the caller's cellar",
			description = "Every entry the caller owns, each with its derived quantity. Not paginated.")
	List<EntryDto> listEntries() {
		return cellar.listEntries(identity.requireCurrentUserId()).stream().map(EntryDto::from).toList();
	}

	@GetMapping("/entries/{entryId}/bottles")
	@Operation(summary = "List one entry's bottles",
			description = "404 when the entry does not exist or belongs to someone else.")
	List<BottleDto> listBottles(@Parameter(description = "Entry id") @PathVariable UUID entryId) {
		return cellar.listBottles(identity.requireCurrentUserId(), entryId).stream().map(BottleDto::from).toList();
	}

	@PostMapping("/bottles")
	@ResponseStatus(HttpStatus.CREATED)
	@Operation(summary = "Add a bottle",
			description = "Extends the entry for this catalog beer if the caller already has one, otherwise "
					+ "creates it. The bottle's id is always server-assigned.")
	BottleDto addBottle(@Valid @RequestBody AddBottleRequestDto request) {
		return BottleDto.from(cellar.addBottle(identity.requireCurrentUserId(), request.beerId(),
				request.containerType(), request.brewedDate(), request.bestBeforeDate()));
	}

	@PatchMapping("/bottles/{id}")
	@Operation(summary = "Update a bottle",
			description = "Replaces the bottle's container type and both dates. 404 when the bottle does not "
					+ "exist or belongs to someone else.")
	BottleDto updateBottle(@Parameter(description = "Bottle id") @PathVariable UUID id,
			@Valid @RequestBody UpdateBottleRequestDto request) {
		return BottleDto.from(cellar.updateBottle(identity.requireCurrentUserId(), id, request.containerType(),
				request.brewedDate(), request.bestBeforeDate()));
	}

	@DeleteMapping("/bottles/{id}")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	@Operation(summary = "Remove a bottle",
			description = "404 when the bottle does not exist or belongs to someone else.")
	void removeBottle(@Parameter(description = "Bottle id") @PathVariable UUID id) {
		cellar.removeBottle(identity.requireCurrentUserId(), id);
	}

}
