"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import {
  addClassroomStudents,
  createAssignment,
  createClassroom,
  evaluateSubmission,
  getAssignments,
  getClassroom,
  getClassrooms,
  gradeSubmission,
  removeClassroomStudent,
  submitAssignment,
} from "../api/classApi";
import { getUsers } from "../api/userApi";
import { API_BASE_URL } from "../config/api";
import type { AiVideoEvaluation, Classroom, ClassroomMember, VideoAssignment, VideoSubmission } from "../domain/Classroom";
import type { UserKind, UserRecord } from "../domain/User";
import { formatDate } from "../utils/date";
import { Icon } from "./Icon";
import { createXlsxWorkbook } from "../utils/xlsxWorkbook";

type ClassesManagementProps = {
  role: UserKind;
  notify: (message: string) => void;
  target?: { classId: number; studentId?: number; assignmentId?: number } | null;
  onTargetHandled?: () => void;
};

const PAGE_SIZE = 20;
const MAX_VIDEO_SIZE = 100 * 1024 * 1024;

function formatDateTime(value: string | null) {
  if (!value) return "Không giới hạn";
  return new Date(value).toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" });
}

function formatDuration(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainder = Math.round(seconds % 60);
  return minutes ? `${minutes} phút ${remainder} giây` : `${remainder} giây`;
}

function videoSource(path: string) {
  return new URL(path, API_BASE_URL).toString();
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Đã xảy ra lỗi. Vui lòng thử lại.";
}

function loadClassData(classId: number) {
  return Promise.all([getClassroom(classId), getAssignments(classId)]);
}

function speedAssessmentLabel(value: AiVideoEvaluation["speedAssessment"] | undefined) {
  if (value === "SLOWER") return "Chậm hơn bài mẫu";
  if (value === "FASTER") return "Nhanh hơn bài mẫu";
  if (value === "SIMILAR") return "Tương tự bài mẫu";
  return "";
}

