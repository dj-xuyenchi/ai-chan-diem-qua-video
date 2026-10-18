package com.theduc.ai.service;

import java.util.List;

import com.theduc.ai.dto.CapNhatGiaoVienRequest;
import com.theduc.ai.dto.CapNhatHocSinhRequest;
import com.theduc.ai.dto.GiaoVienResponse;
import com.theduc.ai.dto.HocSinhResponse;
import com.theduc.ai.dto.TaoGiaoVienRequest;
import com.theduc.ai.dto.TaoHocSinhRequest;

public interface NguoiDungService {

	GiaoVienResponse taoGiaoVien(TaoGiaoVienRequest request);

	List<GiaoVienResponse> layDanhSachGiaoVien();

	GiaoVienResponse layGiaoVienTheoId(Long id);

	GiaoVienResponse capNhatGiaoVien(Long id, CapNhatGiaoVienRequest request);

	void xoaGiaoVien(Long id);

	HocSinhResponse taoHocSinh(TaoHocSinhRequest request);

	List<HocSinhResponse> layDanhSachHocSinh();

	HocSinhResponse layHocSinhTheoId(Long id);

	HocSinhResponse capNhatHocSinh(Long id, CapNhatHocSinhRequest request);

	void xoaHocSinh(Long id);
}
