import { useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { School, Teacher, ClassInfo, Subject, TimeSlot, TimetableVersion } from '@/types/school';

// Debounce helper
function debounce<T extends (...args: any[]) => any>(fn: T, ms: number): T {
  let timer: ReturnType<typeof setTimeout>;
  return ((...args: any[]) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  }) as any;
}

export const useDataPersistence = (userId: string | undefined) => {
  const saveSchool = useCallback(
    debounce(async (school: School) => {
      if (!userId) return;
      await (supabase as any).from('school_settings').upsert({
        user_id: userId,
        school_name: school.schoolName,
        board_type: school.boardType,
        academic_year: school.academicYear,
        divisions_per_grade: school.divisionsPerGrade,
        custom_subjects: school.customSubjects,
      }, { onConflict: 'user_id' });
    }, 1000),
    [userId]
  );

  const saveTeachers = useCallback(
    debounce(async (teachers: Teacher[]) => {
      if (!userId) return;
      // Delete all then insert (simpler than diffing)
      await (supabase as any).from('teachers').delete().eq('user_id', userId);
      if (teachers.length > 0) {
        const rows = teachers.map(t => ({
          user_id: userId,
          teacher_id: t.teacherId,
          data: t,
        }));
        await (supabase as any).from('teachers').insert(rows);
      }
    }, 1500),
    [userId]
  );

  const saveClasses = useCallback(
    debounce(async (classes: ClassInfo[]) => {
      if (!userId) return;
      await (supabase as any).from('classes').delete().eq('user_id', userId);
      if (classes.length > 0) {
        const rows = classes.map(c => ({
          user_id: userId,
          class_id: c.classId,
          data: c,
        }));
        await (supabase as any).from('classes').insert(rows);
      }
    }, 1500),
    [userId]
  );

  const saveSubjects = useCallback(
    debounce(async (subjects: Subject[]) => {
      if (!userId) return;
      await (supabase as any).from('subjects').delete().eq('user_id', userId);
      if (subjects.length > 0) {
        const rows = subjects.map(s => ({
          user_id: userId,
          subject_id: s.subjectId,
          data: s,
        }));
        await (supabase as any).from('subjects').insert(rows);
      }
    }, 1500),
    [userId]
  );

  const saveTimeSlots = useCallback(
    debounce(async (weekdaySlots: TimeSlot[], saturdaySlots: TimeSlot[], isSaturdayHalfDay: boolean) => {
      if (!userId) return;
      await (supabase as any).from('time_slot_config').upsert({
        user_id: userId,
        weekday_slots: weekdaySlots,
        saturday_slots: saturdaySlots,
        is_saturday_half_day: isSaturdayHalfDay,
      }, { onConflict: 'user_id' });
    }, 1000),
    [userId]
  );

  const saveTimetable = useCallback(
    debounce(async (version: TimetableVersion) => {
      if (!userId) return;
      await (supabase as any).from('timetable_versions').upsert({
        user_id: userId,
        version_data: version,
      }, { onConflict: 'user_id' });
    }, 1000),
    [userId]
  );

  const loadAllData = useCallback(async () => {
    if (!userId) return null;

    const [schoolRes, teachersRes, classesRes, subjectsRes, timeSlotsRes, timetableRes] = await Promise.all([
      (supabase as any).from('school_settings').select('*').eq('user_id', userId).maybeSingle(),
      (supabase as any).from('teachers').select('*').eq('user_id', userId),
      (supabase as any).from('classes').select('*').eq('user_id', userId),
      (supabase as any).from('subjects').select('*').eq('user_id', userId),
      (supabase as any).from('time_slot_config').select('*').eq('user_id', userId).maybeSingle(),
      (supabase as any).from('timetable_versions').select('*').eq('user_id', userId).maybeSingle(),
    ]);

    return {
      school: schoolRes.data,
      teachers: teachersRes.data?.map((r: any) => r.data as Teacher) || [],
      classes: classesRes.data?.map((r: any) => r.data as ClassInfo) || [],
      subjects: subjectsRes.data?.map((r: any) => r.data as Subject) || [],
      timeSlots: timeSlotsRes.data,
      timetable: timetableRes.data?.version_data as TimetableVersion | null,
    };
  }, [userId]);

  return { saveSchool, saveTeachers, saveClasses, saveSubjects, saveTimeSlots, saveTimetable, loadAllData };
};
