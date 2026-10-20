package com.theduc.ai.dto;

import java.time.LocalDateTime;
import java.util.List;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class LopHocResponse {

	private Long id;
	private String maLop;
	private String tenLop;
	private Long giaoVienId;
	private String tenGiaoVien;
	private LocalDateTime ngayTao;
	private int soHocSinh;
	private List<HocSinhLopResponse> hocSinh;
}
