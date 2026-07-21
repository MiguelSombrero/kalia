package fi.kalia;

import org.junit.jupiter.api.Test;
import org.springframework.modulith.core.ApplicationModules;

class ModularityTest {

	@Test
	void verifiesModuleStructure() {
		ApplicationModules.of(KaliaApplication.class).verify();
	}

}
