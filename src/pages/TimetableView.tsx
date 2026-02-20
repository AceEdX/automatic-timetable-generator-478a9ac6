import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sparkles, Lock, Unlock, Download, History } from 'lucide-react';
import { useSchoolData } from '@/context/SchoolDataContext';
import { Day } from '@/types/school';
import { DAYS, getSubjectColor } from '@/data/mockData';
import { toast } from 'sonner';

const TimetableView = () => {
  const { classes, subjects, teachers, timetableVersion, weekdaySlots, saturdaySlots, regenerateTimetable, lockTimetable, unlockTimetable } = useSchoolData();
  const [selectedClass, setSelectedClass] = useState('c1');
  const [selectedDay, setSelectedDay] = useState<'all' | Day>('all');

  const classInfo = classes.find(c => c.classId === selectedClass);
  const version = timetableVersion;
  const daysToShow = selectedDay === 'all' ? DAYS : [selectedDay];

  const getSlotsForDay = (day: Day) => {
    const slots = day === 'Saturday' ? saturdaySlots : weekdaySlots;
    return slots.filter(s => !s.isBreak);
  };

  const getEntry = (day: Day, period: number) =>
    version.entries.find(e => e.day === day && e.period === period && e.classId === selectedClass);

  const getSubjectName = (subjectId: string) => subjects.find(s => s.subjectId === subjectId)?.subjectName || '';
  const getTeacherName = (teacherId: string) => teachers.find(t => t.teacherId === teacherId)?.name || '';
  const isTeacherAbsent = (teacherId: string) => teachers.find(t => t.teacherId === teacherId)?.isAbsent || false;

  const handleGenerate = () => {
    const v = regenerateTimetable();
    toast.success(`Timetable generated! Score: ${v.score}%`, { description: `Version ${v.versionId} created at ${new Date(v.generatedAt).toLocaleString()}` });
  };

  const handleLock = () => {
    if (version.status === 'locked') {
      unlockTimetable();
      toast.info('Timetable unlocked for editing');
    } else {
      lockTimetable();
      toast.success('Timetable locked and published');
    }
  };

  const handleExport = () => {
    const rows = [['Day', 'Period', 'Time', 'Subject', 'Teacher', 'Room']];
    version.entries.filter(e => e.classId === selectedClass).forEach(e => {
      rows.push([e.day, String(e.period), e.timeSlot, getSubjectName(e.subjectId), getTeacherName(e.teacherId), e.room]);
    });
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `timetable_${classInfo?.grade}-${classInfo?.section}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Timetable exported as CSV');
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Timetable</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Class {classInfo?.grade}-{classInfo?.section} • Version {version.versionId}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="score-badge">Score: {version.score}%</div>
          <Badge variant="outline" className={`text-xs ${
            version.status === 'locked' ? 'border-success/30 text-success' :
            version.status === 'approved' ? 'border-info/30 text-info' :
            'border-muted-foreground/30'
          }`}>
            {version.status.charAt(0).toUpperCase() + version.status.slice(1)}
          </Badge>
        </div>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <Select value={selectedClass} onValueChange={setSelectedClass}>
          <SelectTrigger className="w-40 h-9 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            {classes.map(c => (
              <SelectItem key={c.classId} value={c.classId}>Class {c.grade}-{c.section}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={selectedDay} onValueChange={(v) => setSelectedDay(v as 'all' | Day)}>
          <SelectTrigger className="w-36 h-9 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Days</SelectItem>
            {DAYS.map(d => (<SelectItem key={d} value={d}>{d}</SelectItem>))}
          </SelectContent>
        </Select>

        <div className="ml-auto flex gap-2">
          <Button variant="outline" size="sm" className="text-xs gap-1.5" onClick={handleLock}>
            {version.status === 'locked' ? <Unlock className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
            {version.status === 'locked' ? 'Unlock' : 'Lock'}
          </Button>
          <Button variant="outline" size="sm" className="text-xs gap-1.5" onClick={handleExport}>
            <Download className="h-3.5 w-3.5" /> Export
          </Button>
          <Button size="sm" className="text-xs gap-1.5" onClick={handleGenerate}>
            <Sparkles className="h-3.5 w-3.5" /> Generate
          </Button>
        </div>
      </div>

      <Card className="glass-card overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-primary/5">
                  <th className="text-left p-3 text-xs font-semibold text-muted-foreground border-b border-border w-24">Day</th>
                  {getSlotsForDay('Monday').map(slot => (
                    <th key={slot.periodNumber} className="text-center p-3 text-xs font-semibold text-muted-foreground border-b border-border">
                      <div>P{slot.periodNumber}</div>
                      <div className="text-[10px] font-normal">{slot.startTime}–{slot.endTime}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {daysToShow.map((day) => {
                  const slots = getSlotsForDay(day);
                  const isSaturday = day === 'Saturday';
                  const maxPeriods = getSlotsForDay('Monday').length;

                  return (
                    <tr key={day} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="p-3 text-sm font-medium text-foreground">
                        {day.slice(0, 3)}
                        {isSaturday && <span className="block text-[10px] text-accent font-normal">Half Day</span>}
                      </td>
                      {Array.from({ length: maxPeriods }, (_, i) => i + 1).map(period => {
                        const slot = slots.find(s => s.periodNumber === period);
                        if (!slot && isSaturday) {
                          return (
                            <td key={period} className="p-1.5 text-center">
                              <div className="rounded-md p-2 bg-muted/30 text-[10px] text-muted-foreground">—</div>
                            </td>
                          );
                        }
                        const entry = getEntry(day, period);
                        if (!entry) return <td key={period} className="p-1.5" />;
                        const subjectName = getSubjectName(entry.subjectId);
                        const teacherName = getTeacherName(entry.teacherId);
                        const absent = isTeacherAbsent(entry.teacherId);
                        const colorClass = getSubjectColor(subjectName);

                        return (
                          <td key={period} className="p-1.5">
                            <div className={`rounded-lg border p-2 text-center cursor-pointer hover:shadow-sm transition-all ${colorClass} ${absent ? 'ring-2 ring-warning/40' : ''}`}>
                              <p className="text-xs font-semibold leading-tight">{subjectName}</p>
                              <p className="text-[10px] mt-0.5 opacity-80">{teacherName}</p>
                              {absent && (
                                <Badge variant="outline" className="mt-1 text-[9px] border-warning/40 text-warning px-1 py-0">Absent</Badge>
                              )}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center gap-4 flex-wrap text-xs text-muted-foreground">
        <span className="font-medium">Subjects:</span>
        {subjects.map(s => (
          <span key={s.subjectId} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border ${getSubjectColor(s.subjectName)}`}>
            {s.subjectName}
          </span>
        ))}
      </div>
    </div>
  );
};

export default TimetableView;
