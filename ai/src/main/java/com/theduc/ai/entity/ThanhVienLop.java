package com.theduc.ai.entity;

import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "thanh_vien_lop", uniqueConstraints = {
		@UniqueConstraint(name = "uk_thanh_vien_lop", columnNames = {"lop_hoc_id", "hoc_sinh_id"})
})
@Getter
@Setter
@NoArgsConstructor
public class ThanhVienLop {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(name = "lop_hoc_id", nullable = false)
	private Long lopHocId;

	@Column(name = "hoc_sinh_id", nullable = false)
	private Long hocSinhId;

	@Column(name = "ngay_tham_gia", nullable = false)
	private LocalDateTime ngayThamGia = LocalDateTime.now();

	public ThanhVienLop(Long lopHocId, Long hocSinhId) {
		this.lopHocId = lopHocId;
		this.hocSinhId = hocSinhId;
	}
}
