"use client";

import type { AuthUser } from "../domain/AuthUser";
import { Icon } from "./Icon";

type ProfileOverviewProps = {
  user: AuthUser;
  onOpenOverview: () => void;
};

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(-2)
    .map((part) => part[0])
    .join("")
    .toLocaleUpperCase("vi");
}

export function ProfileOverview({ user, onOpenOverview }: ProfileOverviewProps) {
  const role = user.loaiNguoiDung === "GIAO_VIEN" ? "Giáo viên" : "Học sinh";

  return (
    <section className="account-overview" aria-label="Hồ sơ cá nhân">
      <article className="account-profile-hero">
        <div className="account-profile-avatar" aria-hidden="true">{initials(user.hoTen)}</div>
        <div className="account-profile-copy">
          <span className="account-eyebrow">TÀI KHOẢN CỦA TÔI</span>
          <h2>{user.hoTen}</h2>
          <p>{role} <span>·</span> ID {user.id}</p>
        </div>
        <span className="account-status"><i /> Đang hoạt động</span>
      </article>

      <div className="learning-overview-metrics account-metrics">
        <article>
          <span className="learning-metric-icon metric-purple"><Icon name="users" size={18} /></span>
          <div><strong>{role}</strong><span>Vai trò trong hệ thống</span></div>
        </article>
        <article>
          <span className="learning-metric-icon metric-blue"><Icon name="calendar" size={18} /></span>
          <div><strong>#{user.id}</strong><span>Mã tài khoản</span></div>
        </article>
        <article>
          <span className="learning-metric-icon metric-green"><Icon name="settings" size={18} /></span>
          <div><strong>{user.doiMatKhauLanDau ? "Cần cập nhật" : "Đã bảo vệ"}</strong><span>Trạng thái mật khẩu</span></div>
        </article>
      </div>

      <section className="panel learning-section account-details">
        <div className="learning-section-heading">
          <div><h2>Thông tin tài khoản</h2><p>Thông tin hồ sơ hiện được sử dụng để đăng nhập và nhận diện trong lớp học.</p></div>
        </div>
        <dl>
          <div><dt>Họ và tên</dt><dd>{user.hoTen}</dd></div>
          <div><dt>Email đăng nhập</dt><dd>{user.email}</dd></div>
          <div><dt>Vai trò</dt><dd>{role}</dd></div>
          <div><dt>Mã người dùng</dt><dd>#{user.id}</dd></div>
        </dl>
      </section>

      <section className="account-next-step">
        <span className="account-next-icon"><Icon name="grid" size={19} /></span>
        <div><strong>Sẵn sàng tiếp tục?</strong><p>Xem nhanh lớp học, bài tập và hoạt động học tập của bạn.</p></div>
        <button className="button button-primary" type="button" onClick={onOpenOverview}>Về tổng quan <Icon name="chevron" size={15} /></button>
      </section>
    </section>
  );
}
