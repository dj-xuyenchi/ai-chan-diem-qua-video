"use client";

import { useMemo, useState } from "react";
import type { Dispatch, FormEvent, SetStateAction } from "react";
import type { Student } from "../type/Student";
import { formatDate, todayDate } from "../utils/date";
import { Icon } from "./Icon";

type StudentsManagementProps = {
  students: Student[];
  setStudents: Dispatch<SetStateAction<Student[]>>;
  query: string;
  setQuery: (query: string) => void;
  notify: (message: string) => void;
};

export function StudentsManagement({ students, setStudents, query, setQuery, notify }: StudentsManagementProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);

  const visibleStudents = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("vi");
    return students.filter((student) =>
      `${student.id} ${student.fullName} ${student.email}`.toLocaleLowerCase("vi").includes(normalizedQuery),
    );
  }, [students, query]);

  function openModal(student?: Student) {
    setEditingStudent(student ?? null);
    setModalOpen(true);
  }

  function saveStudent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const fullName = String(formData.get("fullName")).trim();
    const email = String(formData.get("email")).trim();
    const dateOfBirth = String(formData.get("dateOfBirth"));
    const className = String(formData.get("className")).trim();
    const hasDuplicateEmail = students.some(
      (student) => student.email.toLocaleLowerCase("vi") === email.toLocaleLowerCase("vi") && student.id !== editingStudent?.id,
    );

    if (hasDuplicateEmail) {
      notify("Email này đã được sử dụng cho một sinh viên khác.");
      return;
    }

    if (editingStudent) {
      setStudents((current) => current.map((student) =>
        student.id === editingStudent.id
          ? { ...student, fullName, email, dateOfBirth, className, updatedAt: todayDate() }
          : student,
      ));
      notify(`Đã cập nhật sinh viên ${fullName}`);
    } else {
      const nextId = students.reduce((maxId, student) => Math.max(maxId, Number(student.id.replace(/\D/g, "")) || 0), 0) + 1;
      setStudents((current) => [{
        id: `SV${String(nextId).padStart(4, "0")}`,
        fullName,
        email,
        dateOfBirth,
        className,
        createdAt: todayDate(),
        createdBy: "Thảo Nguyễn",
        updatedAt: "",
      }, ...current]);
      setQuery("");
      notify(`Đã thêm sinh viên ${fullName}`);
    }

    setModalOpen(false);
    setEditingStudent(null);
  }

  function deleteStudent() {
    if (!studentToDelete) return;
    setStudents((current) => current.filter((student) => student.id !== studentToDelete.id));
    notify(`Đã xóa sinh viên ${studentToDelete.fullName}`);
    setStudentToDelete(null);
  }

  return (
    <>
      <section className="panel students-panel">
        <div className="students-heading">
          <div>
            <div className="members-title"><h2>Danh sách sinh viên</h2><span className="member-count">{students.length}</span></div>
            <p>Quản lý thông tin và lịch sử cập nhật sinh viên.</p>
          </div>
          <div className="management-heading-actions">
            <label className="table-search student-search">
              <Icon name="search" size={16} />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm theo ID, họ tên, email..." aria-label="Tìm sinh viên theo ID, họ tên hoặc email" />
            </label>
            <button className="button button-primary" onClick={() => openModal()}><Icon name="plus" size={16} /> Thêm sinh viên</button>
          </div>
        </div>
        <div className="table-scroll student-table-scroll">
          <table className="student-table">
            <thead>
              <tr><th>ID</th><th>HỌ TÊN</th><th>EMAIL</th><th>NGÀY SINH</th><th>LỚP</th><th>NGÀY TẠO</th><th>NGƯỜI TẠO</th><th>NGÀY CẬP NHẬT</th><th>THAO TÁC</th></tr>
            </thead>
            <tbody>
              {visibleStudents.length > 0 ? visibleStudents.map((student) => (
                <tr key={student.id}>
                  <td><span className="student-id">{student.id}</span></td>
                  <td><strong className="student-name">{student.fullName}</strong></td>
                  <td className="student-email">{student.email}</td>
                  <td>{formatDate(student.dateOfBirth)}</td>
                  <td><span className="student-class">{student.className}</span></td>
                  <td>{formatDate(student.createdAt)}</td>
                  <td>{student.createdBy}</td>
                  <td>{formatDate(student.updatedAt)}</td>
                  <td><div className="student-actions">
                    <button className="student-action-button" aria-label={`Chỉnh sửa ${student.fullName}`} onClick={() => openModal(student)}><Icon name="edit" size={16} /></button>
                    <button className="student-action-button student-delete-button" aria-label={`Xóa ${student.fullName}`} onClick={() => setStudentToDelete(student)}><Icon name="trash" size={16} /></button>
                  </div></td>
                </tr>
              )) : <tr><td colSpan={9} className="empty-state">Không tìm thấy sinh viên phù hợp.</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="table-footer">
          <span>Hiển thị <strong>{visibleStudents.length}</strong> trong tổng số <strong>{students.length}</strong> sinh viên</span>
          <span className="student-table-note">Dữ liệu được cập nhật theo thời gian thực</span>
        </div>
      </section>

      {modalOpen && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) { setModalOpen(false); setEditingStudent(null); } }}>
        <section className="member-modal student-modal" role="dialog" aria-modal="true" aria-labelledby="student-modal-title">
          <div className="modal-heading">
            <div><span className="modal-icon"><Icon name="users" size={20} /></span><div><h2 id="student-modal-title">{editingStudent ? "Chỉnh sửa sinh viên" : "Thêm sinh viên mới"}</h2><p>{editingStudent ? `Cập nhật hồ sơ ${editingStudent.id}.` : "Nhập thông tin để tạo hồ sơ sinh viên."}</p></div></div>
            <button className="subtle-icon-button" aria-label="Đóng" onClick={() => { setModalOpen(false); setEditingStudent(null); }}><Icon name="close" /></button>
          </div>
          <form onSubmit={saveStudent}>
            <label>Họ và tên<input name="fullName" required defaultValue={editingStudent?.fullName ?? ""} placeholder="Ví dụ: Nguyễn Minh Anh" autoFocus /></label>
            <label>Email<input name="email" type="email" required defaultValue={editingStudent?.email ?? ""} placeholder="email@example.com" /></label>
            <div className="student-form-row">
              <label>Ngày sinh<input name="dateOfBirth" type="date" required defaultValue={editingStudent?.dateOfBirth ?? ""} /></label>
              <label>Lớp<input name="className" required defaultValue={editingStudent?.className ?? ""} placeholder="Ví dụ: CNTT-K20A" /></label>
            </div>
            <div className="modal-actions">
              <button type="button" className="button button-secondary" onClick={() => { setModalOpen(false); setEditingStudent(null); }}>Hủy</button>
              <button type="submit" className="button button-primary"><Icon name={editingStudent ? "edit" : "plus"} size={16} />{editingStudent ? "Lưu thay đổi" : "Tạo sinh viên"}</button>
            </div>
          </form>
        </section>
      </div>}
      {studentToDelete && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setStudentToDelete(null); }}>
        <section className="member-modal delete-modal" role="alertdialog" aria-modal="true" aria-labelledby="delete-student-title">
          <div className="modal-heading">
            <div><span className="delete-modal-icon"><Icon name="trash" size={19} /></span><div><h2 id="delete-student-title">Xóa sinh viên?</h2><p>Bạn có chắc muốn xóa {studentToDelete.fullName} ({studentToDelete.id})? Thao tác này không thể hoàn tác.</p></div></div>
            <button className="subtle-icon-button" aria-label="Đóng" onClick={() => setStudentToDelete(null)}><Icon name="close" /></button>
          </div>
          <div className="modal-actions"><button className="button button-secondary" onClick={() => setStudentToDelete(null)}>Hủy</button><button className="button delete-confirm-button" onClick={deleteStudent}><Icon name="trash" size={16} /> Xóa sinh viên</button></div>
        </section>
      </div>}
    </>
  );
}
