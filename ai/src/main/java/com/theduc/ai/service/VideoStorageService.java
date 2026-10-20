package com.theduc.ai.service;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

@Service
public class VideoStorageService {

	private final Path root;

	public VideoStorageService(@Value("${app.video.storage-dir:data/videos}") String storageDirectory)
			throws IOException {
		root = Path.of(storageDirectory).toAbsolutePath().normalize();
		Files.createDirectories(root);
	}

	public String store(MultipartFile video) throws IOException {
		String fileName = UUID.randomUUID().toString() + ".video";
		Path destination = resolvePath(fileName);
		try (var input = video.getInputStream()) {
			Files.copy(input, destination);
		}
		return fileName;
	}

	public Resource load(String fileName) throws IOException {
		Path path = resolvePath(fileName);
		if (!Files.isRegularFile(path)) {
			throw new IOException("Không tìm thấy tệp video");
		}
		return new FileSystemResource(path);
	}

	public void delete(String fileName) throws IOException {
		Files.deleteIfExists(resolvePath(fileName));
	}

	public Path resolvePath(String fileName) {
		Path path = root.resolve(fileName).normalize();
		if (!path.startsWith(root)) {
			throw new IllegalArgumentException("Đường dẫn video không hợp lệ");
		}
		return path;
	}
}
