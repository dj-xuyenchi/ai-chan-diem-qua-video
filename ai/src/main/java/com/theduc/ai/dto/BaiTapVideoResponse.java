package com.theduc.ai.dto;

import java.time.LocalDateTime;
import java.util.List;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class BaiTapVideoResponse {

	private Long id;
	private Long lopHocId;
	private String tieuDe;
	private String huongDan;
	private LocalDateTime hanNop;
	private String tenVideo;
	private String videoUrl;
	private LocalDateTime ngayTao;
	private Long giaoVienId;
	private String tenGiaoVien;
	private List<BaiNopVideoResponse> baiNop;
}
