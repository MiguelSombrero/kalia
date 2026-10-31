package fi.kalia.appconfig.domain;

import org.springframework.data.jpa.repository.JpaRepository;

public interface AppConfigRepository extends JpaRepository<AppConfig, Short> {

}
