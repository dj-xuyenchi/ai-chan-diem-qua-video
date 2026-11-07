package com.theduc.ai.dto;

import java.util.List;

public record AiDanhGiaResponse(
		double similarityPercent,
		double suggestedScore,
		double confidencePercent,
		String scoreBreakdown,
		int movementCount,
		int correctMovementCount,
		int incorrectMovementCount,
		double pointsPerMovement,
		List<MovementScoreResponse> movements) {
}
