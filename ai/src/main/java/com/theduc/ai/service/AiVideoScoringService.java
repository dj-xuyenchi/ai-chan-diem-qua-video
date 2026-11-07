package com.theduc.ai.service;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;

import tools.jackson.databind.ObjectMapper;
import com.theduc.ai.dto.AiDanhGiaResponse;
import com.theduc.ai.dto.ReferenceAnalysisResponse;
import com.theduc.ai.dto.ReferenceMovementResponse;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class AiVideoScoringService {

	private static final Duration TIMEOUT = Duration.ofMinutes(3);
	private static final System.Logger LOGGER = System.getLogger(AiVideoScoringService.class.getName());

	private final ObjectMapper objectMapper;
	private final String pythonExecutable;
	private final String configuredScriptPath;
	private final VideoStorageService videoStorageService;

	public AiVideoScoringService(
			ObjectMapper objectMapper,
			VideoStorageService videoStorageService,
			@Value("${app.ai.python-executable:python}") String pythonExecutable,
			@Value("${app.ai.script-path:../mvp_scoring.py}") String scriptPath) {
		this.objectMapper = objectMapper;
		this.videoStorageService = videoStorageService;
		this.pythonExecutable = pythonExecutable;
		this.configuredScriptPath = scriptPath;
	}

	public AiDanhGiaResponse evaluate(String referenceVideoPath, String submissionVideoPath) {
		return evaluate(referenceVideoPath, submissionVideoPath, null);
	}

	public ReferenceAnalysisResponse analyzeReference(String referenceVideoPath) {
		return analyzeReference(referenceVideoPath, null, null);
	}

	public ReferenceAnalysisResponse analyzeReference(
			String referenceVideoPath,
			Integer movementCount,
			List<ReferenceMovementResponse> referenceMovements) {
		Path scriptPath = resolveScriptPath();
		if (!Files.isRegularFile(scriptPath)) {
			throw serviceUnavailable("Không tìm thấy mvp_scoring.py tại " + scriptPath);
		}

		Path outputFile = null;
		Path movementsFile = null;
		Process process = null;
		try {
			Path reference = videoStorageService.resolvePath(referenceVideoPath);
			if (!Files.isRegularFile(reference)) {
				throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy video mẫu để phân tích");
			}

			outputFile = Files.createTempFile("video-reference-analysis-", ".log");
			List<String> arguments = new ArrayList<>(List.of(
					referenceMovements == null ? "--analyze-reference" : "--confirm-reference",
					"--reference",
					reference.toString()));
			if (movementCount != null) {
				arguments.add("--movement-count");
				arguments.add(movementCount.toString());
			}
			if (referenceMovements != null) {
				movementsFile = writeMovementsFile(referenceMovements);
				arguments.add("--reference-movements-file");
				arguments.add(movementsFile.toString());
			}
			process = startProcess(scriptPath, outputFile, arguments);
			return parseOutput(awaitOutput(process, outputFile), ReferenceAnalysisResponse.class);
		} catch (IOException exception) {
			throw serviceUnavailable("Không chạy được AI video. Kiểm tra Python và requirements-ai.txt");
		} catch (InterruptedException exception) {
			Thread.currentThread().interrupt();
			throw serviceUnavailable("Yêu cầu phân tích video mẫu đã bị gián đoạn");
		} finally {
			destroyProcess(process);
			deleteOutput(outputFile);
			deleteOutput(movementsFile);
		}
	}

	public AiDanhGiaResponse evaluate(
			String referenceVideoPath,
			String submissionVideoPath,
			List<ReferenceMovementResponse> referenceMovements) {
		return evaluate(referenceVideoPath, submissionVideoPath, referenceMovements, 70);
	}

	public AiDanhGiaResponse evaluate(
			String referenceVideoPath,
			String submissionVideoPath,
			List<ReferenceMovementResponse> referenceMovements,
			int passThreshold) {
		Path scriptPath = resolveScriptPath();
		if (!Files.isRegularFile(scriptPath)) {
			throw serviceUnavailable("Không tìm thấy mvp_scoring.py tại " + scriptPath);
		}

		Path outputFile = null;
		Path movementsFile = null;
		Process process = null;
		try {
			Path reference = videoStorageService.resolvePath(referenceVideoPath);
			Path submission = videoStorageService.resolvePath(submissionVideoPath);
			if (!Files.isRegularFile(reference) || !Files.isRegularFile(submission)) {
				throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy video để phân tích");
			}

			outputFile = Files.createTempFile("video-score-", ".log");
			List<String> arguments = new ArrayList<>(List.of(
					"--reference",
					reference.toString(),
					"--submission",
					submission.toString(),
					"--pass-threshold",
					Integer.toString(passThreshold)));
			if (referenceMovements != null && !referenceMovements.isEmpty()) {
				movementsFile = writeMovementsFile(referenceMovements);
				arguments.add("--reference-movements-file");
				arguments.add(movementsFile.toString());
			}
			process = startProcess(scriptPath, outputFile, arguments);
			return parseOutput(awaitOutput(process, outputFile), AiDanhGiaResponse.class);
		} catch (IOException exception) {
			throw serviceUnavailable("Không chạy được AI video. Kiểm tra Python và requirements-ai.txt");
		} catch (InterruptedException exception) {
			Thread.currentThread().interrupt();
			throw serviceUnavailable("Yêu cầu phân tích video đã bị gián đoạn");
		} finally {
			destroyProcess(process);
			deleteOutput(outputFile);
			deleteOutput(movementsFile);
		}
	}

	private Path writeMovementsFile(List<ReferenceMovementResponse> referenceMovements) throws IOException {
		Path file = Files.createTempFile("video-reference-movements-", ".json");
		try {
			Files.writeString(file, objectMapper.writeValueAsString(referenceMovements), StandardCharsets.UTF_8);
			return file;
		} catch (IOException | RuntimeException exception) {
			deleteOutput(file);
			throw exception;
		}
	}

	private Process startProcess(Path scriptPath, Path outputFile, List<String> arguments) throws IOException {
		List<String> command = new ArrayList<>(List.of(pythonExecutable, scriptPath.toString()));
		command.addAll(arguments);
		ProcessBuilder processBuilder = new ProcessBuilder(command);
		processBuilder.redirectErrorStream(true);
		processBuilder.redirectOutput(outputFile.toFile());
		processBuilder.directory(scriptPath.getParent().toFile());
		return processBuilder.start();
	}

	private List<String> awaitOutput(Process process, Path outputFile) throws IOException, InterruptedException {
		if (!process.waitFor(TIMEOUT.toSeconds(), java.util.concurrent.TimeUnit.SECONDS)) {
			process.destroyForcibly();
			throw serviceUnavailable("AI phân tích quá thời gian cho phép; vui lòng thử lại");
		}

		List<String> output = Files.readAllLines(outputFile);
		if (process.exitValue() != 0) {
			String detail = output.isEmpty() ? "" : output.get(output.size() - 1);
			if (detail.contains("ModuleNotFoundError")
					|| detail.contains("No module named")
					|| detail.contains("Python was not found")) {
				throw serviceUnavailable("Cần cài Python và các thư viện trong requirements-ai.txt");
			}
			throw new ResponseStatusException(
					HttpStatus.UNPROCESSABLE_ENTITY,
					detail.isBlank() ? "AI không thể phân tích video này" : detail);
		}
		return output;
	}

	private <T> T parseOutput(List<String> output, Class<T> responseType) throws IOException {
		for (int index = output.size() - 1; index >= 0; index--) {
			String line = output.get(index).trim();
			if (line.startsWith("{") && line.endsWith("}")) {
				return objectMapper.readValue(line, responseType);
			}
		}
		throw serviceUnavailable("AI không trả về kết quả phân tích hợp lệ");
	}

	private void destroyProcess(Process process) {
		if (process != null && process.isAlive()) {
			process.destroyForcibly();
		}
	}

	private void deleteOutput(Path outputFile) {
		if (outputFile == null) {
			return;
		}
		try {
			Files.deleteIfExists(outputFile);
		} catch (IOException exception) {
			LOGGER.log(System.Logger.Level.WARNING, "Không xóa được tệp log tạm của AI video", exception);
		}
	}

	private Path resolveScriptPath() {
		Path configured = Path.of(configuredScriptPath);
		if (configured.isAbsolute()) {
			return configured.normalize();
		}

		Path workingDirectory = Path.of(System.getProperty("user.dir")).toAbsolutePath().normalize();
		List<Path> candidates = List.of(
				workingDirectory.resolve(configured).normalize(),
				workingDirectory.resolve("mvp_scoring.py").normalize(),
				workingDirectory.resolve("..").resolve("mvp_scoring.py").normalize());
		return candidates.stream()
				.filter(Files::isRegularFile)
				.findFirst()
				.orElse(candidates.get(0));
	}

	private ResponseStatusException serviceUnavailable(String message) {
		return new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, message);
	}
}
