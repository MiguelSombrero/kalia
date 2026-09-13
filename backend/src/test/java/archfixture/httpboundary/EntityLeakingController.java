package archfixture.httpboundary;

import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

/** Violates {@code HttpBoundaryTest}'s rules: a controller returning or accepting
 * a JPA entity across the HTTP boundary, bare and wrapped in every container
 * the rule must see through. */
@RestController
public class EntityLeakingController {

	@GetMapping("/fixture/entity")
	public FixtureEntity returnsEntityDirectly() {
		return null;
	}

	@GetMapping("/fixture/entity/list")
	public List<FixtureEntity> returnsListOfEntities() {
		return null;
	}

	@GetMapping("/fixture/entity/page")
	public Page<FixtureEntity> returnsPageOfEntities() {
		return null;
	}

	@GetMapping("/fixture/entity/optional")
	public Optional<FixtureEntity> returnsOptionalOfEntity() {
		return null;
	}

	@GetMapping("/fixture/entity/response-entity")
	public ResponseEntity<FixtureEntity> returnsResponseEntityOfEntity() {
		return null;
	}

	@PostMapping("/fixture/entity")
	public void acceptsEntityAsRequestBody(@RequestBody FixtureEntity entity) {
	}

}
