package fi.kalia;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class KaliaApplication {

	public static void main(String[] args) {
		RequiredConfigurationValidator.verify(System::getenv);
		SpringApplication.run(KaliaApplication.class, args);
	}

}
