package com.theduc.ai.controller;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.List;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;

import org.springframework.core.io.Resource;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import com.theduc.ai.dto.BaiTapVideoResponse;
import com.theduc.ai.dto.AiDanhGiaResponse;
import com.theduc.ai.dto.ChamDiemRequest;
import com.theduc.ai.dto.LopHocResponse;
import com.theduc.ai.dto.TaoLopHocRequest;
import com.theduc.ai.dto.ThemHocSinhRequest;
import com.theduc.ai.service.LopHocService;
import com.theduc.ai.service.StoredVideo;

@RestController
@RequestMapping("/api/lop-hoc")
@RequiredArgsConstructor
@CrossOrigin(origins = {"http://localhost:3000", "http://127.0.0.1:3000"}, allowCredentials = "true")
public class LopHocController {

	private final LopHocService lopHocService;

	@GetMapping
	public List<LopHocResponse> layDanhSach(HttpServletRequest request) {
		HttpSession session = laySession(request);
		return lopHocService.layDanhSachLop(userId(session), userRole(session));
	}

	@PostMapping
	public ResponseEntity<LopHocResponse> tao(
			@RequestBody TaoLopHocRequest body,
			HttpServletRequest request) {
		if (!"GIAO_VIEN".equals(userRole(laySession(request)))) {
			throw forbidden();
		}
		if (body == null) {
			throw badRequest("Thông tin lớp học không hợp lệ");
		}
		return ResponseEntity.status(HttpStatus.CREATED)
				.body(lopHocService.taoLop(body.getMaLop(), body.getTenLop(), userId(laySession(request))));
	}

	@GetMapping("/{lopHocId}")
	public LopHocResponse layChiTiet(
			@PathVariable Long lopHocId,
			HttpServletRequest request) {
		HttpSession session = laySession(request);
		return lopHocService.layChiTietLop(lopHocId, userId(session), userRole(session));
	}

	@PostMapping("/{lopHocId}/hoc-sinh")
	public LopHocResponse themHocSinh(
			@PathVariable Long lopHocId,
			@RequestBody ThemHocSinhRequest body,
			HttpServletRequest request) {
		if (body == null) {
			throw badRequest("Danh sách học sinh không hợp lệ");
		}
		return lopHocService.themHocSinh(lopHocId, body.getHocSinhIds(), giaoVienId(request));
	}

	@PostMapping("/{lopHocId}/hoc-sinh/{hocSinhId}/xoa")
	public LopHocResponse xoaHocSinh(
			@PathVariable Long lopHocId,
			@PathVariable Long hocSinhId,
			HttpServletRequest request) {
		return lopHocService.xoaHocSinh(lopHocId, hocSinhId, giaoVienId(request));
	}

	@GetMapping("/{lopHocId}/bai-tap")
	public List<BaiTapVideoResponse> layBaiTap(
			@PathVariable Long lopHocId,
			HttpServletRequest request) {
		HttpSession session = laySession(request);
		return lopHocService.layBaiTap(lopHocId, userId(session), userRole(session));
	}

