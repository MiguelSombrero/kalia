package archfixture.codingrules;

import java.util.logging.Logger;

/** Violates {@code noJavaUtilLogging}. */
public class JavaUtilLoggingUser {

	private static final Logger LOG = Logger.getLogger(JavaUtilLoggingUser.class.getName());

	public void log() {
		LOG.info("logged through the wrong facade");
	}

}
