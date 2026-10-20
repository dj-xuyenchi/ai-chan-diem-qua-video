package com.theduc.ai.dto;

public record AiDanhGiaResponse(
		double similarityPercent,
		double speedDifferencePercent,
		String speedAssessment,
		double suggestedScore,
		double confidencePercent,
		double referenceMovementSeconds,
		double submissionMovementSeconds,
		String scoreBreakdown) {
}
