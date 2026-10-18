package com.theduc.ai.dto;

import com.theduc.ai.constant.LoaiNguoiDung;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class DangNhapResponse {

	private Long id;
	private String hoTen;
	private String email;
	private LoaiNguoiDung loaiNguoiDung;
	private boolean doiMatKhauLanDau;
	private String csrfToken;
}
