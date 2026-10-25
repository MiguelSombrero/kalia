package fi.kalia.web;

import io.swagger.v3.oas.annotations.media.Schema;
import java.util.Map;
import org.jspecify.annotations.Nullable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;

/**
 * An RFC 9457 problem, the body of every error the API sends (ADR-0014). An
 * error kind with members of its own extends this with declared properties
 * rather than {@code setProperty}, so the OpenAPI spec and the generated
 * clients type them where they arrive: at the top level.
 */
@Schema(description = "An RFC 9457 problem: the body of every error response")
public class Problem extends ProblemDetail {

	protected Problem(HttpStatus status, @Nullable String detail) {
		super(status.value());
		setDetail(detail);
	}

	@Override
	@Schema(requiredMode = Schema.RequiredMode.REQUIRED)
	public @Nullable String getTitle() {
		return super.getTitle();
	}

	@Override
	@Schema(requiredMode = Schema.RequiredMode.REQUIRED)
	public int getStatus() {
		return super.getStatus();
	}

	/**
	 * Spring serializes this map's entries at the top level, so the spec must not
	 * show a {@code properties} member nothing sends. Declared members replace it.
	 */
	@Override
	@Schema(hidden = true)
	public @Nullable Map<String, Object> getProperties() {
		return super.getProperties();
	}

}
