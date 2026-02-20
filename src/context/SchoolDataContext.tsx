import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { TimeSlot, TimetableVersion, TimetableEntry, Teacher, Subject, ClassInfo, Day, School } from '@/types/school';
import {
  mockWeekdaySlots,
  mockSaturdaySlots,
  mockTeachers,
  mockSubjects,
  mockClasses,
  mockTimetableVersion,
  DAYS,
  WEEKDAYS,
} from '@/data/mockData';

interface SchoolDataContextType {
  school: School;
  setSchool: React.Dispatch<React.SetStateAction<School>>;
  weekdaySlots: TimeSlot[];
  saturdaySlots: TimeSlot[];
  isSaturdayHalfDay: boolean;
  teachers: Teacher[];
  subjects: Subject[];
  classes: ClassInfo[];
  timetableVersion: TimetableVersion;
  setWeekdaySlots: (slots: TimeSlot[]) => void;
  setSaturdaySlots: (slots: TimeSlot[]) => void;
  setIsSaturdayHalfDay: (val: boolean) => void;
  setTeachers: React.Dispatch<React.SetStateAction<Teacher[]>>;
  setSubjects: React.Dispatch<React.SetStateAction<Subject[]>>;
  setClasses: React.Dispatch<React.SetStateAction<ClassInfo[]>>;
  regenerateTimetable: () => { version: TimetableVersion; errors: string[] };
  assignSubstitute: (absentTeacherId: string, substituteTeacherId: string, day: Day, period: number) => void;
  lockTimetable: () => void;
  unlockTimetable: () => void;
  getTeacherWeeklyPeriods: (teacherId: string) => { total: number; breakdown: { className: string; subjectName: string; count: number }[] };
  getTeacherTimetable: (teacherId: string) => TimetableEntry[];
  validateData: () => string[];
}

const SchoolDataContext = createContext<SchoolDataContextType | null>(null);

export const useSchoolData = () => {
  const ctx = useContext(SchoolDataContext);
  if (!ctx) throw new Error('useSchoolData must be used within SchoolDataProvider');
  return ctx;
};

