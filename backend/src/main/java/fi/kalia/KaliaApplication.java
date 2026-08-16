package fi.kalia;

import io.swagger.v3.oas.annotations.enums.SecuritySchemeType;
import io.swagger.v3.oas.annotations.security.OAuthFlow;
import io.swagger.v3.oas.annotations.security.OAuthFlows;
import io.swagger.v3.oas.annotations.security.OAuthScope;
import io.swagger.v3.oas.annotations.security.SecurityScheme;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

// Drives Swagger UI's Authorize button: Authorization Code + PKCE against
// Keycloak's kalia-swagger client, independent of the resource-server
// validation in identity.web.SecurityConfig (ADR-0028).
@SpringBootApplication
@SecurityScheme(name = "oauth2", type = SecuritySchemeType.OAUTH2,
		flows = @OAuthFlows(authorizationCode = @OAuthFlow(
				authorizationUrl = "${kalia.auth.swagger-authorization-url}",
				tokenUrl = "${kalia.auth.swagger-token-url}",
				scopes = @OAuthScope(name = "openid", description = "OpenID Connect sign-in"))))
public class KaliaApplication {

	public static void main(String[] args) {
		RequiredConfigurationValidator.verify(System::getenv);
		SpringApplication.run(KaliaApplication.class, args);
	}

}
