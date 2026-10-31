package fi.kalia.appconfig.application;

import fi.kalia.appconfig.domain.AppConfig;
import fi.kalia.appconfig.domain.AppConfigRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AppConfigService {

	private final AppConfigRepository configs;

	public AppConfig current() {
		return configs.findById(AppConfig.ID)
				.orElseThrow(() -> new IllegalStateException("the app_config row is missing"));
	}

}
