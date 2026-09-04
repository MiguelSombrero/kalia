package fi.kalia.profile.web;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.BDDMockito.given;

import com.jayway.jsonpath.JsonPath;
import fi.kalia.TestTokens;
import fi.kalia.TestcontainersConfiguration;
import fi.kalia.profile.domain.ProfileRepository;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.resttestclient.autoconfigure.AutoConfigureRestTestClient;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.client.RestTestClient;

@Import(TestcontainersConfiguration.class)
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureRestTestClient
class ProfileApiIT {

	private static final String USER_A = "Bearer user-a-token";

	private static final String USER_B = "Bearer user-b-token";

	@Autowired
	private RestTestClient client;

	@Autowired
	private ProfileRepository profiles;

	@MockitoBean
	private JwtDecoder jwtDecoder;

	private UUID userAId;

	private UUID userBId;

	@BeforeEach
	void setUp() {
		userAId = UUID.randomUUID();
		userBId = UUID.randomUUID();
		given(jwtDecoder.decode("user-a-token")).willReturn(TestTokens.user(userAId.toString(), "user-a"));
		given(jwtDecoder.decode("user-b-token")).willReturn(TestTokens.user(userBId.toString(), "user-b"));
	}

	@Test
	void changesTheCallersOwnVisibility() {
		changeVisibility(USER_A, true)
				.expectStatus().isOk()
				.expectBody(String.class)
				.value(body -> {
					assertThat((String) JsonPath.read(body, "$.username")).isEqualTo("user-a");
					assertThat((boolean) JsonPath.read(body, "$.cellarPublic")).isTrue();
				});

		assertThat(profiles.findById(userAId).orElseThrow().isCellarPublic()).isTrue();
	}

	@Test
	void createsTheProfileLazilyOnFirstUse() {
		changeVisibility(USER_A, false).expectStatus().isOk();

		assertThat(profiles.findById(userAId)).isPresent();
	}

	// Proves there is no path — a body field or otherwise — that lets a
	// caller change anyone's visibility but their own. Confirmed to fail
	// against an implementation that trusts a caller-supplied id instead of
	// always resolving the caller from the bearer token.
	@Test
	void cannotAffectAnotherUsersVisibility() {
		changeVisibility(USER_A, true).expectStatus().isOk();

		changeVisibility(USER_B, false).expectStatus().isOk();

		assertThat(profiles.findById(userAId).orElseThrow().isCellarPublic()).isTrue();
		assertThat(profiles.findById(userBId).orElseThrow().isCellarPublic()).isFalse();
	}

	@Test
	void aClientSuppliedUserIdInTheVisibilityRequestIsIgnored() {
		Map<String, Object> request = new LinkedHashMap<>();
		request.put("userId", userBId.toString());
		request.put("cellarPublic", true);

		client.method(HttpMethod.PATCH).uri("/api/v1/profile/visibility")
				.header("Authorization", USER_A)
				.contentType(MediaType.APPLICATION_JSON)
				.body(request)
				.exchange()
				.expectStatus().isOk();

		assertThat(profiles.findById(userAId).orElseThrow().isCellarPublic()).isTrue();
		assertThat(profiles.findById(userBId)).isEmpty();
	}

	@Test
	void anUnauthenticatedRequestIsRejected() {
		client.method(HttpMethod.PATCH).uri("/api/v1/profile/visibility")
				.contentType(MediaType.APPLICATION_JSON)
				.body(Map.of("cellarPublic", true))
				.exchange()
				.expectStatus().isUnauthorized();
	}

	@Test
	void readsTheCallersOwnProfileReflectingAPriorVisibilityChange() {
		changeVisibility(USER_A, true).expectStatus().isOk();

		readProfile(USER_A)
				.expectStatus().isOk()
				.expectBody(String.class)
				.value(body -> {
					assertThat((String) JsonPath.read(body, "$.username")).isEqualTo("user-a");
					assertThat((boolean) JsonPath.read(body, "$.cellarPublic")).isTrue();
				});
	}

	@Test
	void readingTheProfileCreatesItLazilyDefaultingToPrivate() {
		assertThat(profiles.findById(userAId)).isEmpty();

		readProfile(USER_A)
				.expectStatus().isOk()
				.expectBody(String.class)
				.value(body -> assertThat((boolean) JsonPath.read(body, "$.cellarPublic")).isFalse());

		assertThat(profiles.findById(userAId)).isPresent();
	}

	@Test
	void eachCallerReadsOnlyTheirOwnProfile() {
		changeVisibility(USER_A, true).expectStatus().isOk();

		readProfile(USER_B)
				.expectStatus().isOk()
				.expectBody(String.class)
				.value(body -> {
					assertThat((String) JsonPath.read(body, "$.username")).isEqualTo("user-b");
					assertThat((boolean) JsonPath.read(body, "$.cellarPublic")).isFalse();
				});
	}

	@Test
	void anUnauthenticatedReadIsRejected() {
		client.method(HttpMethod.GET).uri("/api/v1/profile")
				.exchange()
				.expectStatus().isUnauthorized();
	}

	private RestTestClient.ResponseSpec changeVisibility(String bearer, boolean cellarPublic) {
		return client.method(HttpMethod.PATCH).uri("/api/v1/profile/visibility")
				.header("Authorization", bearer)
				.contentType(MediaType.APPLICATION_JSON)
				.body(Map.of("cellarPublic", cellarPublic))
				.exchange();
	}

	private RestTestClient.ResponseSpec readProfile(String bearer) {
		return client.method(HttpMethod.GET).uri("/api/v1/profile")
				.header("Authorization", bearer)
				.exchange();
	}

}
