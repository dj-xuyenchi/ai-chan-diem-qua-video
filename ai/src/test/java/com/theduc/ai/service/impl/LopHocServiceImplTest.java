package com.theduc.ai.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicReference;

import com.theduc.ai.dto.MovementScoreResponse;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.ObjectMapper;
import com.theduc.ai.dto.AiDanhGiaResponse;
import com.theduc.ai.dto.BaiTapVideoResponse;
import com.theduc.ai.dto.ReferenceAnalysisResponse;
import com.theduc.ai.dto.ReferenceMovementResponse;
import com.theduc.ai.entity.BaiNopVideo;
import com.theduc.ai.entity.BaiTapVideo;
import com.theduc.ai.entity.NguoiDung;
import com.theduc.ai.entity.LopHoc;
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
			87.5, 8.2, 95.0, "test", 5, 4, 1, 2.0, List.of());
	private final List<ReferenceMovementResponse> referenceMovements = List.of(
			new ReferenceMovementResponse(1, 0.0, 2.0, 2.0, "đầu gối"),
			new ReferenceMovementResponse(2, 2.1, 4.0, 1.9, "hông"),
			new ReferenceMovementResponse(3, 4.1, 6.0, 1.9, "vai"),
			new ReferenceMovementResponse(4, 6.1, 8.0, 1.9, "khuỷu tay"),
			new ReferenceMovementResponse(5, 8.1, 10.0, 1.9, "toàn thân"));

	@BeforeEach
	void setUp() throws Exception {
		service = new LopHocServiceImpl(
				lopHocRepository,
				thanhVienLopRepository,
				baiTapVideoRepository,
				baiNopVideoRepository,
				nguoiDungRepository,
				videoStorageService,
				aiVideoScoringService,
				new ObjectMapper());
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

		lenient().when(nguoiDungRepository.findById(anyLong())).thenAnswer(invocation ->
				Optional.of(invocation.getArgument(0).equals(10L) ? teacher : student));
	}

	@Test
	void submissionRunsAiAndReturnsTheSavedSuggestionWithoutGrading() throws Exception {
		stubSubmissionDependencies();
		when(aiVideoScoringService.evaluate("reference.video", "submission.video", List.of(), 70))
				.thenReturn(evaluation);

		BaiTapVideoResponse response = service.nopBai(1L, 2L, video(), 20L);

		assertEquals("DA_DANH_GIA", response.getBaiNop().get(0).getTrangThaiAi());
		assertEquals(evaluation, response.getBaiNop().get(0).getAiDanhGia());
		assertNull(response.getBaiNop().get(0).getDiem());
	}

	@Test
	void aiFailureKeepsTheSubmissionAndReturnsRetryableFailureState() throws Exception {
		stubSubmissionDependencies();
		when(aiVideoScoringService.evaluate("reference.video", "submission.video", List.of(), 70))
				.thenThrow(new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Python chưa sẵn sàng"));

		BaiTapVideoResponse response = service.nopBai(1L, 2L, video(), 20L);

		assertNotNull(savedSubmission.get());
		assertEquals("LOI", response.getBaiNop().get(0).getTrangThaiAi());
		assertEquals("Python chưa sẵn sàng", response.getBaiNop().get(0).getLoiDanhGiaAi());
		assertNull(response.getBaiNop().get(0).getDiem());
	}

	@Test
	void teacherCanPreviewFiveReferenceMovementsWithoutSavingAnAssignment() throws Exception {
		LopHoc classroom = new LopHoc("TLU001", "Lớp thử", 10L);
		classroom.setId(1L);
		when(lopHocRepository.findById(1L)).thenReturn(Optional.of(classroom));
		when(videoStorageService.store(any())).thenReturn("temporary.video");
		when(aiVideoScoringService.analyzeReference("temporary.video", 5, null))
				.thenReturn(new ReferenceAnalysisResponse(5, referenceMovements, "Phân tích mẫu", 95.0, 10.0));

		ReferenceAnalysisResponse response = service.phanTichVideoMau(1L, 5, video(), 10L);

		assertEquals(5, response.movements().size());
		verify(videoStorageService).delete("temporary.video");
	}

	@Test
	void storedMovementDetailsRemainReadableAfterRemovingLegacySpeedFields() throws Exception {
		String legacyJson = """
				[{"movementNumber":1,"passed":true,"similarityPercent":90.0,
				"pointsAwarded":2.0,"maxPoints":2.0,"referenceDurationSeconds":2.0,
				"submissionDurationSeconds":2.1,"speedDifferencePercent":5.0,
				"speedAssessment":"SIMILAR","focus":"toàn thân","explanation":"Đạt"}]
				""";

		List<MovementScoreResponse> movements = new ObjectMapper().readValue(
				legacyJson, new TypeReference<List<MovementScoreResponse>>() {});

		assertEquals(1, movements.size());
		assertEquals(90.0, movements.get(0).similarityPercent());
		assertNull(movements.get(0).passThresholdPercent());
		assertEquals("Đạt", movements.get(0).explanation());
	}

	@Test
	void assignmentSavesTeacherConfirmedReferenceMovementsBeforeReturning() throws Exception {
		LopHoc classroom = new LopHoc("TLU001", "Lớp thử", 10L);
		classroom.setId(1L);
		when(lopHocRepository.findById(1L)).thenReturn(Optional.of(classroom));
		when(videoStorageService.store(any())).thenReturn("reference.video");
		when(aiVideoScoringService.analyzeReference("reference.video", 5, referenceMovements))
				.thenReturn(new ReferenceAnalysisResponse(5, referenceMovements, "Phân tích mẫu", 95.0, 10.0));
		when(baiTapVideoRepository.saveAndFlush(any())).thenAnswer(invocation -> {
			BaiTapVideo savedAssignment = invocation.getArgument(0);
			savedAssignment.setId(2L);
			return savedAssignment;
		});

		BaiTapVideoResponse response = service.taoBaiTap(
				1L, "Bài tập", "", "", 5, 60,
				new tools.jackson.databind.ObjectMapper().writeValueAsString(referenceMovements),
				video(), 10L);

		verify(aiVideoScoringService).analyzeReference("reference.video", 5, referenceMovements);
		assertEquals(5, response.getAiDongTacMau().size());
		assertEquals("Phân tích mẫu", response.getAiMoTaDongTacMau());
		assertEquals(60, response.getAiNguongDatPercent());
	}

	private void stubSubmissionDependencies() throws Exception {
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
	}

	private MockMultipartFile video() {
		return new MockMultipartFile("video", "submission.mp4", "video/mp4", new byte[] {1, 2, 3});
	}
}
