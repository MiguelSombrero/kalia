package fi.kalia.feed.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.nio.charset.StandardCharsets;
import java.util.Base64;
import org.junit.jupiter.api.Test;

class FeedCursorCodecTest {

	static final String KEY = "0123456789abcdef0123456789abcdef";

	@Test
	void acceptsACursorSignedByAnotherCodecBuiltFromTheSameKey() {
		String issuedBeforeRestart = new FeedCursorCodec(KEY).encode(42);

		assertThat(new FeedCursorCodec(KEY).decode(issuedBeforeRestart)).isEqualTo(42);
	}

	@Test
	void rejectsACursorSignedWithAnotherKey() {
		String foreign = new FeedCursorCodec("fedcba9876543210fedcba9876543210").encode(42);

		assertThatThrownBy(() -> new FeedCursorCodec(KEY).decode(foreign))
				.isInstanceOf(InvalidFeedCursorException.class);
	}

	@Test
	void rejectsATamperedPayloadUnderTheRightKey() {
		FeedCursorCodec codec = new FeedCursorCodec(KEY);
		String signed = codec.encode(42);
		String signature = signed.substring(signed.indexOf('.'));
		String forgedPayload = Base64.getUrlEncoder().withoutPadding()
				.encodeToString("43".getBytes(StandardCharsets.UTF_8));
		String forged = forgedPayload + signature;

		assertThatThrownBy(() -> codec.decode(forged)).isInstanceOf(InvalidFeedCursorException.class);
	}

	@Test
	void refusesAKeyTooShortToSignWith() {
		assertThatThrownBy(() -> new FeedCursorCodec("too-short"))
				.isInstanceOf(IllegalArgumentException.class)
				.hasMessageContaining("kalia.feed.cursor-key");
	}

}
