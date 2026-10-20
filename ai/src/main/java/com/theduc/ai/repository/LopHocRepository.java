package com.theduc.ai.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.theduc.ai.entity.LopHoc;

public interface LopHocRepository extends JpaRepository<LopHoc, Long> {

	boolean existsByMaLop(String maLop);

	List<LopHoc> findAllByGiaoVienIdOrderByNgayTaoDesc(Long giaoVienId);
}
