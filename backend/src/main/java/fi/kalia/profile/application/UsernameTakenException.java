package fi.kalia.profile.application;

// ADR-0080.
public class UsernameTakenException extends RuntimeException {

	public UsernameTakenException() {
		super("This username belongs to another account");
	}

}
