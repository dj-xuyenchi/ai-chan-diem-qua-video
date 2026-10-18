package com.theduc.ai.controller;

import java.net.URI;
import java.util.List;

import lombok.RequiredArgsConstructor;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.theduc.ai.dto.CapNhatGiaoVienRequest;
import com.theduc.ai.dto.GiaoVienResponse;
import com.theduc.ai.dto.TaoGiaoVienRequest;
import com.theduc.ai.service.NguoiDungService;

@RestController
@RequestMapping("/api/giao-vien")
@RequiredArgsConstructor
@CrossOrigin(origins = {"http://localhost:3000", "http://127.0.0.1:3000"}, allowCredentials = "true")
public class GiaoVienController {

	private final NguoiDungService nguoiDungService;

	@PostMapping
	public ResponseEntity<GiaoVienResponse> tao(@RequestBody TaoGiaoVienRequest request) {
		GiaoVienResponse response = nguoiDungService.taoGiaoVien(request);
		return ResponseEntity.created(URI.create("/api/giao-vien/" + response.getId())).body(response);
	}

	@GetMapping
	public List<GiaoVienResponse> layDanhSach() {
		return nguoiDungService.layDanhSachGiaoVien();
	}

	@GetMapping("/{id}")
	public GiaoVienResponse layTheoId(@PathVariable Long id) {
		return nguoiDungService.layGiaoVienTheoId(id);
	}

	@PostMapping("/{id}/cap-nhat")
	public GiaoVienResponse capNhat(
			@PathVariable Long id,
			@RequestBody CapNhatGiaoVienRequest request) {
		return nguoiDungService.capNhatGiaoVien(id, request);
	}

	@PostMapping("/{id}/xoa")
	public ResponseEntity<Void> xoa(@PathVariable Long id) {
		nguoiDungService.xoaGiaoVien(id);
		return ResponseEntity.noContent().build();
	}
}
