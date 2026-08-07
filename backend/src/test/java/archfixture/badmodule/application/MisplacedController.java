package archfixture.badmodule.application;

import org.springframework.web.bind.annotation.RestController;

/** Violates {@code controllersAndAdviceLiveInWeb}: a controller outside {@code web}. */
@RestController
public class MisplacedController {

}
