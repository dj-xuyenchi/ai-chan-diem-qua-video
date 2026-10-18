package com.theduc.ai.dto;

import java.time.LocalDate;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import com.theduc.ai.constant.GioiTinh;

@Getter
@Setter
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class CapNhatGiaoVienRequest {

	private String hoTen;
	private LocalDate ngaySinh;
	private String email;
	private String soDienThoai;
	private String matKhau;
	private GioiTinh gioiTinh;
	private Long nguoiCapNhatId;
}
