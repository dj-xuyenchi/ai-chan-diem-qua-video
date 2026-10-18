import { API_BASE_URL } from "../config/api";
import type { UserKind, UserMutation, UserRecord } from "../domain/User";
import { apiRequest } from "./apiRequest";

function endpoint(kind: UserKind) {
  return `${API_BASE_URL}/${kind === "GIAO_VIEN" ? "giao-vien" : "hoc-sinh"}`;
}

export function getUsers(kind: UserKind) {
  return apiRequest<UserRecord[]>(endpoint(kind));
}

export function createUser(kind: UserKind, payload: UserMutation) {
  return apiRequest<UserRecord>(endpoint(kind), {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateUser(kind: UserKind, id: number, payload: UserMutation) {
  return apiRequest<UserRecord>(`${endpoint(kind)}/${id}/cap-nhat`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function deleteUser(kind: UserKind, id: number) {
  return apiRequest<void>(`${endpoint(kind)}/${id}/xoa`, { method: "POST" });
}
