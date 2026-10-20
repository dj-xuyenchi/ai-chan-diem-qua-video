package com.theduc.ai.entity;

import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Embedded;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "bai_nop_video", uniqueConstraints = {
		@UniqueConstraint(name = "uk_bai_nop_hoc_sinh", columnNames = {"bai_tap_id", "hoc_sinh_id"})
})
@Getter
@Setter
@NoArgsConstructor
public class BaiNopVideo {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(name = "bai_tap_id", nullable = false)
	private Long baiTapId;

	@Column(name = "hoc_sinh_id", nullable = false)
	private Long hocSinhId;

	@Column(name = "video_path", nullable = false, length = 500)
	private String videoPath;

	@Column(name = "ten_video", nullable = false, length = 255)
	private String tenVideo;

	@Column(name = "loai_video", nullable = false, length = 100)
	private String loaiVideo;

	@Column(name = "kich_thuoc_video", nullable = false)
	private long kichThuocVideo;

	@Column(name = "ngay_nop", nullable = false)
	private LocalDateTime ngayNop;

	@Column(name = "diem")
	private Double diem;

	@Column(name = "nhan_xet", columnDefinition = "text")
	private String nhanXet;

	@Column(name = "ngay_cham")
	private LocalDateTime ngayCham;

	@Column(name = "giao_vien_cham_id")
	private Long giaoVienChamId;

	@Embedded
	private DanhGiaAiVideo danhGiaAi;

	@Column(name = "trang_thai_ai", length = 20)
	private String trangThaiAi;

	@Column(name = "loi_danh_gia_ai", columnDefinition = "text")
	private String loiDanhGiaAi;

	@PrePersist
	void truocKhiTao() {
		ngayNop = LocalDateTime.now();
	}
}
