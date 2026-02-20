import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { TimeSlot, TimetableVersion, TimetableEntry, Teacher, Subject, ClassInfo, Day } from '@/types/school';
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
  regenerateTimetable: () => TimetableVersion;
  assignSubstitute: (absentTeacherId: string, substituteTeacherId: string, day: Day, period: number) => void;
  lockTimetable: () => void;
  unlockTimetable: () => void;
  getTeacherWeeklyPeriods: (teacherId: string) => { total: number; breakdown: { className: string; subjectName: string; count: number }[] };
}

const SchoolDataContext = createContext<SchoolDataContextType | null>(null);

export const useSchoolData = () => {
  const ctx = useContext(SchoolDataContext);
  if (!ctx) throw new Error('useSchoolData must be used within SchoolDataProvider');
  return ctx;
};

export const SchoolDataProvider = ({ children }: { children: React.ReactNode }) => {
  const [weekdaySlots, setWeekdaySlots] = useState<TimeSlot[]>(mockWeekdaySlots);
  const [saturdaySlots, setSaturdaySlots] = useState<TimeSlot[]>(mockSaturdaySlots);
  const [isSaturdayHalfDay, setIsSaturdayHalfDay] = useState(true);
  const [teachers, setTeachers] = useState<Teacher[]>(mockTeachers);
  const [subjects] = useState<Subject[]>(mockSubjects);
  const [classes] = useState<ClassInfo[]>(mockClasses);
  const [timetableVersion, setTimetableVersion] = useState<TimetableVersion>(mockTimetableVersion);

  const generateEntries = useCallback((wSlots: TimeSlot[], sSlots: TimeSlot[]): TimetableEntry[] => {
    const entries: TimetableEntry[] = [];
    const weekdayPeriods = wSlots.filter(s => !s.isBreak).map(s => s.periodNumber);
    const satPeriods = sSlots.filter(s => !s.isBreak).map(s => s.periodNumber);
    const subjectRotation = subjects;
    const now = new Date().toISOString();

    WEEKDAYS.forEach((day) => {
      let si = 0;
      weekdayPeriods.forEach((period) => {
        const subj = subjectRotation[si % subjectRotation.length];
        const teacher = teachers.find(t => subj.qualifiedTeacherIds.includes(t.teacherId));
        const slot = wSlots.find(s => s.periodNumber === period);
        entries.push({
          timetableId: `tt_${day}_${period}`,
          schoolId: 's1',
          classId: 'c1',
          day,
          period,
          timeSlot: `${slot?.startTime || ''} - ${slot?.endTime || ''}`,
          subjectId: subj.subjectId,
          teacherId: teacher?.teacherId || '',
          room: subj.isLab ? 'Lab 1' : `Room ${Math.ceil(period / 3)}`,
          status: 'draft',
          score: 0,
          generatedAt: now,
        });
        si++;
      });
    });

    satPeriods.forEach((period, i) => {
      const subj = subjectRotation[i % subjectRotation.length];
      const teacher = teachers.find(t => subj.qualifiedTeacherIds.includes(t.teacherId));
      const slot = sSlots.find(s => s.periodNumber === period);
      entries.push({
        timetableId: `tt_Saturday_${period}`,
        schoolId: 's1',
        classId: 'c1',
        day: 'Saturday',
        period,
        timeSlot: `${slot?.startTime || ''} - ${slot?.endTime || ''}`,
        subjectId: subj.subjectId,
        teacherId: teacher?.teacherId || '',
        room: `Room 1`,
        status: 'draft',
        generatedAt: now,
      });
    });

    return entries;
  }, [subjects, teachers]);

  const regenerateTimetable = useCallback(() => {
    const entries = generateEntries(weekdaySlots, saturdaySlots);
    const score = Math.floor(Math.random() * 10) + 88; // 88-97
    const newVersion: TimetableVersion = {
      versionId: `v${Date.now()}`,
      schoolId: 's1',
      classId: 'c1',
      generatedAt: new Date().toISOString(),
      score,
      status: 'draft',
      isActive: true,
      entries,
    };
    setTimetableVersion(newVersion);
    return newVersion;
  }, [weekdaySlots, saturdaySlots, generateEntries]);

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

  const value = useMemo(() => ({
    weekdaySlots, saturdaySlots, isSaturdayHalfDay,
    teachers, subjects, classes, timetableVersion,
    setWeekdaySlots, setSaturdaySlots, setIsSaturdayHalfDay,
    setTeachers,
    regenerateTimetable, assignSubstitute,
    lockTimetable, unlockTimetable,
    getTeacherWeeklyPeriods,
  }), [weekdaySlots, saturdaySlots, isSaturdayHalfDay, teachers, subjects, classes, timetableVersion, regenerateTimetable, assignSubstitute, lockTimetable, unlockTimetable, getTeacherWeeklyPeriods]);

  return (
    <SchoolDataContext.Provider value={value}>
      {children}
    </SchoolDataContext.Provider>
  );
};
