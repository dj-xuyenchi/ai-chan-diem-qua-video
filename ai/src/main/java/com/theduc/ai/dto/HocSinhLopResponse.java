package com.theduc.ai.dto;

import java.time.LocalDateTime;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class HocSinhLopResponse {

	private Long id;
	private String hoTen;
	private String maSinhVien;
	private String email;
	private LocalDateTime ngayThamGia;
}
