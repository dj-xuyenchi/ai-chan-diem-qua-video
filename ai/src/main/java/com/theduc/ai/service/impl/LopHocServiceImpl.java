package com.theduc.ai.service.impl;

import java.io.IOException;
import java.time.LocalDateTime;
import java.time.format.DateTimeParseException;
import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.web.server.ResponseStatusException;

import lombok.RequiredArgsConstructor;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.ObjectMapper;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import com.theduc.ai.constant.LoaiNguoiDung;
import com.theduc.ai.dto.AiDanhGiaResponse;
import com.theduc.ai.dto.BaiNopVideoResponse;
import com.theduc.ai.dto.BaiTapVideoResponse;
import com.theduc.ai.dto.HocSinhLopResponse;
import com.theduc.ai.dto.LopHocResponse;
import com.theduc.ai.dto.MovementScoreResponse;
import com.theduc.ai.dto.ReferenceAnalysisResponse;
import com.theduc.ai.dto.ReferenceMovementResponse;
import com.theduc.ai.entity.BaiNopVideo;
import com.theduc.ai.entity.BaiTapVideo;
import com.theduc.ai.entity.DanhGiaAiVideo;
import com.theduc.ai.entity.LopHoc;
import com.theduc.ai.entity.NguoiDung;
import com.theduc.ai.entity.ThanhVienLop;
import com.theduc.ai.repository.BaiNopVideoRepository;
import com.theduc.ai.repository.BaiTapVideoRepository;
import com.theduc.ai.repository.LopHocRepository;
import com.theduc.ai.repository.NguoiDungRepository;
import com.theduc.ai.repository.ThanhVienLopRepository;
import com.theduc.ai.service.LopHocService;
import com.theduc.ai.service.AiVideoScoringService;
import com.theduc.ai.service.StoredVideo;
import com.theduc.ai.service.VideoStorageService;

@Service
@Transactional
@RequiredArgsConstructor
public class LopHocServiceImpl implements LopHocService {

	private static final System.Logger LOGGER = System.getLogger(LopHocServiceImpl.class.getName());
	private static final String GIAO_VIEN = "GIAO_VIEN";
	private static final String HOC_SINH = "HOC_SINH";
    private static final Logger log = LoggerFactory.getLogger(LopHocServiceImpl.class);

    private final LopHocRepository lopHocRepository;
	private final ThanhVienLopRepository thanhVienLopRepository;
	private final BaiTapVideoRepository baiTapVideoRepository;
	private final BaiNopVideoRepository baiNopVideoRepository;
	private final NguoiDungRepository nguoiDungRepository;
	private final VideoStorageService videoStorageService;
	private final AiVideoScoringService aiVideoScoringService;
	private final ObjectMapper objectMapper;

	@Value("${app.video.max-file-size-bytes:104857600}")
	private long maxFileSizeBytes;

	@Override
	@Transactional(readOnly = true)
	public List<LopHocResponse> layDanhSachLop(Long nguoiDungId, String loaiNguoiDung) {
		if (GIAO_VIEN.equals(loaiNguoiDung)) {
			return lopHocRepository.findAllByGiaoVienIdOrderByNgayTaoDesc(nguoiDungId).stream()
					.map(lopHoc -> toLopHocResponse(lopHoc, false))
					.toList();
		}
		if (HOC_SINH.equals(loaiNguoiDung)) {
			return thanhVienLopRepository.findAllByHocSinhIdOrderByNgayThamGiaDesc(nguoiDungId).stream()
					.map(thanhVien -> lopHocRepository.findById(thanhVien.getLopHocId())
							.orElseThrow(() -> notFound("Không tìm thấy lớp học")))
					.map(lopHoc -> toLopHocResponse(lopHoc, false))
					.toList();
		}
		throw forbidden();
	}

	@Override
	public LopHocResponse taoLop(String maLop, String tenLop, Long giaoVienId) {
		if (maLop == null || maLop.isBlank() || maLop.length() > 50
				|| tenLop == null || tenLop.isBlank() || tenLop.length() > 150) {
			throw badRequest("Mã lớp và tên lớp là bắt buộc; mã tối đa 50, tên tối đa 150 ký tự");
		}
		String normalizedCode = maLop.trim();
		if (lopHocRepository.existsByMaLop(normalizedCode)) {
			throw new ResponseStatusException(HttpStatus.CONFLICT, "Mã lớp đã được sử dụng");
		}
		LopHoc lopHoc = lopHocRepository.saveAndFlush(
				new LopHoc(normalizedCode, tenLop.trim(), giaoVienId));
		return toLopHocResponse(lopHoc, true);
	}

