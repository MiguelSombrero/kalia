package fi.kalia;

import org.springframework.boot.SpringApplication;

public class TestKaliaApplication {

	public static void main(String[] args) {
		SpringApplication.from(KaliaApplication::main).with(TestcontainersConfiguration.class).run(args);
	}

}
