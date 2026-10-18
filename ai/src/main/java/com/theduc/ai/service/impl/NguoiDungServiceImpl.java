package com.theduc.ai.service.impl;

import java.time.LocalDate;
import java.util.List;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import com.theduc.ai.constant.GioiTinh;
import com.theduc.ai.constant.LoaiNguoiDung;
import com.theduc.ai.dto.CapNhatGiaoVienRequest;
import com.theduc.ai.dto.CapNhatHocSinhRequest;
import com.theduc.ai.dto.GiaoVienResponse;
import com.theduc.ai.dto.HocSinhResponse;
import com.theduc.ai.dto.TaoGiaoVienRequest;
import com.theduc.ai.dto.TaoHocSinhRequest;
import com.theduc.ai.entity.NguoiDung;
import com.theduc.ai.repository.NguoiDungRepository;
import com.theduc.ai.service.NguoiDungService;
import com.theduc.ai.util.MatKhauUtil;

@Service
@Transactional
@RequiredArgsConstructor
public class NguoiDungServiceImpl implements NguoiDungService {

	private final NguoiDungRepository nguoiDungRepository;

	@Override
	public GiaoVienResponse taoGiaoVien(TaoGiaoVienRequest request) {
		kiemTraRequest(request);
		String matKhauTamThoi = MatKhauUtil.taoMatKhauNgauNhien();
		NguoiDung nguoiDung = tao(
				request.getHoTen(), request.getNgaySinh(), request.getEmail(), request.getSoDienThoai(),
				null, matKhauTamThoi, request.getGioiTinh(), request.getNguoiTaoId(),
				LoaiNguoiDung.GIAO_VIEN);
		GiaoVienResponse response = toGiaoVienResponse(nguoiDung);
		response.setMatKhauTamThoi(matKhauTamThoi);
		return response;
	}

	@Override
	@Transactional(readOnly = true)
	public List<GiaoVienResponse> layDanhSachGiaoVien() {
		return nguoiDungRepository.findAllByLoaiNguoiDung(LoaiNguoiDung.GIAO_VIEN).stream()
				.map(this::toGiaoVienResponse)
				.toList();
	}

	@Override
	@Transactional(readOnly = true)
	public GiaoVienResponse layGiaoVienTheoId(Long id) {
		return toGiaoVienResponse(timTheoIdVaLoai(id, LoaiNguoiDung.GIAO_VIEN));
	}

	@Override
	public GiaoVienResponse capNhatGiaoVien(Long id, CapNhatGiaoVienRequest request) {
		kiemTraRequest(request);
		NguoiDung nguoiDung = capNhat(
				id, request.getHoTen(), request.getNgaySinh(), request.getEmail(), request.getSoDienThoai(),
				null, request.getMatKhau(), request.getGioiTinh(), request.getNguoiCapNhatId(),
				LoaiNguoiDung.GIAO_VIEN);
		return toGiaoVienResponse(nguoiDung);
	}

	@Override
	public void xoaGiaoVien(Long id) {
		nguoiDungRepository.delete(timTheoIdVaLoai(id, LoaiNguoiDung.GIAO_VIEN));
	}

	@Override
	public HocSinhResponse taoHocSinh(TaoHocSinhRequest request) {
		kiemTraRequest(request);
		String matKhauTamThoi = MatKhauUtil.taoMatKhauNgauNhien();
		NguoiDung nguoiDung = tao(
				request.getHoTen(), request.getNgaySinh(), request.getEmail(), request.getSoDienThoai(),
				request.getMaSinhVien(), matKhauTamThoi, request.getGioiTinh(), request.getNguoiTaoId(),
				LoaiNguoiDung.HOC_SINH);
		HocSinhResponse response = toHocSinhResponse(nguoiDung);
		response.setMatKhauTamThoi(matKhauTamThoi);
		return response;
	}

	@Override
	@Transactional(readOnly = true)
	public List<HocSinhResponse> layDanhSachHocSinh() {
		return nguoiDungRepository.findAllByLoaiNguoiDung(LoaiNguoiDung.HOC_SINH).stream()
				.map(this::toHocSinhResponse)
				.toList();
	}

