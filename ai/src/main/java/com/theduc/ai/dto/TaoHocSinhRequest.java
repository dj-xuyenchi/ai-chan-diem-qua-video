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
public class TaoHocSinhRequest {

	private String hoTen;
	private String maSinhVien;
	private LocalDate ngaySinh;
	private String email;
	private String soDienThoai;
	private GioiTinh gioiTinh;
	private Long nguoiTaoId;
}
