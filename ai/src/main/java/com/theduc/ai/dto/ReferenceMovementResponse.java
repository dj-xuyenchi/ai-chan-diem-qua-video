package com.theduc.ai.dto;

public record ReferenceMovementResponse(
		int movementNumber,
		double startSeconds,
		double endSeconds,
		double durationSeconds,
		String focus) {
}
