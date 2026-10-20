package com.theduc.ai.dto;

import java.time.LocalDateTime;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class BaiNopVideoResponse {

	private Long id;
	private Long hocSinhId;
	private String tenHocSinh;
	private String maSinhVien;
	private String tenVideo;
	private String videoUrl;
	private LocalDateTime ngayNop;
	private Double diem;
	private String nhanXet;
	private boolean baiCuaToi;
	private AiDanhGiaResponse aiDanhGia;
	private String trangThaiAi;
	private String loiDanhGiaAi;
}