// ---- TIMETABLE GENERATION ENGINE ----
function generateWholeSchoolTimetable(
  classes: ClassInfo[],
  subjects: Subject[],
  teachers: Teacher[],
  weekdaySlots: TimeSlot[],
  saturdaySlots: TimeSlot[],
): { entries: TimetableEntry[]; errors: string[]; score: number } {
  const entries: TimetableEntry[] = [];
  const errors: string[] = [];
  const now = new Date().toISOString();

  const weekdayPeriods = weekdaySlots.filter(s => !s.isBreak).map(s => s.periodNumber);
  const satPeriods = saturdaySlots.filter(s => !s.isBreak).map(s => s.periodNumber);

  // Track teacher assignments: teacherId -> { day -> Set<period> }
  const teacherSchedule: Record<string, Record<string, Set<number>>> = {};
  // Track teacher daily load
  const teacherDailyLoad: Record<string, Record<string, number>> = {};
  // Track teacher weekly load
  const teacherWeeklyLoad: Record<string, number> = {};
  // Track lab usage: day -> period -> boolean
  const labSchedule: Record<string, Set<number>> = {};
  // Track playground usage: day -> period -> boolean
  const playgroundSchedule: Record<string, Set<number>> = {};

  const initTeacher = (tid: string) => {
    if (!teacherSchedule[tid]) {
      teacherSchedule[tid] = {};
      teacherDailyLoad[tid] = {};
      teacherWeeklyLoad[tid] = 0;
      DAYS.forEach(d => {
        teacherSchedule[tid][d] = new Set();
        teacherDailyLoad[tid][d] = 0;
      });
    }
  };

  const isTeacherFree = (tid: string, day: string, period: number): boolean => {
    initTeacher(tid);
    return !teacherSchedule[tid][day]?.has(period);
  };

  const isTeacherAvailableDay = (teacher: Teacher, day: Day): boolean => {
    return teacher.availableDays.includes(day);
  };

  const canAssignTeacher = (teacher: Teacher, day: Day, period: number): boolean => {
    initTeacher(teacher.teacherId);
    if (!isTeacherAvailableDay(teacher, day)) return false;
    if (!isTeacherFree(teacher.teacherId, day, period)) return false;
    const dailyLoad = (teacherDailyLoad[teacher.teacherId]?.[day] as number) || 0;
    if (dailyLoad >= teacher.maxPeriodsPerDay) return false;
    const weeklyLoad = (teacherWeeklyLoad[teacher.teacherId] as number) || 0;
    if (weeklyLoad >= teacher.maxPeriodsPerWeek) return false;
    if (teacher.isAbsent) return false;
    return true;
  };

  const assignTeacher = (tid: string, day: string, period: number) => {
    initTeacher(tid);
    teacherSchedule[tid][day].add(period);
    const prevDaily = (teacherDailyLoad[tid]?.[day] as number) || 0;
    teacherDailyLoad[tid][day] = prevDaily + 1;
    const prevWeekly = (teacherWeeklyLoad[tid] as number) || 0;
    teacherWeeklyLoad[tid] = prevWeekly + 1;
  };

  const isLabFree = (day: string, period: number): boolean => {
    return !labSchedule[day]?.has(period);
  };

  const isPlaygroundFree = (day: string, period: number): boolean => {
    return !playgroundSchedule[day]?.has(period);
  };

  // Process each class
  for (const cls of classes) {
    const classSubjects = subjects.filter(s => s.classId === cls.classId);
    if (classSubjects.length === 0) continue;

    // Build a pool of subject slots needed
    const subjectSlots: { subject: Subject; assigned: number }[] = classSubjects.map(s => ({
      subject: s,
      assigned: 0,
    }));

    // Sort: Core first, then Elective, then Activity
    const priorityOrder = { 'Core': 0, 'Elective': 1, 'Activity': 2 };
    subjectSlots.sort((a, b) => priorityOrder[a.subject.priority] - priorityOrder[b.subject.priority]);

    const allDays: { day: Day; periods: number[] }[] = [
      ...WEEKDAYS.map(d => ({ day: d, periods: [...weekdayPeriods] })),
      { day: 'Saturday' as Day, periods: [...satPeriods] },
    ];

    // Track subject daily count for this class
    const subjectDailyCount: Record<string, number> = {};

    // Try to assign class teacher to first and last period
    const classTeacher = teachers.find(t => t.teacherId === cls.classTeacherId);
    const classTeacherSubject = classTeacher
      ? classSubjects.find(s => s.qualifiedTeacherIds.includes(classTeacher.teacherId))
      : null;

    for (const { day, periods } of allDays) {
      if (periods.length === 0) continue;

      const firstPeriod = periods[0];
      const lastPeriod = periods[periods.length - 1];

      // Try class teacher for first period
      if (classTeacher && classTeacherSubject && canAssignTeacher(classTeacher, day, firstPeriod)) {
        const slot = (day === 'Saturday' ? saturdaySlots : weekdaySlots).find(s => s.periodNumber === firstPeriod);
        const sSlot = subjectSlots.find(ss => ss.subject.subjectId === classTeacherSubject.subjectId);
        if (sSlot && sSlot.assigned < sSlot.subject.periodsPerWeek) {
          const dailyKey = `${classTeacherSubject.subjectId}_${day}`;
          const dailyCount = subjectDailyCount[dailyKey] || 0;
          if (dailyCount < classTeacherSubject.maxPerDay) {
            entries.push({
              timetableId: `tt_${cls.classId}_${day}_${firstPeriod}`,
              schoolId: cls.schoolId,
              classId: cls.classId,
              day,
              period: firstPeriod,
              timeSlot: `${slot?.startTime || ''} - ${slot?.endTime || ''}`,
              subjectId: classTeacherSubject.subjectId,
              teacherId: classTeacher.teacherId,
              room: `Room ${cls.grade}-${cls.section}`,
              status: 'draft',
              generatedAt: now,
            });
            assignTeacher(classTeacher.teacherId, day, firstPeriod);
            sSlot.assigned++;
            subjectDailyCount[dailyKey] = dailyCount + 1;
          }
        }
      }

      // Try class teacher for last period
      if (classTeacher && classTeacherSubject && periods.length > 1 && canAssignTeacher(classTeacher, day, lastPeriod)) {
        const alreadyAssigned = entries.some(e => e.classId === cls.classId && e.day === day && e.period === lastPeriod);
        if (!alreadyAssigned) {
          const slot = (day === 'Saturday' ? saturdaySlots : weekdaySlots).find(s => s.periodNumber === lastPeriod);
          const sSlot = subjectSlots.find(ss => ss.subject.subjectId === classTeacherSubject.subjectId);
          if (sSlot && sSlot.assigned < sSlot.subject.periodsPerWeek) {
            const dailyKey = `${classTeacherSubject.subjectId}_${day}`;
            const dailyCount = subjectDailyCount[dailyKey] || 0;
            if (dailyCount < classTeacherSubject.maxPerDay) {
              entries.push({
                timetableId: `tt_${cls.classId}_${day}_${lastPeriod}`,
                schoolId: cls.schoolId,
                classId: cls.classId,
                day,
                period: lastPeriod,
                timeSlot: `${slot?.startTime || ''} - ${slot?.endTime || ''}`,
                subjectId: classTeacherSubject.subjectId,
                teacherId: classTeacher.teacherId,
                room: `Room ${cls.grade}-${cls.section}`,
                status: 'draft',
                generatedAt: now,
              });
              assignTeacher(classTeacher.teacherId, day, lastPeriod);
              sSlot.assigned++;
              subjectDailyCount[dailyKey] = dailyCount + 1;
            }
          }
        }
      }
    }

    // Fill remaining periods
    for (const { day, periods } of allDays) {
      for (const period of periods) {
        const alreadyAssigned = entries.some(e => e.classId === cls.classId && e.day === day && e.period === period);
        if (alreadyAssigned) continue;

        // Find a subject that still needs periods
        let assigned = false;
        // Shuffle subjects to distribute better but keep priority order
        const shuffled = [...subjectSlots].sort((a, b) => {
          if (a.subject.priority !== b.subject.priority) return priorityOrder[a.subject.priority] - priorityOrder[b.subject.priority];
          // Prefer subjects with more remaining periods
          const aRemaining = a.subject.periodsPerWeek - a.assigned;
          const bRemaining = b.subject.periodsPerWeek - b.assigned;
          return bRemaining - aRemaining;
        });

        for (const sSlot of shuffled) {
          if (sSlot.assigned >= sSlot.subject.periodsPerWeek) continue;

          const dailyKey = `${sSlot.subject.subjectId}_${day}`;
          const dailyCount = subjectDailyCount[dailyKey] || 0;
          if (dailyCount >= sSlot.subject.maxPerDay) continue;

          // Check same subject not back-to-back (soft)
          const prevEntry = entries.find(e => e.classId === cls.classId && e.day === day && e.period === period - 1);
          if (prevEntry && prevEntry.subjectId === sSlot.subject.subjectId && !sSlot.subject.allowDoublePeriod) continue;

          // Check lab availability
          if (sSlot.subject.isLab && !isLabFree(day, period)) continue;

          // Check playground availability
          if (sSlot.subject.needsPlayground && !isPlaygroundFree(day, period)) continue;

          // Find a qualified teacher
          const qualifiedTeachers = sSlot.subject.qualifiedTeacherIds
            .map(tid => teachers.find(t => t.teacherId === tid))
            .filter((t): t is Teacher => !!t && canAssignTeacher(t, day, period));

          if (qualifiedTeachers.length === 0) {
            // Try any teacher who can teach this subject
            continue;
          }

          // Pick teacher with lowest current load
          const teacher = qualifiedTeachers.sort((a, b) =>
            ((teacherWeeklyLoad[a.teacherId] as number) || 0) - ((teacherWeeklyLoad[b.teacherId] as number) || 0)
          )[0];

          const slot = (day === 'Saturday' ? saturdaySlots : weekdaySlots).find(s => s.periodNumber === period);

          let room = `Room ${cls.grade}-${cls.section}`;
          if (sSlot.subject.isLab) {
            room = 'Computer Lab';
            if (!labSchedule[day]) labSchedule[day] = new Set();
            labSchedule[day].add(period);
          }
          if (sSlot.subject.needsPlayground) {
            room = 'Playground';
            if (!playgroundSchedule[day]) playgroundSchedule[day] = new Set();
            playgroundSchedule[day].add(period);
          }

          entries.push({
            timetableId: `tt_${cls.classId}_${day}_${period}`,
            schoolId: cls.schoolId,
            classId: cls.classId,
            day,
            period,
            timeSlot: `${slot?.startTime || ''} - ${slot?.endTime || ''}`,
            subjectId: sSlot.subject.subjectId,
            teacherId: teacher.teacherId,
            room,
            status: 'draft',
            generatedAt: now,
          });
          assignTeacher(teacher.teacherId, day, period);
          sSlot.assigned++;
          subjectDailyCount[dailyKey] = dailyCount + 1;
          assigned = true;
          break;
        }

        if (!assigned) {
          errors.push(`Could not fill Period ${period} on ${day} for Class ${cls.grade}-${cls.section}: No available teacher/subject`);
        }
      }
    }

    // Check if all subjects got their required periods
    for (const sSlot of subjectSlots) {
      if (sSlot.assigned < sSlot.subject.periodsPerWeek) {
        errors.push(`${sSlot.subject.subjectName} in Class ${cls.grade}-${cls.section}: Only ${sSlot.assigned}/${sSlot.subject.periodsPerWeek} periods assigned`);
      }
    }
  }

  // Calculate score
  const totalSlots = classes.length * (weekdayPeriods.length * 5 + satPeriods.length);
  const filledSlots = entries.length;
  const fillRate = totalSlots > 0 ? (filledSlots / totalSlots) * 100 : 0;

  // Penalty for errors
  const errorPenalty = Math.min(errors.length * 2, 30);
  const score = Math.max(0, Math.min(100, Math.round(fillRate - errorPenalty)));

  return { entries, errors, score };
}

