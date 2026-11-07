package com.theduc.ai.entity;

import java.util.List;

import com.theduc.ai.dto.AiDanhGiaResponse;
import com.theduc.ai.dto.MovementScoreResponse;

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

	@Column(name = "ai_diem_goi_y")
	private Double suggestedScore;

	@Column(name = "ai_do_tin_cay")
	private Double confidencePercent;

	@Column(name = "ai_giai_thich", columnDefinition = "text")
	private String scoreBreakdown;

	@Column(name = "ai_so_dong_tac")
	private Integer movementCount;

	@Column(name = "ai_so_dong_tac_dung")
	private Integer correctMovementCount;

	@Column(name = "ai_so_dong_tac_sai")
	private Integer incorrectMovementCount;

	@Column(name = "ai_diem_moi_dong_tac")
	private Double pointsPerMovement;

	@Column(name = "ai_chi_tiet_dong_tac", columnDefinition = "text")
	private String movementDetailsJson;

	public static DanhGiaAiVideo from(AiDanhGiaResponse response, String movementDetailsJson) {
		DanhGiaAiVideo evaluation = new DanhGiaAiVideo();
		evaluation.setSimilarityPercent(response.similarityPercent());
		evaluation.setSuggestedScore(response.suggestedScore());
		evaluation.setConfidencePercent(response.confidencePercent());
		evaluation.setScoreBreakdown(response.scoreBreakdown());
		evaluation.setMovementCount(response.movementCount());
		evaluation.setCorrectMovementCount(response.correctMovementCount());
		evaluation.setIncorrectMovementCount(response.incorrectMovementCount());
		evaluation.setPointsPerMovement(response.pointsPerMovement());
		evaluation.setMovementDetailsJson(movementDetailsJson);
		return evaluation;
	}

	public AiDanhGiaResponse toResponse(List<MovementScoreResponse> movements) {
		return new AiDanhGiaResponse(
				similarityPercent,
				suggestedScore,
				confidencePercent,
				scoreBreakdown,
				movementCount == null ? 0 : movementCount,
				correctMovementCount == null ? 0 : correctMovementCount,
				incorrectMovementCount == null ? 0 : incorrectMovementCount,
				pointsPerMovement == null ? 0 : pointsPerMovement,
				movements);
	}
}
