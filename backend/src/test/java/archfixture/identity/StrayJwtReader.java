package archfixture.identity;

import org.springframework.security.oauth2.jwt.Jwt;

/** Violates {@code onlyIdentityReadsTokenClaims}: a module other than identity
 * reads the bearer token's claims itself. */
public class StrayJwtReader {

	String username(Jwt jwt) {
		return jwt.getClaimAsString("preferred_username");
	}

}
