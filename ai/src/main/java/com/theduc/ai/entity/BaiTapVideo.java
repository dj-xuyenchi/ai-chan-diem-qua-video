package com.theduc.ai.entity;

import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "bai_tap_video")
@Getter
@Setter
@NoArgsConstructor
public class BaiTapVideo {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(name = "lop_hoc_id", nullable = false)
	private Long lopHocId;

	@Column(nullable = false, length = 150)
	private String tieuDe;

	@Column(columnDefinition = "text")
	private String huongDan;

	@Column(name = "han_nop")
	private LocalDateTime hanNop;

	@Column(name = "video_path", nullable = false, length = 500)
	private String videoPath;

	@Column(name = "ten_video", nullable = false, length = 255)
	private String tenVideo;

	@Column(name = "loai_video", nullable = false, length = 100)
	private String loaiVideo;

	@Column(name = "kich_thuoc_video", nullable = false)
	private long kichThuocVideo;

	@Column(name = "giao_vien_id", nullable = false)
	private Long giaoVienId;

	@Column(name = "ngay_tao", nullable = false, updatable = false)
	private LocalDateTime ngayTao;

	@PrePersist
	void truocKhiTao() {
		ngayTao = LocalDateTime.now();
	}
}
