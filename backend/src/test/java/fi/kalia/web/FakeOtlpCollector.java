package fi.kalia.web;

import com.sun.net.httpserver.HttpServer;
import java.io.IOException;
import java.net.InetAddress;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;

/** An OTLP/HTTP receiver that keeps what it is sent, for the telemetry tests. */
final class FakeOtlpCollector implements AutoCloseable {

	record Export(String path, String contentType, byte[] body) {

		/** The payload as text: protobuf strings are plain UTF-8, so a value sent is a substring. */
		String bodyText() {
			return new String(body, StandardCharsets.ISO_8859_1);
		}

	}

	private final HttpServer server;

	private final List<Export> exports = new CopyOnWriteArrayList<>();

	FakeOtlpCollector() throws IOException {
		server = HttpServer.create(new InetSocketAddress(InetAddress.getLoopbackAddress(), 0), 0);
		server.createContext("/", exchange -> {
			exports.add(new Export(exchange.getRequestURI().getPath(),
					exchange.getRequestHeaders().getFirst("Content-Type"),
					exchange.getRequestBody().readAllBytes()));
			exchange.getResponseHeaders().add("Content-Type", "application/x-protobuf");
			exchange.sendResponseHeaders(200, -1);
			exchange.close();
		});
		server.start();
	}

	String tracesEndpoint() {
		return "http://127.0.0.1:" + server.getAddress().getPort() + "/v1/traces";
	}

	List<Export> exports() {
		return exports;
	}

	@Override
	public void close() {
		server.stop(0);
	}

}
