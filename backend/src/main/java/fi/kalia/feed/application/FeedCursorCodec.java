package fi.kalia.feed.application;

import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.Base64;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.stereotype.Component;

/**
 * Signs and verifies the feed's cursor so it is opaque in fact, not only by
 * convention: a sequence number alone is a dense, guessable integer, so an
 * existence check alone would honour a hand-built cursor for any row that
 * happens to be real. The signing key is generated fresh per process and
 * held only in memory, so every issued cursor stops verifying across a
 * restart — acceptable here since nothing in this stack yet runs more than
 * one instance or persists across one.
 */
// Public, not module-internal: an integration test mints a cursor for a row
// it created directly (bypassing HTTP) the same way FeedControllerIT already
// autowires FeedLineRepository for fixture setup.
@Component
public class FeedCursorCodec {

	private static final String ALGORITHM = "HmacSHA256";

	private final SecretKeySpec key;

	FeedCursorCodec() {
		byte[] keyBytes = new byte[32];
		new SecureRandom().nextBytes(keyBytes);
		this.key = new SecretKeySpec(keyBytes, ALGORITHM);
	}

	public String encode(long sequenceNumber) {
		byte[] payload = Long.toString(sequenceNumber).getBytes(StandardCharsets.UTF_8);
		return base64(payload) + "." + base64(hmac(payload));
	}

	// A missing separator, undecodable segment, or signature that doesn't
	// match is one outcome: reject. Distinguishing them would only help an
	// attacker learn which part of their guess was wrong.
	public long decode(String cursor) {
		int separator = cursor.indexOf('.');
		if (separator < 0) {
			throw invalid();
		}
		byte[] payload;
		byte[] signature;
		try {
			payload = Base64.getUrlDecoder().decode(cursor.substring(0, separator));
			signature = Base64.getUrlDecoder().decode(cursor.substring(separator + 1));
		} catch (IllegalArgumentException e) {
			throw invalid();
		}
		if (!MessageDigest.isEqual(signature, hmac(payload))) {
			throw invalid();
		}
		try {
			return Long.parseLong(new String(payload, StandardCharsets.UTF_8));
		} catch (NumberFormatException e) {
			throw invalid();
		}
	}

	private byte[] hmac(byte[] payload) {
		try {
			Mac mac = Mac.getInstance(ALGORITHM);
			mac.init(key);
			return mac.doFinal(payload);
		} catch (GeneralSecurityException e) {
			// HmacSHA256 and this key are both always valid for Mac.init.
			throw new IllegalStateException(e);
		}
	}

	private static String base64(byte[] bytes) {
		return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
	}

	private static InvalidFeedCursorException invalid() {
		return new InvalidFeedCursorException("Malformed cursor");
	}

}
