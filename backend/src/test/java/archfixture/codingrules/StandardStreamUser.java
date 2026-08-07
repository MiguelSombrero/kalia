package archfixture.codingrules;

/** Violates {@code noStandardStreams}. */
public class StandardStreamUser {

	public void write() {
		System.out.println("printed instead of logged");
	}

}
