package com.theduc.ai.entity;

import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "lop_hoc")
@Getter
@Setter
@NoArgsConstructor
public class LopHoc {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(name = "ma_lop", nullable = false, unique = true, length = 50)
	private String maLop;

	@Column(name = "ten_lop", nullable = false, length = 150)
	private String tenLop;

	@Column(name = "giao_vien_id", nullable = false)
	private Long giaoVienId;

	@Column(name = "ngay_tao", nullable = false, updatable = false)
	private LocalDateTime ngayTao;

	@Column(name = "ngay_cap_nhat", nullable = false)
	private LocalDateTime ngayCapNhat;

	public LopHoc(String maLop, String tenLop, Long giaoVienId) {
		this.maLop = maLop;
		this.tenLop = tenLop;
		this.giaoVienId = giaoVienId;
	}

	@PrePersist
	void truocKhiTao() {
		LocalDateTime now = LocalDateTime.now();
		ngayTao = now;
		ngayCapNhat = now;
	}

	@PreUpdate
	void truocKhiCapNhat() {
		ngayCapNhat = LocalDateTime.now();
	}
}
