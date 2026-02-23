import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertTriangle, UserCheck, ChevronRight, Sparkles, Clock, Users, Table } from 'lucide-react';
import { useSchoolData } from '@/context/SchoolDataContext';
import { Day } from '@/types/school';
import { DAYS } from '@/data/mockData';
import { toast } from 'sonner';

interface SubAssignment {
  absentTeacherId: string;
  period: number;
  substituteTeacherId: string;
  substituteName: string;
  subjectName: string;
  className: string;
}

const SubstitutionPanel = () => {
  const { teachers, subjects, classes, assignSubstitute, timetableVersion, weekdaySlots, saturdaySlots } = useSchoolData();
  const [selectedDay, setSelectedDay] = useState<Day>(() => {
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long' }) as Day;
    return DAYS.includes(today) ? today : 'Monday';
  });
  const [assignments, setAssignments] = useState<SubAssignment[]>([]);

  const absentTeachers = teachers.filter(t => t.isAbsent);

  const getSubjectName = (subjectId: string) => subjects.find(s => s.subjectId === subjectId)?.subjectName || '';
  const getClassName = (classId: string) => {
    const c = classes.find(cl => cl.classId === classId);
    return c ? `${c.grade}-${c.section}` : '';
  };
  const getTeacherName = (tid: string) => teachers.find(t => t.teacherId === tid)?.name || '';

  const getAbsentTeacherPeriods = (teacherId: string) => {
    return timetableVersion.entries
      .filter(e => e.teacherId === teacherId && e.day === selectedDay)
      .sort((a, b) => a.period - b.period);
  };

  // Track all substitutes already assigned this day (across ALL absent teachers)
  const assignedSubstituteIds = useMemo(() => {
    const map: Record<number, Set<string>> = {};
    assignments.forEach(a => {
      if (!map[a.period]) map[a.period] = new Set();
      map[a.period].add(a.substituteTeacherId);
    });
    return map;
  }, [assignments]);

  // Get all substitute teacher IDs across all periods
  const allAssignedSubIds = useMemo(() => {
    return new Set(assignments.map(a => a.substituteTeacherId));
  }, [assignments]);

  const getFreeTeachersForPeriod = (day: Day, period: number, absentTeacherId: string) => {
    const allEntries = timetableVersion.entries.filter(e => e.day === day && e.period === period);
    const busyTeacherIds = new Set(allEntries.map(e => e.teacherId));

    // Also exclude teachers already assigned as substitutes for THIS period (any absent teacher)
    const alreadySubbedThisPeriod = assignedSubstituteIds[period] || new Set();

    const absentEntry = allEntries.find(e => e.teacherId === absentTeacherId);
    const neededSubject = absentEntry ? getSubjectName(absentEntry.subjectId) : '';

    return teachers
      .filter(t => 
        !t.isAbsent && 
        t.teacherId !== absentTeacherId && 
        !busyTeacherIds.has(t.teacherId) &&
        !alreadySubbedThisPeriod.has(t.teacherId)
      )
      .map(t => {
        const teacherTotalLoad = timetableVersion.entries.filter(e => e.teacherId === t.teacherId && e.day === day).length;
        const subAlreadyAssigned = assignments.filter(a => a.substituteTeacherId === t.teacherId).length;
        const subjectMatch = neededSubject && t.subjectsCanTeach.some(s => s.toLowerCase() === neededSubject.toLowerCase());
        const compatibility = subjectMatch 
          ? 85 + Math.max(0, 15 - (teacherTotalLoad + subAlreadyAssigned) * 3) 
          : 40 + Math.max(0, 20 - (teacherTotalLoad + subAlreadyAssigned) * 3);

        return {
          teacherId: t.teacherId,
          teacherName: t.name,
          subjectMatch,
          reason: subjectMatch
            ? `Teaches ${neededSubject}, free this period`
            : `Available (teaches ${t.subjectsCanTeach.slice(0, 2).join(', ')})`,
          compatibility: Math.min(100, Math.max(10, compatibility)),
          dayLoad: teacherTotalLoad + subAlreadyAssigned,
        };
      })
      .sort((a, b) => b.compatibility - a.compatibility);
  };

  const handleAssign = (absentTeacherId: string, substituteId: string, substituteName: string, period: number, subjectName: string, className: string) => {
    assignSubstitute(absentTeacherId, substituteId, selectedDay, period);
    setAssignments(prev => [...prev, {
      absentTeacherId,
      period,
      substituteTeacherId: substituteId,
      substituteName,
      subjectName,
      className,
    }]);
    toast.success(`${substituteName} assigned as substitute for P${period}`);
  };

  const handleRemoveAssignment = (absentTeacherId: string, period: number) => {
    setAssignments(prev => prev.filter(a => !(a.absentTeacherId === absentTeacherId && a.period === period)));
    toast.info('Substitute removed');
  };

  const allSlots = selectedDay === 'Saturday' ? saturdaySlots : weekdaySlots;
  const periodSlots = allSlots.filter(s => !s.isBreak);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Substitution Management</h1>
          <p className="text-sm text-muted-foreground mt-1">Handle teacher absences with smart substitute suggestions</p>
        </div>
        <Select value={selectedDay} onValueChange={v => { setSelectedDay(v as Day); setAssignments([]); }}>
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
        <>
          {/* Substitution Assignment Table */}
          {assignments.length > 0 && (
            <Card className="glass-card overflow-hidden">
              <CardHeader className="pb-2 bg-success/5 border-b border-success/10">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Table className="h-4 w-4 text-success" />
                  Substitution Timetable — {selectedDay}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse min-w-[600px]">
                    <thead>
                      <tr className="bg-primary/5">
                        <th className="text-left p-2.5 text-xs font-semibold text-muted-foreground border-b border-border">Absent Teacher</th>
                        <th className="text-center p-2.5 text-xs font-semibold text-muted-foreground border-b border-border">Period</th>
                        <th className="text-center p-2.5 text-xs font-semibold text-muted-foreground border-b border-border">Time</th>
                        <th className="text-center p-2.5 text-xs font-semibold text-muted-foreground border-b border-border">Subject</th>
                        <th className="text-center p-2.5 text-xs font-semibold text-muted-foreground border-b border-border">Class</th>
                        <th className="text-center p-2.5 text-xs font-semibold text-muted-foreground border-b border-border">Substitute</th>
                        <th className="text-center p-2.5 text-xs font-semibold text-muted-foreground border-b border-border">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {assignments.sort((a, b) => a.period - b.period).map((a, i) => {
                        const slot = periodSlots.find(s => s.periodNumber === a.period);
                        return (
                          <tr key={i} className="border-b border-border last:border-0 hover:bg-muted/30">
                            <td className="p-2.5 text-xs font-medium text-foreground">{getTeacherName(a.absentTeacherId)}</td>
                            <td className="p-2.5 text-xs text-center text-foreground">P{a.period}</td>
                            <td className="p-2.5 text-xs text-center text-muted-foreground">{slot ? `${slot.startTime}–${slot.endTime}` : ''}</td>
                            <td className="p-2.5 text-xs text-center font-medium text-foreground">{a.subjectName}</td>
                            <td className="p-2.5 text-xs text-center text-foreground">{a.className}</td>
                            <td className="p-2.5 text-xs text-center">
                              <Badge variant="default" className="text-[10px] bg-success text-success-foreground">{a.substituteName}</Badge>
                            </td>
                            <td className="p-2.5 text-center">
                              <Button variant="ghost" size="sm" className="text-[10px] h-6 text-destructive" onClick={() => handleRemoveAssignment(a.absentTeacherId, a.period)}>
                                Remove
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Per absent teacher: periods needing substitution */}
          {absentTeachers.map((teacher) => {
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
                      const isAlreadyAssigned = assignments.some(a => a.absentTeacherId === teacher.teacherId && a.period === entry.period);
                      const freeTeachers = getFreeTeachersForPeriod(selectedDay, entry.period, teacher.teacherId);

                      return (
                        <div key={entry.period} className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Clock className="h-3.5 w-3.5 text-primary" />
                            <span className="text-xs font-semibold text-foreground">
                              Period {entry.period} — {subjectName} — Class {className}
                            </span>
                            <span className="text-[10px] text-muted-foreground">{entry.timeSlot}</span>
                            {isAlreadyAssigned && (
                              <Badge variant="default" className="text-[10px] bg-success text-success-foreground ml-auto">
                                ✓ Assigned
                              </Badge>
                            )}
                          </div>

                          {isAlreadyAssigned ? null : freeTeachers.length === 0 ? (
                            <p className="text-xs text-muted-foreground pl-5">No free teachers available for this period</p>
                          ) : (
                            <div className="space-y-1.5 pl-5">
                              {freeTeachers.slice(0, 5).map((ft, i) => (
                                <div key={ft.teacherId} className="flex items-center gap-3 p-2.5 rounded-lg border border-border hover:border-primary/20 transition-all group">
                                  <div className={`h-7 w-7 rounded-full flex items-center justify-center text-[10px] font-bold ${ft.subjectMatch ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'}`}>
                                    #{i + 1}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-medium text-foreground">
                                      {ft.teacherName}
                                      {allAssignedSubIds.has(ft.teacherId) && (
                                        <span className="text-[10px] text-warning ml-1">(already subbing)</span>
                                      )}
                                    </p>
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
                                    onClick={() => handleAssign(teacher.teacherId, ft.teacherId, ft.teacherName, entry.period, subjectName, className)}
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
          })}
        </>
      )}

      {/* Summary */}
      {absentTeachers.length > 0 && timetableVersion.entries.length > 0 && (
        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">
                {absentTeachers.length} absent teacher(s) • {absentTeachers.reduce((sum, t) => sum + getAbsentTeacherPeriods(t.teacherId).length, 0)} periods need substitution on {selectedDay} • {assignments.length} assigned
              </span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SubstitutionPanel;