export function ClassesManagement({ role, notify, target, onTargetHandled }: ClassesManagementProps) {
  const isTeacher = role === "GIAO_VIEN";
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [selectedClass, setSelectedClass] = useState<Classroom | null>(null);
  const [focusedStudentId, setFocusedStudentId] = useState<number | null>(null);
  const [assignments, setAssignments] = useState<VideoAssignment[]>([]);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<number | null>(null);
  const [expandedSubmissionId, setExpandedSubmissionId] = useState<number | null>(null);
  const [submissionQuery, setSubmissionQuery] = useState("");
  const [aiEvaluations, setAiEvaluations] = useState<Record<number, AiVideoEvaluation>>({});
  const [evaluatingSubmissionId, setEvaluatingSubmissionId] = useState<number | null>(null);
  const [gradeDrafts, setGradeDrafts] = useState<Record<number, string>>({});
  const [students, setStudents] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exportingResults, setExportingResults] = useState(false);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [memberPage, setMemberPage] = useState(1);
  const [submissionPages, setSubmissionPages] = useState<Record<number, number>>({});
  const [classModalOpen, setClassModalOpen] = useState(false);
  const [studentModalOpen, setStudentModalOpen] = useState(false);
  const [assignmentModalOpen, setAssignmentModalOpen] = useState(false);

  useEffect(() => {
    let active = true;
    void getClassrooms()
      .then((loadedClassrooms) => {
        if (active) setClassrooms(loadedClassrooms);
      })
      .catch((cause: unknown) => {
        if (active) setError(errorMessage(cause));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!isTeacher) return;
    let active = true;
    void getUsers("HOC_SINH")
      .then((loadedStudents) => {
        if (active) setStudents(loadedStudents);
      })
      .catch((cause: unknown) => {
        if (active) setError(`Không tải được danh sách học sinh: ${errorMessage(cause)}`);
      });
    return () => {
      active = false;
    };
  }, [isTeacher]);

  const visibleClassrooms = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("vi");
    return classrooms.filter((classroom) =>
      `${classroom.maLop} ${classroom.tenLop} ${classroom.tenGiaoVien}`
        .toLocaleLowerCase("vi")
        .includes(normalized),
    );
  }, [classrooms, query]);
  const pageCount = Math.max(1, Math.ceil(visibleClassrooms.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pageClassrooms = visibleClassrooms.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const eligibleStudents = students.filter(
    (student) => !selectedClass?.hocSinh.some((member) => member.id === student.id),
  );

  const openClass = useCallback(async (
    classroom: Classroom,
    focusStudentId?: number,
    assignmentId?: number,
  ) => {
    try {
      const [details, loadedAssignments] = await loadClassData(classroom.id);
      setError("");
      setSelectedClass(details);
      setFocusedStudentId(focusStudentId ?? null);
      const focusIndex = focusStudentId
        ? details.hocSinh.findIndex((student) => student.id === focusStudentId)
        : -1;
      setMemberPage(focusIndex >= 0 ? Math.floor(focusIndex / PAGE_SIZE) + 1 : 1);
      setSelectedAssignmentId(assignmentId ?? null);
      setAssignments(loadedAssignments);
    } catch (cause) {
      setError(errorMessage(cause));
    }
  }, []);

  useEffect(() => {
    if (!target || !classrooms.length) return;
    const classroom = classrooms.find((item) => item.id === target.classId);
    if (!classroom) return;
    let active = true;
    const loadTargetClass = async () => {
      try {
        const [details, loadedAssignments] = await loadClassData(classroom.id);
        if (!active) return;
        setError("");
        setSelectedClass(details);
        setFocusedStudentId(target.studentId ?? null);
        const focusIndex = target.studentId
          ? details.hocSinh.findIndex((student) => student.id === target.studentId)
          : -1;
        setMemberPage(focusIndex >= 0 ? Math.floor(focusIndex / PAGE_SIZE) + 1 : 1);
        setSelectedAssignmentId(target.assignmentId ?? null);
        setAssignments(loadedAssignments);
      } catch (cause) {
        if (active) setError(errorMessage(cause));
      } finally {
        if (active) onTargetHandled?.();
      }
    };
    void loadTargetClass();
    return () => {
      active = false;
    };
  }, [classrooms, onTargetHandled, target]);

  async function refreshSelectedClass() {
    if (!selectedClass) return;
    const [details, loadedAssignments] = await Promise.all([
      getClassroom(selectedClass.id),
      getAssignments(selectedClass.id),
    ]);
    setSelectedClass(details);
    setClassrooms((current) => current.map((classroom) => classroom.id === details.id ? details : classroom));
    setAssignments(loadedAssignments);
  }

  async function saveClass(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    const form = new FormData(event.currentTarget);
    setSaving(true);
    try {
      const classroom = await createClassroom({
        maLop: String(form.get("maLop") ?? "").trim(),
        tenLop: String(form.get("tenLop") ?? "").trim(),
      });
      setClassrooms((current) => [classroom, ...current]);
      setClassModalOpen(false);
      notify(`Đã tạo lớp ${classroom.tenLop}.`);
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setSaving(false);
    }
  }

  async function addStudents(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedClass || saving) return;
    const form = new FormData(event.currentTarget);
    const hocSinhIds = form.getAll("hocSinhIds").map(Number);
    if (hocSinhIds.length === 0) {
      setError("Chọn ít nhất một học sinh.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const classroom = await addClassroomStudents(selectedClass.id, hocSinhIds);
      setSelectedClass(classroom);
      setClassrooms((current) => current.map((item) => item.id === classroom.id ? classroom : item));
      setStudentModalOpen(false);
      notify(`Đã thêm ${hocSinhIds.length} học sinh vào lớp.`);
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setSaving(false);
    }
  }

  async function removeStudent(student: ClassroomMember) {
    if (!selectedClass || saving) return;
    setSaving(true);
    try {
      const classroom = await removeClassroomStudent(selectedClass.id, student.id);
      setSelectedClass(classroom);
      setClassrooms((current) => current.map((item) => item.id === classroom.id ? classroom : item));
      notify(`Đã xóa ${student.hoTen} khỏi lớp.`);
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setSaving(false);
    }
  }

  async function saveAssignment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedClass || saving) return;
    const form = new FormData(event.currentTarget);
    const video = form.get("video");
    if (!(video instanceof File) || video.size === 0 || !video.type.startsWith("video/")) {
      setError("Vui lòng chọn tệp video hợp lệ.");
      return;
    }
    if (video.size > MAX_VIDEO_SIZE) {
      setError("Video không được vượt quá 100 MB.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const assignment = await createAssignment(selectedClass.id, {
        tieuDe: String(form.get("tieuDe") ?? "").trim(),
        huongDan: String(form.get("huongDan") ?? "").trim(),
        hanNop: String(form.get("hanNop") ?? ""),
        video,
      });
      setAssignments((current) => [assignment, ...current]);
      setAssignmentModalOpen(false);
      notify("Đã thêm bài tập video.");
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setSaving(false);
    }
  }

  async function submitVideo(event: FormEvent<HTMLFormElement>, assignment: VideoAssignment) {
    event.preventDefault();
    if (!selectedClass || saving) return;
    const video = new FormData(event.currentTarget).get("video");
    if (!(video instanceof File) || video.size === 0 || !video.type.startsWith("video/")) {
      setError("Vui lòng chọn tệp video hợp lệ để nộp.");
      return;
    }
    if (video.size > MAX_VIDEO_SIZE) {
      setError("Video không được vượt quá 100 MB.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const submittedAssignment = await submitAssignment(selectedClass.id, assignment.id, video);
      const submittedVideo = submittedAssignment.baiNop.find((submission) => submission.baiCuaToi);
      setAiEvaluations((current) => {
        const next = { ...current };
        const submission = assignment.baiNop.find((item) => item.baiCuaToi);
        if (submission) delete next[submission.id];
        if (submittedVideo?.aiDanhGia) {
          next[submittedVideo.id] = submittedVideo.aiDanhGia;
        }
        return next;
      });
      await refreshSelectedClass();
      if (submittedVideo?.trangThaiAi === "LOI") {
        notify("Đã lưu bài nộp; hệ thống AI chưa đánh giá được, giáo viên có thể thử phân tích lại.");
      } else {
        notify(`Đã nộp video và AI đã đánh giá cho bài "${assignment.tieuDe}".`);
      }
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setSaving(false);
    }
  }

  async function saveGrade(
    event: FormEvent<HTMLFormElement>,
    assignment: VideoAssignment,
    submission: VideoSubmission,
  ) {
    event.preventDefault();
    if (!selectedClass || saving) return;
    const form = new FormData(event.currentTarget);
    const score = Number(form.get("diem"));
    setSaving(true);
    setError("");
    try {
      await gradeSubmission(
        selectedClass.id,
        assignment.id,
        submission.id,
        score,
        String(form.get("nhanXet") ?? "").trim(),
      );
      setGradeDrafts((current) => ({ ...current, [submission.id]: String(score) }));
      await refreshSelectedClass();
      notify(`Đã lưu điểm cho ${submission.tenHocSinh}.`);
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setSaving(false);
    }
  }

  async function evaluateVideo(assignment: VideoAssignment, submission: VideoSubmission) {
    if (!selectedClass || evaluatingSubmissionId !== null) return;
    setEvaluatingSubmissionId(submission.id);
    setError("");
    try {
      const result = await evaluateSubmission(selectedClass.id, assignment.id, submission.id);
      setAiEvaluations((current) => ({ ...current, [submission.id]: result }));
    } catch (cause) {
      setError(`Không thể đánh giá video: ${errorMessage(cause)}`);
    } finally {
      setEvaluatingSubmissionId(null);
    }
  }

  async function exportClassResults() {
    if (!selectedClass || !isTeacher || exportingResults) return;
    setExportingResults(true);
    try {
      const rows = assignments.flatMap((assignment) =>
        selectedClass.hocSinh.map((student) => {
          const submission = assignment.baiNop.find((item) => item.hocSinhId === student.id);
          const evaluation = submission
            ? aiEvaluations[submission.id] ?? submission.aiDanhGia
            : null;
          const aiStatus = !submission
            ? "Chưa nộp"
            : evaluation
              ? "Đã phân tích"
              : submission.trangThaiAi === "DANG_DANH_GIA"
                ? "Đang đánh giá"
                : submission.trangThaiAi === "LOI"
                  ? "Lỗi đánh giá"
                  : "Chưa đánh giá";
          return [
            selectedClass.maLop,
            selectedClass.tenLop,
            student.maSinhVien,
            student.hoTen,
            student.email,
            assignment.tieuDe,
            assignment.hanNop ?? "",
            submission ? "Đã nộp" : "Chưa nộp",
            submission?.ngayNop ?? "",
            submission?.tenVideo ?? "",
            submission?.diem ?? "",
            submission?.nhanXet ?? "",
            aiStatus,
            evaluation?.similarityPercent ?? "",
            evaluation ? speedAssessmentLabel(evaluation.speedAssessment) : "",
            evaluation?.speedDifferencePercent ?? "",
            evaluation?.suggestedScore ?? "",
            evaluation?.confidencePercent ?? "",
            evaluation?.referenceMovementSeconds ?? "",
            evaluation?.submissionMovementSeconds ?? "",
            evaluation?.scoreBreakdown ?? submission?.loiDanhGiaAi ?? "",
          ];
        }),
      );
      const headers = [
        "Mã lớp",
        "Tên lớp",
        "Mã học sinh",
        "Họ tên học sinh",
        "Email",
        "Bài tập",
        "Hạn nộp",
        "Trạng thái nộp",
        "Ngày nộp",
        "Tên video",
        "Điểm giáo viên (/10)",
        "Nhận xét giáo viên",
        "Trạng thái AI",
        "Độ tương đồng (%)",
        "Đánh giá tốc độ",
        "Chênh lệch tốc độ (%)",
        "Điểm AI đề xuất (/10)",
        "Độ tin cậy AI (%)",
        "Thời lượng động tác mẫu (giây)",
        "Thời lượng động tác bài nộp (giây)",
        "Chi tiết AI / Lỗi đánh giá",
      ];
      const columnWidths = [
        14, 24, 16, 24, 30, 30, 20, 15, 20, 30, 18, 36, 16, 17, 22, 20, 19, 18, 26, 29, 60,
      ];
      const blob = await createXlsxWorkbook(headers, rows, columnWidths, "Kết quả bài tập");
      const downloadUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = `ket-qua-${selectedClass.maLop.replace(/[<>:"/\\|?*]/g, "_")}.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 0);
      notify(`Đã xuất ${rows.length} dòng kết quả của lớp ${selectedClass.maLop}.`);
    } catch (cause) {
      setError(`Không thể xuất Excel: ${errorMessage(cause)}`);
    } finally {
      setExportingResults(false);
    }
  }

  if (selectedClass) {
    const activeAssignment = assignments.find((assignment) => assignment.id === selectedAssignmentId) ?? null;
    return (
      <section className="class-detail-page">
        <button className="class-back-button" onClick={() => { setSelectedClass(null); setSelectedAssignmentId(null); setAssignments([]); setError(""); }}>
          <Icon name="back" size={17} /> Danh sách lớp
        </button>
        <div className="class-detail-heading">
          <div className="class-detail-title">
            <span className="class-detail-icon"><Icon name="calendar" size={21} /></span>
            <div>
              <span className="class-detail-kicker">{selectedClass.maLop} · LỚP HỌC</span>
              <h2>{selectedClass.tenLop}</h2>
              <p>Giáo viên: <strong>{selectedClass.tenGiaoVien}</strong><span className="detail-dot">·</span>{selectedClass.soHocSinh} học sinh</p>
            </div>
          </div>
          {isTeacher && <div className="class-detail-actions">
            <button className="button button-secondary" onClick={() => void exportClassResults()} disabled={assignments.length === 0 || exportingResults}><Icon name="download" size={15} /> {exportingResults ? "Đang xuất..." : "Xuất Excel"}</button>
            <button className="button button-secondary" onClick={() => setStudentModalOpen(true)}><Icon name="users" size={15} /> Thêm học sinh</button>
          </div>}
        </div>

        {error && <div className="class-error" role="alert">{error}</div>}

        {selectedAssignmentId === null ? (
          <>
        <section className="panel classroom-members-panel">
          <div className="students-heading">
            <div><div className="members-title"><h2>Học sinh trong lớp</h2><span className="member-count">{selectedClass.soHocSinh}</span></div><p>Thành viên lớp có thể xem bài tập và video bài nộp của nhau.</p></div>
          </div>
          {selectedClass.hocSinh.length ? (
            <div className="table-scroll student-table-scroll">
              <table className="student-table classroom-members-table">
                <thead><tr><th>STT</th><th>MÃ SINH VIÊN</th><th>HỌ TÊN</th><th>EMAIL</th>{isTeacher && <th>THAO TÁC</th>}</tr></thead>
                <tbody>{selectedClass.hocSinh.slice((memberPage - 1) * PAGE_SIZE, memberPage * PAGE_SIZE).map((student, index) => (
                  <tr className={focusedStudentId === student.id ? "classroom-member-highlight" : undefined} key={student.id}>
                    <td>{(memberPage - 1) * PAGE_SIZE + index + 1}</td><td>{student.maSinhVien}</td><td><strong className="student-name">{student.hoTen}</strong></td><td>{student.email}</td>
                    {isTeacher && <td><button className="student-action-button student-delete-button" aria-label={`Xóa ${student.hoTen} khỏi lớp`} disabled={saving} onClick={() => void removeStudent(student)}><Icon name="trash" size={15} /></button></td>}
                  </tr>
                ))}</tbody>
              </table>
            </div>
          ) : <div className="class-empty-state">Lớp chưa có học sinh.{isTeacher ? " Hãy thêm học sinh để các em truy cập lớp." : ""}</div>}
          {selectedClass.soHocSinh > PAGE_SIZE && (
            <div className="table-footer">
              <span>Hiển thị {(memberPage - 1) * PAGE_SIZE + 1}–{Math.min(memberPage * PAGE_SIZE, selectedClass.soHocSinh)} trong {selectedClass.soHocSinh} học sinh.</span>
              <div><button type="button" aria-label="Trang học sinh trước" disabled={memberPage === 1} onClick={() => setMemberPage(memberPage - 1)}><Icon name="chevron" size={13} className="previous-chevron" /></button><span className="page-number">{memberPage} / {Math.ceil(selectedClass.soHocSinh / PAGE_SIZE)}</span><button type="button" aria-label="Trang học sinh sau" disabled={memberPage === Math.ceil(selectedClass.soHocSinh / PAGE_SIZE)} onClick={() => setMemberPage(memberPage + 1)}><Icon name="chevron" size={13} /></button></div>
            </div>
          )}
        </section>

        <div className="class-assignment-heading">
          <div><h3>Bài tập video</h3><p>{isTeacher ? "Thêm video hướng dẫn, xem bài nộp và chấm điểm." : "Nộp video và xem bài làm của các bạn trong lớp."}</p></div>
          {isTeacher && <button className="button button-primary" onClick={() => setAssignmentModalOpen(true)}><Icon name="plus" size={16} /> Thêm bài tập</button>}
        </div>
        {assignments.length ? (
          <div className="classroom-assignment-list">
            {assignments.map((assignment) => {
              const mySubmission = assignment.baiNop.find((submission) => submission.baiCuaToi);
              const ungradedCount = assignment.baiNop.filter((submission) => submission.diem === null).length;
              return (
                <article className="panel classroom-assignment-summary" key={assignment.id}>
                  <div className="classroom-assignment-heading">
                    <div><span className="class-detail-kicker">BÀI TẬP · {formatDate(assignment.ngayTao)}</span><h3>{assignment.tieuDe}</h3><p>{assignment.huongDan || "Không có hướng dẫn bổ sung."}</p></div>
                    <span className="assignment-deadline">Hạn nộp: {formatDateTime(assignment.hanNop)}</span>
                  </div>
                  <div className="assignment-summary-metrics">
                    <span><strong>{assignment.baiNop.length}</strong> bài đã nộp</span>
                    <span><strong>{ungradedCount}</strong> chưa chấm</span>
                    {!isTeacher && <span>{mySubmission ? `Bạn đã nộp · ${mySubmission.diem === null ? "Chờ chấm" : `${mySubmission.diem}/10`}` : "Bạn chưa nộp"}</span>}
                  </div>
                  <button className="button button-secondary assignment-open-button" type="button" onClick={() => {
                    setSelectedAssignmentId(assignment.id);
                    setExpandedSubmissionId(null);
                    setSubmissionQuery("");
                    setError("");
                  }}>
                    Xem bài tập và {isTeacher ? "duyệt bài nộp" : "bài nộp"} <Icon name="chevron" size={14} />
                  </button>
                </article>
              );
            })}
          </div>
        ) : <div className="class-empty-state">{isTeacher ? "Lớp chưa có bài tập video." : "Lớp chưa có bài tập được giao."}</div>}
          </>
        ) : activeAssignment ? (
          <section className="assignment-review-page">
            <button className="class-back-button" type="button" onClick={() => { setSelectedAssignmentId(null); setExpandedSubmissionId(null); setError(""); }}>
              <Icon name="back" size={17} /> Danh sách bài tập
            </button>
            <header className="assignment-review-header">
              <div><span className="class-detail-kicker">TỔNG QUAN BÀI TẬP · {formatDate(activeAssignment.ngayTao)}</span><h2>{activeAssignment.tieuDe}</h2><p>{activeAssignment.huongDan || "Không có hướng dẫn bổ sung."}</p></div>
              <span className="assignment-deadline">Hạn nộp: {formatDateTime(activeAssignment.hanNop)}</span>
            </header>
            <div className="assignment-review-stats">
              <article><strong>{activeAssignment.baiNop.length}</strong><span>Đã nộp</span></article>
              <article><strong>{Math.max(0, selectedClass.soHocSinh - activeAssignment.baiNop.length)}</strong><span>Chưa nộp</span></article>
              <article><strong>{activeAssignment.baiNop.filter((submission) => submission.diem === null).length}</strong><span>Chờ chấm</span></article>
            </div>
            <section className="panel assignment-reference-panel">
              <div><h3>Video bài mẫu</h3><p>{activeAssignment.tenVideo} · Giáo viên {activeAssignment.tenGiaoVien}</p></div>
              <video className="classroom-video" controls preload="metadata" crossOrigin="use-credentials" src={videoSource(activeAssignment.videoUrl)}>
                Trình duyệt không hỗ trợ phát video.
              </video>
            </section>
            {!isTeacher && (
              <div className="student-submit-panel">
                {activeAssignment.baiNop.find((submission) => submission.baiCuaToi) && (() => {
                  const mySubmission = activeAssignment.baiNop.find((submission) => submission.baiCuaToi)!;
                  return <p>Bạn đã nộp {mySubmission.tenVideo} · {formatDateTime(mySubmission.ngayNop)}{mySubmission.diem !== null ? ` · Điểm ${mySubmission.diem}/10` : " · Chưa chấm điểm"}{mySubmission.nhanXet ? ` · ${mySubmission.nhanXet}` : ""}</p>;
                })()}
                <form className="video-submit-form" onSubmit={(event) => void submitVideo(event, activeAssignment)}>
                  <label>Chọn video bài làm<input name="video" type="file" accept="video/*" required /></label>
                  <button className="button button-primary" type="submit" disabled={saving}><Icon name="upload" size={15} />{saving ? "Đang tải lên và AI đánh giá..." : activeAssignment.baiNop.some((submission) => submission.baiCuaToi) ? "Nộp lại video" : "Nộp video"}</button>
                </form>
              </div>
            )}
            <section className="panel assignment-submissions-panel">
              <div className="assignment-submissions-toolbar">
                <div><h3>{isTeacher ? "Danh sách bài nộp" : "Bài nộp trong lớp"}</h3><p>{activeAssignment.baiNop.length} bài nộp · {activeAssignment.baiNop.filter((submission) => submission.diem !== null).length} đã chấm</p></div>
                <input aria-label="Tìm học sinh" placeholder="Tìm theo tên hoặc mã sinh viên" value={submissionQuery} onChange={(event) => { setSubmissionQuery(event.target.value); setSubmissionPages((pages) => ({ ...pages, [activeAssignment.id]: 1 })); }} />
              </div>
              {(() => {
                const normalizedQuery = submissionQuery.trim().toLocaleLowerCase("vi");
                const filteredSubmissions = activeAssignment.baiNop.filter((submission) =>
                  `${submission.tenHocSinh} ${submission.maSinhVien}`.toLocaleLowerCase("vi").includes(normalizedQuery),
                );
                const totalPages = Math.max(1, Math.ceil(filteredSubmissions.length / PAGE_SIZE));
                const currentPage = Math.min(submissionPages[activeAssignment.id] ?? 1, totalPages);
                const visibleSubmissions = filteredSubmissions.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
                if (filteredSubmissions.length === 0) {
                  return <div className="class-empty-state">{activeAssignment.baiNop.length ? "Không tìm thấy bài nộp phù hợp." : "Chưa có học sinh nộp bài tập này."}</div>;
                }
                return (
                  <>
                    <div className="review-submission-list">
                      {visibleSubmissions.map((submission, index) => {
                        const expanded = expandedSubmissionId === submission.id;
                        const evaluation = aiEvaluations[submission.id] ?? submission.aiDanhGia;
                        return (
                          <article className={`review-submission${expanded ? " review-submission-expanded" : ""}`} key={submission.id}>
                            <div className="review-submission-row">
                              <span className="review-submission-number">{(currentPage - 1) * PAGE_SIZE + index + 1}</span>
                              <div className="review-submission-student"><strong>{submission.baiCuaToi ? "Bài của bạn" : submission.tenHocSinh}</strong><span>{submission.maSinhVien} · {formatDateTime(submission.ngayNop)}</span></div>
                              <span className={submission.diem === null ? "submission-ungraded" : "submission-score"}>{submission.diem === null ? "Chưa chấm" : `${submission.diem}/10`}</span>
                              <button className="button button-secondary review-toggle-button" type="button" onClick={() => setExpandedSubmissionId(expanded ? null : submission.id)}>{expanded ? "Thu gọn" : "Xem bài"}</button>
                            </div>
                            {expanded && (
                              <div className="review-submission-detail">
                                <p className="classroom-video-caption">{submission.tenVideo}</p>
                                <video className="classroom-video classroom-submission-video" controls preload="metadata" crossOrigin="use-credentials" src={videoSource(submission.videoUrl)}>
                                  Trình duyệt không hỗ trợ phát video.
                                </video>
                                {submission.nhanXet && <p className="submission-feedback">Nhận xét hiện tại: {submission.nhanXet}</p>}
                                {isTeacher && (
                                  <>
                                    <section className="ai-evaluation-panel">
                                      <div><strong>Gợi ý phân tích AI</strong><p>So sánh video với bài mẫu; kết quả chỉ để tham khảo và không tự lưu điểm.</p></div>
                                      <button type="button" className="button button-secondary" disabled={evaluatingSubmissionId !== null} onClick={() => void evaluateVideo(activeAssignment, submission)}>
                                        {evaluatingSubmissionId === submission.id ? "Đang phân tích..." : evaluation ? "Phân tích lại" : "Phân tích video"}
                                      </button>
                                      {!evaluation && submission.trangThaiAi === "DANG_DANH_GIA" && <p className="ai-evaluation-error">AI đang phân tích bài nộp này.</p>}
                                      {!evaluation && submission.trangThaiAi === "LOI" && <p className="ai-evaluation-error">{submission.loiDanhGiaAi || "AI chưa phân tích được video."} Bạn có thể thử phân tích lại.</p>}
                                      {evaluation && (
                                        <div className="ai-evaluation-results">
                                          <div><strong>{evaluation.similarityPercent}%</strong><span>Động tác tương đồng</span></div>
                                          <div><strong>{evaluation.speedAssessment === "SLOWER" ? "Chậm hơn" : evaluation.speedAssessment === "FASTER" ? "Nhanh hơn" : "Gần bằng"}</strong><span>{Math.abs(evaluation.speedDifferencePercent)}% thời lượng động tác</span></div>
                                          <div><strong>{evaluation.suggestedScore}/10</strong><span>Điểm AI gợi ý</span></div>
                                          <p>Độ tin cậy nhận diện {evaluation.confidencePercent}%. Thời lượng động tác mẫu: {formatDuration(evaluation.referenceMovementSeconds)} · bài nộp: {formatDuration(evaluation.submissionMovementSeconds)}.</p>
                                          <small>{evaluation.scoreBreakdown}. Tốc độ được ước lượng theo khoảng biến đổi góc gối; tư thế quay khuất hoặc chuyển động ít có thể ảnh hưởng kết quả.</small>
                                        </div>
                                      )}
                                    </section>
                                    <form className="grade-form" onSubmit={(event) => void saveGrade(event, activeAssignment, submission)}>
                                        <label>Điểm chính thức (0–10)<input name="diem" type="number" min="0" max="10" step="0.1" required value={gradeDrafts[submission.id] ?? submission.diem?.toString() ?? evaluation?.suggestedScore.toString() ?? ""} onChange={(event) => setGradeDrafts((current) => ({ ...current, [submission.id]: event.target.value }))} /></label>
                                      <label>Nhận xét<input name="nhanXet" maxLength={2000} defaultValue={submission.nhanXet ?? ""} placeholder="Nhận xét cho học sinh" /></label>
                                      <button type="submit" className="button button-primary" disabled={saving}>{saving ? "Đang lưu..." : "Lưu điểm thủ công"}</button>
                                    </form>
                                  </>
                                )}
                                {!isTeacher && submission.baiCuaToi && (
                                  <section className="ai-evaluation-panel student-ai-evaluation">
                                    <div><strong>Gợi ý từ AI (tham khảo)</strong><p>Đánh giá sơ bộ; không phải điểm chính thức.</p></div>
                                    {evaluation ? (
                                      <div className="ai-evaluation-results">
                                        <div><strong>{evaluation.similarityPercent}%</strong><span>Động tác tương đồng</span></div>
                                        <div><strong>{evaluation.speedAssessment === "SLOWER" ? "Chậm hơn" : evaluation.speedAssessment === "FASTER" ? "Nhanh hơn" : "Gần bằng"}</strong><span>{Math.abs(evaluation.speedDifferencePercent)}% thời lượng động tác</span></div>
                                        <div><strong>{evaluation.suggestedScore}/10</strong><span>Điểm AI gợi ý</span></div>
                                      </div>
                                    ) : submission.trangThaiAi === "LOI" ? (
                                      <p className="ai-evaluation-error">{submission.loiDanhGiaAi || "AI chưa phân tích được video."}</p>
                                    ) : (
                                      <p className="ai-evaluation-error">Bài nộp đã được lưu; đang chờ kết quả phân tích AI.</p>
                                    )}
                                  </section>
                                )}
                              </div>
                            )}
                          </article>
                        );
                      })}
                    </div>
                    {filteredSubmissions.length > PAGE_SIZE && (
                      <div className="table-footer classroom-submission-pagination">
                        <span>Hiển thị {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filteredSubmissions.length)} trong {filteredSubmissions.length} bài nộp</span>
                        <div><button type="button" aria-label="Bài nộp trước" disabled={currentPage === 1} onClick={() => setSubmissionPages((pages) => ({ ...pages, [activeAssignment.id]: currentPage - 1 }))}><Icon name="chevron" size={13} className="previous-chevron" /></button><span className="page-number">{currentPage} / {totalPages}</span><button type="button" aria-label="Bài nộp tiếp theo" disabled={currentPage === totalPages} onClick={() => setSubmissionPages((pages) => ({ ...pages, [activeAssignment.id]: currentPage + 1 }))}><Icon name="chevron" size={13} /></button></div>
                      </div>
                    )}
                  </>
                );
              })()}
            </section>
          </section>
        ) : (
          <div className="class-empty-state">Đang tải thông tin bài tập...</div>
        )}

        {classModalOpen && renderClassModal()}
        {studentModalOpen && renderStudentModal()}
        {assignmentModalOpen && renderAssignmentModal()}
      </section>
    );
  }

  function renderClassModal() {
    return (
      <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setClassModalOpen(false); }}>
        <section className="member-modal student-modal" role="dialog" aria-modal="true" aria-labelledby="class-modal-title">
          <div className="modal-heading"><div><span className="modal-icon"><Icon name="calendar" size={20} /></span><div><h2 id="class-modal-title">Tạo lớp học</h2><p>Tạo lớp và thêm học sinh sau khi lưu.</p></div></div><button className="subtle-icon-button" aria-label="Đóng" onClick={() => setClassModalOpen(false)}><Icon name="close" /></button></div>
          <form onSubmit={(event) => void saveClass(event)}>
            <label>Mã lớp<input name="maLop" required maxLength={50} placeholder="Ví dụ: CNTT-K22A" /></label>
            <label>Tên lớp<input name="tenLop" required maxLength={150} placeholder="Ví dụ: Tin học khóa 22A" /></label>
            <div className="modal-actions"><button type="button" className="button button-secondary" onClick={() => setClassModalOpen(false)}>Hủy</button><button type="submit" className="button button-primary" disabled={saving}>{saving ? "Đang tạo..." : "Tạo lớp học"}</button></div>
          </form>
        </section>
      </div>
    );
  }

  function renderStudentModal() {
    return (
      <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setStudentModalOpen(false); }}>
        <section className="member-modal student-modal classroom-student-modal" role="dialog" aria-modal="true" aria-labelledby="student-modal-title">
          <div className="modal-heading"><div><span className="modal-icon"><Icon name="users" size={20} /></span><div><h2 id="student-modal-title">Thêm học sinh vào lớp</h2><p>Chọn một hoặc nhiều học sinh. Học sinh có thể tham gia nhiều lớp.</p></div></div><button className="subtle-icon-button" aria-label="Đóng" onClick={() => setStudentModalOpen(false)}><Icon name="close" /></button></div>
          {eligibleStudents.length ? <form onSubmit={(event) => void addStudents(event)}>
            <div className="classroom-student-picker">{eligibleStudents.map((student) => (
              <label key={student.id}><input type="checkbox" name="hocSinhIds" value={student.id} /><span><strong>{student.hoTen}</strong><small>{student.maSinhVien} · {student.email}</small></span></label>
            ))}</div>
            <div className="modal-actions"><button type="button" className="button button-secondary" onClick={() => setStudentModalOpen(false)}>Hủy</button><button type="submit" className="button button-primary" disabled={saving}>{saving ? "Đang thêm..." : "Thêm học sinh đã chọn"}</button></div>
          </form> : <div className="class-empty-state">Không còn học sinh nào để thêm.</div>}
        </section>
      </div>
    );
  }

  function renderAssignmentModal() {
    return (
      <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setAssignmentModalOpen(false); }}>
        <section className="member-modal student-modal" role="dialog" aria-modal="true" aria-labelledby="assignment-modal-title">
          <div className="modal-heading"><div><span className="modal-icon"><Icon name="video" size={20} /></span><div><h2 id="assignment-modal-title">Thêm bài tập video</h2><p>Tải video hướng dẫn để học sinh xem và nộp video trả lời.</p></div></div><button className="subtle-icon-button" aria-label="Đóng" onClick={() => setAssignmentModalOpen(false)}><Icon name="close" /></button></div>
          <form onSubmit={(event) => void saveAssignment(event)}>
            <label>Tiêu đề<input name="tieuDe" required maxLength={150} placeholder="Ví dụ: Bài tập tuần 1" /></label>
            <label>Hướng dẫn<textarea name="huongDan" maxLength={4000} rows={3} placeholder="Mô tả yêu cầu bài tập" /></label>
            <label>Hạn nộp<input name="hanNop" type="datetime-local" /></label>
            <label className="video-file-label">Video hướng dẫn<input name="video" type="file" accept="video/*" required /></label>
            <p className="password-help">Định dạng video; tối đa 100 MB. Tệp được lưu trên máy chủ.</p>
            <div className="modal-actions"><button type="button" className="button button-secondary" onClick={() => setAssignmentModalOpen(false)}>Hủy</button><button type="submit" className="button button-primary" disabled={saving}>{saving ? "Đang tải lên..." : "Tạo bài tập"}</button></div>
          </form>
        </section>
      </div>
    );
  }

  return (
    <section className="panel students-panel">
      <div className="students-heading">
        <div><div className="members-title"><h2>{isTeacher ? "Lớp học của tôi" : "Lớp học của tôi"}</h2><span className="member-count">{classrooms.length}</span></div><p>{isTeacher ? "Tạo lớp, thêm học sinh và quản lý bài tập video." : "Xem bài tập video và bài nộp trong các lớp bạn tham gia."}</p></div>
        <div className="management-heading-actions">
          <label className="table-search student-search"><Icon name="search" size={16} /><input value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} placeholder="Tìm theo mã hoặc tên lớp..." aria-label="Tìm lớp học" /></label>
          {isTeacher && <button className="button button-primary" onClick={() => setClassModalOpen(true)}><Icon name="plus" size={16} /> Tạo lớp</button>}
        </div>
      </div>
      {error && <div className="class-error" role="alert">{error}</div>}
      {loading ? <div className="class-empty-state">Đang tải lớp học...</div> : visibleClassrooms.length ? (
        <>
          <div className="table-scroll student-table-scroll">
            <table className="student-table class-table">
              <thead><tr><th>STT</th><th>MÃ LỚP</th><th>TÊN LỚP</th><th>GIÁO VIÊN</th><th>SỐ HỌC SINH</th><th>NGÀY TẠO</th><th>THAO TÁC</th></tr></thead>
              <tbody>{pageClassrooms.map((classroom, index) => (
                <tr key={classroom.id}>
                  <td>{(currentPage - 1) * PAGE_SIZE + index + 1}</td><td><span className="student-class">{classroom.maLop}</span></td><td><strong className="student-name">{classroom.tenLop}</strong></td><td>{classroom.tenGiaoVien}</td><td>{classroom.soHocSinh}</td><td>{formatDate(classroom.ngayTao)}</td>
                  <td><button className="student-action-button class-open-button" aria-label={`Mở lớp ${classroom.tenLop}`} onClick={() => void openClass(classroom)}><Icon name="video" size={15} /></button></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
          <div className="table-footer">
            <span>Hiển thị <strong>{(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, visibleClassrooms.length)}</strong> trong <strong>{visibleClassrooms.length}</strong> lớp học</span>
            <div><button type="button" disabled={currentPage === 1} aria-label="Trang trước" onClick={() => setPage(currentPage - 1)}><Icon name="chevron" size={13} className="previous-chevron" /></button><span className="page-number">{currentPage} / {pageCount}</span><button type="button" disabled={currentPage === pageCount} aria-label="Trang sau" onClick={() => setPage(currentPage + 1)}><Icon name="chevron" size={13} /></button></div>
          </div>
        </>
      ) : <div className="class-empty-state">{query ? "Không tìm thấy lớp phù hợp." : isTeacher ? "Bạn chưa tạo lớp học nào." : "Bạn chưa được thêm vào lớp học nào."}</div>}
      {classModalOpen && renderClassModal()}
    </section>
  );
}
