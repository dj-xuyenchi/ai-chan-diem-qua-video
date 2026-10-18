"use client";

import { useMemo, useState } from "react";
import type { Dispatch, FormEvent, SetStateAction } from "react";
import type { SchoolClass } from "../type/SchoolClass";
import type { Student } from "../type/Student";
import type { VideoAssignment } from "../type/VideoAssignment";
import { formatDate, todayDate } from "../utils/date";
import { Icon } from "./Icon";

type ClassesManagementProps = {
  schoolClasses: SchoolClass[];
  setSchoolClasses: Dispatch<SetStateAction<SchoolClass[]>>;
  students: Student[];
  assignments: VideoAssignment[];
  setAssignments: Dispatch<SetStateAction<VideoAssignment[]>>;
  query: string;
  setQuery: (query: string) => void;
  notify: (message: string) => void;
};

export function ClassesManagement({
  schoolClasses,
  setSchoolClasses,
  students,
  assignments,
  setAssignments,
  query,
  setQuery,
  notify,
}: ClassesManagementProps) {
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"teacher" | "student">("teacher");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<SchoolClass | null>(null);
  const [classToDelete, setClassToDelete] = useState<SchoolClass | null>(null);
  const [assignmentModalOpen, setAssignmentModalOpen] = useState(false);
  const [submissionAssignment, setSubmissionAssignment] = useState<VideoAssignment | null>(null);
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [expandedSubmissions, setExpandedSubmissions] = useState<string | null>(null);

  const visibleClasses = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("vi");
    return schoolClasses.filter((schoolClass) =>
      `${schoolClass.id} ${schoolClass.code} ${schoolClass.homeroomTeacher}`.toLocaleLowerCase("vi").includes(normalizedQuery),
    );
  }, [schoolClasses, query]);

  const selectedClass = schoolClasses.find((schoolClass) => schoolClass.id === selectedClassId) ?? null;
  const classAssignments = assignments.filter((assignment) => assignment.classId === selectedClassId);
  const enrolledStudents = selectedClass
    ? students.filter((student) => student.className.toLocaleLowerCase("vi") === selectedClass.code.toLocaleLowerCase("vi"))
    : [];
  const selectedStudent = enrolledStudents.find((student) => student.id === selectedStudentId) ?? enrolledStudents[0] ?? null;

  function openClassModal(schoolClass?: SchoolClass) {
    setEditingClass(schoolClass ?? null);
    setModalOpen(true);
  }

  function saveClass(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const code = String(formData.get("code")).trim();
    const studentCount = Number(formData.get("studentCount"));
    const homeroomTeacher = String(formData.get("homeroomTeacher")).trim();
    const hasDuplicateCode = schoolClasses.some(
      (schoolClass) => schoolClass.code.toLocaleLowerCase("vi") === code.toLocaleLowerCase("vi") && schoolClass.id !== editingClass?.id,
    );

    if (hasDuplicateCode) {
      notify("Mã lớp này đã tồn tại.");
      return;
    }

    if (editingClass) {
      setSchoolClasses((current) => current.map((schoolClass) =>
        schoolClass.id === editingClass.id
          ? { ...schoolClass, code, studentCount, homeroomTeacher, updatedAt: todayDate() }
          : schoolClass,
      ));
      notify(`Đã cập nhật lớp ${code}`);
    } else {
      const nextId = schoolClasses.reduce((maxId, schoolClass) => Math.max(maxId, Number(schoolClass.id.replace(/\D/g, "")) || 0), 0) + 1;
      setSchoolClasses((current) => [{
        id: `LH${String(nextId).padStart(4, "0")}`,
        code,
        studentCount,
        createdAt: todayDate(),
        createdBy: "Thảo Nguyễn",
        homeroomTeacher,
        updatedAt: "",
      }, ...current]);
      setQuery("");
      notify(`Đã thêm lớp ${code}`);
    }

    setModalOpen(false);
    setEditingClass(null);
  }

  function deleteClass() {
    if (!classToDelete) return;
    setSchoolClasses((current) => current.filter((schoolClass) => schoolClass.id !== classToDelete.id));
    setAssignments((current) => current.filter((assignment) => assignment.classId !== classToDelete.id));
    if (selectedClassId === classToDelete.id) setSelectedClassId(null);
    notify(`Đã xóa lớp ${classToDelete.code}`);
    setClassToDelete(null);
  }

  function addAssignment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedClass) return;

    const formData = new FormData(event.currentTarget);
    const title = String(formData.get("title")).trim();
    const instructions = String(formData.get("instructions")).trim();
    const dueDate = String(formData.get("dueDate"));
    const video = formData.get("video");

    if (!(video instanceof File) || video.size === 0 || !video.type.startsWith("video/")) {
      notify("Vui lòng chọn tệp video hợp lệ cho bài tập.");
      return;
    }

    const assignment: VideoAssignment = {
      id: `BT-${selectedClass.id}-${assignments.filter((assignment) => assignment.classId === selectedClass.id).length + 1}`,
      classId: selectedClass.id,
      title,
      instructions,
      dueDate,
      videoName: video.name,
      videoUrl: URL.createObjectURL(video),
      createdAt: todayDate(),
      createdBy: "Thảo Nguyễn",
      submissions: [],
    };

    setAssignments((current) => [assignment, ...current]);
    setAssignmentModalOpen(false);
    notify(`Đã thêm bài tập video "${title}"`);
  }

  function submitVideo(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!submissionAssignment || !selectedStudent) return;

    const formData = new FormData(event.currentTarget);
    const video = formData.get("video");
    if (!(video instanceof File) || video.size === 0 || !video.type.startsWith("video/")) {
      notify("Vui lòng chọn tệp video hợp lệ để nộp bài.");
      return;
    }

    const submission = {
      studentId: selectedStudent.id,
      videoName: video.name,
      videoUrl: URL.createObjectURL(video),
      submittedAt: new Date().toISOString(),
    };

    setAssignments((current) => current.map((assignment) => assignment.id === submissionAssignment.id
      ? { ...assignment, submissions: [...assignment.submissions.filter((item) => item.studentId !== selectedStudent.id), submission] }
      : assignment,
    ));
    setSubmissionAssignment(null);
    notify(`Đã nộp video bài "${submissionAssignment.title}"`);
  }

  function renderClassModal() {
    if (!modalOpen) return null;
    return (
      <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) { setModalOpen(false); setEditingClass(null); } }}>
        <section className="member-modal student-modal" role="dialog" aria-modal="true" aria-labelledby="class-modal-title">
          <div className="modal-heading">
            <div><span className="modal-icon"><Icon name="calendar" size={20} /></span><div><h2 id="class-modal-title">{editingClass ? "Chỉnh sửa lớp học" : "Thêm lớp học mới"}</h2><p>{editingClass ? `Cập nhật thông tin lớp ${editingClass.code}.` : "Nhập thông tin để tạo hồ sơ lớp học."}</p></div></div>
            <button className="subtle-icon-button" aria-label="Đóng" onClick={() => { setModalOpen(false); setEditingClass(null); }}><Icon name="close" /></button>
          </div>
          <form onSubmit={saveClass}>
            <label>Mã lớp<input name="code" required defaultValue={editingClass?.code ?? ""} placeholder="Ví dụ: CNTT-K22A" /></label>
            <label>Số lượng sinh viên<input name="studentCount" type="number" min="0" step="1" required defaultValue={editingClass?.studentCount ?? 0} /></label>
            <label>Giáo viên chủ nhiệm<input name="homeroomTeacher" required defaultValue={editingClass?.homeroomTeacher ?? ""} placeholder="Ví dụ: Nguyễn Văn Minh" autoFocus /></label>
            <div className="modal-actions">
              <button type="button" className="button button-secondary" onClick={() => { setModalOpen(false); setEditingClass(null); }}>Hủy</button>
              <button type="submit" className="button button-primary"><Icon name={editingClass ? "edit" : "plus"} size={16} />{editingClass ? "Lưu thay đổi" : "Tạo lớp học"}</button>
            </div>
          </form>
        </section>
      </div>
    );
  }

  function renderClassList() {
    return (
      <section className="panel students-panel">
        <div className="students-heading">
          <div>
            <div className="members-title"><h2>Danh sách lớp học</h2><span className="member-count">{schoolClasses.length}</span></div>
            <p>Chọn một lớp để xem bài tập video và bài nộp.</p>
          </div>
          <div className="management-heading-actions">
            <label className="table-search student-search">
              <Icon name="search" size={16} />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm theo ID, mã lớp, giáo viên..." aria-label="Tìm lớp theo ID, mã lớp hoặc giáo viên chủ nhiệm" />
            </label>
            <button className="button button-primary" onClick={() => openClassModal()}><Icon name="plus" size={16} /> Thêm lớp học</button>
          </div>
        </div>
        <div className="table-scroll student-table-scroll">
          <table className="student-table class-table">
            <thead>
              <tr><th>ID</th><th>MÃ LỚP</th><th>SỐ LƯỢNG SINH VIÊN</th><th>NGÀY TẠO</th><th>NGƯỜI TẠO</th><th>GV CHỦ NHIỆM</th><th>NGÀY CẬP NHẬT</th><th>BÀI TẬP VIDEO</th><th>THAO TÁC</th></tr>
            </thead>
            <tbody>
              {visibleClasses.length > 0 ? visibleClasses.map((schoolClass) => (
                <tr key={schoolClass.id}>
                  <td><span className="student-id">{schoolClass.id}</span></td>
                  <td><span className="student-class">{schoolClass.code}</span></td>
                  <td><span className="class-student-count">{schoolClass.studentCount}<span> sinh viên</span></span></td>
                  <td>{formatDate(schoolClass.createdAt)}</td>
                  <td>{schoolClass.createdBy}</td>
                  <td><strong className="student-name">{schoolClass.homeroomTeacher}</strong></td>
                  <td>{formatDate(schoolClass.updatedAt)}</td>
                  <td><span className="class-assignment-count"><Icon name="video" size={14} />{assignments.filter((assignment) => assignment.classId === schoolClass.id).length} bài</span></td>
                  <td><div className="student-actions">
                    <button className="student-action-button class-open-button" aria-label={`Mở lớp ${schoolClass.code}`} onClick={() => { setSelectedClassId(schoolClass.id); setViewMode("teacher"); setSelectedStudentId(""); setQuery(""); }}><Icon name="video" size={16} /></button>
                    <button className="student-action-button" aria-label={`Chỉnh sửa lớp ${schoolClass.code}`} onClick={() => openClassModal(schoolClass)}><Icon name="edit" size={16} /></button>
                    <button className="student-action-button student-delete-button" aria-label={`Xóa lớp ${schoolClass.code}`} onClick={() => setClassToDelete(schoolClass)}><Icon name="trash" size={16} /></button>
                  </div></td>
                </tr>
              )) : <tr><td colSpan={9} className="empty-state">Không tìm thấy lớp học phù hợp.</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="table-footer">
          <span>Hiển thị <strong>{visibleClasses.length}</strong> trong tổng số <strong>{schoolClasses.length}</strong> lớp học</span>
          <span className="student-table-note">Bấm biểu tượng video để mở bài tập của lớp</span>
        </div>
      </section>
    );
  }

  function renderClassDetail() {
    if (!selectedClass) return null;
    return (
      <section className="class-detail-page">
        <button className="class-back-button" onClick={() => { setSelectedClassId(null); setQuery(""); }}><Icon name="back" size={17} /> Danh sách lớp</button>
        <div className="class-detail-heading">
          <div className="class-detail-title">
            <span className="class-detail-icon"><Icon name="calendar" size={21} /></span>
            <div><span className="class-detail-kicker">{selectedClass.id} · LỚP HỌC</span><h2>{selectedClass.code}</h2><p>Giáo viên chủ nhiệm: <strong>{selectedClass.homeroomTeacher}</strong><span className="detail-dot">·</span>{selectedClass.studentCount} sinh viên</p></div>
          </div>
          <div className="class-mode-switch" aria-label="Chế độ xem lớp">
            <button className={viewMode === "teacher" ? "class-mode-active" : ""} onClick={() => setViewMode("teacher")}>Quản lý lớp</button>
            <button className={viewMode === "student" ? "class-mode-active" : ""} onClick={() => setViewMode("student")}>Học sinh xem lớp</button>
          </div>
        </div>

        <div className="assignment-summary">
          <article><span className="summary-icon summary-video"><Icon name="video" size={18} /></span><div><strong>{classAssignments.length}</strong><span>bài tập video</span></div></article>
          <article><span className="summary-icon summary-student"><Icon name="users" size={18} /></span><div><strong>{selectedClass.studentCount}</strong><span>sinh viên trong lớp</span></div></article>
          <article><span className="summary-icon summary-submission"><Icon name="upload" size={18} /></span><div><strong>{classAssignments.reduce((total, assignment) => total + assignment.submissions.length, 0)}</strong><span>lượt nộp bài</span></div></article>
        </div>

        <div className="class-assignment-heading">
          <div><h3>{viewMode === "teacher" ? "Bài tập của lớp" : "Bài tập cần hoàn thành"}</h3><p>{viewMode === "teacher" ? "Thêm video hướng dẫn và theo dõi bài nộp của học sinh." : "Chọn một bài tập để xem video hướng dẫn và gửi video bài làm."}</p></div>
          {viewMode === "teacher" ? <button className="button button-primary" onClick={() => setAssignmentModalOpen(true)}><Icon name="plus" size={17} /> Thêm bài tập video</button> : enrolledStudents.length > 0 ? (
            <label className="student-identity-select"><span>Đang xem với</span><select aria-label="Chọn học sinh" value={selectedStudent?.id ?? ""} onChange={(event) => setSelectedStudentId(event.target.value)}>{enrolledStudents.map((student) => <option value={student.id} key={student.id}>{student.fullName}</option>)}</select></label>
          ) : null}
        </div>

        {viewMode === "student" && !selectedStudent ? (
          <div className="assignment-empty"><span className="assignment-empty-icon"><Icon name="users" size={23} /></span><h3>Chưa có hồ sơ học sinh trong lớp này</h3><p>Thêm học sinh có mã lớp <strong>{selectedClass.code}</strong> trong mục Sinh viên để xem và nộp bài.</p></div>
        ) : classAssignments.length > 0 ? (
          <div className="assignment-grid">
            {classAssignments.map((assignment) => {
              const submission = selectedStudent
                ? assignment.submissions.find((item) => item.studentId === selectedStudent.id)
                : null;
              return (
                <article className="assignment-card" key={assignment.id}>
                  <div className="assignment-video-frame">
                    <video src={assignment.videoUrl} controls preload="metadata" aria-label={`Video hướng dẫn: ${assignment.title}`} />
                    <span className="video-label"><Icon name="video" size={13} /> VIDEO BÀI TẬP</span>
                  </div>
                  <div className="assignment-card-content">
                    <div className="assignment-card-topline">
                      <span className={`submission-status ${submission ? "submission-done" : "submission-pending"}`}><i />{submission ? "Đã nộp video" : "Chưa nộp"}</span>
                      {assignment.dueDate && <span className="assignment-deadline">Hạn {formatDate(assignment.dueDate)}</span>}
                    </div>
                    <h4>{assignment.title}</h4>
                    {assignment.instructions && <p className="assignment-instructions">{assignment.instructions}</p>}
                    <div className="assignment-source"><Icon name="video" size={14} /><span>{assignment.videoName}</span></div>
                    {viewMode === "student" && selectedStudent ? (
                      <div className="assignment-card-actions">
                        {submission && <span className="submitted-file-name">Đã gửi: {submission.videoName}</span>}
                        <button className="button button-primary" onClick={() => setSubmissionAssignment(assignment)}><Icon name="upload" size={16} />{submission ? "Gửi lại video" : "Chọn bài tập & nộp video"}</button>
                        {submission && <span className="submitted-time">Đã nộp lúc {new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short" }).format(new Date(submission.submittedAt))}</span>}
                      </div>
                    ) : (
                      <div className="assignment-card-actions">
                        <button className="assignment-submissions-toggle" onClick={() => setExpandedSubmissions(expandedSubmissions === assignment.id ? null : assignment.id)}>{assignment.submissions.length} video đã nộp <Icon name="chevron" size={14} className={expandedSubmissions === assignment.id ? "chevron-open" : ""} /></button>
                        {expandedSubmissions === assignment.id && (
                          <div className="submission-list">
                            {assignment.submissions.length > 0 ? assignment.submissions.map((item) => {
                              const student = students.find((person) => person.id === item.studentId);
                              return <div className="submission-list-item" key={item.studentId}><div><strong>{student?.fullName ?? "Học sinh"}</strong><span>{item.videoName}</span></div><a href={item.videoUrl} target="_blank" rel="noreferrer">Xem video</a></div>;
                            }) : <p className="no-submissions">Chưa có video nào được nộp.</p>}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="assignment-empty">
            <span className="assignment-empty-icon"><Icon name="video" size={23} /></span>
            <h3>{viewMode === "teacher" ? "Lớp chưa có bài tập video" : "Chưa có bài tập cần nộp"}</h3>
            <p>{viewMode === "teacher" ? "Thêm video hướng dẫn đầu tiên để học sinh có thể xem và nộp bài." : "Giáo viên chưa giao bài tập video cho lớp này."}</p>
            {viewMode === "teacher" && <button className="button button-primary" onClick={() => setAssignmentModalOpen(true)}><Icon name="plus" size={16} /> Thêm bài tập video</button>}
          </div>
        )}
      </section>
    );
  }

  return (
    <>
      {selectedClassId ? renderClassDetail() : renderClassList()}
      {renderClassModal()}
      {classToDelete && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setClassToDelete(null); }}>
        <section className="member-modal delete-modal" role="alertdialog" aria-modal="true" aria-labelledby="delete-class-title">
          <div className="modal-heading">
            <div><span className="delete-modal-icon"><Icon name="trash" size={19} /></span><div><h2 id="delete-class-title">Xóa lớp học?</h2><p>Bạn có chắc muốn xóa lớp {classToDelete.code} ({classToDelete.id}) và toàn bộ bài tập video của lớp? Thao tác này không thể hoàn tác.</p></div></div>
            <button className="subtle-icon-button" aria-label="Đóng" onClick={() => setClassToDelete(null)}><Icon name="close" /></button>
          </div>
          <div className="modal-actions"><button className="button button-secondary" onClick={() => setClassToDelete(null)}>Hủy</button><button className="button delete-confirm-button" onClick={deleteClass}><Icon name="trash" size={16} /> Xóa lớp học</button></div>
        </section>
      </div>}
      {assignmentModalOpen && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setAssignmentModalOpen(false); }}>
        <section className="member-modal video-modal" role="dialog" aria-modal="true" aria-labelledby="assignment-modal-title">
          <div className="modal-heading">
            <div><span className="modal-icon"><Icon name="video" size={20} /></span><div><h2 id="assignment-modal-title">Thêm bài tập video</h2><p>Giao video hướng dẫn cho lớp {selectedClass?.code}.</p></div></div>
            <button className="subtle-icon-button" aria-label="Đóng" onClick={() => setAssignmentModalOpen(false)}><Icon name="close" /></button>
          </div>
          <form onSubmit={addAssignment}>
            <label>Tên bài tập<input name="title" required placeholder="Ví dụ: Bài tập thực hành tuần 1" /></label>
            <label>Hướng dẫn<textarea name="instructions" rows={3} placeholder="Mô tả yêu cầu và cách thực hiện..." /></label>
            <label>Hạn nộp<input name="dueDate" type="date" /></label>
            <label className="video-file-label">Video hướng dẫn
              <span className="video-file-picker"><Icon name="upload" size={18} /><span>Chọn video từ thiết bị<small>Chỉ nhận tệp video như MP4, MOV, WebM</small></span><input name="video" type="file" accept="video/*" required /></span>
            </label>
            <p className="local-video-note">Video chỉ khả dụng trong phiên trình duyệt này cho đến khi kết nối máy chủ lưu trữ.</p>
            <div className="modal-actions">
              <button type="button" className="button button-secondary" onClick={() => setAssignmentModalOpen(false)}>Hủy</button>
              <button type="submit" className="button button-primary"><Icon name="video" size={16} /> Tạo bài tập</button>
            </div>
          </form>
        </section>
      </div>}
      {submissionAssignment && selectedStudent && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setSubmissionAssignment(null); }}>
        <section className="member-modal video-modal" role="dialog" aria-modal="true" aria-labelledby="submission-modal-title">
          <div className="modal-heading">
            <div><span className="modal-icon"><Icon name="upload" size={20} /></span><div><h2 id="submission-modal-title">Nộp video bài tập</h2><p>{submissionAssignment.title} · {selectedStudent.fullName}</p></div></div>
            <button className="subtle-icon-button" aria-label="Đóng" onClick={() => setSubmissionAssignment(null)}><Icon name="close" /></button>
          </div>
          <form onSubmit={submitVideo}>
            <label className="video-file-label">Video bài làm
              <span className="video-file-picker"><Icon name="upload" size={18} /><span>Chọn video bài làm<small>Chỉ nhận tệp video như MP4, MOV, WebM</small></span><input name="video" type="file" accept="video/*" required /></span>
            </label>
            <p className="local-video-note">Bài nộp video chỉ lưu trong phiên trình duyệt hiện tại.</p>
            <div className="modal-actions">
              <button type="button" className="button button-secondary" onClick={() => setSubmissionAssignment(null)}>Hủy</button>
              <button type="submit" className="button button-primary"><Icon name="upload" size={16} /> Gửi video bài làm</button>
            </div>
          </form>
        </section>
      </div>}
    </>
  );
}
