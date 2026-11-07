package com.theduc.ai.controller;

import static org.junit.jupiter.api.Assertions.assertEquals;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.web.server.ResponseStatusException;

class ApiExceptionHandlerTest {

	@Test
	void responseStatusExceptionsReturnTheirReasonAsAnApiMessage() {
		ApiExceptionHandler handler = new ApiExceptionHandler();
		MockHttpServletRequest request = new MockHttpServletRequest();
		request.setRequestURI("/api/lop-hoc/2/bai-tap");

		var response = handler.handleResponseStatusException(
				new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY, "Mốc thời gian không hợp lệ"),
				request);

		assertEquals(HttpStatus.UNPROCESSABLE_ENTITY, response.getStatusCode());
		assertEquals("Mốc thời gian không hợp lệ", response.getBody().message());
		assertEquals("/api/lop-hoc/2/bai-tap", response.getBody().path());
	}
}