	@PostMapping(path = "/{lopHocId}/bai-tap", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
	public ResponseEntity<BaiTapVideoResponse> taoBaiTap(
			@PathVariable Long lopHocId,
			@RequestParam String tieuDe,
			@RequestParam(required = false) String huongDan,
			@RequestParam(required = false) String hanNop,
			@RequestParam MultipartFile video,
			HttpServletRequest request) throws IOException {
		BaiTapVideoResponse response = lopHocService.taoBaiTap(
				lopHocId, tieuDe, huongDan, hanNop, video, giaoVienId(request));
		return ResponseEntity.status(HttpStatus.CREATED).body(response);
	}

	@PostMapping(path = "/{lopHocId}/bai-tap/{baiTapId}/bai-nop", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
	public BaiTapVideoResponse nopBai(
			@PathVariable Long lopHocId,
			@PathVariable Long baiTapId,
			@RequestParam MultipartFile video,
			HttpServletRequest request) throws IOException {
		HttpSession session = laySession(request);
		if (!"HOC_SINH".equals(userRole(session))) {
			throw forbidden();
		}
		return lopHocService.nopBai(lopHocId, baiTapId, video, userId(session));
	}

	@PostMapping("/{lopHocId}/bai-tap/{baiTapId}/bai-nop/{baiNopId}/cham-diem")
	public BaiTapVideoResponse chamDiem(
			@PathVariable Long lopHocId,
			@PathVariable Long baiTapId,
			@PathVariable Long baiNopId,
			@RequestBody ChamDiemRequest body,
			HttpServletRequest request) {
		if (!"GIAO_VIEN".equals(userRole(laySession(request)))) {
			throw forbidden();
		}
		if (body == null) {
			throw badRequest("Thông tin chấm điểm không hợp lệ");
		}
		return lopHocService.chamDiem(
				lopHocId, baiTapId, baiNopId, body.getDiem(), body.getNhanXet(), giaoVienId(request));
	}

	@PostMapping("/{lopHocId}/bai-tap/{baiTapId}/bai-nop/{baiNopId}/ai-danh-gia")
	public AiDanhGiaResponse danhGiaVideo(
			@PathVariable Long lopHocId,
			@PathVariable Long baiTapId,
			@PathVariable Long baiNopId,
			HttpServletRequest request) {
		return lopHocService.danhGiaVideo(lopHocId, baiTapId, baiNopId, giaoVienId(request));
	}

	@GetMapping("/{lopHocId}/bai-tap/{baiTapId}/video")
	public ResponseEntity<Resource> xemVideoBaiTap(
			@PathVariable Long lopHocId,
			@PathVariable Long baiTapId,
			HttpServletRequest request) throws IOException {
		HttpSession session = laySession(request);
		return videoResponse(lopHocService.layVideoBaiTap(
				lopHocId, baiTapId, userId(session), userRole(session)));
	}

	@GetMapping("/{lopHocId}/bai-tap/{baiTapId}/bai-nop/{baiNopId}/video")
	public ResponseEntity<Resource> xemVideoBaiNop(
			@PathVariable Long lopHocId,
			@PathVariable Long baiTapId,
			@PathVariable Long baiNopId,
			HttpServletRequest request) throws IOException {
		HttpSession session = laySession(request);
		return videoResponse(lopHocService.layVideoBaiNop(
				lopHocId, baiTapId, baiNopId, userId(session), userRole(session)));
	}

	private ResponseEntity<Resource> videoResponse(StoredVideo video) {
		MediaType mediaType;
		try {
			mediaType = MediaType.parseMediaType(video.contentType());
			if (!"video".equalsIgnoreCase(mediaType.getType())) {
				throw badRequest("Tệp video không hợp lệ");
			}
		} catch (IllegalArgumentException exception) {
			throw badRequest("Định dạng video không hợp lệ");
		}
		HttpHeaders headers = new HttpHeaders();
		headers.setContentType(mediaType);
		headers.setContentDisposition(ContentDisposition.inline()
				.filename(video.fileName(), StandardCharsets.UTF_8)
				.build());
		headers.set("X-Content-Type-Options", "nosniff");
		headers.setCacheControl("private, no-store");
		return ResponseEntity.ok().headers(headers).body(video.resource());
	}

	private Long giaoVienId(HttpServletRequest request) {
		HttpSession session = laySession(request);
		if (!"GIAO_VIEN".equals(userRole(session))) {
			throw forbidden();
		}
		return userId(session);
	}

	private HttpSession laySession(HttpServletRequest request) {
		HttpSession session = request.getSession(false);
		if (session == null || !(session.getAttribute(AuthController.SESSION_USER_ID) instanceof Long)) {
			throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Chưa đăng nhập");
		}
		return session;
	}

	private Long userId(HttpSession session) {
		return (Long) session.getAttribute(AuthController.SESSION_USER_ID);
	}

	private String userRole(HttpSession session) {
		return (String) session.getAttribute(AuthController.SESSION_USER_ROLE);
	}

	private ResponseStatusException forbidden() {
		return new ResponseStatusException(HttpStatus.FORBIDDEN, "Bạn không có quyền thực hiện thao tác này");
	}

	private ResponseStatusException badRequest(String message) {
		return new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
	}
}
