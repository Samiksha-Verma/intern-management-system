export type UserStatus = "pending" | "invited" | "active";

export interface InternRow {
  id: string;
  name: string;
  email: string;
  status: UserStatus;
  department: string | null;
  mentor: { id: string; name: string } | null;
}

export interface MentorRow {
  id: string;
  name: string;
  email: string;
  status: UserStatus;
  internCount: number;
  canRemove: boolean;
}

export interface DepartmentCount {
  department: string;
  count: number;
}

export interface AdminStats {
  totalInterns: number;
  totalMentors: number;
  pendingApprovals: number;
  byDepartment: DepartmentCount[];
}

export interface SkippedCsvRow {
  row: number;
  email: string;
  reason: string;
}

export interface CsvImportResult {
  createdCount: number;
  skipped: SkippedCsvRow[];
}

export interface MentorStats {
  totalInterns: number;
  openTasks: number;
  evaluationsGiven: number;
}

export interface MyInternRow {
  id: string;
  name: string;
  email: string;
  status: UserStatus;
  activeTaskCount: number;
  lastAttendance: { status: string; date: string } | null;
  attendancePercentage: number;
}

export type TaskStatus = "pending" | "in_progress" | "done";

export interface InternTaskRow {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  dueDate: string | null;
  createdAt: string;
  attachmentName: string | null;
  completionNote: string | null;
}

export interface EvaluationSummary {
  rating: number;
  feedback: string | null;
  createdAt: string;
  mentorName: string;
}

export interface InternStats {
  tasksCompletedThisMonth: number;
  attendancePercentage: number;
  lastEvaluation: EvaluationSummary | null;
}

export interface AttendanceDay {
  date: string;
  status: string | null;
}

export interface TodayAttendance {
  checkInTime: string | null;
  checkOutTime: string | null;
  status: string;
}

export interface AttendanceData {
  streak: number;
  last7Days: AttendanceDay[];
  today: TodayAttendance | null;
}

export interface EvaluationRow {
  id: string;
  rating: number;
  feedback: string | null;
  createdAt: string;
  mentorName: string;
}

export interface MentorTaskRow {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  dueDate: string | null;
  createdAt: string;
  intern: { id: string; name: string };
  attachmentName: string | null;
  completionNote: string | null;
}

export interface MentorEvaluationRow {
  id: string;
  rating: number;
  feedback: string | null;
  createdAt: string;
  intern: { id: string; name: string };
}

export interface AttendanceOverviewPerson {
  id: string;
  name: string;
  role: "mentor" | "intern";
  attendancePercentage: number;
}

export interface ProfileUser {
  id: string;
  name: string;
  email: string;
  role: string;
  status: UserStatus;
  mentorName: string | null;
}
