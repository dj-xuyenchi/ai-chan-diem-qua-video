package com.theduc.ai.controller;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.Base64;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import com.theduc.ai.dto.DangNhapRequest;
import com.theduc.ai.dto.DangNhapResponse;
import com.theduc.ai.dto.DoiMatKhauRequest;
import com.theduc.ai.entity.NguoiDung;
import com.theduc.ai.service.AuthService;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@CrossOrigin(origins = {"http://localhost:3000", "http://127.0.0.1:3000"}, allowCredentials = "true")
public class AuthController {

	public static final String SESSION_USER_ID = "authUserId";
	public static final String SESSION_CSRF_TOKEN = "csrfToken";
	public static final String SESSION_MUST_CHANGE_PASSWORD = "mustChangePassword";
	public static final String SESSION_USER_ROLE = "authUserRole";
	private static final SecureRandom SECURE_RANDOM = new SecureRandom();

	private final AuthService authService;

	@PostMapping("/dang-nhap")
	public DangNhapResponse dangNhap(@RequestBody DangNhapRequest request, HttpServletRequest httpRequest) {
		if (request == null) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Thông tin đăng nhập không hợp lệ");
		}
		NguoiDung nguoiDung = authService.dangNhap(request.getEmail(), request.getMatKhau());
		HttpSession oldSession = httpRequest.getSession(false);
		if (oldSession != null) {
			httpRequest.changeSessionId();
		}
		HttpSession session = httpRequest.getSession(true);
		String csrfToken = taoCsrfToken();
		session.setAttribute(SESSION_USER_ID, nguoiDung.getId());
		session.setAttribute(SESSION_CSRF_TOKEN, csrfToken);
		session.setAttribute(SESSION_MUST_CHANGE_PASSWORD, nguoiDung.isDoiMatKhauLanDau());
		session.setAttribute(SESSION_USER_ROLE, nguoiDung.getLoaiNguoiDung().name());
		return taoResponse(nguoiDung, csrfToken);
	}

	@GetMapping("/hien-tai")
	public DangNhapResponse hienTai(HttpServletRequest request) {
		HttpSession session = request.getSession(false);
		if (session == null || !(session.getAttribute(SESSION_USER_ID) instanceof Long userId)) {
			throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Chưa đăng nhập");
		}
		NguoiDung nguoiDung = authService.layTheoId(userId);
		return taoResponse(nguoiDung, (String) session.getAttribute(SESSION_CSRF_TOKEN));
	}

	@PostMapping("/doi-mat-khau")
	public DangNhapResponse doiMatKhau(
			@RequestBody DoiMatKhauRequest request,
			HttpServletRequest httpRequest,
			@RequestHeader(name = "X-CSRF-TOKEN", required = false) String csrfToken) {
		HttpSession session = laySessionVaKiemTraCsrf(httpRequest, csrfToken);
		if (request == null) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Mật khẩu mới không hợp lệ");
		}
		Long userId = (Long) session.getAttribute(SESSION_USER_ID);
		authService.doiMatKhau(userId, request.getMatKhauMoi());
		session.setAttribute(SESSION_MUST_CHANGE_PASSWORD, false);
		return taoResponse(authService.layTheoId(userId), (String) session.getAttribute(SESSION_CSRF_TOKEN));
	}

	@PostMapping("/dang-xuat")
	public ResponseEntity<Void> dangXuat(
			HttpServletRequest request,
			@RequestHeader(name = "X-CSRF-TOKEN", required = false) String csrfToken) {
		HttpSession session = laySessionVaKiemTraCsrf(request, csrfToken);
		session.invalidate();
		return ResponseEntity.noContent().build();
	}

	private HttpSession laySessionVaKiemTraCsrf(HttpServletRequest request, String csrfToken) {
		HttpSession session = request.getSession(false);
		if (session == null || !(session.getAttribute(SESSION_USER_ID) instanceof Long)) {
			throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Chưa đăng nhập");
		}
		String expectedToken = (String) session.getAttribute(SESSION_CSRF_TOKEN);
		if (csrfToken == null || expectedToken == null
				|| !MessageDigest.isEqual(
						expectedToken.getBytes(StandardCharsets.UTF_8),
						csrfToken.getBytes(StandardCharsets.UTF_8))) {
			throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Yêu cầu không hợp lệ");
		}
		return session;
	}

	private DangNhapResponse taoResponse(NguoiDung nguoiDung, String csrfToken) {
		return DangNhapResponse.builder()
				.id(nguoiDung.getId())
				.hoTen(nguoiDung.getHoTen())
				.email(nguoiDung.getEmail())
				.loaiNguoiDung(nguoiDung.getLoaiNguoiDung())
				.doiMatKhauLanDau(nguoiDung.isDoiMatKhauLanDau())
				.csrfToken(csrfToken)
				.build();
	}

	private String taoCsrfToken() {
		byte[] token = new byte[32];
		SECURE_RANDOM.nextBytes(token);
		return Base64.getUrlEncoder().withoutPadding().encodeToString(token);
	}
}
