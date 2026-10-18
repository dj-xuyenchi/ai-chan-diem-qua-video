import { API_BASE_URL } from "../config/api";
import type { AuthUser } from "../domain/AuthUser";
import { ApiError, apiRequest } from "./apiRequest";
import { setCsrfToken } from "./sessionToken";

function setSession(user: AuthUser) {
  setCsrfToken(user.csrfToken);
  return user;
}

export async function getCurrentUser() {
  try {
    return setSession(await apiRequest<AuthUser>(`${API_BASE_URL}/auth/hien-tai`));
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      setCsrfToken("");
      return null;
    }
    throw error;
  }
}

export async function login(email: string, matKhau: string) {
  try {
    const user = await apiRequest<AuthUser>(`${API_BASE_URL}/auth/dang-nhap`, {
      method: "POST",
      body: JSON.stringify({ email, matKhau }),
    });
    return setSession(user);
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      throw new Error("Email hoặc mật khẩu không đúng.");
    }
    throw error;
  }
}

export async function changePassword(matKhauMoi: string) {
  const user = await apiRequest<AuthUser>(`${API_BASE_URL}/auth/doi-mat-khau`, {
    method: "POST",
    body: JSON.stringify({ matKhauMoi }),
  });
  return setSession(user);
}

export async function logout() {
  await apiRequest<void>(`${API_BASE_URL}/auth/dang-xuat`, { method: "POST" });
  setCsrfToken("");
}
