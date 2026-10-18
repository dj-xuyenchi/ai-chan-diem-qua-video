import { Member } from "../type/Member";
import { Student } from "../type/Student";
import { SchoolClass } from "../type/SchoolClass";

export const initialMembers: Member[] = [
  { name: "Nguyễn Minh Anh", email: "minhanh@gmail.com", initials: "MA", color: "lavender", plan: "Premium · 12 tháng", status: "Đang hoạt động", joined: "12 Th10, 2026" },
  { name: "Trần Quốc Bảo", email: "quocbao@gmail.com", initials: "QB", color: "peach", plan: "Standard · 6 tháng", status: "Đang hoạt động", joined: "08 Th10, 2026" },
  { name: "Lê Hoàng Yến", email: "hoangyen@gmail.com", initials: "HY", color: "mint", plan: "Premium · 12 tháng", status: "Sắp hết hạn", joined: "05 Th10, 2026" },
  { name: "Phạm Đức Huy", email: "duchuy@gmail.com", initials: "DH", color: "blue", plan: "Basic · 3 tháng", status: "Đang hoạt động", joined: "02 Th10, 2026" },
  { name: "Vũ Khánh Linh", email: "khanhlinh@gmail.com", initials: "KL", color: "rose", plan: "Standard · 6 tháng", status: "Tạm dừng", joined: "28 Th09, 2026" },
];

export const initialStudents: Student[] = [
  { id: "SV0001", fullName: "Nguyễn Minh Anh", email: "minhanh@gmail.com", dateOfBirth: "2003-04-12", className: "CNTT-K20A", createdAt: "2026-10-12", createdBy: "Thảo Nguyễn", updatedAt: "" },
  { id: "SV0002", fullName: "Trần Quốc Bảo", email: "quocbao@gmail.com", dateOfBirth: "2002-11-08", className: "CNTT-K20B", createdAt: "2026-10-08", createdBy: "Thảo Nguyễn", updatedAt: "" },
  { id: "SV0003", fullName: "Lê Hoàng Yến", email: "hoangyen@gmail.com", dateOfBirth: "2004-02-05", className: "QTKD-K21A", createdAt: "2026-10-05", createdBy: "Minh Trần", updatedAt: "" },
  { id: "SV0004", fullName: "Phạm Đức Huy", email: "duchuy@gmail.com", dateOfBirth: "2003-07-21", className: "CNTT-K20A", createdAt: "2026-10-02", createdBy: "Thảo Nguyễn", updatedAt: "2026-10-10" },
  { id: "SV0005", fullName: "Vũ Khánh Linh", email: "khanhlinh@gmail.com", dateOfBirth: "2004-09-14", className: "Marketing-K21B", createdAt: "2026-09-28", createdBy: "Minh Trần", updatedAt: "" },
  { id: "SV0006", fullName: "Đặng An Nhiên", email: "annhien@gmail.com", dateOfBirth: "2004-05-16", className: "CNTT-K22A", createdAt: "2026-09-25", createdBy: "Thảo Nguyễn", updatedAt: "" },
];

export const initialSchoolClasses: SchoolClass[] = [
  { id: "LH0001", code: "CNTT-K20A", studentCount: 36, createdAt: "2026-09-02", createdBy: "Thảo Nguyễn", homeroomTeacher: "Nguyễn Văn Minh", updatedAt: "" },
  { id: "LH0002", code: "CNTT-K20B", studentCount: 34, createdAt: "2026-09-03", createdBy: "Thảo Nguyễn", homeroomTeacher: "Trần Thị Lan", updatedAt: "2026-10-10" },
  { id: "LH0003", code: "QTKD-K21A", studentCount: 32, createdAt: "2026-09-05", createdBy: "Minh Trần", homeroomTeacher: "Lê Hoàng Nam", updatedAt: "" },
  { id: "LH0004", code: "MARKETING-K21B", studentCount: 30, createdAt: "2026-09-08", createdBy: "Minh Trần", homeroomTeacher: "Phạm Thu Hà", updatedAt: "" },
  { id: "LH0005", code: "CNTT-K22A", studentCount: 38, createdAt: "2026-09-12", createdBy: "Thảo Nguyễn", homeroomTeacher: "Vũ Đức Thành", updatedAt: "2026-10-14" },
];

export  const sectionDescriptions: Record<string, string> = {
  "Tổng quan": "Đây là những gì đang diễn ra tại phòng tập của bạn hôm nay.",
  "Hội viên": "Theo dõi danh sách, trạng thái và gói tập của hội viên.",
  "Sinh viên": "Quản lý thông tin, lớp học và hồ sơ sinh viên.",
  "Lịch tập": "Lịch tập hôm nay và những khung giờ sắp diễn ra.",
  "Lớp học": "Quản lý lớp học, bài tập video và bài nộp của sinh viên.",
  "Thanh toán": "Theo dõi doanh thu và các giao dịch gần đây.",
  "Báo cáo": "Phân tích hiệu suất phòng tập theo thời gian.",
  "Cài đặt": "Tùy chỉnh thông tin và thiết lập phòng tập.",
};


export const navGroups = [
  {
    label: "TỔNG QUAN",
    items: [{ label: "Tổng quan", icon: "grid" as const }, { label: "Sinh viên", icon: "users" as const }],
  },
  {
    label: "QUẢN LÝ",
    items: [{ label: "Lớp học", icon: "calendar" as const }],
  },
 
];


export const chartSets = {
  "7 ngày": { values: [38, 48, 42, 62, 53, 71, 66, 83, 72, 91, 82, 97], previous: [26, 32, 28, 44, 39, 52, 45, 60, 54, 66, 61, 73], total: "1.284", change: "+12,8%" },
  "30 ngày": { values: [35, 42, 38, 58, 49, 67, 62, 78, 68, 88, 79, 96], previous: [27, 30, 26, 41, 35, 48, 43, 57, 49, 63, 56, 68], total: "5.642", change: "+18,4%" },
  "12 tháng": { values: [30, 38, 35, 48, 43, 60, 54, 71, 65, 82, 76, 96], previous: [23, 29, 26, 37, 32, 43, 39, 51, 45, 58, 52, 64], total: "48.916", change: "+9,2%" },
};

export const classes = [
  { name: "Yoga Flow", coach: "HLV Ngọc Hà", time: "09:30 – 10:30", booked: 18, total: 20, type: "yoga" },
  { name: "HIIT Burn", coach: "HLV Tuấn Anh", time: "11:00 – 12:00", booked: 12, total: 16, type: "hiit" },
  { name: "Pilates Core", coach: "HLV Minh Thư", time: "14:30 – 15:30", booked: 9, total: 15, type: "pilates" },
];
