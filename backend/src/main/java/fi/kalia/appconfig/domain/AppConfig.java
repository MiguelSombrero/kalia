package fi.kalia.appconfig.domain;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.Immutable;

@Entity
@Immutable
@Table(name = "app_config", schema = "appconfig")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class AppConfig {

	public static final short ID = 1;

	@Id
	private short id;

	private int minimumBuildIos;

	private int minimumBuildAndroid;

	private boolean maintenance;

}
