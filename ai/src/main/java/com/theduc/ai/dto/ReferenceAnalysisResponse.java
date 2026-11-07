package com.theduc.ai.dto;

import java.util.List;

public record ReferenceAnalysisResponse(
		int movementCount,
		List<ReferenceMovementResponse> movements,
		String explanation,
		double confidencePercent,
		double durationSeconds) {
}
