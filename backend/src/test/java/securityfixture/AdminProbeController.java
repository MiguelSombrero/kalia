package securityfixture;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * An endpoint under the admin prefix with no rule of its own, for AdminAccessIT.
 * Outside {@code fi.kalia} so no other test's context scans it into the spec.
 */
@RestController
@RequestMapping("/api/v1/admin/probe")
public class AdminProbeController {

	@GetMapping
	String probe() {
		return "reached";
	}

}
