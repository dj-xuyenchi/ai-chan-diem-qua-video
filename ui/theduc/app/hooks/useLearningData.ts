"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getAssignments, getClassroom, getClassrooms } from "../api/classApi";
import { getUsers } from "../api/userApi";
import type { VideoAssignment, Classroom } from "../domain/Classroom";
import type { UserKind, UserRecord } from "../domain/User";

export type LearningClassData = {
  classroom: Classroom;
  assignments: VideoAssignment[];
};

export function useLearningData(role: UserKind) {
  const [classes, setClasses] = useState<LearningClassData[]>([]);
  const [students, setStudents] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const mounted = useRef(false);

  const refresh = useCallback(async () => {
    try {
      const classrooms = await getClassrooms();
      const loadedClasses = await Promise.all(
        classrooms.map(async (classroom) => {
          const [details, assignments] = await Promise.all([
            getClassroom(classroom.id),
            getAssignments(classroom.id),
          ]);
          return { classroom: details, assignments };
        }),
      );
      const loadedStudents = role === "GIAO_VIEN" ? await getUsers("HOC_SINH") : [];
      if (mounted.current) {
        setClasses(loadedClasses);
        setStudents(loadedStudents);
        setError("");
      }
    } catch (cause) {
      if (mounted.current) {
        setError(cause instanceof Error ? cause.message : "Không tải được dữ liệu lớp học.");
      }
      throw cause;
    }
  }, [role]);

  useEffect(() => {
    let active = true;
    mounted.current = true;
    const load = async () => {
      try {
        await refresh();
      } catch (cause) {
        if (active) {
          setError(cause instanceof Error ? cause.message : "Không tải được dữ liệu lớp học.");
        }
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    const interval = window.setInterval(() => {
      void refresh().catch((cause: unknown) => {
        if (active) {
          setError(cause instanceof Error ? cause.message : "Không thể làm mới dữ liệu lớp học.");
        }
      });
    }, 60_000);
    return () => {
      active = false;
      mounted.current = false;
      window.clearInterval(interval);
    };
  }, [refresh]);

  return { classes, students, loading, error, refresh };
}
