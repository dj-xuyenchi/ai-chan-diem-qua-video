package com.theduc.ai.service;

import java.io.IOException;
import java.util.List;

import org.springframework.web.multipart.MultipartFile;

import com.theduc.ai.dto.ReferenceAnalysisResponse;
import com.theduc.ai.dto.BaiTapVideoResponse;
import com.theduc.ai.dto.AiDanhGiaResponse;
import com.theduc.ai.dto.LopHocResponse;

public interface LopHocService {

	List<LopHocResponse> layDanhSachLop(Long nguoiDungId, String loaiNguoiDung);

	LopHocResponse taoLop(String maLop, String tenLop, Long giaoVienId);

	LopHocResponse layChiTietLop(Long lopHocId, Long nguoiDungId, String loaiNguoiDung);

	LopHocResponse themHocSinh(Long lopHocId, List<Long> hocSinhIds, Long giaoVienId);

	LopHocResponse xoaHocSinh(Long lopHocId, Long hocSinhId, Long giaoVienId);

	List<BaiTapVideoResponse> layBaiTap(Long lopHocId, Long nguoiDungId, String loaiNguoiDung);

	ReferenceAnalysisResponse phanTichVideoMau(
			Long lopHocId, int soDongTac, MultipartFile video, Long giaoVienId) throws IOException;

	BaiTapVideoResponse taoBaiTap(
			Long lopHocId, String tieuDe, String huongDan, String hanNop, int soDongTac, int aiNguongDatPercent,
			String dongTacMauJson, MultipartFile video, Long giaoVienId) throws IOException;

	BaiTapVideoResponse nopBai(Long lopHocId, Long baiTapId, MultipartFile video, Long hocSinhId)
			throws IOException;

	BaiTapVideoResponse chamDiem(
			Long lopHocId, Long baiTapId, Long baiNopId,
			Double diem, String nhanXet, Long giaoVienId);

	AiDanhGiaResponse danhGiaVideo(Long lopHocId, Long baiTapId, Long baiNopId, Long giaoVienId);

	StoredVideo layVideoBaiTap(Long lopHocId, Long baiTapId, Long nguoiDungId, String loaiNguoiDung)
			throws IOException;

	StoredVideo layVideoBaiNop(
			Long lopHocId, Long baiTapId, Long baiNopId,
			Long nguoiDungId, String loaiNguoiDung) throws IOException;
}
