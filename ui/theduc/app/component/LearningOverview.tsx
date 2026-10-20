"use client";

import type { LearningClassData } from "../hooks/useLearningData";
import type { UserKind } from "../domain/User";
import { Icon } from "./Icon";

type LearningOverviewProps = {
  role: UserKind;
  classes: LearningClassData[];
  loading: boolean;
  error: string;
  onOpenClass: (classId: number, assignmentId?: number) => void;
};

function activityDate(classData: LearningClassData) {
  return classData.assignments
    .flatMap((assignment) => [
      assignment.ngayTao,
      ...assignment.baiNop.map((submission) => submission.ngayNop),
    ])
    .map((date) => new Date(date).getTime())
    .filter(Number.isFinite)
    .reduce((latest, date) => Math.max(latest, date), new Date(classData.classroom.ngayTao).getTime());
}

function formatDeadline(value: string) {
  return new Date(value).toLocaleString("vi-VN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function isUpcoming(value: string | null) {
  return value !== null && new Date(value).getTime() >= Date.now();
}

export function LearningOverview({
  role,
  classes,
  loading,
  error,
  onOpenClass,
}: LearningOverviewProps) {
  const isTeacher = role === "GIAO_VIEN";
  const recentClasses = [...classes].sort((left, right) => activityDate(right) - activityDate(left)).slice(0, 4);
  const deadlines = classes
    .flatMap(({ classroom, assignments }) =>
      assignments
        .filter((assignment) => isUpcoming(assignment.hanNop))
        .map((assignment) => ({
          classroom,
          assignment,
          submission: assignment.baiNop.find((item) => item.baiCuaToi),
        })),
    )
    .sort((left, right) => new Date(left.assignment.hanNop!).getTime() - new Date(right.assignment.hanNop!).getTime())
    .slice(0, 6);

  return (
    <section className="learning-overview">
      {error && <div className="class-error" role="alert">{error}</div>}
      {loading ? (
        <div className="learning-overview-loading"><span /> Đang tải dữ liệu lớp học...</div>
      ) : (
        <>
          <div className="learning-overview-metrics">
            <article><span className="learning-metric-icon metric-purple"><Icon name="calendar" size={18} /></span><div><strong>{classes.length}</strong><span>{isTeacher ? "Lớp đang quản lý" : "Lớp đang tham gia"}</span></div></article>
            {isTeacher ? (
              <>
                <article><span className="learning-metric-icon metric-blue"><Icon name="upload" size={18} /></span><div><strong>{classes.reduce((total, item) => total + item.assignments.reduce((count, assignment) => count + assignment.baiNop.length, 0), 0)}</strong><span>Lượt nộp bài</span></div></article>
                <article><span className="learning-metric-icon metric-orange"><Icon name="users" size={18} /></span><div><strong>{classes.reduce((total, item) => total + item.assignments.reduce((count, assignment) => count + Math.max(0, item.classroom.soHocSinh - assignment.baiNop.length), 0), 0)}</strong><span>Lượt chưa nộp</span></div></article>
                <article><span className="learning-metric-icon metric-green"><Icon name="chart" size={18} /></span><div><strong>{(() => {
                  const scores = classes.flatMap((item) => item.assignments.flatMap((assignment) => assignment.baiNop.map((submission) => submission.diem).filter((score): score is number => score !== null)));
                  return scores.length ? `${(scores.reduce((sum, score) => sum + score, 0) / scores.length).toFixed(1)}/10` : "—";
                })()}</strong><span>Điểm trung bình</span></div></article>
              </>
            ) : (
              <>
                <article><span className="learning-metric-icon metric-blue"><Icon name="upload" size={18} /></span><div><strong>{classes.reduce((total, item) => total + item.assignments.filter((assignment) => assignment.baiNop.some((submission) => submission.baiCuaToi)).length, 0)}</strong><span>Bài đã nộp</span></div></article>
                <article><span className="learning-metric-icon metric-orange"><Icon name="calendar" size={18} /></span><div><strong>{deadlines.filter((item) => !item.submission).length}</strong><span>Sắp đến hạn cần nộp</span></div></article>
                <article><span className="learning-metric-icon metric-green"><Icon name="chart" size={18} /></span><div><strong>{(() => {
                  const scores = classes.flatMap((item) => item.assignments.flatMap((assignment) => assignment.baiNop.filter((submission) => submission.baiCuaToi && submission.diem !== null).map((submission) => submission.diem!)));
                  return scores.length ? `${(scores.reduce((sum, score) => sum + score, 0) / scores.length).toFixed(1)}/10` : "—";
                })()}</strong><span>Điểm trung bình</span></div></article>
              </>
            )}
          </div>

          {isTeacher ? (
            <section className="panel learning-section">
              <div className="learning-section-heading"><div><h2>Lớp học hoạt động gần đây</h2><p>Theo dõi tình hình nộp bài và kết quả chấm theo từng lớp.</p></div><span>{recentClasses.length} lớp</span></div>
              {recentClasses.length ? (
                <div className="learning-class-grid">
                  {recentClasses.map(({ classroom, assignments }) => {
                    const submitted = assignments.reduce((total, assignment) => total + assignment.baiNop.length, 0);
                    const expected = assignments.length * classroom.soHocSinh;
                    const scores = assignments.flatMap((assignment) => assignment.baiNop.map((submission) => submission.diem).filter((score): score is number => score !== null));
                    const average = scores.length ? (scores.reduce((sum, score) => sum + score, 0) / scores.length).toFixed(1) : "—";
                    return (
                      <button className="learning-class-card" key={classroom.id} onClick={() => onOpenClass(classroom.id)}>
                        <div className="learning-class-card-top"><span className="learning-class-avatar"><Icon name="calendar" size={17} /></span><span className="class-detail-kicker">{classroom.maLop}</span><Icon name="chevron" size={14} /></div>
                        <strong>{classroom.tenLop}</strong>
                        <span className="learning-class-meta">{classroom.soHocSinh} học sinh · {assignments.length} bài tập</span>
                        <div className="learning-class-stats"><span><b>{submitted}</b> lượt nộp</span><span><b>{Math.max(0, expected - submitted)}</b> chưa nộp</span><span><b>{average}</b> TB</span></div>
                      </button>
                    );
                  })}
                </div>
              ) : <div className="class-empty-state">Bạn chưa có lớp học. Tạo lớp để bắt đầu giao bài và theo dõi tiến độ.</div>}
            </section>
          ) : (
            <>
              <section className="panel learning-section">
                <div className="learning-section-heading"><div><h2>Kết quả theo lớp</h2><p>Điểm trung bình dựa trên các bài đã được giáo viên chấm.</p></div><span>{classes.length} lớp</span></div>
                {classes.length ? (
                  <div className="student-class-results">
                    {classes.map(({ classroom, assignments }) => {
                      const submissions = assignments.flatMap((assignment) => assignment.baiNop.filter((submission) => submission.baiCuaToi));
                      const scores = submissions.map((submission) => submission.diem).filter((score): score is number => score !== null);
                      const average = scores.length ? (scores.reduce((sum, score) => sum + score, 0) / scores.length).toFixed(1) : "—";
                      return <button className="student-class-result" key={classroom.id} onClick={() => onOpenClass(classroom.id)}><span><strong>{classroom.tenLop}</strong><small>{classroom.maLop} · {submissions.length}/{assignments.length} bài đã nộp</small></span><b>{average}<small>{average === "—" ? "Chưa có điểm" : "/10"}</small></b><Icon name="chevron" size={14} /></button>;
                    })}
                  </div>
                ) : <div className="class-empty-state">Bạn chưa tham gia lớp học nào.</div>}
              </section>
              <section className="panel learning-section">
                <div className="learning-section-heading"><div><h2>Hạn nộp sắp tới</h2><p>Ưu tiên các bài chưa nộp để không bỏ lỡ thời hạn.</p></div><span>{deadlines.length} bài</span></div>
                {deadlines.length ? (
                  <div className="upcoming-deadline-list">
                    {deadlines.map(({ classroom, assignment, submission }) => <button className={`upcoming-deadline${submission ? " deadline-row-submitted" : ""}`} key={`${classroom.id}-${assignment.id}`} onClick={() => onOpenClass(classroom.id, assignment.id)}><span className={`deadline-indicator${submission ? " deadline-submitted" : ""}`} /><span><strong>{assignment.tieuDe}</strong><small>{classroom.tenLop} · Hạn {formatDeadline(assignment.hanNop!)}</small></span><b>{submission ? "Đã nộp" : "Cần nộp"}</b><Icon name="chevron" size={14} /></button>)}
                  </div>
                ) : <div className="class-empty-state">Hiện không có hạn nộp sắp tới.</div>}
              </section>
            </>
          )}
        </>
      )}
    </section>
  );
}
