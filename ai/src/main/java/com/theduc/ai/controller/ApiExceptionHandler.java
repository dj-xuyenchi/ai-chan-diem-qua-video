package com.theduc.ai.controller;

import java.time.Instant;

import jakarta.servlet.http.HttpServletRequest;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.server.ResponseStatusException;

@RestControllerAdvice
public class ApiExceptionHandler {

	@ExceptionHandler(ResponseStatusException.class)
	public ResponseEntity<ApiErrorResponse> handleResponseStatusException(
			ResponseStatusException exception,
			HttpServletRequest request) {
		int status = exception.getStatusCode().value();
		String error = HttpStatus.resolve(status) == null
				? "Request failed"
				: HttpStatus.valueOf(status).getReasonPhrase();
		ApiErrorResponse body = new ApiErrorResponse(
				Instant.now(),
				status,
				error,
				exception.getReason(),
				request.getRequestURI());
		return ResponseEntity.status(exception.getStatusCode()).body(body);
	}

	public record ApiErrorResponse(
			Instant timestamp,
			int status,
			String error,
			String message,
			String path) {
	}
}