	@Override
	@Transactional(readOnly = true)
	public LopHocResponse layChiTietLop(Long lopHocId, Long nguoiDungId, String loaiNguoiDung) {
		LopHoc lopHoc = layLop(lopHocId);
		kiemTraQuyenXemLop(lopHocId, lopHoc, nguoiDungId, loaiNguoiDung);
		return toLopHocResponse(lopHoc, true);
	}

	@Override
	public LopHocResponse themHocSinh(Long lopHocId, List<Long> hocSinhIds, Long giaoVienId) {
		LopHoc lopHoc = layLopCuaGiaoVien(lopHocId, giaoVienId);
		if (hocSinhIds == null || hocSinhIds.isEmpty()) {
			throw badRequest("Chọn ít nhất một học sinh");
		}
		for (Long hocSinhId : hocSinhIds.stream().distinct().toList()) {
			if (hocSinhId == null) {
				throw badRequest("ID học sinh không hợp lệ");
			}
			NguoiDung hocSinh = nguoiDungRepository.findById(hocSinhId)
					.orElseThrow(() -> notFound("Không tìm thấy học sinh"));
			if (hocSinh.getLoaiNguoiDung() != LoaiNguoiDung.HOC_SINH) {
				throw badRequest("Chỉ có thể thêm tài khoản học sinh vào lớp");
			}
			if (!thanhVienLopRepository.existsByLopHocIdAndHocSinhId(lopHocId, hocSinhId)) {
				thanhVienLopRepository.save(new ThanhVienLop(lopHocId, hocSinhId));
			}
		}
		return toLopHocResponse(lopHoc, true);
	}

	@Override
	public LopHocResponse xoaHocSinh(Long lopHocId, Long hocSinhId, Long giaoVienId) {
		layLopCuaGiaoVien(lopHocId, giaoVienId);
		thanhVienLopRepository.deleteByLopHocIdAndHocSinhId(lopHocId, hocSinhId);
		return toLopHocResponse(layLop(lopHocId), true);
	}

	@Override
	@Transactional(readOnly = true)
	public List<BaiTapVideoResponse> layBaiTap(Long lopHocId, Long nguoiDungId, String loaiNguoiDung) {
		LopHoc lopHoc = layLop(lopHocId);
		kiemTraQuyenXemLop(lopHocId, lopHoc, nguoiDungId, loaiNguoiDung);
		List<BaiTapVideo> baiTaps = baiTapVideoRepository.findAllByLopHocIdOrderByNgayTaoDesc(lopHocId);
		if (baiTaps.isEmpty()) {
			return List.of();
		}
		List<Long> baiTapIds = baiTaps.stream().map(BaiTapVideo::getId).toList();
		List<BaiNopVideo> baiNops = baiNopVideoRepository.findAllByBaiTapIdInOrderByNgayNopDesc(baiTapIds);
		return baiTaps.stream()
				.map(baiTap -> toBaiTapResponse(baiTap, baiNops, nguoiDungId))
				.toList();
	}

	@Override
	public ReferenceAnalysisResponse phanTichVideoMau(
			Long lopHocId, int soDongTac, MultipartFile video, Long giaoVienId) throws IOException {
		layLopCuaGiaoVien(lopHocId, giaoVienId);
		kiemTraSoDongTac(soDongTac);
		kiemTraVideo(video);
		String videoPath = videoStorageService.store(video);
		try {
			return aiVideoScoringService.analyzeReference(videoPath, soDongTac, null);
		} finally {
			xoaVideoTam(videoPath);
		}
	}