	@Override
	@Transactional(readOnly = true)
	public HocSinhResponse layHocSinhTheoId(Long id) {
		return toHocSinhResponse(timTheoIdVaLoai(id, LoaiNguoiDung.HOC_SINH));
	}

	@Override
	public HocSinhResponse capNhatHocSinh(Long id, CapNhatHocSinhRequest request) {
		kiemTraRequest(request);
		NguoiDung nguoiDung = capNhat(
				id, request.getHoTen(), request.getNgaySinh(), request.getEmail(), request.getSoDienThoai(),
				request.getMaSinhVien(), request.getMatKhau(), request.getGioiTinh(), request.getNguoiCapNhatId(),
				LoaiNguoiDung.HOC_SINH);
		return toHocSinhResponse(nguoiDung);
	}

	@Override
	public void xoaHocSinh(Long id) {
		nguoiDungRepository.delete(timTheoIdVaLoai(id, LoaiNguoiDung.HOC_SINH));
	}

	private NguoiDung tao(
			String hoTen,
			LocalDate ngaySinh,
			String email,
			String soDienThoai,
			String maSinhVien,
			String matKhau,
			GioiTinh gioiTinh,
			Long nguoiTaoId,
			LoaiNguoiDung loaiNguoiDung) {
		kiemTraThongTin(hoTen, ngaySinh, email, soDienThoai, gioiTinh, nguoiTaoId, "người tạo");
		kiemTraMatKhau(matKhau, true);
		if (loaiNguoiDung == LoaiNguoiDung.HOC_SINH) {
			kiemTraMaSinhVien(maSinhVien);
			if (nguoiDungRepository.existsByMaSinhVien(maSinhVien)) {
				throw new ResponseStatusException(HttpStatus.CONFLICT, "Mã sinh viên đã được sử dụng");
			}
		}
		if (nguoiDungRepository.existsByEmail(email)) {
			throw new ResponseStatusException(HttpStatus.CONFLICT, "Email đã được sử dụng");
		}
		NguoiDung nguoiDung = NguoiDung.builder()
				.hoTen(hoTen)
				.ngaySinh(ngaySinh)
				.email(email)
				.soDienThoai(soDienThoai)
				.maSinhVien(maSinhVien)
				.matKhauHash(MatKhauUtil.bam(matKhau))
				.gioiTinh(gioiTinh)
				.loaiNguoiDung(loaiNguoiDung)
				.nguoiTaoId(nguoiTaoId)
				.build();
		return nguoiDungRepository.saveAndFlush(nguoiDung);
	}

	private NguoiDung capNhat(
			Long id,
			String hoTen,
			LocalDate ngaySinh,
			String email,
			String soDienThoai,
			String maSinhVien,
			String matKhau,
			GioiTinh gioiTinh,
			Long nguoiCapNhatId,
			LoaiNguoiDung loaiNguoiDung) {
		kiemTraThongTin(hoTen, ngaySinh, email, soDienThoai, gioiTinh, nguoiCapNhatId, "người cập nhật");
		NguoiDung nguoiDung = timTheoIdVaLoai(id, loaiNguoiDung);
		if (nguoiDungRepository.existsByEmailAndIdNot(email, id)) {
			throw new ResponseStatusException(HttpStatus.CONFLICT, "Email đã được sử dụng");
		}
		if (loaiNguoiDung == LoaiNguoiDung.HOC_SINH) {
			kiemTraMaSinhVien(maSinhVien);
			if (nguoiDungRepository.existsByMaSinhVienAndIdNot(maSinhVien, id)) {
				throw new ResponseStatusException(HttpStatus.CONFLICT, "Mã sinh viên đã được sử dụng");
			}
			nguoiDung.setMaSinhVien(maSinhVien);
		}
		if (matKhau != null && !matKhau.isBlank()) {
			kiemTraMatKhau(matKhau, false);
			nguoiDung.setMatKhauHash(MatKhauUtil.bam(matKhau));
			nguoiDung.setDoiMatKhauLanDau(true);
		}
		nguoiDung.capNhatThongTin(hoTen, ngaySinh, email, soDienThoai, gioiTinh);
		nguoiDung.setNguoiCapNhatId(nguoiCapNhatId);
		return nguoiDungRepository.saveAndFlush(nguoiDung);
	}