export const SchoolDataProvider = ({ children }: { children: React.ReactNode }) => {
  const [school, setSchool] = useState<School>({
    schoolId: 's1',
    schoolName: 'Delhi Public School',
    boardType: 'CBSE',
    academicYear: '2025-26',
  });
  const [weekdaySlots, setWeekdaySlots] = useState<TimeSlot[]>(mockWeekdaySlots);
  const [saturdaySlots, setSaturdaySlots] = useState<TimeSlot[]>(mockSaturdaySlots);
  const [isSaturdayHalfDay, setIsSaturdayHalfDay] = useState(true);
  const [teachers, setTeachers] = useState<Teacher[]>(mockTeachers);
  const [subjects, setSubjects] = useState<Subject[]>(mockSubjects);
  const [classes, setClasses] = useState<ClassInfo[]>(mockClasses);
  const [timetableVersion, setTimetableVersion] = useState<TimetableVersion>(mockTimetableVersion);

  const regenerateTimetable = useCallback(() => {
    const { entries, errors, score } = generateWholeSchoolTimetable(
      classes, subjects, teachers, weekdaySlots, saturdaySlots
    );
    const newVersion: TimetableVersion = {
      versionId: `v${Date.now()}`,
      schoolId: school.schoolId,
      classId: 'all',
      generatedAt: new Date().toISOString(),
      score,
      status: 'draft',
      isActive: true,
      entries,
    };
    setTimetableVersion(newVersion);
    return { version: newVersion, errors };
  }, [classes, subjects, teachers, weekdaySlots, saturdaySlots, school.schoolId]);

  const assignSubstitute = useCallback((absentTeacherId: string, substituteTeacherId: string, day: Day, period: number) => {
    setTimetableVersion(prev => ({
      ...prev,
      entries: prev.entries.map(e =>
        e.teacherId === absentTeacherId && e.day === day && e.period === period
          ? { ...e, teacherId: substituteTeacherId }
          : e
      ),
    }));
  }, []);

  const lockTimetable = useCallback(() => {
    setTimetableVersion(prev => ({ ...prev, status: 'locked' }));
  }, []);

  const unlockTimetable = useCallback(() => {
    setTimetableVersion(prev => ({ ...prev, status: 'draft' }));
  }, []);

  const getTeacherWeeklyPeriods = useCallback((teacherId: string) => {
    const teacherEntries = timetableVersion.entries.filter(e => e.teacherId === teacherId);
    const breakdownMap = new Map<string, { className: string; subjectName: string; count: number }>();

    teacherEntries.forEach(entry => {
      const cls = classes.find(c => c.classId === entry.classId);
      const subj = subjects.find(s => s.subjectId === entry.subjectId);
      const key = `${entry.classId}_${entry.subjectId}`;
      const existing = breakdownMap.get(key);
      if (existing) {
        existing.count++;
      } else {
        breakdownMap.set(key, {
          className: cls ? `${cls.grade}-${cls.section}` : 'Unknown',
          subjectName: subj?.subjectName || 'Unknown',
          count: 1,
        });
      }
    });

    return {
      total: teacherEntries.length,
      breakdown: Array.from(breakdownMap.values()),
    };
  }, [timetableVersion.entries, classes, subjects]);

  const getTeacherTimetable = useCallback((teacherId: string) => {
    return timetableVersion.entries.filter(e => e.teacherId === teacherId);
  }, [timetableVersion.entries]);

  const validateData = useCallback((): string[] => {
    const errs: string[] = [];

    // Check time slots
    const wPeriods = weekdaySlots.filter(s => !s.isBreak);
    if (wPeriods.length === 0) errs.push('No weekday time slots configured');

    // Check teachers
    if (teachers.length === 0) errs.push('No teachers added');

    // Check subjects have qualified teachers
    const classesWithSubjects = classes.filter(c => subjects.some(s => s.classId === c.classId));
    if (classesWithSubjects.length === 0) errs.push('No classes with subjects configured');

    for (const cls of classesWithSubjects) {
      const classSubjects = subjects.filter(s => s.classId === cls.classId);
      for (const subj of classSubjects) {
        if (subj.qualifiedTeacherIds.length === 0) {
          errs.push(`${subj.subjectName} in Class ${cls.grade}-${cls.section} has no teacher assigned`);
        }
      }
    }

    return errs;
  }, [weekdaySlots, teachers, subjects, classes]);

  const value = useMemo(() => ({
    school, setSchool,
    weekdaySlots, saturdaySlots, isSaturdayHalfDay,
    teachers, subjects, classes, timetableVersion,
    setWeekdaySlots, setSaturdaySlots, setIsSaturdayHalfDay,
    setTeachers, setSubjects, setClasses,
    regenerateTimetable, assignSubstitute,
    lockTimetable, unlockTimetable,
    getTeacherWeeklyPeriods, getTeacherTimetable,
    validateData,
  }), [school, weekdaySlots, saturdaySlots, isSaturdayHalfDay, teachers, subjects, classes, timetableVersion, regenerateTimetable, assignSubstitute, lockTimetable, unlockTimetable, getTeacherWeeklyPeriods, getTeacherTimetable, validateData]);

  return (
    <SchoolDataContext.Provider value={value}>
      {children}
    </SchoolDataContext.Provider>
  );
};
