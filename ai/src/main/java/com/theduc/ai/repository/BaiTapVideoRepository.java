package com.theduc.ai.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.theduc.ai.entity.BaiTapVideo;

public interface BaiTapVideoRepository extends JpaRepository<BaiTapVideo, Long> {

	List<BaiTapVideo> findAllByLopHocIdOrderByNgayTaoDesc(Long lopHocId);
}
