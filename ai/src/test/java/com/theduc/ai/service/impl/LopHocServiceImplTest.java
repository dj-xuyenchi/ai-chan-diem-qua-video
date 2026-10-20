package com.theduc.ai.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicReference;

import com.theduc.ai.dto.AiDanhGiaResponse;
import com.theduc.ai.dto.BaiTapVideoResponse;
import com.theduc.ai.entity.BaiNopVideo;
import com.theduc.ai.entity.BaiTapVideo;
import com.theduc.ai.entity.NguoiDung;
import com.theduc.ai.repository.BaiNopVideoRepository;
import com.theduc.ai.repository.BaiTapVideoRepository;
import com.theduc.ai.repository.LopHocRepository;
import com.theduc.ai.repository.NguoiDungRepository;
import com.theduc.ai.repository.ThanhVienLopRepository;
import com.theduc.ai.service.AiVideoScoringService;
import com.theduc.ai.service.VideoStorageService;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.server.ResponseStatusException;

@ExtendWith(MockitoExtension.class)
class LopHocServiceImplTest {

	@Mock
	private LopHocRepository lopHocRepository;

	@Mock
	private ThanhVienLopRepository thanhVienLopRepository;

	@Mock
	private BaiTapVideoRepository baiTapVideoRepository;

	@Mock
	private BaiNopVideoRepository baiNopVideoRepository;

	@Mock
	private NguoiDungRepository nguoiDungRepository;

	@Mock
	private VideoStorageService videoStorageService;

	@Mock
	private AiVideoScoringService aiVideoScoringService;

	private LopHocServiceImpl service;
	private BaiTapVideo assignment;
	private final AtomicReference<BaiNopVideo> savedSubmission = new AtomicReference<>();
	private final AiDanhGiaResponse evaluation = new AiDanhGiaResponse(
			87.5, 12.0, "SLOWER", 8.2, 95.0, 10.0, 11.2, "test");

	@BeforeEach
	void setUp() throws Exception {
		service = new LopHocServiceImpl(
				lopHocRepository,
				thanhVienLopRepository,
				baiTapVideoRepository,
				baiNopVideoRepository,
				nguoiDungRepository,
				videoStorageService,
				aiVideoScoringService);
		ReflectionTestUtils.setField(service, "maxFileSizeBytes", 100 * 1024 * 1024L);

		assignment = new BaiTapVideo();
		assignment.setId(2L);
		assignment.setLopHocId(1L);
		assignment.setTieuDe("Bài tập");
		assignment.setVideoPath("reference.video");
		assignment.setTenVideo("reference.mp4");
		assignment.setLoaiVideo("video/mp4");
		assignment.setGiaoVienId(10L);

		NguoiDung teacher = NguoiDung.builder()
				.hoTen("Giáo viên")
				.email("teacher@example.com")
				.matKhauHash("hash")
				.loaiNguoiDung(com.theduc.ai.constant.LoaiNguoiDung.GIAO_VIEN)
				.gioiTinh(com.theduc.ai.constant.GioiTinh.KHAC)
				.nguoiTaoId(10L)
				.build();
		teacher.setId(10L);
		NguoiDung student = NguoiDung.builder()
				.hoTen("Học sinh")
				.email("student@example.com")
				.maSinhVien("TLU001")
				.matKhauHash("hash")
				.loaiNguoiDung(com.theduc.ai.constant.LoaiNguoiDung.HOC_SINH)
				.gioiTinh(com.theduc.ai.constant.GioiTinh.KHAC)
				.nguoiTaoId(10L)
				.build();
		student.setId(20L);

		when(thanhVienLopRepository.existsByLopHocIdAndHocSinhId(1L, 20L)).thenReturn(true);
		when(baiTapVideoRepository.findById(2L)).thenReturn(Optional.of(assignment));
		when(baiNopVideoRepository.findByBaiTapIdAndHocSinhId(2L, 20L)).thenReturn(Optional.empty());
		when(videoStorageService.store(any())).thenReturn("submission.video");
		when(baiNopVideoRepository.saveAndFlush(any())).thenAnswer(invocation -> {
			BaiNopVideo submission = invocation.getArgument(0);
			submission.setId(30L);
			savedSubmission.set(submission);
			return submission;
		});
		when(baiNopVideoRepository.findAllByBaiTapIdInOrderByNgayNopDesc(anyList()))
				.thenAnswer(invocation -> List.of(savedSubmission.get()));
		when(nguoiDungRepository.findById(anyLong())).thenAnswer(invocation ->
				Optional.of(invocation.getArgument(0).equals(10L) ? teacher : student));
	}

	@Test
	void submissionRunsAiAndReturnsTheSavedSuggestionWithoutGrading() throws Exception {
		when(aiVideoScoringService.evaluate("reference.video", "submission.video")).thenReturn(evaluation);

		BaiTapVideoResponse response = service.nopBai(1L, 2L, video(), 20L);

		assertEquals("DA_DANH_GIA", response.getBaiNop().get(0).getTrangThaiAi());
		assertEquals(evaluation, response.getBaiNop().get(0).getAiDanhGia());
		assertNull(response.getBaiNop().get(0).getDiem());
	}

	@Test
	void aiFailureKeepsTheSubmissionAndReturnsRetryableFailureState() throws Exception {
		when(aiVideoScoringService.evaluate("reference.video", "submission.video"))
				.thenThrow(new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Python chưa sẵn sàng"));

		BaiTapVideoResponse response = service.nopBai(1L, 2L, video(), 20L);

		assertNotNull(savedSubmission.get());
		assertEquals("LOI", response.getBaiNop().get(0).getTrangThaiAi());
		assertEquals("Python chưa sẵn sàng", response.getBaiNop().get(0).getLoiDanhGiaAi());
		assertNull(response.getBaiNop().get(0).getDiem());
	}

	private MockMultipartFile video() {
		return new MockMultipartFile("video", "submission.mp4", "video/mp4", new byte[] {1, 2, 3});
	}
}
