package archfixture.codingrules;

import org.springframework.beans.factory.annotation.Autowired;

/** Violates {@code noFieldInjection}. */
public class FieldInjected {

	@Autowired
	private Object collaborator;

	public Object collaborator() {
		return this.collaborator;
	}

}
