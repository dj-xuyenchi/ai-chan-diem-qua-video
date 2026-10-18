package com.theduc.ai.util;

import java.security.GeneralSecurityException;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.Base64;

import javax.crypto.SecretKeyFactory;
import javax.crypto.spec.PBEKeySpec;

public final class MatKhauUtil {

	private static final String ALGORITHM = "PBKDF2WithHmacSHA256";
	private static final int ITERATIONS = 310_000;
	private static final int KEY_LENGTH = 256;
	private static final int SALT_LENGTH = 16;
	private static final String PASSWORD_ALPHABET =
			"ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%&*+-_";
	private static final SecureRandom SECURE_RANDOM = new SecureRandom();

	private MatKhauUtil() {
	}

	public static String bam(String matKhau) {
		byte[] salt = new byte[SALT_LENGTH];
		SECURE_RANDOM.nextBytes(salt);
		PBEKeySpec keySpec = new PBEKeySpec(matKhau.toCharArray(), salt, ITERATIONS, KEY_LENGTH);
		try {
			byte[] hash = SecretKeyFactory.getInstance(ALGORITHM)
					.generateSecret(keySpec)
					.getEncoded();
			return "pbkdf2-sha256$" + ITERATIONS + "$"
					+ Base64.getEncoder().withoutPadding().encodeToString(salt) + "$"
					+ Base64.getEncoder().withoutPadding().encodeToString(hash);
		} catch (GeneralSecurityException exception) {
			throw new IllegalStateException("Không thể băm mật khẩu", exception);
		} finally {
			keySpec.clearPassword();
		}
	}

	public static boolean xacMinh(String matKhau, String hashLuuTru) {
		if (matKhau == null) {
			return false;
		}

		String[] parts = hashLuuTru == null ? new String[0] : hashLuuTru.split("\\$", -1);
		int iterations = ITERATIONS;
		byte[] salt = new byte[SALT_LENGTH];
		byte[] expectedHash = new byte[KEY_LENGTH / 8];
		boolean validFormat = parts.length == 4 && "pbkdf2-sha256".equals(parts[0]);
		if (validFormat) {
			try {
				iterations = Integer.parseInt(parts[1]);
				salt = Base64.getDecoder().decode(parts[2]);
				expectedHash = Base64.getDecoder().decode(parts[3]);
				validFormat = iterations >= 100_000 && iterations <= 1_000_000
						&& salt.length >= 16 && salt.length <= 64
						&& expectedHash.length == KEY_LENGTH / 8;
			} catch (IllegalArgumentException exception) {
				validFormat = false;
			}
		}
		if (!validFormat) {
			iterations = ITERATIONS;
			salt = new byte[SALT_LENGTH];
			expectedHash = new byte[KEY_LENGTH / 8];
		}

		byte[] actualHash = derive(matKhau, salt, iterations);
		return validFormat && MessageDigest.isEqual(expectedHash, actualHash);
	}

	public static String taoMatKhauNgauNhien() {
		int length = 12 + SECURE_RANDOM.nextInt(7);
		StringBuilder matKhau = new StringBuilder(length);
		for (int index = 0; index < length; index++) {
			matKhau.append(PASSWORD_ALPHABET.charAt(SECURE_RANDOM.nextInt(PASSWORD_ALPHABET.length())));
		}
		return matKhau.toString();
	}

	private static byte[] derive(String matKhau, byte[] salt, int iterations) {
		PBEKeySpec keySpec = new PBEKeySpec(matKhau.toCharArray(), salt, iterations, KEY_LENGTH);
		try {
			return SecretKeyFactory.getInstance(ALGORITHM).generateSecret(keySpec).getEncoded();
		} catch (GeneralSecurityException exception) {
			throw new IllegalStateException("Không thể xác minh mật khẩu", exception);
		} finally {
			keySpec.clearPassword();
		}
	}
}
