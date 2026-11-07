package com.theduc.ai.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@JsonIgnoreProperties(ignoreUnknown = true)
public record MovementScoreResponse(
		int movementNumber,
		boolean passed,
		double similarityPercent,
		double pointsAwarded,
		double maxPoints,
		Double passThresholdPercent,
		String focus,
		String explanation) {
}
