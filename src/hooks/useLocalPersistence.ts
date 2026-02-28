import { useCallback } from 'react';
import { School, Teacher, ClassInfo, Subject, TimeSlot, TimetableVersion } from '@/types/school';

const KEYS = {
  school: 'aceedx_school',
  teachers: 'aceedx_teachers',
  classes: 'aceedx_classes',
  subjects: 'aceedx_subjects',
  timeslots: 'aceedx_timeslots',
  timetable: 'aceedx_timetable',
};

function saveJSON(key: string, data: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.warn('Failed to save to localStorage:', key, e);
  }
}

function loadJSON<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export const useLocalPersistence = () => {
  const saveSchool = useCallback((school: School) => saveJSON(KEYS.school, school), []);
  const saveTeachers = useCallback((teachers: Teacher[]) => saveJSON(KEYS.teachers, teachers), []);
  const saveClasses = useCallback((classes: ClassInfo[]) => saveJSON(KEYS.classes, classes), []);
  const saveSubjects = useCallback((subjects: Subject[]) => saveJSON(KEYS.subjects, subjects), []);
  const saveTimeSlots = useCallback((weekdaySlots: TimeSlot[], saturdaySlots: TimeSlot[], isSaturdayHalfDay: boolean) => {
    saveJSON(KEYS.timeslots, { weekdaySlots, saturdaySlots, isSaturdayHalfDay });
  }, []);
  const saveTimetable = useCallback((version: TimetableVersion) => saveJSON(KEYS.timetable, version), []);

  const loadAllData = useCallback(() => {
    const school = loadJSON<School>(KEYS.school);
    const teachers = loadJSON<Teacher[]>(KEYS.teachers);
    const classes = loadJSON<ClassInfo[]>(KEYS.classes);
    const subjects = loadJSON<Subject[]>(KEYS.subjects);
    const timeslots = loadJSON<{ weekdaySlots: TimeSlot[]; saturdaySlots: TimeSlot[]; isSaturdayHalfDay: boolean }>(KEYS.timeslots);
    const timetable = loadJSON<TimetableVersion>(KEYS.timetable);

    return { school, teachers, classes, subjects, timeslots, timetable };
  }, []);

  return { saveSchool, saveTeachers, saveClasses, saveSubjects, saveTimeSlots, saveTimetable, loadAllData };
};
