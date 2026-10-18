"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import type { AuthUser } from "../domain/AuthUser";

type LoginScreenProps = {
  onLogin: (email: string, password: string) => Promise<void>;
  initialError?: string;
};

type PasswordChangeProps = {
  user: AuthUser;
  onChangePassword: (password: string) => Promise<void>;
};

function Brand() {
  return (
    <div className="auth-brand">
      <span className="brand-mark"><span /><span /><span /><span /></span>
      <span className="brand-name">form<span>club</span></span>
    </div>
  );
}

export function LoginScreen({ onLogin, initialError = "" }: LoginScreenProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(initialError);
  const [submitting, setSubmitting] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError("");
    try {
      await onLogin(email.trim(), password);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không thể đăng nhập. Vui lòng thử lại.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="auth-page">
      <div className="auth-decoration auth-decoration-top" />
      <div className="auth-decoration auth-decoration-bottom" />
      <section className="auth-card" aria-labelledby="login-title">
        <Brand />
        <div className="auth-intro">
          <span className="auth-kicker">CỔNG QUẢN LÝ ĐÀO TẠO</span>
          <h1 id="login-title">Chào mừng trở lại</h1>
          <p>Đăng nhập để tiếp tục quản lý lớp học và người dùng.</p>
        </div>
        {error && <div className="auth-error" role="alert">{error}</div>}
        <form className="auth-form" onSubmit={submit}>
          <label>
            Email
            <input
              type="email"
              name="email"
              autoComplete="username"
              required
              maxLength={254}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="name@example.com"
              autoFocus
            />
          </label>
          <label>
            Mật khẩu
            <span className="auth-password-field">
              <input
                type={passwordVisible ? "text" : "password"}
                name="password"
                autoComplete="current-password"
                required
                maxLength={128}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Nhập mật khẩu"
              />
              <button type="button" onClick={() => setPasswordVisible((visible) => !visible)}>
                {passwordVisible ? "Ẩn" : "Hiện"}
              </button>
            </span>
          </label>
          <button className="auth-submit" type="submit" disabled={submitting}>
            {submitting ? "Đang xác thực..." : "Đăng nhập"}
            <span aria-hidden="true">→</span>
          </button>
        </form>
        <p className="auth-security-note"><span /> Kết nối bảo mật · Mật khẩu được mã hóa an toàn</p>
      </section>
      <footer className="auth-footer">© 2026 Formclub · Nền tảng quản lý học tập</footer>
    </main>
  );
}

export function ForcePasswordChangeScreen({ user, onChangePassword }: PasswordChangeProps) {
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    if (password !== confirmation) {
      setError("Hai mật khẩu chưa khớp.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      await onChangePassword(password);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không thể đổi mật khẩu. Vui lòng thử lại.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="auth-page">
      <div className="auth-decoration auth-decoration-top" />
      <div className="auth-decoration auth-decoration-bottom" />
      <section className="auth-card" aria-labelledby="change-password-title">
        <Brand />
        <div className="auth-intro">
          <span className="auth-kicker">BẢO VỆ TÀI KHOẢN</span>
          <h1 id="change-password-title">Tạo mật khẩu mới</h1>
          <p>Xin chào {user.hoTen}, hãy đổi mật khẩu tạm thời để tiếp tục.</p>
        </div>
        {error && <div className="auth-error" role="alert">{error}</div>}
        <form className="auth-form" onSubmit={submit}>
          <label>
            Mật khẩu mới
            <span className="auth-password-field">
              <input
                type={passwordVisible ? "text" : "password"}
                autoComplete="new-password"
                required
                minLength={12}
                maxLength={128}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Tối thiểu 12 ký tự"
                autoFocus
              />
              <button type="button" onClick={() => setPasswordVisible((visible) => !visible)}>
                {passwordVisible ? "Ẩn" : "Hiện"}
              </button>
            </span>
          </label>
          <label>
            Xác nhận mật khẩu
            <input
              type={passwordVisible ? "text" : "password"}
              autoComplete="new-password"
              required
              minLength={12}
              maxLength={128}
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              placeholder="Nhập lại mật khẩu mới"
            />
          </label>
          <p className="auth-password-hint">Mật khẩu mới cần có ít nhất 12 ký tự.</p>
          <button className="auth-submit" type="submit" disabled={submitting}>
            {submitting ? "Đang cập nhật..." : "Cập nhật mật khẩu"}
            <span aria-hidden="true">→</span>
          </button>
        </form>
        <p className="auth-security-note"><span /> Mật khẩu chỉ lưu dưới dạng bản băm an toàn</p>
      </section>
      <footer className="auth-footer">© 2026 Formclub · Nền tảng quản lý học tập</footer>
    </main>
  );
}
