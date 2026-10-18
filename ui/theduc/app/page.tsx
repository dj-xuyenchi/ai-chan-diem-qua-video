"use client";

import { FormEvent, useMemo, useState } from "react";
import { chartSets, initialMembers, initialSchoolClasses, initialStudents, navGroups, sectionDescriptions } from "./mock/mock";
import { Icon } from "./component/Icon";
import { StudentsManagement } from "./component/StudentsManagement";
import { ClassesManagement } from "./component/ClassesManagement";
import type { VideoAssignment } from "./type/VideoAssignment";






export default function Home() {
  const [activeNav, setActiveNav] = useState("Tổng quan");
  const [query, setQuery] = useState("");
  const [timeframe, setTimeframe] = useState<keyof typeof chartSets>("30 ngày");
  const [members, setMembers] = useState(initialMembers);
  const [students, setStudents] = useState(initialStudents);
  const [schoolClasses, setSchoolClasses] = useState(initialSchoolClasses);
  const [assignments, setAssignments] = useState<VideoAssignment[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [toast, setToast] = useState("");
  const [showNotifications, setShowNotifications] = useState(false);

  const visibleMembers = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("vi");
    return members.filter((member) =>
      `${member.name} ${member.email} ${member.plan}`.toLocaleLowerCase("vi").includes(normalizedQuery),
    );
  }, [members, query]);

  function notify(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 3000);
  }

  function exportMembers() {
    const rows = [
      ["Họ tên", "Email", "Gói tập", "Trạng thái", "Ngày tham gia"],
      ...visibleMembers.map((member) => [member.name, member.email, member.plan, member.status, member.joined]),
    ];
    const csv = `\uFEFF${rows.map((row) => row.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(",")).join("\n")}`;
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    link.download = "danh-sach-hoi-vien.csv";
    link.click();
    URL.revokeObjectURL(link.href);
    notify("Đã xuất danh sách hội viên");
  }

  function addMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const name = String(formData.get("name")).trim();
    const email = String(formData.get("email")).trim();
    const plan = String(formData.get("plan"));
    if (!name || !email) return;
    const initials = name.split(/\s+/).slice(-2).map((part) => part[0]).join("").toLocaleUpperCase("vi");
    setMembers((current) => [{ name, email, initials, color: "blue", plan, status: "Đang hoạt động", joined: "Hôm nay" }, ...current]);
    setModalOpen(false);
    setQuery("");
    notify(`Đã thêm hội viên ${name}`);
  }

  const activeChart = chartSets[timeframe];

  return (
    <main className="admin-shell">
      {mobileNavOpen && <button className="mobile-scrim" aria-label="Đóng menu" onClick={() => setMobileNavOpen(false)} />}
      <aside className={`sidebar ${mobileNavOpen ? "sidebar-open" : ""}`}>
        <a className="brand" href="#" onClick={(event) => event.preventDefault()}>
          <span className="brand-mark"><span /><span /><span /><span /></span>
          <span className="brand-name">form<span>club</span></span>
        </a>
        <div className="club-switcher">
          <span className="club-avatar">F</span>
          <span className="club-copy"><strong>Form Fitness</strong><small>Nguyễn Huệ, TP.HCM</small></span>
          <Icon name="chevron" size={16} className="switch-chevron" />
        </div>

        <nav className="side-nav" aria-label="Điều hướng chính">
          {navGroups.map((group) => (
            <div className="nav-group" key={group.label}>
              <p className="nav-group-label">{group.label}</p>
              {group.items.map((item) => (
                <button
                  className={`nav-item ${activeNav === item.label ? "nav-item-active" : ""}`}
                  key={item.label}
                  onClick={() => {
                    setActiveNav(item.label);
                    setMobileNavOpen(false);
                  }}
                >
                  <Icon name={item.icon} size={19} />
                  <span>{item.label}</span>
                  {item.label === "Sinh viên" && <span className="nav-count">{students.length}</span>}
                  {item.label === "Lớp học" && <span className="nav-count">{schoolClasses.length}</span>}
                </button>
              ))}
            </div>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="help-card">
            <div className="help-icon"><Icon name="dumbbell" size={18} /></div>
            <strong>Cần hỗ trợ?</strong>
            <p>Đội ngũ Formclub luôn sẵn sàng giúp bạn.</p>
            <button onClick={() => notify("Đội ngũ hỗ trợ sẽ liên hệ với bạn sớm nhất!")}>Liên hệ hỗ trợ <Icon name="arrow" size={14} /></button>
          </div>
          <button className="profile-button" onClick={() => setActiveNav("Cài đặt")}>
            <span className="profile-avatar">TN</span>
            <span className="profile-copy"><strong>Thảo Nguyễn</strong><small>Quản trị viên</small></span>
            <Icon name="more" size={18} />
          </button>
        </div>
      </aside>

      <section className="main-panel">
        <header className="topbar">
          <button className="mobile-menu-button" aria-label="Mở menu" onClick={() => setMobileNavOpen(true)}><Icon name="menu" /></button>
          <div className="breadcrumbs"><span>Form Fitness</span><Icon name="chevron" size={14} /><strong>{activeNav}</strong></div>
          <div className="topbar-actions">
            <label className="global-search">
              <Icon name="search" size={17} />
              <input aria-label="Tìm kiếm toàn trang" placeholder="Tìm kiếm..." onChange={(event) => setQuery(event.target.value)} />
              <kbd>⌘ K</kbd>
            </label>
            <div className="notification-wrap">
              <button className="icon-button notification-button" aria-label="Thông báo" onClick={() => setShowNotifications(!showNotifications)}>
                <Icon name="bell" size={19} /><span className="notification-dot" />
              </button>
              {showNotifications && <div className="notification-popover"><strong>Thông báo</strong><p>Bạn có 3 hội viên mới trong tuần này.</p><p>Lớp Yoga Flow còn 2 chỗ trống.</p></div>}
            </div>
            <span className="topbar-divider" />
            <button className="topbar-user" onClick={() => setActiveNav("Cài đặt")}><span className="profile-avatar">TN</span><span>Thảo Nguyễn</span><Icon name="chevron" size={14} /></button>
          </div>
        </header>

        <div className="page-content">
          <div className="page-heading">
            <div>
              <div className="eyebrow"><span className="live-dot" /> THỨ BẢY, 17 THÁNG 10, 2026</div>
              <h1>{activeNav === "Tổng quan" ? "Chào buổi sáng, Thảo 👋" : activeNav}</h1>
              <p>{sectionDescriptions[activeNav]}</p>
            </div>
            {activeNav !== "Sinh viên" && activeNav !== "Lớp học" && (
              <div className="heading-actions">
                <button className="button button-secondary" onClick={exportMembers}><Icon name="download" size={17} /> Xuất báo cáo</button>
                <button className="button button-primary" onClick={() => setModalOpen(true)}><Icon name="plus" size={18} /> Thêm hội viên</button>
              </div>
            )}
          </div>

          {activeNav === "Sinh viên" ? (
            <StudentsManagement students={students} setStudents={setStudents} query={query} setQuery={setQuery} notify={notify} />
          ) : activeNav === "Lớp học" ? (
            <ClassesManagement schoolClasses={schoolClasses} setSchoolClasses={setSchoolClasses} students={students} assignments={assignments} setAssignments={setAssignments} query={query} setQuery={setQuery} notify={notify} />
          ) : (
            <>
          <section className="stats-grid" aria-label="Thống kê tổng quan">
            <article className="stat-card">
              <div className="stat-top"><span className="stat-label">Tổng hội viên</span><span className="stat-icon stat-icon-lilac"><Icon name="users" size={18} /></span></div>
              <div className="stat-value">1.284</div>
              <div className="stat-foot"><span className="trend-up"><Icon name="arrow" size={13} /> 12,8%</span><span>so với tháng trước</span></div>
              <div className="sparkline sparkline-purple"><svg viewBox="0 0 100 34" preserveAspectRatio="none"><path d="M0 26 C12 22 13 29 25 19 S42 23 49 15 60 19 68 11 80 18 89 7 95 10 100 3" /></svg></div>
            </article>
            <article className="stat-card">
              <div className="stat-top"><span className="stat-label">Doanh thu tháng</span><span className="stat-icon stat-icon-green"><Icon name="credit" size={18} /></span></div>
              <div className="stat-value">186,4<span className="stat-unit">tr</span></div>
              <div className="stat-foot"><span className="trend-up"><Icon name="arrow" size={13} /> 8,2%</span><span>so với tháng trước</span></div>
              <div className="sparkline sparkline-green"><svg viewBox="0 0 100 34" preserveAspectRatio="none"><path d="M0 28 C10 25 14 21 24 25 S39 16 47 19 59 21 66 12 77 17 84 8 95 12 100 3" /></svg></div>
            </article>
            <article className="stat-card">
              <div className="stat-top"><span className="stat-label">Lượt check-in hôm nay</span><span className="stat-icon stat-icon-orange"><Icon name="calendar" size={18} /></span></div>
              <div className="stat-value">186</div>
              <div className="stat-foot"><span className="trend-up"><Icon name="arrow" size={13} /> 6,4%</span><span>so với tuần trước</span></div>
              <div className="sparkline sparkline-orange"><svg viewBox="0 0 100 34" preserveAspectRatio="none"><path d="M0 25 C9 21 16 25 23 17 S35 22 43 15 53 16 61 9 73 16 81 10 91 13 100 3" /></svg></div>
            </article>
            <article className="stat-card">
              <div className="stat-top"><span className="stat-label">Tỷ lệ duy trì</span><span className="stat-icon stat-icon-blue"><Icon name="chart" size={18} /></span></div>
              <div className="stat-value">94,2<span className="stat-unit">%</span></div>
              <div className="stat-foot"><span className="trend-up"><Icon name="arrow" size={13} /> 2,1%</span><span>so với tháng trước</span></div>
              <div className="sparkline sparkline-blue"><svg viewBox="0 0 100 34" preserveAspectRatio="none"><path d="M0 24 C11 19 15 23 25 18 S39 19 47 13 57 20 66 12 77 14 85 8 94 11 100 3" /></svg></div>
            </article>
          </section>

          <section className="content-grid">
            <article className="panel attendance-panel">
              <div className="panel-heading">
                <div><h2>Lượt hội viên</h2><p>Lượng check-in tại phòng tập</p></div>
                <label className="select-wrap"><select aria-label="Khoảng thời gian" value={timeframe} onChange={(event) => setTimeframe(event.target.value as keyof typeof chartSets)}><option>7 ngày</option><option>30 ngày</option><option>12 tháng</option></select><Icon name="chevron" size={14} /></label>
              </div>
              <div className="chart-summary"><strong>{activeChart.total}</strong><span className="trend-up"><Icon name="arrow" size={13} /> {activeChart.change}</span><span className="chart-period">so với kỳ trước</span></div>
              <div className="chart-wrap">
                <div className="chart-y-labels"><span>1.000</span><span>750</span><span>500</span><span>250</span><span>0</span></div>
                <div className="chart-area">
                  <div className="chart-gridlines"><span /><span /><span /><span /><span /></div>
                  <svg className="attendance-chart" viewBox="0 0 700 210" preserveAspectRatio="none" role="img" aria-label={`Biểu đồ lượt hội viên trong ${timeframe}`}>
                    <defs><linearGradient id="chart-fill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#7367f0" stopOpacity=".18" /><stop offset="100%" stopColor="#7367f0" stopOpacity="0" /></linearGradient></defs>
                    <path className="chart-previous" d="M0 157 C35 150 40 162 65 145 S105 158 127 139 170 147 191 126 233 143 254 117 292 130 318 112 354 126 382 101 425 120 445 89 480 107 510 85 550 99 577 72 612 87 636 61 672 76 700 54" />
                    <path className="chart-fill" d="M0 132 C30 124 44 139 66 119 S104 132 130 105 166 120 190 91 225 106 253 81 293 96 319 65 354 84 382 59 421 77 448 46 481 66 510 40 547 59 576 32 609 49 636 27 671 37 700 15 V210 H0Z" />
                    <path className="chart-current" d="M0 132 C30 124 44 139 66 119 S104 132 130 105 166 120 190 91 225 106 253 81 293 96 319 65 354 84 382 59 421 77 448 46 481 66 510 40 547 59 576 32 609 49 636 27 671 37 700 15" />
                    <circle cx="448" cy="46" r="5" className="chart-point" />
                  </svg>
                  <div className="chart-tooltip"><strong>824 lượt</strong><span>Thứ Bảy, 17 Th10</span></div>
                  <div className="chart-x-labels">{(timeframe === "7 ngày" ? ["T2", "T3", "T4", "T5", "T6", "T7", "CN"] : timeframe === "12 tháng" ? ["Th1", "Th2", "Th3", "Th4", "Th5", "Th6", "Th7", "Th8", "Th9", "Th10", "Th11", "Th12"] : ["01 Th10", "04 Th10", "07 Th10", "10 Th10", "13 Th10", "16 Th10", "19 Th10", "21 Th10"]).map((day) => <span key={day}>{day}</span>)}</div>
                </div>
              </div>
              <div className="chart-legend"><span><i className="legend-dot legend-current" /> Kỳ này</span><span><i className="legend-dot legend-previous" /> Kỳ trước</span></div>
            </article>

            <article className="panel activity-panel">
              <div className="panel-heading"><div><h2>Hoạt động gần đây</h2><p>Cập nhật mới nhất</p></div><button className="subtle-icon-button" aria-label="Tùy chọn hoạt động" onClick={() => notify("Bạn đang xem những hoạt động mới nhất")}><Icon name="more" /></button></div>
              {/* <div className="activity-list">
                {activityItems.map((activity, index) => <div className="activity-item" key={activity.initials}>
                  <span className={`mini-avatar avatar-${activity.color}`}>{activity.initials}</span>
                  <div className="activity-copy"><p>{activity.text}</p><span>{activity.time}</span></div>
                  {index === 0 && <span className="activity-new" />}
                </div>)}
              </div>
              <button className="text-link" onClick={() => setActiveNav("Báo cáo")}>Xem tất cả hoạt động <Icon name="arrow" size={14} /></button>
              <div className="today-classes">
                <div className="classes-heading"><div><h3>Lớp học hôm nay</h3><span>Thứ Bảy, 17 Th10</span></div><button onClick={() => setActiveNav("Lịch tập")}>Xem lịch <Icon name="chevron" size={14} /></button></div>
                {classes.slice(0, 2).map((gymClass) => <div className="class-item" key={gymClass.name}><span className={`class-color class-${gymClass.type}`} /><div className="class-copy"><strong>{gymClass.name}</strong><span>{gymClass.coach}</span></div><span className="class-time">{gymClass.time}</span></div>)}
              </div> */}
            </article>
          </section>

          <section className="panel members-panel">
            <div className="members-heading">
              <div><div className="members-title"><h2>Hội viên mới</h2><span className="member-count">{members.length}</span></div><p>Danh sách hội viên tham gia gần đây</p></div>
              <div className="members-actions">
                <label className="table-search"><Icon name="search" size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm hội viên..." aria-label="Tìm hội viên" /></label>
                <button className="button button-secondary filter-button" onClick={() => notify("Đang hiển thị tất cả trạng thái hội viên")}>Trạng thái <Icon name="chevron" size={14} /></button>
                <button className="view-all-button" onClick={() => setActiveNav("Hội viên")}>Xem tất cả <Icon name="arrow" size={14} /></button>
              </div>
            </div>
            <div className="table-scroll"><table>
              <thead><tr><th>HỘI VIÊN</th><th>GÓI TẬP</th><th>TRẠNG THÁI</th><th>NGÀY THAM GIA</th><th /></tr></thead>
              <tbody>{visibleMembers.length > 0 ? visibleMembers.slice(0, 5).map((member) => <tr key={`${member.email}-${member.joined}`}><td><div className="member-cell"><span className={`member-avatar avatar-${member.color}`}>{member.initials}</span><span><strong>{member.name}</strong><small>{member.email}</small></span></div></td><td><span className="plan-name">{member.plan}</span></td><td><span className={`status-pill ${member.status === "Đang hoạt động" ? "status-active" : member.status === "Sắp hết hạn" ? "status-ending" : "status-paused"}`}><i />{member.status}</span></td><td className="joined-date">{member.joined}</td><td><button className="row-menu" aria-label={`Tùy chọn ${member.name}`} onClick={() => notify(`Đang xem hồ sơ ${member.name}`)}><Icon name="more" size={18} /></button></td></tr>) : <tr><td colSpan={5} className="empty-state">Không tìm thấy hội viên phù hợp.</td></tr>}</tbody>
            </table></div>
            <div className="table-footer"><span>Hiển thị <strong>{Math.min(visibleMembers.length, 5)}</strong> trong tổng số <strong>{visibleMembers.length}</strong> hội viên</span><div><button disabled aria-label="Trang trước"><Icon name="chevron" size={16} className="previous-chevron" /></button><button className="page-number">1</button><button aria-label="Trang tiếp theo" onClick={() => notify("Bạn đang ở trang đầu tiên")}><Icon name="chevron" size={16} /></button></div></div>
          </section>
            </>
          )}
          <footer className="page-footer"><span>© 2024 Formclub. Được tạo để bạn phát triển.</span><span><i /> Hệ thống đang hoạt động tốt</span></footer>
        </div>
      </section>

      {modalOpen && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setModalOpen(false); }}>
        <section className="member-modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
          <div className="modal-heading"><div><span className="modal-icon"><Icon name="users" size={20} /></span><div><h2 id="modal-title">Thêm hội viên mới</h2><p>Điền thông tin để tạo hồ sơ hội viên.</p></div></div><button className="subtle-icon-button" aria-label="Đóng" onClick={() => setModalOpen(false)}><Icon name="close" /></button></div>
          <form onSubmit={addMember}>
            <label>Họ và tên<input name="name" required placeholder="Ví dụ: Nguyễn Minh Anh" autoFocus /></label>
            <label>Địa chỉ email<input name="email" type="email" required placeholder="email@example.com" /></label>
            <label>Gói tập<select name="plan"><option>Premium · 12 tháng</option><option>Standard · 6 tháng</option><option>Basic · 3 tháng</option></select></label>
            <div className="modal-actions"><button type="button" className="button button-secondary" onClick={() => setModalOpen(false)}>Hủy</button><button type="submit" className="button button-primary"><Icon name="plus" size={17} /> Tạo hội viên</button></div>
          </form>
        </section>
      </div>}
      {toast && <div className="toast" role="status"><span>✓</span>{toast}</div>}
    </main>
  );
}
