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

import com.theduc.ai.dto.CapNhatHocSinhRequest;
import com.theduc.ai.dto.HocSinhResponse;
import com.theduc.ai.dto.TaoHocSinhRequest;
import com.theduc.ai.service.NguoiDungService;

@RestController
@RequestMapping("/api/hoc-sinh")
@RequiredArgsConstructor
@CrossOrigin(origins = {"http://localhost:3000", "http://127.0.0.1:3000"}, allowCredentials = "true")
public class HocSinhController {

	private final NguoiDungService nguoiDungService;

	@PostMapping
	public ResponseEntity<HocSinhResponse> tao(@RequestBody TaoHocSinhRequest request) {
		HocSinhResponse response = nguoiDungService.taoHocSinh(request);
		return ResponseEntity.created(URI.create("/api/hoc-sinh/" + response.getId())).body(response);
	}

	@GetMapping
	public List<HocSinhResponse> layDanhSach() {
		return nguoiDungService.layDanhSachHocSinh();
	}

	@GetMapping("/{id}")
	public HocSinhResponse layTheoId(@PathVariable Long id) {
		return nguoiDungService.layHocSinhTheoId(id);
	}

	@PostMapping("/{id}/cap-nhat")
	public HocSinhResponse capNhat(
			@PathVariable Long id,
			@RequestBody CapNhatHocSinhRequest request) {
		return nguoiDungService.capNhatHocSinh(id, request);
	}

	@PostMapping("/{id}/xoa")
	public ResponseEntity<Void> xoa(@PathVariable Long id) {
		nguoiDungService.xoaHocSinh(id);
		return ResponseEntity.noContent().build();
	}
}
