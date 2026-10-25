export type UserRole = 'teacher' | 'student';

export interface Profile {
  id: string;
  first_name: string;
  last_name: string;
  role: UserRole;
  student_number?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface ClassItem {
  id: string;
  name: string;
  school_year: string;
  created_at?: string;
}

export interface SubjectItem {
  id: string;
  name: string;
  description?: string | null;
  teacher_id: string;
  created_at?: string;
}

export interface ClassSubject {
  id: string;
  class_id: string;
  subject_id: string;
  created_at?: string;
}

export interface Enrollment {
  id: string;
  student_id: string;
  class_id: string;
  subject_id: string;
  created_at?: string;
}

export interface WeeklyActivity {
  id: string;
  class_id: string;
  subject_id: string;
  week_number: number;
  activity_date?: string;
  title: string;
  description?: string | null;
  max_score: number;
  teacher_id: string;
  created_at?: string;
  updated_at?: string;
}

export interface Grade {
  id: string;
  activity_id: string;
  student_id: string;
  score: number;
  comment?: string | null;
  entered_by: string;
  created_at?: string;
  updated_at?: string;
}

export interface BulkGradeRow {
  student_id: string;
  student_number: string;
  first_name: string;
  last_name: string;
  score: number | '';
  comment: string;
  status: 'saved' | 'draft' | 'dirty' | 'error';
  saved_score?: number | null;
  saved_comment?: string | null;
  error_message?: string;
}

export interface StudentActivityGrade {
  activity_id: string;
  week_number: number;
  title: string;
  activity_date?: string;
  description?: string | null;
  max_score: number;
  score: number | null; // null means not entered yet
  comment?: string | null;
  entered_by_name?: string;
  updated_at?: string;
}
