package com.theduc.ai.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.theduc.ai.constant.LoaiNguoiDung;
import com.theduc.ai.entity.NguoiDung;

public interface NguoiDungRepository extends JpaRepository<NguoiDung, Long> {

	boolean existsByEmail(String email);

	Optional<NguoiDung> findByEmail(String email);

	List<NguoiDung> findAllByMatKhauHashIsNull();

	boolean existsByEmailAndIdNot(String email, Long id);

	boolean existsByMaSinhVien(String maSinhVien);

	boolean existsByMaSinhVienAndIdNot(String maSinhVien, Long id);

	List<NguoiDung> findAllByLoaiNguoiDung(LoaiNguoiDung loaiNguoiDung);

	Optional<NguoiDung> findByIdAndLoaiNguoiDung(Long id, LoaiNguoiDung loaiNguoiDung);
}
