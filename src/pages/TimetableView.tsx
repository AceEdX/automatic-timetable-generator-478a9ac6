import { useState, useRef } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sparkles, Lock, Unlock, Download, Printer, AlertTriangle, CheckCircle } from 'lucide-react';
import { useSchoolData } from '@/context/SchoolDataContext';
import { Day } from '@/types/school';
import { DAYS, getSubjectColor } from '@/data/mockData';
import { toast } from 'sonner';

const TimetableView = () => {
  const {
    school, classes, subjects, teachers, timetableVersion, weekdaySlots, saturdaySlots,
    regenerateTimetable, lockTimetable, unlockTimetable, validateData, getTeacherTimetable,
  } = useSchoolData();
  const [selectedClass, setSelectedClass] = useState(classes[0]?.classId || '');
  const [selectedTeacher, setSelectedTeacher] = useState('');
  const [viewTab, setViewTab] = useState('class');
  const [generationErrors, setGenerationErrors] = useState<string[]>([]);
  const printRef = useRef<HTMLDivElement>(null);

  const enabledClasses = classes.filter(c => c.isEnabled);
  const version = timetableVersion;

  const getSlotsForDay = (day: Day) => (day === 'Saturday' ? saturdaySlots : weekdaySlots).filter(s => !s.isBreak);
  const getAllSlotsForDay = (day: Day) => (day === 'Saturday' ? saturdaySlots : weekdaySlots);
  const getSubjectName = (subjectId: string) => subjects.find(s => s.subjectId === subjectId)?.subjectName || '';
  const getTeacherName = (teacherId: string) => teachers.find(t => t.teacherId === teacherId)?.name || '';
  const getClassName = (classId: string) => {
    const c = classes.find(cl => cl.classId === classId);
    return c ? `${c.grade}-${c.section}` : '';
  };

  const handleGenerate = (gradeRange?: [number, number]) => {
    const validationErrors = validateData(gradeRange);
    if (validationErrors.length > 0) {
      setGenerationErrors(validationErrors);
      toast.error(`${validationErrors.length} validation issue(s). Fix them before generating.`);
      return;
    }
    const { errors } = regenerateTimetable(gradeRange);
    setGenerationErrors(errors);
    const label = gradeRange ? `Grades ${gradeRange[0]}-${gradeRange[1]}` : 'All';
    if (errors.length === 0) {
      toast.success(`${label} timetable generated successfully!`);
    } else {
      toast.warning(`${label} timetable generated with ${errors.length} warning(s)`);
    }
  };

  const handleLock = () => {
    if (version.status === 'locked') { unlockTimetable(); toast.info('Timetable unlocked'); }
    else { lockTimetable(); toast.success('Timetable locked & published'); }
  };

  const generateCSV = (rows: string[][], filename: string) => {
    const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportClass = () => {
    const cls = classes.find(c => c.classId === selectedClass);
    if (!cls) return;
    const rows = [
      [`${school.schoolName} - Class ${cls.grade}-${cls.section} Timetable`],
      [`Board: ${school.boardType}`, `Year: ${school.academicYear}`, `Generated: ${new Date(version.generatedAt).toLocaleString()}`],
      ['Day', 'Period', 'Time', 'Subject', 'Teacher', 'Room'],
    ];
    version.entries.filter(e => e.classId === selectedClass).sort((a, b) => DAYS.indexOf(a.day) - DAYS.indexOf(b.day) || a.period - b.period)
      .forEach(e => rows.push([e.day, String(e.period), e.timeSlot, getSubjectName(e.subjectId), getTeacherName(e.teacherId), e.room]));
    generateCSV(rows, `timetable_class_${cls.grade}-${cls.section}_${new Date().toISOString().slice(0, 10)}.csv`);
    toast.success('Class timetable exported');
  };

  const handleExportTeacher = () => {
    const teacher = teachers.find(t => t.teacherId === selectedTeacher);
    if (!teacher) return;
    const entries = getTeacherTimetable(selectedTeacher);
    const rows = [
      [`${school.schoolName} - ${teacher.name} Teaching Schedule`],
      [`Board: ${school.boardType}`, `Year: ${school.academicYear}`, `Generated: ${new Date(version.generatedAt).toLocaleString()}`],
      ['Day', 'Period', 'Time', 'Subject', 'Class', 'Room'],
    ];
    entries.sort((a, b) => DAYS.indexOf(a.day) - DAYS.indexOf(b.day) || a.period - b.period)
      .forEach(e => rows.push([e.day, String(e.period), e.timeSlot, getSubjectName(e.subjectId), getClassName(e.classId), e.room]));
    generateCSV(rows, `timetable_teacher_${teacher.name.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`);
    toast.success('Teacher timetable exported');
  };

  const handleExportWholeSchool = () => {
    const rows = [
      [`${school.schoolName} - Whole School Timetable`],
      [`Board: ${school.boardType}`, `Year: ${school.academicYear}`, `Generated: ${new Date(version.generatedAt).toLocaleString()}`],
      ['Class', 'Day', 'Period', 'Time', 'Subject', 'Teacher', 'Room'],
    ];
    version.entries.sort((a, b) => {
      const ca = classes.findIndex(c => c.classId === a.classId);
      const cb = classes.findIndex(c => c.classId === b.classId);
      if (ca !== cb) return ca - cb;
      if (a.day !== b.day) return DAYS.indexOf(a.day) - DAYS.indexOf(b.day);
      return a.period - b.period;
    }).forEach(e =>
      rows.push([getClassName(e.classId), e.day, String(e.period), e.timeSlot, getSubjectName(e.subjectId), getTeacherName(e.teacherId), e.room])
    );
    generateCSV(rows, `timetable_whole_school_${new Date().toISOString().slice(0, 10)}.csv`);
    toast.success('Whole school timetable exported');
  };

  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <html><head><title>${school.schoolName} - Timetable</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; }
        table { border-collapse: collapse; width: 100%; margin-top: 10px; }
        th, td { border: 1px solid #ddd; padding: 6px 8px; font-size: 11px; text-align: center; }
        th { background: #f0f4f8; font-weight: bold; }
        h1 { font-size: 18px; margin-bottom: 4px; }
        .meta { font-size: 12px; color: #666; margin-bottom: 10px; }
        @media print { body { padding: 0; } }
      </style></head><body>
      <h1>${school.schoolName}</h1>
      <div class="meta">${school.boardType} • ${school.academicYear} • Generated: ${new Date(version.generatedAt).toLocaleString()}</div>
      ${printContent.innerHTML}
      </body></html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const mondayAllSlots = getAllSlotsForDay('Monday');

  const renderClassTable = (classId: string) => {
    const classEntries = version.entries.filter(e => e.classId === classId);
    return (
      <table className="w-full border-collapse min-w-[700px]">
        <thead>
          <tr className="bg-primary/5">
            <th className="text-left p-2.5 text-xs font-semibold text-muted-foreground border-b border-border w-20">Day</th>
            {mondayAllSlots.map(slot => (
              <th key={slot.isBreak ? `break-${slot.startTime}` : slot.periodNumber} className={`text-center p-2.5 text-xs font-semibold text-muted-foreground border-b border-border ${slot.isBreak ? 'bg-muted/40' : ''}`}>
                <div>{slot.isBreak ? slot.label || 'Break' : `P${slot.periodNumber}`}</div>
                <div className="text-[10px] font-normal">{slot.startTime}–{slot.endTime}</div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {DAYS.map(day => {
            const allSlots = getAllSlotsForDay(day);
            return (
              <tr key={day} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                <td className="p-2.5 text-xs font-medium text-foreground">{day.slice(0, 3)}</td>
                {mondayAllSlots.map((mondaySlot, idx) => {
                  if (mondaySlot.isBreak) {
                    const dayHasSlot = allSlots.find(s => s.isBreak && s.startTime === mondaySlot.startTime);
                    if (dayHasSlot) {
                      return <td key={`break-${idx}`} className="p-1 text-center bg-muted/20"><div className="rounded p-1.5 text-[10px] font-medium text-muted-foreground">☕ {dayHasSlot.label || 'Break'}</div></td>;
                    }
                    return <td key={`break-${idx}`} className="p-1 text-center bg-muted/20"><div className="rounded p-1.5 text-[10px] text-muted-foreground">—</div></td>;
                  }
                  const period = mondaySlot.periodNumber;
                  const daySlot = allSlots.find(s => !s.isBreak && s.periodNumber === period);
                  if (!daySlot && day === 'Saturday') {
                    return <td key={period} className="p-1 text-center"><div className="rounded p-1.5 bg-muted/30 text-[10px] text-muted-foreground">—</div></td>;
                  }
                  const entry = classEntries.find(e => e.day === day && e.period === period);
                  if (!entry) return <td key={period} className="p-1"><div className="rounded p-1.5 bg-muted/20 text-[10px] text-muted-foreground text-center">Free</div></td>;
                  const subjectName = getSubjectName(entry.subjectId);
                  const teacherName = getTeacherName(entry.teacherId);
                  const colorClass = getSubjectColor(subjectName);
                  return (
                    <td key={period} className="p-1">
                      <div className={`rounded-lg border p-1.5 text-center ${colorClass}`}>
                        <p className="text-[11px] font-semibold leading-tight">{subjectName}</p>
                        <p className="text-[9px] mt-0.5 opacity-80">{teacherName}</p>
                      </div>
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    );
  };

  const renderTeacherTable = (teacherId: string) => {
    const teacher = teachers.find(t => t.teacherId === teacherId);
    if (!teacher) return null;
    const teacherEntries = getTeacherTimetable(teacherId);

    return (
      <div>
        <table className="w-full border-collapse min-w-[700px]">
          <thead>
            <tr className="bg-primary/5">
              <th className="text-left p-2.5 text-xs font-semibold text-muted-foreground border-b border-border w-20">Day</th>
              {mondayAllSlots.map(slot => (
                <th key={slot.isBreak ? `break-${slot.startTime}` : slot.periodNumber} className={`text-center p-2.5 text-xs font-semibold text-muted-foreground border-b border-border ${slot.isBreak ? 'bg-muted/40' : ''}`}>
                  <div>{slot.isBreak ? slot.label || 'Break' : `P${slot.periodNumber}`}</div>
                  <div className="text-[10px] font-normal">{slot.startTime}–{slot.endTime}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {DAYS.map(day => {
              const allSlots = getAllSlotsForDay(day);
              return (
                <tr key={day} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="p-2.5 text-xs font-medium text-foreground">{day.slice(0, 3)}</td>
                  {mondayAllSlots.map((mondaySlot, idx) => {
                    if (mondaySlot.isBreak) {
                      const dayHasSlot = allSlots.find(s => s.isBreak && s.startTime === mondaySlot.startTime);
                      if (dayHasSlot) {
                        return <td key={`break-${idx}`} className="p-1 text-center bg-muted/20"><div className="rounded p-1.5 text-[10px] font-medium text-muted-foreground">☕ {dayHasSlot.label || 'Break'}</div></td>;
                      }
                      return <td key={`break-${idx}`} className="p-1 text-center bg-muted/20"><div className="rounded p-1.5 text-[10px] text-muted-foreground">—</div></td>;
                    }
                    const period = mondaySlot.periodNumber;
                    const daySlot = allSlots.find(s => !s.isBreak && s.periodNumber === period);
                    if (!daySlot && day === 'Saturday') {
                      return <td key={period} className="p-1 text-center"><div className="rounded p-1.5 bg-muted/30 text-[10px] text-muted-foreground">—</div></td>;
                    }
                    const entry = teacherEntries.find(e => e.day === day && e.period === period);
                    if (!entry) return (
                      <td key={period} className="p-1">
                        <div className="rounded p-1.5 bg-success/10 text-[10px] text-success text-center border border-success/20">
                          Free
                        </div>
                      </td>
                    );
                    const subjectName = getSubjectName(entry.subjectId);
                    const className = getClassName(entry.classId);
                    const colorClass = getSubjectColor(subjectName);
                    return (
                      <td key={period} className="p-1">
                        <div className={`rounded-lg border p-1.5 text-center ${colorClass}`}>
                          <p className="text-[11px] font-semibold leading-tight">{subjectName}</p>
                          <p className="text-[9px] mt-0.5 opacity-80">{className}</p>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
        {teacher.isAbsent && (
          <div className="mt-3 p-3 rounded-lg bg-warning/10 border border-warning/20">
            <p className="text-xs font-medium text-warning">⚠ This teacher is marked absent. Free teachers can substitute during their free periods.</p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Timetable</h1>
          <p className="text-sm text-muted-foreground mt-1">{school.schoolName} • {school.boardType} • {school.academicYear}</p>
        </div>
        <div className="flex items-center gap-2">
          {version.score > 0 && <div className="score-badge">Score: {version.score}%</div>}
          <Badge variant="outline" className={`text-xs ${version.status === 'locked' ? 'border-success/30 text-success' : 'border-muted-foreground/30'}`}>
            {version.status.charAt(0).toUpperCase() + version.status.slice(1)}
          </Badge>
        </div>
      </div>

      {/* Action Bar */}
      <Card className="glass-card">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-medium text-muted-foreground mr-2">Generate:</span>
            <Button size="sm" className="text-xs gap-1.5" onClick={() => handleGenerate([1, 4])}>
              <Sparkles className="h-3.5 w-3.5" /> Grade 1-4
            </Button>
            <Button size="sm" className="text-xs gap-1.5" onClick={() => handleGenerate([5, 10])}>
              <Sparkles className="h-3.5 w-3.5" /> Grade 5-10
            </Button>
            <Button size="sm" variant="secondary" className="text-xs gap-1.5" onClick={() => handleGenerate()}>
              <Sparkles className="h-3.5 w-3.5" /> All Grades
            </Button>
            <div className="border-l border-border h-6 mx-1" />
            <Button variant="outline" size="sm" className="text-xs gap-1.5" onClick={handleLock} disabled={version.entries.length === 0}>
              {version.status === 'locked' ? <Unlock className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
              {version.status === 'locked' ? 'Unlock' : 'Lock'}
            </Button>
            <Button variant="outline" size="sm" className="text-xs gap-1.5" onClick={handlePrint} disabled={version.entries.length === 0}>
              <Printer className="h-3.5 w-3.5" /> Print
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Errors */}
      {generationErrors.length > 0 && (
        <Card className="border-warning/30 bg-warning/5">
          <CardContent className="p-4">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-foreground mb-1">{generationErrors.length} Issue(s)</p>
                <ul className="space-y-0.5">
                  {generationErrors.slice(0, 10).map((err, i) => (
                    <li key={i} className="text-xs text-muted-foreground">• {err}</li>
                  ))}
                  {generationErrors.length > 10 && <li className="text-xs text-muted-foreground">...and {generationErrors.length - 10} more</li>}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {version.entries.length === 0 ? (
        <Card className="glass-card">
          <CardContent className="p-8 text-center">
            <Sparkles className="h-12 w-12 text-accent mx-auto mb-3" />
            <h3 className="font-semibold text-foreground">No Timetable Generated Yet</h3>
            <p className="text-sm text-muted-foreground mt-1 mb-4">Configure time slots, add teachers and subjects, then generate by grade group</p>
            <div className="flex justify-center gap-2">
              <Button onClick={() => handleGenerate([1, 4])}><Sparkles className="h-4 w-4 mr-2" /> Grade 1-4</Button>
              <Button onClick={() => handleGenerate([5, 10])}><Sparkles className="h-4 w-4 mr-2" /> Grade 5-10</Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Tabs value={viewTab} onValueChange={setViewTab}>
          <TabsList>
            <TabsTrigger value="class">Class Timetable</TabsTrigger>
            <TabsTrigger value="teacher">Teacher Timetable</TabsTrigger>
            <TabsTrigger value="school">Whole School</TabsTrigger>
          </TabsList>

          <TabsContent value="class" className="space-y-4">
            <div className="flex items-center gap-3">
              <Select value={selectedClass} onValueChange={setSelectedClass}>
                <SelectTrigger className="w-44 h-9 text-sm"><SelectValue placeholder="Select class" /></SelectTrigger>
                <SelectContent>
                  {enabledClasses.map(c => (
                    <SelectItem key={c.classId} value={c.classId}>Class {c.grade}-{c.section}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" className="text-xs gap-1.5 ml-auto" onClick={handleExportClass}>
                <Download className="h-3.5 w-3.5" /> Export CSV
              </Button>
            </div>
            <Card className="glass-card overflow-hidden">
              <CardContent className="p-0" ref={printRef}>
                <div className="overflow-x-auto">{renderClassTable(selectedClass)}</div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="teacher" className="space-y-4">
            <div className="flex items-center gap-3">
              <Select value={selectedTeacher} onValueChange={setSelectedTeacher}>
                <SelectTrigger className="w-52 h-9 text-sm"><SelectValue placeholder="Select teacher" /></SelectTrigger>
                <SelectContent>
                  {teachers.map(t => (
                    <SelectItem key={t.teacherId} value={t.teacherId}>{t.name} {t.isAbsent ? '(Absent)' : ''}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" className="text-xs gap-1.5 ml-auto" onClick={handleExportTeacher} disabled={!selectedTeacher}>
                <Download className="h-3.5 w-3.5" /> Export CSV
              </Button>
            </div>
            {selectedTeacher ? (
              <Card className="glass-card overflow-hidden">
                <CardContent className="p-0">
                  <div className="overflow-x-auto">{renderTeacherTable(selectedTeacher)}</div>
                </CardContent>
              </Card>
            ) : (
              <p className="text-sm text-muted-foreground">Select a teacher to view schedule. Free periods (green) show when they can substitute.</p>
            )}
          </TabsContent>

          <TabsContent value="school" className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">All enabled classes timetable</p>
              <Button variant="outline" size="sm" className="text-xs gap-1.5" onClick={handleExportWholeSchool}>
                <Download className="h-3.5 w-3.5" /> Export Whole School CSV
              </Button>
            </div>
            <div className="space-y-6">
              {enabledClasses.filter(c => version.entries.some(e => e.classId === c.classId)).sort((a, b) => parseInt(a.grade) - parseInt(b.grade) || a.section.localeCompare(b.section)).map(cls => (
                <Card key={cls.classId} className="glass-card overflow-hidden">
                  <CardHeader className="pb-2 bg-primary/5">
                    <CardTitle className="text-sm font-semibold">Class {cls.grade}-{cls.section}</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">{renderClassTable(cls.classId)}</div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      )}

      {version.entries.length > 0 && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <CheckCircle className="h-3.5 w-3.5 text-success" />
          Generated: {new Date(version.generatedAt).toLocaleString()} • Version: {version.versionId.slice(0, 12)} • Score: {version.score}%
        </div>
      )}
    </div>
  );
};

export default TimetableView;
