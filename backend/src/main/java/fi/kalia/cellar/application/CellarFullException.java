package fi.kalia.cellar.application;

import lombok.Getter;

@Getter
public class CellarFullException extends RuntimeException {

	private final int limit;

	private final int remaining;

	CellarFullException(int limit, int remaining) {
		super("A cellar holds %d bottles at most, and %d more fit; nothing was added".formatted(limit, remaining));
		this.limit = limit;
		this.remaining = remaining;
	}

}
