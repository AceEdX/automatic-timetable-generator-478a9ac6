export type BoardType = 'CBSE' | 'ICSE' | 'STATE';
export type SubjectPriority = 'Core' | 'Elective' | 'Activity';
export type TimetableStatus = 'draft' | 'approved' | 'locked';
export type TeacherRole = 'SubjectTeacher' | 'ClassTeacher';
export type Day = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday';

export interface TimeSlot {
  periodNumber: number;
  startTime: string;
  endTime: string;
  isBreak?: boolean;
  label?: string;
}

export interface TimeSlotTemplate {
  templateId: string;
  schoolId: string;
  weekdaySlots: TimeSlot[];
  saturdaySlots: TimeSlot[];
  isSaturdayHalfDay: boolean;
}

export interface School {
  schoolId: string;
  schoolName: string;
  boardType: BoardType;
  academicYear: string;
}

export interface ClassInfo {
  classId: string;
  schoolId: string;
  grade: string;
  section: string;
  classTeacherId: string;
}

export interface Teacher {
  teacherId: string;
  schoolId: string;
  name: string;
  teacherRole: TeacherRole;
  subjectsCanTeach: string[];
  classesHandled: string[];
  maxPeriodsPerDay: number;
  maxPeriodsPerWeek: number;
  availableDays: Day[];
  isAbsent: boolean;
}

export interface Subject {
  subjectId: string;
  classId: string;
  subjectName: string;
  periodsPerWeek: number;
  maxPerDay: number;
  isLab: boolean;
  allowDoublePeriod: boolean;
  priority: SubjectPriority;
  qualifiedTeacherIds: string[];
  needsPlayground?: boolean;
}

export interface TimetableEntry {
  timetableId: string;
  schoolId: string;
  classId: string;
  day: Day;
  period: number;
  timeSlot: string;
  subjectId: string;
  teacherId: string;
  room: string;
  status: TimetableStatus;
  score?: number;
  generatedAt: string;
}

export interface TimetableVersion {
  versionId: string;
  schoolId: string;
  classId: string;
  generatedAt: string;
  score: number;
  status: TimetableStatus;
  isActive: boolean;
  entries: TimetableEntry[];
}

export interface SubstitutionSuggestion {
  teacherId: string;
  teacherName: string;
  reason: string;
  compatibility: number;
  currentLoad: number;
}
