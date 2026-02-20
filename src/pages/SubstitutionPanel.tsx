import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertTriangle, UserCheck, ChevronRight, Sparkles, Clock, Users } from 'lucide-react';
import { useSchoolData } from '@/context/SchoolDataContext';
import { Day } from '@/types/school';
import { DAYS } from '@/data/mockData';
import { toast } from 'sonner';

const SubstitutionPanel = () => {
  const { teachers, subjects, classes, assignSubstitute, timetableVersion, getTeacherTimetable } = useSchoolData();
  const [selectedDay, setSelectedDay] = useState<Day>(() => {
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long' }) as Day;
    return DAYS.includes(today) ? today : 'Monday';
  });

  const absentTeachers = teachers.filter(t => t.isAbsent);

  const getSubjectName = (subjectId: string) => subjects.find(s => s.subjectId === subjectId)?.subjectName || '';
  const getClassName = (classId: string) => {
    const c = classes.find(cl => cl.classId === classId);
    return c ? `${c.grade}-${c.section}` : '';
  };

  const getAbsentTeacherPeriods = (teacherId: string) => {
    return timetableVersion.entries
      .filter(e => e.teacherId === teacherId && e.day === selectedDay)
      .sort((a, b) => a.period - b.period);
  };

  const getFreeTeachersForPeriod = (day: Day, period: number, absentTeacherId: string) => {
    const allEntries = timetableVersion.entries.filter(e => e.day === day && e.period === period);
    const busyTeacherIds = new Set(allEntries.map(e => e.teacherId));

    // Find the absent teacher's entry for this period to know the subject
    const absentEntry = allEntries.find(e => e.teacherId === absentTeacherId);
    const neededSubject = absentEntry ? getSubjectName(absentEntry.subjectId) : '';

    return teachers
      .filter(t => !t.isAbsent && t.teacherId !== absentTeacherId && !busyTeacherIds.has(t.teacherId))
      .map(t => {
        const teacherTotalLoad = timetableVersion.entries.filter(e => e.teacherId === t.teacherId && e.day === day).length;
        const subjectMatch = neededSubject && t.subjectsCanTeach.some(s => s.toLowerCase() === neededSubject.toLowerCase());
        const compatibility = subjectMatch ? 85 + Math.max(0, 15 - teacherTotalLoad * 3) : 40 + Math.max(0, 20 - teacherTotalLoad * 3);

        return {
          teacherId: t.teacherId,
          teacherName: t.name,
          subjectMatch,
          reason: subjectMatch
            ? `Teaches ${neededSubject}, free this period`
            : `Available this period (teaches ${t.subjectsCanTeach.slice(0, 2).join(', ')})`,
          compatibility: Math.min(100, Math.max(10, compatibility)),
          dayLoad: teacherTotalLoad,
        };
      })
      .sort((a, b) => b.compatibility - a.compatibility);
  };

  const handleAssign = (absentTeacherId: string, substituteId: string, substituteName: string, period: number) => {
    assignSubstitute(absentTeacherId, substituteId, selectedDay, period);
    toast.success(`${substituteName} assigned as substitute for P${period}`);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Substitution Management</h1>
          <p className="text-sm text-muted-foreground mt-1">Handle teacher absences with smart substitute suggestions</p>
        </div>
        <Select value={selectedDay} onValueChange={v => setSelectedDay(v as Day)}>
          <SelectTrigger className="w-40 h-9 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            {DAYS.map(d => (
              <SelectItem key={d} value={d}>{d}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {timetableVersion.entries.length === 0 ? (
        <Card className="glass-card">
          <CardContent className="p-8 text-center">
            <Sparkles className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <h3 className="font-semibold text-foreground">Generate Timetable First</h3>
            <p className="text-sm text-muted-foreground mt-1">A timetable must be generated before substitutions can be managed</p>
          </CardContent>
        </Card>
      ) : absentTeachers.length === 0 ? (
        <Card className="glass-card">
          <CardContent className="p-8 text-center">
            <UserCheck className="h-12 w-12 text-success mx-auto mb-3" />
            <h3 className="font-semibold text-foreground">All Teachers Present</h3>
            <p className="text-sm text-muted-foreground mt-1">No substitutions needed. Mark teachers absent from the Teachers page.</p>
          </CardContent>
        </Card>
      ) : (
        absentTeachers.map((teacher) => {
          const periods = getAbsentTeacherPeriods(teacher.teacherId);
          return (
            <Card key={teacher.teacherId} className="glass-card overflow-hidden">
              <CardHeader className="pb-3 bg-warning/5 border-b border-warning/10">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-warning" />
                  {teacher.name} — Absent on {selectedDay}
                  <Badge variant="outline" className="ml-auto text-[10px] border-warning/30 text-warning">
                    {teacher.subjectsCanTeach.join(', ')}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                {periods.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No classes scheduled on {selectedDay}</p>
                ) : (
                  periods.map(entry => {
                    const subjectName = getSubjectName(entry.subjectId);
                    const className = getClassName(entry.classId);
                    const freeTeachers = getFreeTeachersForPeriod(selectedDay, entry.period, teacher.teacherId);

                    return (
                      <div key={entry.period} className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Clock className="h-3.5 w-3.5 text-primary" />
                          <span className="text-xs font-semibold text-foreground">
                            Period {entry.period} — {subjectName} — Class {className}
                          </span>
                          <span className="text-[10px] text-muted-foreground">{entry.timeSlot}</span>
                        </div>

                        {freeTeachers.length === 0 ? (
                          <p className="text-xs text-muted-foreground pl-5">No free teachers available for this period</p>
                        ) : (
                          <div className="space-y-1.5 pl-5">
                            {freeTeachers.slice(0, 5).map((ft, i) => (
                              <div key={ft.teacherId} className="flex items-center gap-3 p-2.5 rounded-lg border border-border hover:border-primary/20 transition-all group">
                                <div className={`h-7 w-7 rounded-full flex items-center justify-center text-[10px] font-bold ${ft.subjectMatch ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'}`}>
                                  #{i + 1}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-medium text-foreground">{ft.teacherName}</p>
                                  <p className="text-[10px] text-muted-foreground">{ft.reason}</p>
                                </div>
                                <div className="text-right shrink-0">
                                  <div className="flex items-center gap-2">
                                    <span className="text-[10px] text-muted-foreground">Match</span>
                                    <Progress value={ft.compatibility} className="w-14 h-1.5" />
                                    <span className="text-[10px] font-bold text-foreground">{ft.compatibility}%</span>
                                  </div>
                                  <p className="text-[10px] text-muted-foreground">Day load: {ft.dayLoad}p</p>
                                </div>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-xs h-7"
                                  onClick={() => handleAssign(teacher.teacherId, ft.teacherId, ft.teacherName, entry.period)}
                                >
                                  Assign <ChevronRight className="h-3 w-3 ml-1" />
                                </Button>
                              </div>
                            ))}
                            {freeTeachers.length > 5 && (
                              <p className="text-[10px] text-muted-foreground pl-2">+{freeTeachers.length - 5} more teachers available</p>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>
          );
        })
      )}

      {/* Summary */}
      {absentTeachers.length > 0 && timetableVersion.entries.length > 0 && (
        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">
                {absentTeachers.length} absent teacher(s) • {absentTeachers.reduce((sum, t) => sum + getAbsentTeacherPeriods(t.teacherId).length, 0)} periods need substitution on {selectedDay}
              </span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SubstitutionPanel;
