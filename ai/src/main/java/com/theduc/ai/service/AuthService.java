package com.theduc.ai.service;

import java.util.Locale;

import lombok.RequiredArgsConstructor;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import com.theduc.ai.entity.NguoiDung;
import com.theduc.ai.repository.NguoiDungRepository;
import com.theduc.ai.util.MatKhauUtil;

@Service
@RequiredArgsConstructor
public class AuthService {

	private final NguoiDungRepository nguoiDungRepository;

	@Transactional(readOnly = true)
	public NguoiDung dangNhap(String email, String matKhau) {
		if (email == null || email.isBlank() || matKhau == null) {
			MatKhauUtil.xacMinh(matKhau == null ? "" : matKhau, null);
			throw loiDangNhap();
		}

		NguoiDung nguoiDung = nguoiDungRepository.findByEmail(email.trim().toLowerCase(Locale.ROOT))
				.orElse(null);
		String hashLuuTru = nguoiDung == null ? null : nguoiDung.getMatKhauHash();
		if (!MatKhauUtil.xacMinh(matKhau, hashLuuTru)) {
			throw loiDangNhap();
		}
		return nguoiDung;
	}

	@Transactional(readOnly = true)
	public NguoiDung layTheoId(Long id) {
		return nguoiDungRepository.findById(id)
				.orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Phiên đăng nhập không hợp lệ"));
	}

	@Transactional
	public void doiMatKhau(Long id, String matKhauMoi) {
		if (matKhauMoi == null || matKhauMoi.length() < 12 || matKhauMoi.length() > 128) {
			throw new ResponseStatusException(
					HttpStatus.BAD_REQUEST, "Mật khẩu mới phải dài từ 12 đến 128 ký tự");
		}
		NguoiDung nguoiDung = layTheoId(id);
		nguoiDung.setMatKhauHash(MatKhauUtil.bam(matKhauMoi));
		nguoiDung.setDoiMatKhauLanDau(false);
		nguoiDungRepository.save(nguoiDung);
	}

	private ResponseStatusException loiDangNhap() {
		return new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Email hoặc mật khẩu không đúng");
	}
}
