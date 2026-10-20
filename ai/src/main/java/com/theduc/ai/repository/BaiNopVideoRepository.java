package com.theduc.ai.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.theduc.ai.entity.BaiNopVideo;

public interface BaiNopVideoRepository extends JpaRepository<BaiNopVideo, Long> {

	List<BaiNopVideo> findAllByBaiTapIdInOrderByNgayNopDesc(List<Long> baiTapIds);

	Optional<BaiNopVideo> findByBaiTapIdAndHocSinhId(Long baiTapId, Long hocSinhId);
}
