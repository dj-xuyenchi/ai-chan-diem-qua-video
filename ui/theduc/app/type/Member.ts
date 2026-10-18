export type Member = {
  name: string;
  email: string;
  initials: string;
  color: string;
  plan: string;
  status: "Đang hoạt động" | "Sắp hết hạn" | "Tạm dừng";
  joined: string;
};