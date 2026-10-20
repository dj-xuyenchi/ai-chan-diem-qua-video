package com.theduc.ai.entity;

import com.theduc.ai.dto.AiDanhGiaResponse;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Embeddable
@Getter
@Setter
@NoArgsConstructor
public class DanhGiaAiVideo {

	@Column(name = "ai_do_tuong_dong")
	private Double similarityPercent;

	@Column(name = "ai_chenh_lech_toc_do")
	private Double speedDifferencePercent;

	@Column(name = "ai_danh_gia_toc_do", length = 20)
	private String speedAssessment;

	@Column(name = "ai_diem_goi_y")
	private Double suggestedScore;

	@Column(name = "ai_do_tin_cay")
	private Double confidencePercent;

	@Column(name = "ai_thoi_luong_mau")
	private Double referenceMovementSeconds;

	@Column(name = "ai_thoi_luong_bai_nop")
	private Double submissionMovementSeconds;

	@Column(name = "ai_giai_thich", columnDefinition = "text")
	private String scoreBreakdown;

	public static DanhGiaAiVideo from(AiDanhGiaResponse response) {
		DanhGiaAiVideo evaluation = new DanhGiaAiVideo();
		evaluation.setSimilarityPercent(response.similarityPercent());
		evaluation.setSpeedDifferencePercent(response.speedDifferencePercent());
		evaluation.setSpeedAssessment(response.speedAssessment());
		evaluation.setSuggestedScore(response.suggestedScore());
		evaluation.setConfidencePercent(response.confidencePercent());
		evaluation.setReferenceMovementSeconds(response.referenceMovementSeconds());
		evaluation.setSubmissionMovementSeconds(response.submissionMovementSeconds());
		evaluation.setScoreBreakdown(response.scoreBreakdown());
		return evaluation;
	}

	public AiDanhGiaResponse toResponse() {
		return new AiDanhGiaResponse(
				similarityPercent,
				speedDifferencePercent,
				speedAssessment,
				suggestedScore,
				confidencePercent,
				referenceMovementSeconds,
				submissionMovementSeconds,
				scoreBreakdown);
	}
}
