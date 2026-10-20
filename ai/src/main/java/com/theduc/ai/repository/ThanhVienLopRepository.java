package com.theduc.ai.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.theduc.ai.entity.ThanhVienLop;

public interface ThanhVienLopRepository extends JpaRepository<ThanhVienLop, Long> {

	boolean existsByLopHocIdAndHocSinhId(Long lopHocId, Long hocSinhId);

	List<ThanhVienLop> findAllByLopHocIdOrderByNgayThamGiaAsc(Long lopHocId);

	List<ThanhVienLop> findAllByHocSinhIdOrderByNgayThamGiaDesc(Long hocSinhId);

	Optional<ThanhVienLop> findByLopHocIdAndHocSinhId(Long lopHocId, Long hocSinhId);

	void deleteByLopHocIdAndHocSinhId(Long lopHocId, Long hocSinhId);
}
