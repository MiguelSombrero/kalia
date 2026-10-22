package fi.kalia.catalog.application;

import java.util.UUID;
import lombok.Getter;

@Getter
public class DuplicateBeerException extends RuntimeException {

	private final UUID existingBeerId;

	DuplicateBeerException(UUID existingBeerId) {
		super("The catalog already has this beer from this brewery");
		this.existingBeerId = existingBeerId;
	}

}
