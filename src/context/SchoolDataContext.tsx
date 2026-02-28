import React, { createContext, useContext, useState, useCallback, useMemo, useEffect, useRef } from 'react';
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
  AVAILABLE_SUBJECTS,
  defaultDivisionsPerGrade,
  generateClasses,
  generateSubjectsForClasses,
} from '@/data/mockData';
import { useAuth } from '@/hooks/useAuth';
import { useDataPersistence } from '@/hooks/useDataPersistence';

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
  regenerateTimetable: (gradeRange?: [number, number]) => { version: TimetableVersion; errors: string[] };
  assignSubstitute: (absentTeacherId: string, substituteTeacherId: string, day: Day, period: number) => void;
  lockTimetable: () => void;
  unlockTimetable: () => void;
  getTeacherWeeklyPeriods: (teacherId: string) => { total: number; breakdown: { className: string; subjectName: string; count: number }[] };
  getTeacherTimetable: (teacherId: string) => TimetableEntry[];
  validateData: (gradeRange?: [number, number]) => string[];
  updateDivisions: (grade: string, sections: string[]) => void;
  syncTeacherToSubjects: (teacher: Teacher) => void;
  getAllSubjectNames: () => string[];
  getPeriodsPerWeekForClass: (classId: string) => { total: number; available: number; gap: number };
  dataLoading: boolean;
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
  gradeRange?: [number, number],
): { entries: TimetableEntry[]; errors: string[]; score: number } {
  const entries: TimetableEntry[] = [];
  const errors: string[] = [];
  const now = new Date().toISOString();

  const weekdayPeriods = weekdaySlots.filter(s => !s.isBreak).map(s => s.periodNumber);
  const satPeriods = saturdaySlots.filter(s => !s.isBreak).map(s => s.periodNumber);

  const activeClasses = classes.filter(c => {
    if (!c.isEnabled) return false;
    if (gradeRange) {
      const g = parseInt(c.grade);
      return g >= gradeRange[0] && g <= gradeRange[1];
    }
    return true;
  });

  const teacherSchedule: Record<string, Record<string, Set<number>>> = {};
  const teacherDailyLoad: Record<string, Record<string, number>> = {};
  const teacherWeeklyLoad: Record<string, number> = {};
  const labSchedule: Record<string, Set<number>> = {};
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

  const canAssignTeacher = (teacher: Teacher, day: Day, period: number): boolean => {
    initTeacher(teacher.teacherId);
    if (!teacher.availableDays.includes(day)) return false;
    if (!isTeacherFree(teacher.teacherId, day, period)) return false;
    if ((teacherDailyLoad[teacher.teacherId]?.[day] || 0) >= teacher.maxPeriodsPerDay) return false;
    if ((teacherWeeklyLoad[teacher.teacherId] || 0) >= teacher.maxPeriodsPerWeek) return false;
    if (teacher.isAbsent) return false;
    return true;
  };

  const assignTeacher = (tid: string, day: string, period: number) => {
    initTeacher(tid);
    teacherSchedule[tid][day].add(period);
    teacherDailyLoad[tid][day] = (teacherDailyLoad[tid]?.[day] || 0) + 1;
    teacherWeeklyLoad[tid] = (teacherWeeklyLoad[tid] || 0) + 1;
  };

  const isLabFree = (day: string, period: number): boolean => !labSchedule[day]?.has(period);
  const isPlaygroundFree = (day: string, period: number): boolean => !playgroundSchedule[day]?.has(period);

  const lockedTeacherMap: Record<string, string> = {};

  for (const cls of activeClasses) {
    const classSubjects = subjects.filter(s => s.classId === cls.classId);
    if (classSubjects.length === 0) continue;

    for (const subj of classSubjects) {
      if (subj.qualifiedTeacherIds.length > 0) {
        const bestTeacher = subj.qualifiedTeacherIds
          .map(tid => teachers.find(t => t.teacherId === tid))
          .filter((t): t is Teacher => !!t && !t.isAbsent)
          .sort((a, b) => (teacherWeeklyLoad[a.teacherId] || 0) - (teacherWeeklyLoad[b.teacherId] || 0))[0];
        if (bestTeacher) {
          lockedTeacherMap[subj.subjectId] = bestTeacher.teacherId;
        }
      }
    }

    const priorityOrder = { 'Core': 0, 'Elective': 1, 'Activity': 2 };
    const subjectSlots = classSubjects.map(s => ({ subject: s, assigned: 0 }));
    subjectSlots.sort((a, b) => priorityOrder[a.subject.priority] - priorityOrder[b.subject.priority]);

    const allDays: { day: Day; periods: number[] }[] = [
      ...WEEKDAYS.map(d => ({ day: d, periods: [...weekdayPeriods] })),
      { day: 'Saturday' as Day, periods: [...satPeriods] },
    ];

    const subjectDailyCount: Record<string, number> = {};

    const classTeacher = teachers.find(t => t.teacherId === cls.classTeacherId);
    const classTeacherSubject = classTeacher
      ? classSubjects.find(s => s.qualifiedTeacherIds.includes(classTeacher.teacherId))
      : null;

    for (const { day, periods } of allDays) {
      if (periods.length === 0) continue;
      const firstPeriod = periods[0];
      const lastPeriod = periods[periods.length - 1];

      for (const targetPeriod of [firstPeriod, lastPeriod]) {
        if (classTeacher && classTeacherSubject && canAssignTeacher(classTeacher, day, targetPeriod)) {
          const alreadyAssigned = entries.some(e => e.classId === cls.classId && e.day === day && e.period === targetPeriod);
          if (!alreadyAssigned) {
            const sSlot = subjectSlots.find(ss => ss.subject.subjectId === classTeacherSubject.subjectId);
            if (sSlot && sSlot.assigned < sSlot.subject.periodsPerWeek) {
              const dailyKey = `${classTeacherSubject.subjectId}_${day}`;
              const dailyCount = subjectDailyCount[dailyKey] || 0;
              if (dailyCount < classTeacherSubject.maxPerDay) {
                const slot = (day === 'Saturday' ? saturdaySlots : weekdaySlots).find(s => s.periodNumber === targetPeriod);
                entries.push({
                  timetableId: `tt_${cls.classId}_${day}_${targetPeriod}`,
                  schoolId: cls.schoolId, classId: cls.classId, day, period: targetPeriod,
                  timeSlot: `${slot?.startTime || ''} - ${slot?.endTime || ''}`,
                  subjectId: classTeacherSubject.subjectId, teacherId: classTeacher.teacherId,
                  room: `Room ${cls.grade}-${cls.section}`, status: 'draft', generatedAt: now,
                });
                assignTeacher(classTeacher.teacherId, day, targetPeriod);
                sSlot.assigned++;
                subjectDailyCount[dailyKey] = dailyCount + 1;
              }
            }
          }
        }
      }
    }

    const fillPeriods = (allowOverfill: boolean) => {
      for (const { day, periods } of allDays) {
        for (const period of periods) {
          if (entries.some(e => e.classId === cls.classId && e.day === day && e.period === period)) continue;

          const shuffled = [...subjectSlots].sort((a, b) => {
            if (!allowOverfill) {
              const aRemaining = a.subject.periodsPerWeek - a.assigned;
              const bRemaining = b.subject.periodsPerWeek - b.assigned;
              if (aRemaining > 0 && bRemaining <= 0) return -1;
              if (bRemaining > 0 && aRemaining <= 0) return 1;
            }
            if (a.subject.priority !== b.subject.priority) return priorityOrder[a.subject.priority] - priorityOrder[b.subject.priority];
            return (b.subject.periodsPerWeek - b.assigned) - (a.subject.periodsPerWeek - a.assigned);
          });

          let assigned = false;
          for (const sSlot of shuffled) {
            if (!allowOverfill && sSlot.assigned >= sSlot.subject.periodsPerWeek) continue;
            const dailyKey = `${sSlot.subject.subjectId}_${day}`;
            const dailyMax = allowOverfill ? sSlot.subject.maxPerDay + 1 : sSlot.subject.maxPerDay;
            if ((subjectDailyCount[dailyKey] || 0) >= dailyMax) continue;

            const prevEntry = entries.find(e => e.classId === cls.classId && e.day === day && e.period === period - 1);
            if (prevEntry && prevEntry.subjectId === sSlot.subject.subjectId && !sSlot.subject.allowDoublePeriod) continue;

            if (sSlot.subject.isLab && !isLabFree(day, period)) continue;
            if (sSlot.subject.needsPlayground && !isPlaygroundFree(day, period)) continue;

            const lockedTid = lockedTeacherMap[sSlot.subject.subjectId];
            let teacher: Teacher | undefined;

            if (lockedTid) {
              const lockedT = teachers.find(t => t.teacherId === lockedTid);
              if (lockedT && canAssignTeacher(lockedT, day, period)) {
                teacher = lockedT;
              }
            }

            if (!teacher) {
              const qualifiedTeachers = sSlot.subject.qualifiedTeacherIds
                .map(tid => teachers.find(t => t.teacherId === tid))
                .filter((t): t is Teacher => !!t && canAssignTeacher(t, day, period));
              if (qualifiedTeachers.length > 0) {
                teacher = qualifiedTeachers.sort((a, b) =>
                  (teacherWeeklyLoad[a.teacherId] || 0) - (teacherWeeklyLoad[b.teacherId] || 0)
                )[0];
              }
            }

            if (!teacher) continue;

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
              schoolId: cls.schoolId, classId: cls.classId, day, period,
              timeSlot: `${slot?.startTime || ''} - ${slot?.endTime || ''}`,
              subjectId: sSlot.subject.subjectId, teacherId: teacher.teacherId,
              room, status: 'draft', generatedAt: now,
            });
            assignTeacher(teacher.teacherId, day, period);
            sSlot.assigned++;
            subjectDailyCount[dailyKey] = (subjectDailyCount[dailyKey] || 0) + 1;
            assigned = true;
            break;
          }

          if (!assigned && allowOverfill) {
            errors.push(`Could not fill P${period} on ${day} for ${cls.grade}-${cls.section}: No available teacher/subject`);
          }
        }
      }
    };

    fillPeriods(false);

    for (const sSlot of subjectSlots) {
      if (sSlot.assigned < sSlot.subject.periodsPerWeek) {
        errors.push(`${sSlot.subject.subjectName} in ${cls.grade}-${cls.section}: Only ${sSlot.assigned}/${sSlot.subject.periodsPerWeek} periods`);
      } else if (sSlot.assigned > sSlot.subject.periodsPerWeek) {
        errors.push(`${sSlot.subject.subjectName} in ${cls.grade}-${cls.section}: Over-assigned ${sSlot.assigned}/${sSlot.subject.periodsPerWeek} periods`);
      }
    }
  }

  const totalSlots = activeClasses.length * (weekdayPeriods.length * 5 + satPeriods.length);
  const filledSlots = entries.length;
  const fillRate = totalSlots > 0 ? (filledSlots / totalSlots) * 100 : 0;
  const errorPenalty = Math.min(errors.length * 2, 30);
  const score = Math.max(0, Math.min(100, Math.round(fillRate - errorPenalty)));

  return { entries, errors, score };
}