	@Override
	public BaiTapVideoResponse taoBaiTap(
			Long lopHocId,
			String tieuDe,
			String huongDan,
			String hanNop,
			int soDongTac,
			int aiNguongDatPercent,
			String dongTacMauJson,
			MultipartFile video,
			Long giaoVienId) throws IOException {
		LopHoc lopHoc = layLopCuaGiaoVien(lopHocId, giaoVienId);
		kiemTraTieuDe(tieuDe);
		kiemTraSoDongTac(soDongTac);
		kiemTraNguongDat(aiNguongDatPercent);
		List<ReferenceMovementResponse> dongTacMau = parseDongTacMau(dongTacMauJson, soDongTac);
		kiemTraVideo(video);
		LocalDateTime deadline = parseDeadline(hanNop);
		String videoPath = videoStorageService.store(video);
		try {
			ReferenceAnalysisResponse referenceAnalysis =
					aiVideoScoringService.analyzeReference(videoPath, soDongTac, dongTacMau);
			if (referenceAnalysis.movementCount() != soDongTac
					|| referenceAnalysis.movements() == null
					|| referenceAnalysis.movements().size() != soDongTac) {
				throw badRequest("Số đoạn video mẫu không trùng với số động tác đã chọn");
			}
			BaiTapVideo baiTap = new BaiTapVideo();
			baiTap.setLopHocId(lopHoc.getId());
			baiTap.setTieuDe(tieuDe.trim());
			baiTap.setHuongDan(huongDan == null ? "" : huongDan.trim());
			baiTap.setHanNop(deadline);
			baiTap.setVideoPath(videoPath);
			baiTap.setTenVideo(tenTep(video));
			baiTap.setLoaiVideo(video.getContentType());
			baiTap.setKichThuocVideo(video.getSize());
			baiTap.setGiaoVienId(giaoVienId);
			baiTap.setAiNguongDatPercent(aiNguongDatPercent);
			baiTap.setAiDongTacMauJson(serialize(referenceAnalysis.movements()));
			baiTap.setAiMoTaDongTacMau(referenceAnalysis.explanation());
			BaiTapVideo saved = baiTapVideoRepository.saveAndFlush(baiTap);
			return toBaiTapResponse(saved, List.of(), giaoVienId);
		} catch (RuntimeException exception) {
            exception.printStackTrace();
			videoStorageService.delete(videoPath);
			throw exception;
		}
	}

	private List<ReferenceMovementResponse> parseDongTacMau(String dongTacMauJson, int soDongTac) {
		if (dongTacMauJson == null || dongTacMauJson.isBlank()) {
			throw badRequest("Vui lòng phân tích và xác nhận các đoạn động tác trước khi tạo bài tập");
		}
		try {
			List<ReferenceMovementResponse> movements = objectMapper.readValue(
					dongTacMauJson, new TypeReference<List<ReferenceMovementResponse>>() {});
			if (movements == null || movements.size() != soDongTac) {
				throw badRequest("Số đoạn đã xác nhận không trùng với số động tác đã chọn");
			}
			double previousEnd = 0.0;
			for (int index = 0; index < movements.size(); index++) {
				ReferenceMovementResponse movement = movements.get(index);
				if (movement.movementNumber() != index + 1
						|| !Double.isFinite(movement.startSeconds())
						|| !Double.isFinite(movement.endSeconds())
						|| movement.startSeconds() < previousEnd
						|| movement.endSeconds() - movement.startSeconds() < 0.5) {
					throw badRequest("Thời gian các đoạn động tác không hợp lệ hoặc bị chồng lấn");
				}
				previousEnd = movement.endSeconds();
			}
			return movements;
		} catch (RuntimeException exception) {
			if (exception instanceof ResponseStatusException responseStatusException) {
				throw responseStatusException;
			}
			throw badRequest("Danh sách các đoạn động tác không hợp lệ");
		}
	}

	private void kiemTraSoDongTac(int soDongTac) {
		if (soDongTac < 5 || soDongTac > 6) {
			throw badRequest("Số động tác phải là 5 hoặc 6");
		}
	}

	private void kiemTraNguongDat(int nguongDatPercent) {
		if (!List.of(50, 60, 70).contains(nguongDatPercent)) {
			throw badRequest("Ngưỡng đạt phải là 50%, 60% hoặc 70%");
		}
	}

	private void xoaVideoTam(String videoPath) {
		try {
			videoStorageService.delete(videoPath);
		} catch (IOException exception) {
			LOGGER.log(System.Logger.Level.WARNING, "Không xóa được video tạm sau phân tích AI", exception);
		}
	}