	private void kiemTraMatKhau(String matKhau, boolean batBuoc) {
		if (matKhau == null || matKhau.isBlank()) {
			if (batBuoc) {
				throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Mật khẩu không được để trống");
			}
			return;
		}
		if (matKhau.length() < 12 || matKhau.length() > 128) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Mật khẩu phải dài từ 12 đến 128 ký tự");
		}
	}

	private void kiemTraMaSinhVien(String maSinhVien) {
		if (maSinhVien == null || maSinhVien.isBlank() || maSinhVien.length() > 50) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Mã sinh viên không hợp lệ");
		}
	}

	private void kiemTraThongTin(
			String hoTen,
			LocalDate ngaySinh,
			String email,
			String soDienThoai,
			GioiTinh gioiTinh,
			Long nguoiThaoTacId,
			String tenNguoiThaoTac) {
		if (hoTen == null || hoTen.isBlank() || hoTen.length() > 100) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Họ tên không hợp lệ");
		}
		if (ngaySinh == null) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Ngày sinh không được để trống");
		}
		if (email == null || email.length() > 254 || !email.matches("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$")) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Email không hợp lệ");
		}
		if (soDienThoai != null && soDienThoai.length() > 20) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Số điện thoại không được vượt quá 20 ký tự");
		}
		if (gioiTinh == null) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Giới tính không được để trống");
		}
		if (nguoiThaoTacId == null || nguoiThaoTacId <= 0) {
			throw new ResponseStatusException(
					HttpStatus.BAD_REQUEST, "ID " + tenNguoiThaoTac + " phải là số dương");
		}
	}

	private void kiemTraRequest(Object request) {
		if (request == null) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Request không được để trống");
		}
	}

	private NguoiDung timTheoIdVaLoai(Long id, LoaiNguoiDung loaiNguoiDung) {
		return nguoiDungRepository.findByIdAndLoaiNguoiDung(id, loaiNguoiDung)
				.orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy người dùng"));
	}

	private GiaoVienResponse toGiaoVienResponse(NguoiDung nguoiDung) {
		return GiaoVienResponse.builder()
				.id(nguoiDung.getId())
				.hoTen(nguoiDung.getHoTen())
				.ngaySinh(nguoiDung.getNgaySinh())
				.email(nguoiDung.getEmail())
				.soDienThoai(nguoiDung.getSoDienThoai())
				.gioiTinh(nguoiDung.getGioiTinh())
				.daCoMatKhau(nguoiDung.getMatKhauHash() != null)
				.ngayTao(nguoiDung.getNgayTao())
				.nguoiTaoId(nguoiDung.getNguoiTaoId())
				.ngayCapNhat(nguoiDung.getNgayCapNhat())
				.nguoiCapNhatId(nguoiDung.getNguoiCapNhatId())
				.build();
	}

	private HocSinhResponse toHocSinhResponse(NguoiDung nguoiDung) {
		return HocSinhResponse.builder()
				.id(nguoiDung.getId())
				.hoTen(nguoiDung.getHoTen())
				.maSinhVien(nguoiDung.getMaSinhVien())
				.ngaySinh(nguoiDung.getNgaySinh())
				.email(nguoiDung.getEmail())
				.soDienThoai(nguoiDung.getSoDienThoai())
				.gioiTinh(nguoiDung.getGioiTinh())
				.daCoMatKhau(nguoiDung.getMatKhauHash() != null)
				.ngayTao(nguoiDung.getNgayTao())
				.nguoiTaoId(nguoiDung.getNguoiTaoId())
				.ngayCapNhat(nguoiDung.getNgayCapNhat())
				.nguoiCapNhatId(nguoiDung.getNguoiCapNhatId())
				.build();
	}
}
