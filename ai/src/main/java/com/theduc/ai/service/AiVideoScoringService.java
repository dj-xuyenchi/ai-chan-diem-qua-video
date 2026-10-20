package com.theduc.ai.service;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.util.List;

import tools.jackson.databind.ObjectMapper;
import com.theduc.ai.dto.AiDanhGiaResponse;

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
		Path scriptPath = resolveScriptPath();
		if (!Files.isRegularFile(scriptPath)) {
			throw serviceUnavailable("Không tìm thấy mvp_scoring.py tại " + scriptPath);
		}

		Path outputFile = null;
		Process process = null;
		try {
			Path reference = videoStorageService.resolvePath(referenceVideoPath);
			Path submission = videoStorageService.resolvePath(submissionVideoPath);
			if (!Files.isRegularFile(reference) || !Files.isRegularFile(submission)) {
				throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy video để phân tích");
			}

			outputFile = Files.createTempFile("video-score-", ".log");
			ProcessBuilder processBuilder = new ProcessBuilder(
					pythonExecutable,
					scriptPath.toString(),
					"--reference",
					reference.toString(),
					"--submission",
					submission.toString());
			processBuilder.redirectErrorStream(true);
			processBuilder.redirectOutput(outputFile.toFile());
			processBuilder.directory(scriptPath.getParent().toFile());
			process = processBuilder.start();

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

			for (int index = output.size() - 1; index >= 0; index--) {
				String line = output.get(index).trim();
				if (line.startsWith("{") && line.endsWith("}")) {
					return objectMapper.readValue(line, AiDanhGiaResponse.class);
				}
			}
			throw serviceUnavailable("AI không trả về kết quả phân tích hợp lệ");
		} catch (IOException exception) {
			throw serviceUnavailable("Không chạy được AI video. Kiểm tra Python và requirements-ai.txt");
		} catch (InterruptedException exception) {
			Thread.currentThread().interrupt();
			throw serviceUnavailable("Yêu cầu phân tích video đã bị gián đoạn");
		} finally {
			if (process != null && process.isAlive()) {
				process.destroyForcibly();
			}
			if (outputFile != null) {
				try {
					Files.deleteIfExists(outputFile);
				} catch (IOException exception) {
					LOGGER.log(System.Logger.Level.WARNING, "Không xóa được tệp log tạm của AI video", exception);
				}
			}
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