	@Override
	public BaiTapVideoResponse nopBai(Long lopHocId, Long baiTapId, MultipartFile video, Long hocSinhId)
			throws IOException {
		if (!thanhVienLopRepository.existsByLopHocIdAndHocSinhId(lopHocId, hocSinhId)) {
			throw forbidden();
		}
		BaiTapVideo baiTap = layBaiTap(lopHocId, baiTapId);
		kiemTraVideo(video);
		BaiNopVideo baiNop = baiNopVideoRepository.findByBaiTapIdAndHocSinhId(baiTapId, hocSinhId)
				.orElseGet(BaiNopVideo::new);
		String previousPath = baiNop.getVideoPath();
		String videoPath = videoStorageService.store(video);
		baiNop.setBaiTapId(baiTapId);
		baiNop.setHocSinhId(hocSinhId);
		baiNop.setVideoPath(videoPath);
		baiNop.setTenVideo(tenTep(video));
		baiNop.setLoaiVideo(video.getContentType());
		baiNop.setKichThuocVideo(video.getSize());
		baiNop.setNgayNop(LocalDateTime.now());
		baiNop.setDiem(null);
		baiNop.setNhanXet(null);
		baiNop.setNgayCham(null);
		baiNop.setGiaoVienChamId(null);
		baiNop.setDanhGiaAi(null);
		baiNop.setTrangThaiAi("DANG_DANH_GIA");
		baiNop.setLoiDanhGiaAi(null);
		try {
			baiNopVideoRepository.saveAndFlush(baiNop);
			if (previousPath != null) {
				videoStorageService.delete(previousPath);
			}
			try {
				AiDanhGiaResponse evaluation = aiVideoScoringService.evaluate(
						baiTap.getVideoPath(),
						baiNop.getVideoPath(),
						referenceMovements(baiTap),
						nguongDatPercent(baiTap));
				baiNop.setDanhGiaAi(DanhGiaAiVideo.from(evaluation, serialize(evaluation.movements())));
				baiNop.setTrangThaiAi("DA_DANH_GIA");
			} catch (ResponseStatusException exception) {
				baiNop.setTrangThaiAi("LOI");
				baiNop.setLoiDanhGiaAi(exception.getReason() == null
						? "Không thể đánh giá video; giáo viên có thể thử lại."
						: exception.getReason());
				LOGGER.log(System.Logger.Level.WARNING,
						"AI video đánh giá không thành công cho bài nộp " + baiNop.getId()
								+ ": " + baiNop.getLoiDanhGiaAi());
			}
			baiNopVideoRepository.saveAndFlush(baiNop);
			List<BaiNopVideo> baiNops =
					baiNopVideoRepository.findAllByBaiTapIdInOrderByNgayNopDesc(List.of(baiTapId));
			return toBaiTapResponse(baiTap, baiNops, hocSinhId);
		} catch (RuntimeException exception) {
			videoStorageService.delete(videoPath);
			throw exception;
		}
	}

	@Override
	public BaiTapVideoResponse chamDiem(
			Long lopHocId,
			Long baiTapId,
			Long baiNopId,
			Double diem,
			String nhanXet,
			Long giaoVienId) {
		layLopCuaGiaoVien(lopHocId, giaoVienId);
		layBaiTap(lopHocId, baiTapId);
		BaiNopVideo baiNop = baiNopVideoRepository.findById(baiNopId)
				.orElseThrow(() -> notFound("Không tìm thấy bài nộp"));
		if (!baiTapId.equals(baiNop.getBaiTapId())) {
			throw notFound("Không tìm thấy bài nộp trong bài tập này");
		}
		if (diem == null || !Double.isFinite(diem) || diem < 0 || diem > 10) {
			throw badRequest("Điểm phải nằm trong khoảng từ 0 đến 10");
		}
		if (nhanXet != null && nhanXet.length() > 2000) {
			throw badRequest("Nhận xét không được vượt quá 2000 ký tự");
		}
		baiNop.setDiem(diem);
		baiNop.setNhanXet(nhanXet == null ? "" : nhanXet.trim());
		baiNop.setNgayCham(LocalDateTime.now());
		baiNop.setGiaoVienChamId(giaoVienId);
		baiNopVideoRepository.save(baiNop);
		List<BaiNopVideo> baiNops = baiNopVideoRepository.findAllByBaiTapIdInOrderByNgayNopDesc(List.of(baiTapId));
		return toBaiTapResponse(layBaiTap(lopHocId, baiTapId), baiNops, giaoVienId);
	}

