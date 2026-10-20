package com.theduc.ai.service;

import org.springframework.core.io.Resource;

public record StoredVideo(Resource resource, String contentType, String fileName) {
}
