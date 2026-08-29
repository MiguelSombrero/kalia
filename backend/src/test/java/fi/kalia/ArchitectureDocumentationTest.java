package fi.kalia;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.modulith.core.ApplicationModules;
import org.springframework.modulith.docs.Documenter;
import org.springframework.modulith.docs.Documenter.DiagramOptions;
import org.springframework.modulith.docs.Documenter.DiagramOptions.ElementsWithoutRelationships;
import org.springframework.modulith.docs.Documenter.Options;

/**
 * Fails CI when the backend's actual module map drifts from the module set
 * and dependency edges docs/architecture.md §2/§3 describe by hand. See
 * backend/README.md "Notable suites".
 */
class ArchitectureDocumentationTest {

	private static final Path ARCHITECTURE_DOC = Path.of("..", "docs", "architecture.md");

	// ADR-0014: a module-neutral exception §2/§3 deliberately describe in
	// prose rather than as a subdomain, so it is excluded from both sides.
	private static final String EXCLUDED_MODULE = "web";

	private static final Pattern SECTION_2_HEADING = Pattern.compile("^## 2\\. High-level design$");
	private static final Pattern SECTION_3_HEADING = Pattern.compile("^## 3\\. Backend modules$");
	private static final Pattern NEXT_HEADING = Pattern.compile("^## \\d+\\.");
	private static final Pattern MERMAID_NODE = Pattern.compile("^\\s*[A-Za-z0-9_]+\\[([^]]+)]\\s*$");
	private static final Pattern SINGLE_WORD_LABEL = Pattern.compile("^[a-z]+$");
	private static final Pattern TABLE_ROW = Pattern.compile("^\\|.*\\|$");
	private static final Pattern BACKTICKED_MODULE = Pattern.compile("`([a-z]+)`");

	// Matches Documenter's own PlantUML output (see createPlantUml in
	// spring-modulith-docs), not a format Kalia controls.
	private static final Pattern PLANTUML_COMPONENT = Pattern.compile("Component\\((\\S+),\\s*\"([^\"]+)\"");
	private static final Pattern PLANTUML_REL = Pattern.compile("Rel\\((\\S+),\\s*(\\S+),");

	@Test
	void moduleSetAndDependenciesMatchArchitectureDoc(@TempDir Path outputDir) throws IOException {
		List<String> lines = Files.readAllLines(ARCHITECTURE_DOC);

		Set<String> section2Modules = parseSection2ModuleSet(lines);
		Map<String, Set<String>> section3 = parseSection3DependsOn(lines);

		String componentDiagram = generateComponentDiagram(outputDir);
		Map<String, String> componentIdsToNames = parseComponents(componentDiagram);
		Set<String> codeModules = new LinkedHashSet<>(componentIdsToNames.values());
		codeModules.remove(EXCLUDED_MODULE);
		Map<String, Set<String>> codeEdges = parseDependencyEdges(componentDiagram, componentIdsToNames);

		assertThat(section2Modules)
				.as("§2's mermaid module set vs Documenter's own module set")
				.isEqualTo(codeModules);
		assertThat(section3.keySet())
				.as("§3's table module set vs Documenter's own module set")
				.isEqualTo(codeModules);
		assertThat(section3)
				.as("§3's 'Depends on' column vs Documenter's own dependency edges")
				.isEqualTo(codeEdges);
	}

	/** Renders the same PlantUML component diagram {@code writeModulesAsPlantUml} writes for human readers. */
	private static String generateComponentDiagram(Path outputDir) throws IOException {
		ApplicationModules modules = ApplicationModules.of(KaliaApplication.class);
		Documenter documenter = new Documenter(modules, Options.defaults().withOutputFolder(outputDir.toString()));
		// VISIBLE so an isolated module (like fi.kalia.web, with no dependency
		// edges) still yields a Component() line for the EXCLUDED_MODULE filter
		// below to name explicitly, rather than silently vanishing from the
		// diagram on its own.
		documenter.writeModulesAsPlantUml(
				DiagramOptions.defaults().withElementsWithoutRelationships(ElementsWithoutRelationships.VISIBLE));
		return Files.readString(outputDir.resolve("components.puml"));
	}

	private static Map<String, String> parseComponents(String componentDiagram) {
		Map<String, String> idsToNames = new LinkedHashMap<>();
		Matcher matcher = PLANTUML_COMPONENT.matcher(componentDiagram);
		while (matcher.find()) {
			idsToNames.put(matcher.group(1), matcher.group(2).toLowerCase());
		}
		if (idsToNames.isEmpty()) {
			throw new AssertionError("Documenter's component diagram listed no modules");
		}
		return idsToNames;
	}

