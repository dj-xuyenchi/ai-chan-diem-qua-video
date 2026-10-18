package com.theduc.ai.config;

import java.io.BufferedWriter;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.ArrayList;
import java.util.List;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import com.theduc.ai.entity.NguoiDung;
import com.theduc.ai.repository.NguoiDungRepository;
import com.theduc.ai.util.MatKhauUtil;

@Component
@RequiredArgsConstructor
@Slf4j
public class LegacyPasswordBootstrap implements CommandLineRunner {

	private final NguoiDungRepository nguoiDungRepository;

	@Value("${app.auth.legacy-password-export-path:}")
	private String exportPath;

	@Override
	@Transactional
	public void run(String... args) throws IOException {
		if (exportPath.isBlank()) {
			return;
		}

		Path destination = Path.of(exportPath).toAbsolutePath().normalize();
		if (Files.exists(destination)) {
			throw new IOException("Initial password export already exists; choose a new secure path.");
		}
		Path parent = destination.getParent();
		if (parent != null) {
			Files.createDirectories(parent);
		}

		List<NguoiDung> nguoiDungCu = nguoiDungRepository.findAllByMatKhauHashIsNull();
		List<ThongTinMatKhau> thongTinMatKhaus = new ArrayList<>(nguoiDungCu.size());
		for (NguoiDung nguoiDung : nguoiDungCu) {
			String matKhau = MatKhauUtil.taoMatKhauNgauNhien();
			nguoiDung.setMatKhauHash(MatKhauUtil.bam(matKhau));
			nguoiDung.setDoiMatKhauLanDau(true);
			thongTinMatKhaus.add(new ThongTinMatKhau(
					nguoiDung.getId(),
					nguoiDung.getHoTen(),
					nguoiDung.getEmail(),
					nguoiDung.getLoaiNguoiDung().name(),
					matKhau));
		}
		nguoiDungRepository.saveAllAndFlush(nguoiDungCu);

		String prefix = destination.getFileName().toString();
		if (prefix.length() < 3) {
			prefix = (prefix + "___").substring(0, 3);
		}
		Path temporaryFile = Files.createTempFile(parent, prefix, ".tmp");
		try {
			try (BufferedWriter writer = Files.newBufferedWriter(temporaryFile, StandardCharsets.UTF_8)) {
				writer.write("\uFEFFid,ho_ten,email,loai_nguoi_dung,mat_khau_tam_thoi");
				writer.newLine();
				for (ThongTinMatKhau thongTin : thongTinMatKhaus) {
					writer.write(thongTin.id() + "," + csv(thongTin.hoTen()) + "," + csv(thongTin.email())
							+ "," + thongTin.loaiNguoiDung() + "," + csv(thongTin.matKhau()));
					writer.newLine();
				}
			}
			Files.move(temporaryFile, destination, StandardCopyOption.ATOMIC_MOVE);
		} catch (IOException exception) {
			Files.deleteIfExists(temporaryFile);
			throw exception;
		}
		log.info("Generated one-time initial passwords for {} legacy accounts. Export: {}", thongTinMatKhaus.size(), destination);
	}

	private String csv(String value) {
		return "\"" + value.replace("\"", "\"\"") + "\"";
	}

	private record ThongTinMatKhau(Long id, String hoTen, String email, String loaiNguoiDung, String matKhau) {
	}
}