	@Override
	public AiDanhGiaResponse danhGiaVideo(Long lopHocId, Long baiTapId, Long baiNopId, Long giaoVienId) {
		layLopCuaGiaoVien(lopHocId, giaoVienId);
		BaiTapVideo baiTap = layBaiTap(lopHocId, baiTapId);
		BaiNopVideo baiNop = baiNopVideoRepository.findById(baiNopId)
				.orElseThrow(() -> notFound("Không tìm thấy bài nộp"));
		if (!baiTapId.equals(baiNop.getBaiTapId())) {
			throw notFound("Không tìm thấy bài nộp trong bài tập này");
		}
		AiDanhGiaResponse evaluation =
				aiVideoScoringService.evaluate(
						baiTap.getVideoPath(), baiNop.getVideoPath(),
						referenceMovements(baiTap), nguongDatPercent(baiTap));
		baiNop.setDanhGiaAi(DanhGiaAiVideo.from(evaluation, serialize(evaluation.movements())));
		baiNop.setTrangThaiAi("DA_DANH_GIA");
		baiNop.setLoiDanhGiaAi(null);
		baiNopVideoRepository.save(baiNop);
		return evaluation;
	}

	@Override
	@Transactional(readOnly = true)
	public StoredVideo layVideoBaiTap(
			Long lopHocId, Long baiTapId, Long nguoiDungId, String loaiNguoiDung) throws IOException {
		LopHoc lopHoc = layLop(lopHocId);
		kiemTraQuyenXemLop(lopHocId, lopHoc, nguoiDungId, loaiNguoiDung);
		BaiTapVideo baiTap = layBaiTap(lopHocId, baiTapId);
		return new StoredVideo(
				videoStorageService.load(baiTap.getVideoPath()),
				baiTap.getLoaiVideo(),
				baiTap.getTenVideo());
	}

	@Override
	@Transactional(readOnly = true)
	public StoredVideo layVideoBaiNop(
			Long lopHocId,
			Long baiTapId,
			Long baiNopId,
			Long nguoiDungId,
			String loaiNguoiDung) throws IOException {
		LopHoc lopHoc = layLop(lopHocId);
		kiemTraQuyenXemLop(lopHocId, lopHoc, nguoiDungId, loaiNguoiDung);
		layBaiTap(lopHocId, baiTapId);
		BaiNopVideo baiNop = baiNopVideoRepository.findById(baiNopId)
				.orElseThrow(() -> notFound("Không tìm thấy bài nộp"));
		if (!baiTapId.equals(baiNop.getBaiTapId())) {
			throw notFound("Không tìm thấy bài nộp trong bài tập này");
		}
		return new StoredVideo(
				videoStorageService.load(baiNop.getVideoPath()),
				baiNop.getLoaiVideo(),
				baiNop.getTenVideo());
	}

	private LopHocResponse toLopHocResponse(LopHoc lopHoc, boolean includeStudents) {
		List<ThanhVienLop> thanhViens = thanhVienLopRepository.findAllByLopHocIdOrderByNgayThamGiaAsc(lopHoc.getId());
		List<HocSinhLopResponse> hocSinhs = includeStudents
				? thanhViens.stream()
						.map(thanhVien -> toHocSinhLopResponse(
								layNguoiDung(thanhVien.getHocSinhId()), thanhVien.getNgayThamGia()))
						.toList()
				: List.of();
		NguoiDung giaoVien = layNguoiDung(lopHoc.getGiaoVienId());
		return LopHocResponse.builder()
				.id(lopHoc.getId())
				.maLop(lopHoc.getMaLop())
				.tenLop(lopHoc.getTenLop())
				.giaoVienId(lopHoc.getGiaoVienId())
				.tenGiaoVien(giaoVien.getHoTen())
				.ngayTao(lopHoc.getNgayTao())
				.soHocSinh(thanhViens.size())
				.hocSinh(hocSinhs)
				.build();
	}

