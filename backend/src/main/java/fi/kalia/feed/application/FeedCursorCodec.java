package fi.kalia.feed.application;

import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.MessageDigest;
import java.util.Base64;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.util.Assert;

/**
 * Signs and verifies the feed's cursor so it is opaque in fact, not only by
 * convention: a sequence number alone is a dense, guessable integer, so an
 * existence check alone would honour a hand-built cursor for any row that
 * happens to be real. The signing key is configured, not generated (ADR-0060).
 */
// Public, not module-internal: an integration test mints a cursor for a row
// it created directly (bypassing HTTP) the same way FeedControllerIT already
// autowires FeedLineRepository for fixture setup.
@Component
public class FeedCursorCodec {

	private static final String ALGORITHM = "HmacSHA256";

	// RFC 2104 §3: a key shorter than the hash output weakens the MAC.
	private static final int MIN_KEY_BYTES = 32;

	private final SecretKeySpec key;

	FeedCursorCodec(@Value("${kalia.feed.cursor-key}") String signingKey) {
		byte[] keyBytes = signingKey.getBytes(StandardCharsets.UTF_8);
		Assert.isTrue(keyBytes.length >= MIN_KEY_BYTES,
				"kalia.feed.cursor-key (FEED_CURSOR_KEY) must be at least %d bytes".formatted(MIN_KEY_BYTES));
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
