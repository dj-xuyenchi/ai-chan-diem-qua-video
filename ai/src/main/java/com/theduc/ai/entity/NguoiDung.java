package com.theduc.ai.entity;

import java.time.LocalDate;
import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import com.theduc.ai.constant.GioiTinh;
import com.theduc.ai.constant.LoaiNguoiDung;

@Entity
@Table(name = "nguoi_dung")
@Getter
@Setter
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class NguoiDung {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(name = "ho_ten", nullable = false, length = 100)
	private String hoTen;

	@Column(name = "ngay_sinh", nullable = false)
	private LocalDate ngaySinh;

	@Column(nullable = false, unique = true, length = 254)
	private String email;

	@Column(name = "so_dien_thoai", length = 20)
	private String soDienThoai;

	@Column(name = "ma_sinh_vien", unique = true, length = 50)
	private String maSinhVien;

	@Column(name = "mat_khau", length = 255)
	private String matKhauHash;

	@Column(name = "doi_mat_khau_lan_dau", nullable = false, columnDefinition = "boolean default true")
	private boolean doiMatKhauLanDau = true;

	@Enumerated(EnumType.STRING)
	@Column(name = "gioi_tinh", nullable = false, length = 10)
	private GioiTinh gioiTinh;

	@Enumerated(EnumType.STRING)
	@Column(name = "loai_nguoi_dung", nullable = false, length = 20)
	private LoaiNguoiDung loaiNguoiDung;

	@Column(name = "ngay_tao", nullable = false, updatable = false)
	private LocalDateTime ngayTao;

	@Column(name = "nguoi_tao_id", nullable = false)
	private Long nguoiTaoId;

	@Column(name = "ngay_cap_nhat", nullable = false)
	private LocalDateTime ngayCapNhat;

	@Column(name = "nguoi_cap_nhat_id")
	private Long nguoiCapNhatId;

	@Builder
	public NguoiDung(
			String hoTen,
			LocalDate ngaySinh,
			String email,
			String soDienThoai,
			String maSinhVien,
			String matKhauHash,
			GioiTinh gioiTinh,
			LoaiNguoiDung loaiNguoiDung,
			Long nguoiTaoId) {
		this.hoTen = hoTen;
		this.ngaySinh = ngaySinh;
		this.email = email;
		this.soDienThoai = soDienThoai;
		this.maSinhVien = maSinhVien;
		this.matKhauHash = matKhauHash;
		this.doiMatKhauLanDau = true;
		this.gioiTinh = gioiTinh;
		this.loaiNguoiDung = loaiNguoiDung;
		this.nguoiTaoId = nguoiTaoId;
	}

	public void capNhatThongTin(String hoTen, LocalDate ngaySinh, String email, String soDienThoai, GioiTinh gioiTinh) {
		this.hoTen = hoTen;
		this.ngaySinh = ngaySinh;
		this.email = email;
		this.soDienThoai = soDienThoai;
		this.gioiTinh = gioiTinh;
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