	private BaiTapVideoResponse toBaiTapResponse(BaiTapVideo baiTap, List<BaiNopVideo> allSubmissions, Long currentUserId) {
		NguoiDung giaoVien = layNguoiDung(baiTap.getGiaoVienId());
		List<BaiNopVideoResponse> submissions = allSubmissions.stream()
				.filter(submission -> submission.getBaiTapId().equals(baiTap.getId()))
				.map(submission -> toBaiNopResponse(submission, currentUserId))
				.toList();
		return BaiTapVideoResponse.builder()
				.id(baiTap.getId())
				.lopHocId(baiTap.getLopHocId())
				.tieuDe(baiTap.getTieuDe())
				.huongDan(baiTap.getHuongDan())
				.hanNop(baiTap.getHanNop())
				.tenVideo(baiTap.getTenVideo())
				.videoUrl("/api/lop-hoc/" + baiTap.getLopHocId() + "/bai-tap/" + baiTap.getId() + "/video")
				.ngayTao(baiTap.getNgayTao())
				.giaoVienId(baiTap.getGiaoVienId())
				.tenGiaoVien(giaoVien.getHoTen())
				.aiDongTacMau(referenceMovements(baiTap))
				.aiMoTaDongTacMau(baiTap.getAiMoTaDongTacMau())
				.aiNguongDatPercent(nguongDatPercent(baiTap))
				.baiNop(submissions)
				.build();
	}

	private int nguongDatPercent(BaiTapVideo baiTap) {
		return baiTap.getAiNguongDatPercent() == null ? 70 : baiTap.getAiNguongDatPercent();
	}

	private BaiNopVideoResponse toBaiNopResponse(BaiNopVideo baiNop, Long currentUserId) {
		NguoiDung hocSinh = layNguoiDung(baiNop.getHocSinhId());
		return BaiNopVideoResponse.builder()
				.id(baiNop.getId())
				.hocSinhId(baiNop.getHocSinhId())
				.tenHocSinh(hocSinh.getHoTen())
				.maSinhVien(hocSinh.getMaSinhVien())
				.tenVideo(baiNop.getTenVideo())
				.videoUrl("/api/lop-hoc/" + layLopIdCuaBaiTap(baiNop.getBaiTapId())
						+ "/bai-tap/" + baiNop.getBaiTapId()
						+ "/bai-nop/" + baiNop.getId() + "/video")
				.ngayNop(baiNop.getNgayNop())
				.diem(baiNop.getDiem())
				.nhanXet(baiNop.getNhanXet())
				.baiCuaToi(baiNop.getHocSinhId().equals(currentUserId))
				.aiDanhGia(baiNop.getDanhGiaAi() == null ? null : aiEvaluationResponse(baiNop.getDanhGiaAi()))
				.trangThaiAi(baiNop.getTrangThaiAi())
				.loiDanhGiaAi(baiNop.getLoiDanhGiaAi())
				.build();
	}

	private List<ReferenceMovementResponse> referenceMovements(BaiTapVideo baiTap) {
		if (baiTap.getAiDongTacMauJson() == null || baiTap.getAiDongTacMauJson().isBlank()) {
			return List.of();
		}
		try {
			return objectMapper.readValue(
					baiTap.getAiDongTacMauJson(),
					new TypeReference<List<ReferenceMovementResponse>>() {});
		} catch (RuntimeException exception) {
			throw new IllegalStateException("Không đọc được cấu hình động tác AI đã lưu", exception);
		}
	}

	private String serialize(Object value) {
		try {
			return objectMapper.writeValueAsString(value);
		} catch (RuntimeException exception) {
			throw new IllegalStateException("Không thể lưu dữ liệu phân tích động tác AI", exception);
		}
	}

	private AiDanhGiaResponse aiEvaluationResponse(DanhGiaAiVideo evaluation) {
		List<MovementScoreResponse> movements = List.of();
		if (evaluation.getMovementDetailsJson() != null && !evaluation.getMovementDetailsJson().isBlank()) {
			try {
				movements = objectMapper.readValue(
						evaluation.getMovementDetailsJson(),
						new TypeReference<List<MovementScoreResponse>>() {});
			} catch (RuntimeException exception) {
				throw new IllegalStateException("Không đọc được chi tiết đánh giá động tác AI đã lưu", exception);
			}
		}
		return evaluation.toResponse(movements);
	}