export const SchoolDataProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  const { saveSchool, saveTeachers, saveClasses, saveSubjects, saveTimeSlots, saveTimetable, loadAllData } = useDataPersistence(user?.id);
  const [dataLoading, setDataLoading] = useState(true);
  const initialLoadDone = useRef(false);

  const [school, setSchool] = useState<School>({
    schoolId: 's1',
    schoolName: 'Delhi Public School',
    boardType: 'CBSE',
    academicYear: '2025-26',
    divisionsPerGrade: { ...defaultDivisionsPerGrade },
    customSubjects: [],
  });
  const [weekdaySlots, setWeekdaySlotsState] = useState<TimeSlot[]>(mockWeekdaySlots);
  const [saturdaySlots, setSaturdaySlotsState] = useState<TimeSlot[]>(mockSaturdaySlots);
  const [isSaturdayHalfDay, setIsSaturdayHalfDayState] = useState(true);
  const [teachers, setTeachers] = useState<Teacher[]>(mockTeachers);
  const [subjects, setSubjects] = useState<Subject[]>(mockSubjects);
  const [classes, setClasses] = useState<ClassInfo[]>(mockClasses);
  const [timetableVersion, setTimetableVersion] = useState<TimetableVersion>(mockTimetableVersion);

  // Load data from DB on login
  useEffect(() => {
    if (!user?.id) {
      setDataLoading(false);
      return;
    }
    if (initialLoadDone.current) return;
    
    const load = async () => {
      setDataLoading(true);
      const data = await loadAllData();
      if (data) {
        if (data.school) {
          setSchool(prev => ({
            ...prev,
            schoolName: data.school.school_name,
            boardType: data.school.board_type as any,
            academicYear: data.school.academic_year,
            divisionsPerGrade: data.school.divisions_per_grade || prev.divisionsPerGrade,
            customSubjects: data.school.custom_subjects || [],
          }));
        }
        if (data.teachers.length > 0) setTeachers(data.teachers);
        if (data.classes.length > 0) setClasses(data.classes);
        if (data.subjects.length > 0) setSubjects(data.subjects);
        if (data.timeSlots) {
          setWeekdaySlotsState(data.timeSlots.weekday_slots || mockWeekdaySlots);
          setSaturdaySlotsState(data.timeSlots.saturday_slots || mockSaturdaySlots);
          setIsSaturdayHalfDayState(data.timeSlots.is_saturday_half_day ?? true);
        }
        if (data.timetable) setTimetableVersion(data.timetable);
      }
      initialLoadDone.current = true;
      setDataLoading(false);
    };
    load();
  }, [user?.id, loadAllData]);

  // Auto-save on changes (after initial load)
  const skipSave = useRef(true);
  useEffect(() => {
    if (!initialLoadDone.current || !user?.id) return;
    // Skip the first render after load
    if (skipSave.current) { skipSave.current = false; return; }
    saveSchool(school);
  }, [school, saveSchool, user?.id]);

  useEffect(() => {
    if (!initialLoadDone.current || !user?.id) return;
    saveTeachers(teachers);
  }, [teachers, saveTeachers, user?.id]);

  useEffect(() => {
    if (!initialLoadDone.current || !user?.id) return;
    saveClasses(classes);
  }, [classes, saveClasses, user?.id]);

  useEffect(() => {
    if (!initialLoadDone.current || !user?.id) return;
    saveSubjects(subjects);
  }, [subjects, saveSubjects, user?.id]);

  useEffect(() => {
    if (!initialLoadDone.current || !user?.id) return;
    saveTimeSlots(weekdaySlots, saturdaySlots, isSaturdayHalfDay);
  }, [weekdaySlots, saturdaySlots, isSaturdayHalfDay, saveTimeSlots, user?.id]);

  useEffect(() => {
    if (!initialLoadDone.current || !user?.id) return;
    saveTimetable(timetableVersion);
  }, [timetableVersion, saveTimetable, user?.id]);

  const setWeekdaySlots = useCallback((slots: TimeSlot[]) => setWeekdaySlotsState(slots), []);
  const setSaturdaySlots = useCallback((slots: TimeSlot[]) => setSaturdaySlotsState(slots), []);
  const setIsSaturdayHalfDay = useCallback((val: boolean) => setIsSaturdayHalfDayState(val), []);

  const updateDivisions = useCallback((grade: string, sections: string[]) => {
    setSchool(prev => ({
      ...prev,
      divisionsPerGrade: { ...prev.divisionsPerGrade, [grade]: sections },
    }));
    setClasses(prev => {
      const otherClasses = prev.filter(c => c.grade !== grade);
      const newClasses = sections.map(section => {
        const existing = prev.find(c => c.grade === grade && c.section === section);
        return existing || {
          classId: `c_${grade}_${section}`,
          schoolId: 's1',
          grade,
          section,
          classTeacherId: '',
          isEnabled: true,
        };
      });
      return [...otherClasses, ...newClasses].sort((a, b) =>
        parseInt(a.grade) - parseInt(b.grade) || a.section.localeCompare(b.section)
      );
    });
    setSubjects(prev => {
      const otherSubjects = prev.filter(s => !s.classId.startsWith(`c_${grade}_`) || sections.some(sec => s.classId === `c_${grade}_${sec}`));
      const newClassIds = sections.map(s => `c_${grade}_${s}`);
      const missingClassIds = newClassIds.filter(cid => !prev.some(s => s.classId === cid));
      const newSubjects = generateSubjectsForClasses(
        missingClassIds.map(cid => ({
          classId: cid, schoolId: 's1', grade,
          section: cid.split('_')[2], classTeacherId: '', isEnabled: true,
        }))
      );
      return [...otherSubjects, ...newSubjects];
    });
  }, []);

  const syncTeacherToSubjects = useCallback((teacher: Teacher) => {
    setSubjects(prev => prev.map(s => {
      const mapping = teacher.subjectClassMap.find(
        m => m.subject.toLowerCase() === s.subjectName.toLowerCase() && m.classIds.includes(s.classId)
      );
      if (mapping) {
        if (!s.qualifiedTeacherIds.includes(teacher.teacherId)) {
          return { ...s, qualifiedTeacherIds: [...s.qualifiedTeacherIds, teacher.teacherId] };
        }
      } else {
        return { ...s, qualifiedTeacherIds: s.qualifiedTeacherIds.filter(id => id !== teacher.teacherId) };
      }
      return s;
    }));
  }, []);

  const getAllSubjectNames = useCallback((): string[] => {
    const fromSubjects = [...new Set(subjects.map(s => s.subjectName))];
    const fromCustom = school.customSubjects;
    return [...new Set([...AVAILABLE_SUBJECTS, ...fromSubjects, ...fromCustom])].sort();
  }, [subjects, school.customSubjects]);

  const getPeriodsPerWeekForClass = useCallback((classId: string): { total: number; available: number; gap: number } => {
    const classSubjects = subjects.filter(s => s.classId === classId);
    const total = classSubjects.reduce((sum, s) => sum + s.periodsPerWeek, 0);
    const weekdayPeriods = weekdaySlots.filter(s => !s.isBreak).length;
    const satPeriods = saturdaySlots.filter(s => !s.isBreak).length;
    const available = weekdayPeriods * 5 + satPeriods;
    return { total, available, gap: available - total };
  }, [subjects, weekdaySlots, saturdaySlots]);

  const regenerateTimetable = useCallback((gradeRange?: [number, number]) => {
    const enabledClasses = classes.filter(c => c.isEnabled);
    const { entries, errors, score } = generateWholeSchoolTimetable(
      enabledClasses, subjects, teachers, weekdaySlots, saturdaySlots, gradeRange
    );

    if (gradeRange) {
      setTimetableVersion(prev => {
        const otherEntries = prev.entries.filter(e => {
          const cls = classes.find(c => c.classId === e.classId);
          if (!cls) return false;
          const g = parseInt(cls.grade);
          return g < gradeRange[0] || g > gradeRange[1];
        });
        return {
          versionId: `v${Date.now()}`, schoolId: school.schoolId, classId: 'all',
          generatedAt: new Date().toISOString(), score, status: 'draft', isActive: true,
          entries: [...otherEntries, ...entries],
        };
      });
    } else {
      setTimetableVersion({
        versionId: `v${Date.now()}`, schoolId: school.schoolId, classId: 'all',
        generatedAt: new Date().toISOString(), score, status: 'draft', isActive: true, entries,
      });
    }

    return { version: timetableVersion, errors };
  }, [classes, subjects, teachers, weekdaySlots, saturdaySlots, school.schoolId, timetableVersion]);

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

  const lockTimetable = useCallback(() => setTimetableVersion(prev => ({ ...prev, status: 'locked' })), []);
  const unlockTimetable = useCallback(() => setTimetableVersion(prev => ({ ...prev, status: 'draft' })), []);

  const getTeacherWeeklyPeriods = useCallback((teacherId: string) => {
    const teacherEntries = timetableVersion.entries.filter(e => e.teacherId === teacherId);
    const breakdownMap = new Map<string, { className: string; subjectName: string; count: number }>();
    teacherEntries.forEach(entry => {
      const cls = classes.find(c => c.classId === entry.classId);
      const subj = subjects.find(s => s.subjectId === entry.subjectId);
      const key = `${entry.classId}_${entry.subjectId}`;
      const existing = breakdownMap.get(key);
      if (existing) existing.count++;
      else breakdownMap.set(key, {
        className: cls ? `${cls.grade}-${cls.section}` : 'Unknown',
        subjectName: subj?.subjectName || 'Unknown', count: 1,
      });
    });
    return { total: teacherEntries.length, breakdown: Array.from(breakdownMap.values()) };
  }, [timetableVersion.entries, classes, subjects]);

  const getTeacherTimetable = useCallback((teacherId: string) => {
    return timetableVersion.entries.filter(e => e.teacherId === teacherId);
  }, [timetableVersion.entries]);

  const validateData = useCallback((gradeRange?: [number, number]): string[] => {
    const errs: string[] = [];
    const wPeriods = weekdaySlots.filter(s => !s.isBreak);
    if (wPeriods.length === 0) errs.push('No weekday time slots configured');
    if (teachers.length === 0) errs.push('No teachers added');
    const targetClasses = classes.filter(c => {
      if (!c.isEnabled) return false;
      if (gradeRange) {
        const g = parseInt(c.grade);
        return g >= gradeRange[0] && g <= gradeRange[1];
      }
      return true;
    });
    for (const cls of targetClasses) {
      const classSubjects = subjects.filter(s => s.classId === cls.classId);
      if (classSubjects.length === 0) { errs.push(`Class ${cls.grade}-${cls.section} has no subjects`); continue; }
      for (const subj of classSubjects) {
        if (subj.qualifiedTeacherIds.length === 0) {
          errs.push(`${subj.subjectName} in ${cls.grade}-${cls.section} has no teacher`);
        }
      }
    }
    return errs;
  }, [weekdaySlots, teachers, subjects, classes]);

  const value = useMemo(() => ({
    school, setSchool, weekdaySlots, saturdaySlots, isSaturdayHalfDay,
    teachers, subjects, classes, timetableVersion,
    setWeekdaySlots, setSaturdaySlots, setIsSaturdayHalfDay,
    setTeachers, setSubjects, setClasses,
    regenerateTimetable, assignSubstitute,
    lockTimetable, unlockTimetable,
    getTeacherWeeklyPeriods, getTeacherTimetable,
    validateData, updateDivisions, syncTeacherToSubjects,
    getAllSubjectNames, getPeriodsPerWeekForClass, dataLoading,
  }), [school, weekdaySlots, saturdaySlots, isSaturdayHalfDay, teachers, subjects, classes, timetableVersion, regenerateTimetable, assignSubstitute, lockTimetable, unlockTimetable, getTeacherWeeklyPeriods, getTeacherTimetable, validateData, updateDivisions, syncTeacherToSubjects, getAllSubjectNames, getPeriodsPerWeekForClass, dataLoading]);

  return (
    <SchoolDataContext.Provider value={value}>
      {children}
    </SchoolDataContext.Provider>
  );
};
