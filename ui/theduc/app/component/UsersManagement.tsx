"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { createUser, deleteUser, getUsers, updateUser } from "../api/userApi";
import type { UserKind, UserMutation, UserRecord } from "../domain/User";
import { formatDate } from "../utils/date";
import { Icon } from "./Icon";

type UsersManagementProps = {
  query: string;
  setQuery: (query: string) => void;
  notify: (message: string) => void;
  operatorUserId: number;
};

const kindLabels: Record<UserKind, string> = {
  GIAO_VIEN: "Giáo viên",
  HOC_SINH: "Sinh viên",
};

const genderLabels: Record<UserRecord["gioiTinh"], string> = {
  NAM: "Nam",
  NU: "Nữ",
  KHAC: "Khác",
};

const PAGE_SIZE = 20;

export function UsersManagement({ query, setQuery, notify, operatorUserId }: UsersManagementProps) {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [activeKind, setActiveKind] = useState<UserKind>("HOC_SINH");
  const [pagination, setPagination] = useState({ page: 1, query, kind: "HOC_SINH" as UserKind });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserRecord | null>(null);
  const [userToDelete, setUserToDelete] = useState<UserRecord | null>(null);
  const [newAccountCredential, setNewAccountCredential] = useState<{ email: string; password: string } | null>(null);

  const fetchUsers = useCallback(async () => {
      const [teachers, students] = await Promise.all([
        getUsers("GIAO_VIEN"),
        getUsers("HOC_SINH"),
      ]);
      return [
        ...teachers.map((user) => ({ ...user, loaiNguoiDung: "GIAO_VIEN" as const })),
        ...students.map((user) => ({ ...user, loaiNguoiDung: "HOC_SINH" as const })),
      ];
  }, []);

  useEffect(() => {
    let active = true;
    void fetchUsers()
      .then((loadedUsers) => {
        if (active) setUsers(loadedUsers);
      })
      .catch((error: unknown) => {
        if (active) {
          setLoadError(error instanceof Error ? error.message : "Không thể tải danh sách người dùng.");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [fetchUsers]);

  async function reloadUsers() {
    setLoading(true);
    setLoadError("");
    try {
      setUsers(await fetchUsers());
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Không thể tải danh sách người dùng.");
    } finally {
      setLoading(false);
    }
  }

  const kindUsers = useMemo(
    () => users.filter((user) => user.loaiNguoiDung === activeKind),
    [users, activeKind],
  );
  const visibleUsers = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("vi");
    return kindUsers.filter((user) =>
      `${user.id} ${user.hoTen} ${user.email} ${user.maSinhVien ?? ""}`
        .toLocaleLowerCase("vi")
        .includes(normalizedQuery),
    );
  }, [kindUsers, query]);
  const pageCount = Math.max(1, Math.ceil(visibleUsers.length / PAGE_SIZE));
  const requestedPage = pagination.query === query && pagination.kind === activeKind ? pagination.page : 1;
  const currentPage = Math.min(requestedPage, pageCount);
  const paginatedUsers = visibleUsers.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  function setPage(nextPage: number) {
    setPagination({ page: nextPage, query, kind: activeKind });
  }

  function openModal(user?: UserRecord) {
    setEditingUser(user ?? null);
    setModalOpen(true);
  }

  function closeModal() {
    if (saving) return;
    setModalOpen(false);
    setEditingUser(null);
  }

  async function saveUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;

    const formData = new FormData(event.currentTarget);
    const password = String(formData.get("matKhau") ?? "");
    const payload: UserMutation = {
      hoTen: String(formData.get("hoTen") ?? "").trim(),
      ngaySinh: String(formData.get("ngaySinh") ?? ""),
      email: String(formData.get("email") ?? "").trim(),
      soDienThoai: String(formData.get("soDienThoai") ?? "").trim(),
      gioiTinh: String(formData.get("gioiTinh") ?? "KHAC") as UserRecord["gioiTinh"],
      ...(password ? { matKhau: password } : {}),
      ...(activeKind === "HOC_SINH"
        ? { maSinhVien: String(formData.get("maSinhVien") ?? "").trim() }
        : {}),
      ...(editingUser
        ? { nguoiCapNhatId: operatorUserId }
        : { nguoiTaoId: operatorUserId }),
    };

    setSaving(true);
    try {
      const savedUser = editingUser
        ? await updateUser(activeKind, editingUser.id, payload)
        : await createUser(activeKind, payload);
      const { matKhauTamThoi, ...userWithoutTemporaryPassword } = savedUser;
      const savedUserWithKind = { ...userWithoutTemporaryPassword, loaiNguoiDung: activeKind };
      setUsers((current) =>
        editingUser
          ? current.map((user) => user.id === editingUser.id ? savedUserWithKind : user)
          : [savedUserWithKind, ...current],
      );
      notify(editingUser ? "Đã cập nhật người dùng." : "Đã tạo người dùng.");
      if (matKhauTamThoi) {
        setNewAccountCredential({ email: savedUser.email, password: matKhauTamThoi });
      }
      setModalOpen(false);
      setEditingUser(null);
      setQuery("");
      setPage(1);
    } catch (error) {
      notify(error instanceof Error ? error.message : "Không thể lưu người dùng.");
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!userToDelete) return;
    try {
      await deleteUser(userToDelete.loaiNguoiDung, userToDelete.id);
      setUsers((current) => current.filter((user) => user.id !== userToDelete.id));
      notify(`Đã xóa ${kindLabels[userToDelete.loaiNguoiDung].toLocaleLowerCase("vi")} ${userToDelete.hoTen}.`);
      setUserToDelete(null);
    } catch (error) {
      notify(error instanceof Error ? error.message : "Không thể xóa người dùng.");
    }
  }

  return (
    <>
      <section className="panel students-panel">
        <div className="students-heading">
          <div>
            <div className="members-title">
              <h2>Danh sách {kindLabels[activeKind].toLocaleLowerCase("vi")}</h2>
              <span className="member-count">{kindUsers.length}</span>
            </div>
            <p>Quản lý hồ sơ giáo viên và sinh viên.</p>
          </div>
          <div className="management-heading-actions">
            <label className="table-search student-search">
              <Icon name="search" size={16} />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Tìm theo ID, mã, họ tên, email..."
                aria-label="Tìm người dùng"
              />
            </label>
            <button className="button button-primary" onClick={() => openModal()}>
              <Icon name="plus" size={16} /> Thêm {kindLabels[activeKind].toLocaleLowerCase("vi")}
            </button>
          </div>
        </div>

        <div className="user-kind-switch" role="tablist" aria-label="Loại người dùng">
          {(["HOC_SINH", "GIAO_VIEN"] as const).map((kind) => (
            <button
              key={kind}
              type="button"
              role="tab"
              aria-selected={activeKind === kind}
              className={activeKind === kind ? "user-kind-active" : ""}
              onClick={() => setActiveKind(kind)}
            >
              {kindLabels[kind]} <span>{users.filter((user) => user.loaiNguoiDung === kind).length}</span>
            </button>
          ))}
        </div>

        {loadError ? (
          <div className="user-load-error" role="alert">
            <p>Không tải được danh sách từ máy chủ: {loadError}</p>
            <button className="button button-secondary" onClick={() => void reloadUsers()}>Thử tải lại</button>
          </div>
        ) : (
          <>
            <div className="table-scroll student-table-scroll">
              <table className="student-table user-table">
                <thead>
                  <tr>
                    <th>STT</th>
                    {activeKind === "HOC_SINH" && <th>MÃ SINH VIÊN</th>}
                    <th>HỌ TÊN</th>
                    <th>EMAIL</th>
                    <th>NGÀY SINH</th>
                    <th>GIỚI TÍNH</th>
                    <th>SỐ ĐIỆN THOẠI</th>
                    <th>MẬT KHẨU</th>
                    <th>NGÀY TẠO</th>
                    <th>NGƯỜI TẠO</th>
                    <th>NGÀY CẬP NHẬT</th>
                    <th>NGƯỜI CẬP NHẬT</th>
                    <th>THAO TÁC</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={activeKind === "HOC_SINH" ? 13 : 12} className="empty-state">Đang tải dữ liệu...</td></tr>
                  ) : paginatedUsers.length > 0 ? paginatedUsers.map((user, index) => (
                    <tr key={`${user.loaiNguoiDung}-${user.id}`}>
                      <td>{(currentPage - 1) * PAGE_SIZE + index + 1}</td>
                      {activeKind === "HOC_SINH" && <td><span className="student-id">{user.maSinhVien}</span></td>}
                      <td><strong className="student-name">{user.hoTen}</strong></td>
                      <td className="student-email">{user.email}</td>
                      <td>{formatDate(user.ngaySinh)}</td>
                      <td>{genderLabels[user.gioiTinh]}</td>
                      <td>{user.soDienThoai || "—"}</td>
                      <td><span className="password-state">{user.daCoMatKhau ? "Đã thiết lập" : "Chưa thiết lập"}</span></td>
                      <td>{formatDate(user.ngayTao)}</td>
                      <td>{user.nguoiTaoId}</td>
                      <td>{formatDate(user.ngayCapNhat)}</td>
                      <td>{user.nguoiCapNhatId ?? "—"}</td>
                      <td>
                        <div className="student-actions">
                          <button className="student-action-button" aria-label={`Chỉnh sửa ${user.hoTen}`} onClick={() => openModal(user)}>
                            <Icon name="edit" size={16} />
                          </button>
                          <button className="student-action-button student-delete-button" aria-label={`Xóa ${user.hoTen}`} onClick={() => setUserToDelete(user)}>
                            <Icon name="trash" size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )) : (
                    <tr><td colSpan={activeKind === "HOC_SINH" ? 13 : 12} className="empty-state">Không tìm thấy người dùng phù hợp.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="table-footer">
              <span>Hiển thị <strong>{visibleUsers.length ? (currentPage - 1) * PAGE_SIZE + 1 : 0}–{Math.min(currentPage * PAGE_SIZE, visibleUsers.length)}</strong> trong <strong>{visibleUsers.length}</strong> kết quả ({kindUsers.length} {kindLabels[activeKind].toLocaleLowerCase("vi")})</span>
              <div>
                <button type="button" aria-label="Trang trước" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}><Icon name="chevron" size={13} className="previous-chevron" /></button>
                <span className="page-number">{currentPage} / {pageCount}</span>
                <button type="button" aria-label="Trang sau" disabled={currentPage === pageCount} onClick={() => setPage(currentPage + 1)}><Icon name="chevron" size={13} /></button>
              </div>
              <span className="student-table-note">Mật khẩu mới chỉ hiển thị một lần sau khi tạo.</span>
            </div>
          </>
        )}
      </section>

      {modalOpen && (
        <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) closeModal(); }}>
          <section className="member-modal student-modal user-modal" role="dialog" aria-modal="true" aria-labelledby="user-modal-title">
            <div className="modal-heading">
              <div>
                <span className="modal-icon"><Icon name="users" size={20} /></span>
                <div>
                  <h2 id="user-modal-title">{editingUser ? "Cập nhật" : "Thêm"} {kindLabels[activeKind].toLocaleLowerCase("vi")}</h2>
                  <p>{editingUser ? `Cập nhật hồ sơ ID ${editingUser.id}.` : "Nhập thông tin hồ sơ người dùng."}</p>
                </div>
              </div>
              <button className="subtle-icon-button" aria-label="Đóng" onClick={closeModal}><Icon name="close" /></button>
            </div>
            <form onSubmit={saveUser}>
              <label>Họ và tên
                <input name="hoTen" required maxLength={100} defaultValue={editingUser?.hoTen ?? ""} placeholder="Ví dụ: Nguyễn Minh Anh" autoFocus />
              </label>
              {activeKind === "HOC_SINH" && (
                <label>Mã sinh viên
                  <input name="maSinhVien" required maxLength={50} defaultValue={editingUser?.maSinhVien ?? ""} placeholder="Ví dụ: TLU2026001" />
                </label>
              )}
              <div className="student-form-row">
                <label>Email
                  <input name="email" type="email" required maxLength={254} defaultValue={editingUser?.email ?? ""} placeholder="ten.hd.ma@tlu.com.vn" />
                </label>
                <label>Số điện thoại
                  <input name="soDienThoai" maxLength={20} defaultValue={editingUser?.soDienThoai ?? ""} placeholder="0901234567" />
                </label>
              </div>
              <div className="student-form-row">
                <label>Ngày sinh
                  <input name="ngaySinh" type="date" required defaultValue={editingUser?.ngaySinh ?? ""} />
                </label>
                <label>Giới tính
                  <select name="gioiTinh" defaultValue={editingUser?.gioiTinh ?? "KHAC"}>
                    <option value="NAM">Nam</option>
                    <option value="NU">Nữ</option>
                    <option value="KHAC">Khác</option>
                  </select>
                </label>
              </div>
              {editingUser ? (
                <>
                  <label>Mật khẩu mới (để trống nếu không đổi)
                    <input name="matKhau" type="password" autoComplete="new-password" minLength={12} maxLength={128} />
                  </label>
                  <p className="password-help">Đặt mật khẩu mới sẽ yêu cầu người dùng đổi mật khẩu ở lần đăng nhập kế tiếp.</p>
                </>
              ) : (
                <p className="password-help">Hệ thống tự tạo mật khẩu ngẫu nhiên dài 12–18 ký tự. Người dùng sẽ đổi mật khẩu ở lần đăng nhập đầu tiên.</p>
              )}
              <div className="modal-actions">
                <button type="button" className="button button-secondary" onClick={closeModal} disabled={saving}>Hủy</button>
                <button type="submit" className="button button-primary" disabled={saving}>
                  <Icon name={editingUser ? "edit" : "plus"} size={16} />
                  {saving ? "Đang lưu..." : editingUser ? "Lưu thay đổi" : "Tạo người dùng"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {newAccountCredential && (
        <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setNewAccountCredential(null); }}>
          <section className="member-modal credential-modal" role="dialog" aria-modal="true" aria-labelledby="credential-title">
            <div className="modal-heading">
              <div>
                <span className="modal-icon"><Icon name="users" size={20} /></span>
                <div><h2 id="credential-title">Tài khoản đã được tạo</h2><p>Gửi mật khẩu tạm thời này cho người dùng. Mật khẩu chỉ hiển thị lần này.</p></div>
              </div>
              <button className="subtle-icon-button" aria-label="Đóng" onClick={() => setNewAccountCredential(null)}><Icon name="close" /></button>
            </div>
            <dl className="credential-details">
              <div><dt>Email</dt><dd>{newAccountCredential.email}</dd></div>
              <div><dt>Mật khẩu tạm thời</dt><dd><code>{newAccountCredential.password}</code></dd></div>
            </dl>
            <p className="password-help">Người dùng bắt buộc đổi mật khẩu sau lần đăng nhập đầu tiên.</p>
            <div className="modal-actions">
              <button type="button" className="button button-secondary" onClick={async () => {
                try {
                  await navigator.clipboard.writeText(newAccountCredential.password);
                  notify("Đã sao chép mật khẩu tạm thời.");
                } catch {
                  notify("Không thể sao chép mật khẩu trên trình duyệt này.");
                }
              }}>Sao chép mật khẩu</button>
              <button type="button" className="button button-primary" onClick={() => setNewAccountCredential(null)}>Đã lưu mật khẩu</button>
            </div>
          </section>
        </div>
      )}

      {userToDelete && (
        <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setUserToDelete(null); }}>
          <section className="member-modal delete-modal" role="alertdialog" aria-modal="true" aria-labelledby="delete-user-title">
            <div className="modal-heading">
              <div>
                <span className="delete-modal-icon"><Icon name="trash" size={19} /></span>
                <div>
                  <h2 id="delete-user-title">Xóa {kindLabels[userToDelete.loaiNguoiDung].toLocaleLowerCase("vi")}?</h2>
                  <p>Bạn có chắc muốn xóa {userToDelete.hoTen} (ID {userToDelete.id})? Thao tác này không thể hoàn tác.</p>
                </div>
              </div>
              <button className="subtle-icon-button" aria-label="Đóng" onClick={() => setUserToDelete(null)}><Icon name="close" /></button>
            </div>
            <div className="modal-actions">
              <button className="button button-secondary" onClick={() => setUserToDelete(null)}>Hủy</button>
              <button className="button delete-confirm-button" onClick={() => void confirmDelete()}><Icon name="trash" size={16} /> Xóa người dùng</button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