	private static Map<String, Set<String>> parseDependencyEdges(String componentDiagram,
			Map<String, String> componentIdsToNames) {
		Map<String, Set<String>> edges = new LinkedHashMap<>();
		componentIdsToNames.values().forEach(name -> {
			if (!name.equals(EXCLUDED_MODULE)) {
				edges.put(name, new LinkedHashSet<>());
			}
		});

		Matcher matcher = PLANTUML_REL.matcher(componentDiagram);
		while (matcher.find()) {
			String source = componentIdsToNames.get(matcher.group(1));
			String target = componentIdsToNames.get(matcher.group(2));
			if (!source.equals(EXCLUDED_MODULE) && !target.equals(EXCLUDED_MODULE)) {
				edges.get(source).add(target);
			}
		}
		return edges;
	}

	private static Set<String> parseSection2ModuleSet(List<String> lines) {
		int headingLine = indexMatching(lines, 0, SECTION_2_HEADING::matcher,
				"§2 heading ('## 2. High-level design')");
		int sectionEnd = indexOfNextHeading(lines, headingLine + 1);

		int mermaidStart = indexOfLine(lines, headingLine + 1, sectionEnd, "```mermaid",
				"§2's ```mermaid code block");
		int mermaidEnd = indexOfLine(lines, mermaidStart + 1, sectionEnd, "```",
				"the closing ``` of §2's mermaid code block");

		List<String> mermaid = lines.subList(mermaidStart + 1, mermaidEnd);
		int subgraphStart = indexOfLinePrefix(mermaid, 0, "subgraph Backend", "§2's Backend subgraph");
		int subgraphEnd = indexOfLine(mermaid, subgraphStart + 1, mermaid.size(), "end",
				"the closing 'end' of §2's Backend subgraph");

		Set<String> moduleNames = new LinkedHashSet<>();
		for (String line : mermaid.subList(subgraphStart + 1, subgraphEnd)) {
			Matcher matcher = MERMAID_NODE.matcher(line);
			if (matcher.matches() && SINGLE_WORD_LABEL.matcher(matcher.group(1)).matches()) {
				moduleNames.add(matcher.group(1));
			}
		}
		return moduleNames;
	}

	private static Map<String, Set<String>> parseSection3DependsOn(List<String> lines) {
		int headingLine = indexMatching(lines, 0, SECTION_3_HEADING::matcher,
				"§3 heading ('## 3. Backend modules')");
		int sectionEnd = indexOfNextHeading(lines, headingLine + 1);

		int headerRow = indexOfLinePrefix(lines, headingLine + 1, sectionEnd, "| Module |",
				"§3's 'Module' table header");
		int separatorRow = headerRow + 1;
		if (separatorRow >= sectionEnd || !TABLE_ROW.matcher(lines.get(separatorRow)).matches()) {
			throw new AssertionError("Could not find §3's table header separator row in " + ARCHITECTURE_DOC);
		}

		Map<String, Set<String>> dependsOn = new LinkedHashMap<>();
		for (int i = separatorRow + 1; i < sectionEnd && TABLE_ROW.matcher(lines.get(i)).matches(); i++) {
			String[] cells = lines.get(i).split("\\|", -1);
			String module = cells[1].strip().replace("`", "");
			String dependsOnCell = cells[cells.length - 2];

			Set<String> dependencies = new LinkedHashSet<>();
			Matcher matcher = BACKTICKED_MODULE.matcher(dependsOnCell);
			while (matcher.find()) {
				dependencies.add(matcher.group(1));
			}
			dependsOn.put(module, dependencies);
		}
		if (dependsOn.isEmpty()) {
			throw new AssertionError("Could not find any rows in §3's table in " + ARCHITECTURE_DOC);
		}
		return dependsOn;
	}

	private static int indexOfNextHeading(List<String> lines, int from) {
		for (int i = from; i < lines.size(); i++) {
			if (NEXT_HEADING.matcher(lines.get(i)).find()) {
				return i;
			}
		}
		return lines.size();
	}

	private static int indexMatching(List<String> lines, int from,
			Function<String, Matcher> matcherFactory, String description) {
		for (int i = from; i < lines.size(); i++) {
			if (matcherFactory.apply(lines.get(i)).matches()) {
				return i;
			}
		}
		throw new AssertionError("Could not find " + description + " in " + ARCHITECTURE_DOC);
	}

	private static int indexOfLine(List<String> lines, int from, int to, String exact, String description) {
		for (int i = from; i < to; i++) {
			if (lines.get(i).strip().equals(exact)) {
				return i;
			}
		}
		throw new AssertionError("Could not find " + description + " in " + ARCHITECTURE_DOC);
	}

	private static int indexOfLinePrefix(List<String> lines, int from, int to, String prefix, String description) {
		for (int i = from; i < to; i++) {
			if (lines.get(i).strip().startsWith(prefix)) {
				return i;
			}
		}
		throw new AssertionError("Could not find " + description + " in " + ARCHITECTURE_DOC);
	}

	private static int indexOfLinePrefix(List<String> lines, int from, String prefix, String description) {
		return indexOfLinePrefix(lines, from, lines.size(), prefix, description);
	}

}
