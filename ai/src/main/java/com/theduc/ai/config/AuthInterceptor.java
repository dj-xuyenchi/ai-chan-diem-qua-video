package com.theduc.ai.config;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;

import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

import com.theduc.ai.controller.AuthController;

@Component
public class AuthInterceptor implements HandlerInterceptor {

	@Override
	public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler)
			throws Exception {
		if ("OPTIONS".equalsIgnoreCase(request.getMethod())) {
			return true;
		}

		HttpSession session = request.getSession(false);
		if (session == null || !(session.getAttribute(AuthController.SESSION_USER_ID) instanceof Long)) {
			response.sendError(HttpServletResponse.SC_UNAUTHORIZED);
			return false;
		}
		if (Boolean.TRUE.equals(session.getAttribute(AuthController.SESSION_MUST_CHANGE_PASSWORD))) {
			response.sendError(HttpServletResponse.SC_FORBIDDEN, "Vui lòng đổi mật khẩu trước khi tiếp tục");
			return false;
		}
		if (!"GIAO_VIEN".equals(session.getAttribute(AuthController.SESSION_USER_ROLE))) {
			String requestUri = request.getRequestURI();
			boolean classroomPath = "/api/lop-hoc".equals(requestUri)
					|| requestUri.startsWith("/api/lop-hoc/");
			boolean studentRead = classroomPath && "GET".equalsIgnoreCase(request.getMethod());
			boolean studentSubmission = "HOC_SINH".equals(session.getAttribute(AuthController.SESSION_USER_ROLE))
					&& request.getMethod().equalsIgnoreCase("POST")
					&& requestUri.matches("^/api/lop-hoc/\\d+/bai-tap/\\d+/bai-nop$");
			if (!studentRead && !studentSubmission) {
				response.sendError(HttpServletResponse.SC_FORBIDDEN);
				return false;
			}
		}
		if (!"GET".equalsIgnoreCase(request.getMethod())) {
			String expectedToken = (String) session.getAttribute(AuthController.SESSION_CSRF_TOKEN);
			String csrfToken = request.getHeader("X-CSRF-TOKEN");
			if (expectedToken == null || csrfToken == null
					|| !MessageDigest.isEqual(
							expectedToken.getBytes(StandardCharsets.UTF_8),
							csrfToken.getBytes(StandardCharsets.UTF_8))) {
				response.sendError(HttpServletResponse.SC_FORBIDDEN);
				return false;
			}
		}
		return true;
	}
}