	private HocSinhLopResponse toHocSinhLopResponse(
			NguoiDung hocSinh, LocalDateTime ngayThamGia) {
		return HocSinhLopResponse.builder()
				.id(hocSinh.getId())
				.hoTen(hocSinh.getHoTen())
				.maSinhVien(hocSinh.getMaSinhVien())
				.email(hocSinh.getEmail())
				.ngayThamGia(ngayThamGia)
				.build();
	}

	private Long layLopIdCuaBaiTap(Long baiTapId) {
		return baiTapVideoRepository.findById(baiTapId)
				.orElseThrow(() -> notFound("Không tìm thấy bài tập"))
				.getLopHocId();
	}

	private LopHoc layLop(Long lopHocId) {
		return lopHocRepository.findById(lopHocId)
				.orElseThrow(() -> notFound("Không tìm thấy lớp học"));
	}

	private LopHoc layLopCuaGiaoVien(Long lopHocId, Long giaoVienId) {
		LopHoc lopHoc = layLop(lopHocId);
		if (!lopHoc.getGiaoVienId().equals(giaoVienId)) {
			throw forbidden();
		}
		return lopHoc;
	}

	private BaiTapVideo layBaiTap(Long lopHocId, Long baiTapId) {
		BaiTapVideo baiTap = baiTapVideoRepository.findById(baiTapId)
				.orElseThrow(() -> notFound("Không tìm thấy bài tập"));
		if (!lopHocId.equals(baiTap.getLopHocId())) {
			throw notFound("Không tìm thấy bài tập trong lớp này");
		}
		return baiTap;
	}

	private void kiemTraQuyenXemLop(Long lopHocId, LopHoc lopHoc, Long nguoiDungId, String loaiNguoiDung) {
		if (GIAO_VIEN.equals(loaiNguoiDung) && lopHoc.getGiaoVienId().equals(nguoiDungId)) {
			return;
		}
		if (HOC_SINH.equals(loaiNguoiDung)
				&& thanhVienLopRepository.existsByLopHocIdAndHocSinhId(lopHocId, nguoiDungId)) {
			return;
		}
		throw forbidden();
	}

	private NguoiDung layNguoiDung(Long nguoiDungId) {
		return nguoiDungRepository.findById(nguoiDungId)
				.orElseThrow(() -> notFound("Không tìm thấy người dùng"));
	}

	private void kiemTraTieuDe(String tieuDe) {
		if (tieuDe == null || tieuDe.isBlank() || tieuDe.length() > 150) {
			throw badRequest("Tiêu đề bài tập là bắt buộc và tối đa 150 ký tự");
		}
	}

	private void kiemTraVideo(MultipartFile video) {
		if (video == null || video.isEmpty()) {
			throw badRequest("Vui lòng chọn tệp video");
		}
		if (video.getSize() > maxFileSizeBytes) {
			throw new ResponseStatusException(HttpStatus.PAYLOAD_TOO_LARGE, "Video vượt quá giới hạn 100 MB");
		}
		String contentType = video.getContentType();
		if (contentType == null || !contentType.toLowerCase().startsWith("video/")) {
			throw badRequest("Tệp tải lên phải có định dạng video");
		}
		if (video.getOriginalFilename() == null || video.getOriginalFilename().isBlank()) {
			throw badRequest("Tên tệp video không hợp lệ");
		}
	}

	private String tenTep(MultipartFile video) {
		String originalName = video.getOriginalFilename();
		String fileName = originalName == null ? "" : originalName.replace('\\', '/');
		fileName = fileName.substring(fileName.lastIndexOf('/') + 1).trim();
		if (fileName.length() > 255) {
			fileName = fileName.substring(fileName.length() - 255);
		}
		return fileName;
	}

	private LocalDateTime parseDeadline(String deadline) {
		if (deadline == null || deadline.isBlank()) {
			return null;
		}
		try {
			return LocalDateTime.parse(deadline);
		} catch (DateTimeParseException exception) {
			throw badRequest("Hạn nộp không hợp lệ");
		}
	}

	private ResponseStatusException badRequest(String message) {
		return new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
	}

	private ResponseStatusException notFound(String message) {
		return new ResponseStatusException(HttpStatus.NOT_FOUND, message);
	}

	private ResponseStatusException forbidden() {
		return new ResponseStatusException(HttpStatus.FORBIDDEN, "Bạn không có quyền truy cập nội dung này");
	}
}
