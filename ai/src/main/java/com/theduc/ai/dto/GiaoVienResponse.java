package com.theduc.ai.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;

import com.fasterxml.jackson.annotation.JsonInclude;

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
@JsonInclude(JsonInclude.Include.NON_NULL)
public class GiaoVienResponse {

	private Long id;
	private String hoTen;
	private LocalDate ngaySinh;
	private String email;
	private String soDienThoai;
	private GioiTinh gioiTinh;
	private boolean daCoMatKhau;
	private String matKhauTamThoi;
	private LocalDateTime ngayTao;
	private Long nguoiTaoId;
	private LocalDateTime ngayCapNhat;
	private Long nguoiCapNhatId;
}
