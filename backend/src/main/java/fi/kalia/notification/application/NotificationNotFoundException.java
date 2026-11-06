package fi.kalia.notification.application;

/** Deliberately says nothing of why: another user's notification reads as one that does not exist. */
public class NotificationNotFoundException extends RuntimeException {

	public NotificationNotFoundException() {
		super("No such notification");
	}

}
