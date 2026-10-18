package com.theduc.ai.util;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;

class MatKhauUtilTest {

	@Test
	void verifiesOnlyTheOriginalPassword() {
		String hash = MatKhauUtil.bam("TestPassword#2026");

		assertTrue(MatKhauUtil.xacMinh("TestPassword#2026", hash));
		assertFalse(MatKhauUtil.xacMinh("WrongPassword#2026", hash));
		assertFalse(MatKhauUtil.xacMinh("TestPassword#2026", null));
	}

	@Test
	void generatesPasswordsWithinTheRequiredLength() {
		for (int index = 0; index < 100; index++) {
			int length = MatKhauUtil.taoMatKhauNgauNhien().length();
			assertTrue(length >= 12 && length <= 18);
		}
	}
}
