import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Pencil, Trash2, Users } from 'lucide-react';
import { useSchoolData } from '@/context/SchoolDataContext';
import { Teacher, Day, TeacherRole, SubjectClassMapping } from '@/types/school';
import { DAYS, AVAILABLE_SUBJECTS } from '@/data/mockData';
import { toast } from 'sonner';

const TeachersPage = () => {
  const { teachers, setTeachers, classes, setClasses, subjects, setSubjects, getTeacherWeeklyPeriods, school, setSchool, syncTeacherToSubjects } = useSchoolData();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [role, setRole] = useState<TeacherRole>('SubjectTeacher');
  const [ctClassId, setCtClassId] = useState('none');
  const [subjectClassMap, setSubjectClassMap] = useState<SubjectClassMapping[]>([]);
  const [maxPerDay, setMaxPerDay] = useState(6);
  const [maxPerWeek, setMaxPerWeek] = useState(30);
  const [availDays, setAvailDays] = useState<Day[]>([...DAYS]);
  const [customSubject, setCustomSubject] = useState('');

  // All available subjects including custom
  const allSubjects = [...new Set([...AVAILABLE_SUBJECTS, ...school.customSubjects])].sort();

  // Enabled classes only
  const enabledClasses = classes.filter(c => c.isEnabled);

  const resetForm = () => {
    setName('');
    setRole('SubjectTeacher');
    setCtClassId('none');
    setSubjectClassMap([]);
    setMaxPerDay(6);
    setMaxPerWeek(30);
    setAvailDays([...DAYS]);
    setEditingTeacher(null);
    setCustomSubject('');
  };

  const openAdd = () => { resetForm(); setDialogOpen(true); };

  const openEdit = (t: Teacher) => {
    setEditingTeacher(t);
    setName(t.name);
    setRole(t.teacherRole);
    const ctClass = classes.find(c => c.classTeacherId === t.teacherId);
    setCtClassId(ctClass ? ctClass.classId : 'none');
    setSubjectClassMap(t.subjectClassMap || []);
    setMaxPerDay(t.maxPeriodsPerDay);
    setMaxPerWeek(t.maxPeriodsPerWeek);
    setAvailDays(t.availableDays);
    setDialogOpen(true);
  };

  const toggleSubject = (subject: string, checked: boolean) => {
    if (checked) {
      setSubjectClassMap(prev => [...prev, { subject, classIds: [] }]);
    } else {
      setSubjectClassMap(prev => prev.filter(m => m.subject !== subject));
    }
  };

  const toggleClassForSubject = (subject: string, classId: string, checked: boolean) => {
    setSubjectClassMap(prev => prev.map(m => {
      if (m.subject !== subject) return m;
      return {
        ...m,
        classIds: checked ? [...m.classIds, classId] : m.classIds.filter(c => c !== classId),
      };
    }));
  };

  const selectAllClassesForSubject = (subject: string) => {
    setSubjectClassMap(prev => prev.map(m => {
      if (m.subject !== subject) return m;
      return { ...m, classIds: enabledClasses.map(c => c.classId) };
    }));
  };

  const handleAddCustomSubject = () => {
    const trimmed = customSubject.trim();
    if (!trimmed) return;
    if (allSubjects.includes(trimmed)) { toast.error('Subject already exists'); return; }
    setSchool(prev => ({ ...prev, customSubjects: [...prev.customSubjects, trimmed] }));
    setSubjectClassMap(prev => [...prev, { subject: trimmed, classIds: [] }]);
    setCustomSubject('');
    toast.success(`Added "${trimmed}" as a subject option`);
  };

  const handleSave = () => {
    if (!name.trim()) { toast.error('Enter teacher name'); return; }
    if (subjectClassMap.length === 0) { toast.error('Select at least one subject'); return; }
    const hasClasses = subjectClassMap.some(m => m.classIds.length > 0);
    if (!hasClasses) { toast.error('Assign at least one class to a subject'); return; }

    const derivedSubjects = subjectClassMap.map(m => m.subject);
    const derivedClasses = [...new Set(subjectClassMap.flatMap(m => m.classIds))];

    const teacherId = editingTeacher ? editingTeacher.teacherId : `t_${Date.now()}`;

    if (editingTeacher) {
      const updated: Teacher = {
        ...editingTeacher,
        name: name.trim(),
        teacherRole: role,
        subjectsCanTeach: derivedSubjects,
        classesHandled: derivedClasses,
        subjectClassMap,
        maxPeriodsPerDay: maxPerDay,
        maxPeriodsPerWeek: maxPerWeek,
        availableDays: availDays,
      };
      setTeachers(prev => prev.map(t => t.teacherId === updated.teacherId ? updated : t));
      syncTeacherToSubjects(updated);
      toast.success('Teacher updated');
    } else {
      const newTeacher: Teacher = {
        teacherId,
        schoolId: 's1',
        name: name.trim(),
        teacherRole: role,
        subjectsCanTeach: derivedSubjects,
        classesHandled: derivedClasses,
        subjectClassMap,
        maxPeriodsPerDay: maxPerDay,
        maxPeriodsPerWeek: maxPerWeek,
        availableDays: availDays,
        isAbsent: false,
      };
      setTeachers(prev => [...prev, newTeacher]);
      syncTeacherToSubjects(newTeacher);
      toast.success('Teacher added');
    }

    // Sync CT assignment to classes
    if (role === 'ClassTeacher' && ctClassId !== 'none') {
      setClasses(prev => prev.map(c => {
        // Remove this teacher from any previous CT assignment
        if (c.classTeacherId === teacherId && c.classId !== ctClassId) {
          return { ...c, classTeacherId: '' };
        }
        // Assign to selected class
        if (c.classId === ctClassId) {
          return { ...c, classTeacherId: teacherId };
        }
        return c;
      }));
    } else if (role === 'SubjectTeacher') {
      // Remove CT assignment if role changed
      setClasses(prev => prev.map(c =>
        c.classTeacherId === teacherId ? { ...c, classTeacherId: '' } : c
      ));
    }

    setDialogOpen(false);
    resetForm();
  };

  const handleDelete = (tid: string) => {
    setTeachers(prev => prev.filter(t => t.teacherId !== tid));
    setSubjects(prev => prev.map(s => ({
      ...s,
      qualifiedTeacherIds: s.qualifiedTeacherIds.filter(id => id !== tid),
    })));
    toast.success('Teacher removed');
  };

  const toggleAbsent = (tid: string) => {
    setTeachers(prev => prev.map(t => t.teacherId === tid ? { ...t, isAbsent: !t.isAbsent } : t));
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Teachers</h1>
          <p className="text-sm text-muted-foreground mt-1">Add teachers with subject-class mapping. Data auto-syncs to Classes & Subjects tab.</p>
        </div>
        <Button className="gap-2" onClick={openAdd}>
          <Plus className="h-4 w-4" /> Add Teacher
        </Button>
      </div>

      {teachers.length === 0 ? (
        <Card className="glass-card">
          <CardContent className="p-8 text-center">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <h3 className="font-semibold text-foreground">No Teachers Added</h3>
            <p className="text-sm text-muted-foreground mt-1">Click "Add Teacher" to start. Teacher data will auto-populate Classes & Subjects.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {teachers.map((teacher) => {
            const { total, breakdown } = getTeacherWeeklyPeriods(teacher.teacherId);
            const classTeacherOf = classes.find(c => c.classTeacherId === teacher.teacherId);

            return (
              <Card key={teacher.teacherId} className={`glass-card hover:shadow-md transition-all ${teacher.isAbsent ? 'ring-2 ring-warning/30' : ''}`}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                        {teacher.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-foreground">{teacher.name}</p>
                          <Badge variant="secondary" className="text-[10px] h-5">
                            {[...new Set((teacher.subjectClassMap || []).flatMap(m => m.classIds))].length} classes
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {teacher.teacherRole === 'ClassTeacher' ? 'Class Teacher' : 'Subject Teacher'}
                          {classTeacherOf && <span className="text-primary"> • CT of {classTeacherOf.grade}-{classTeacherOf.section}</span>}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => openEdit(teacher)} className="p-1.5 rounded hover:bg-muted transition-colors">
                        <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                      </button>
                      <button onClick={() => handleDelete(teacher.teacherId)} className="p-1.5 rounded hover:bg-destructive/10 transition-colors">
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mb-3">
                    <button onClick={() => toggleAbsent(teacher.teacherId)}
                      className={`text-[10px] px-2 py-0.5 rounded-full border cursor-pointer transition-colors ${
                        teacher.isAbsent ? 'border-warning/30 text-warning bg-warning/10' : 'border-success/30 text-success bg-success/10'
                      }`}>
                      {teacher.isAbsent ? 'Absent' : 'Present'}
                    </button>
                  </div>

                  {/* Subject-Class Mapping Display */}
                  <div className="space-y-1.5 text-xs mb-3">
                    <p className="text-[10px] uppercase tracking-wider font-medium text-muted-foreground">Subject → Classes</p>
                    {(teacher.subjectClassMap || []).map((m, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <span className="font-medium text-foreground">{m.subject}</span>
                        <span className="text-muted-foreground text-right max-w-[60%]">
                          {m.classIds.map(cid => {
                            const c = classes.find(cl => cl.classId === cid);
                            return c ? `${c.grade}-${c.section}` : cid;
                          }).join(', ') || 'None'}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Max/Day</span>
                      <span className="font-medium text-foreground">{teacher.maxPeriodsPerDay}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Max/Week</span>
                      <span className="font-medium text-foreground">{teacher.maxPeriodsPerWeek}</span>
                    </div>
                    <div className="flex justify-between items-center pt-1 border-t border-border">
                      <span className="text-muted-foreground font-medium">Assigned Periods/Week</span>
                      <Badge variant="secondary" className="text-xs font-bold">
                        {(() => {
                          // Calculate from subject periodsPerWeek for classes this teacher is assigned to
                          let totalPeriods = 0;
                          (teacher.subjectClassMap || []).forEach(m => {
                            m.classIds.forEach(cid => {
                              const subj = subjects.find(s => s.classId === cid && s.subjectName.toLowerCase() === m.subject.toLowerCase());
                              if (subj) totalPeriods += subj.periodsPerWeek;
                            });
                          });
                          return totalPeriods;
                        })()}
                      </Badge>
                    </div>
                  </div>

                  {breakdown.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-border">
                      <p className="text-[10px] uppercase tracking-wider font-medium text-muted-foreground mb-2">Timetable Assignments</p>
                      <div className="space-y-1">
                        {breakdown.map((b, i) => (
                          <div key={i} className="flex items-center justify-between text-xs">
                            <span className="text-foreground">
                              <span className="font-medium">{b.subjectName}</span>
                              <span className="text-muted-foreground"> → {b.className}</span>
                            </span>
                            <Badge variant="outline" className="text-[10px] h-5">{b.count}p/w</Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingTeacher ? 'Edit Teacher' : 'Add New Teacher'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Teacher Name</Label>
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Mrs. Sharma" />
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <Select value={role} onValueChange={v => setRole(v as TeacherRole)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SubjectTeacher">Subject Teacher</SelectItem>
                    <SelectItem value="ClassTeacher">Class Teacher</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* CT Class Assignment */}
            {role === 'ClassTeacher' && (
              <div className="space-y-2">
                <Label>Assign as Class Teacher of</Label>
                <Select value={ctClassId} onValueChange={setCtClassId}>
                  <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {enabledClasses.map(c => {
                      const currentCT = teachers.find(t => t.teacherId === c.classTeacherId);
                      const isOccupied = currentCT && currentCT.teacherId !== editingTeacher?.teacherId;
                      return (
                        <SelectItem key={c.classId} value={c.classId} disabled={!!isOccupied}>
                          {c.grade}-{c.section}{isOccupied ? ` (CT: ${currentCT.name})` : ''}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Max Periods/Day</Label>
                <Input type="number" value={maxPerDay} onChange={e => setMaxPerDay(Number(e.target.value))} min={1} max={10} />
              </div>
              <div className="space-y-2">
                <Label>Max Periods/Week</Label>
                <Input type="number" value={maxPerWeek} onChange={e => setMaxPerWeek(Number(e.target.value))} min={1} max={50} />
              </div>
            </div>

            {/* Subject-Class Mapping */}
            <div className="space-y-3">
              <Label>Subjects & Classes (select which subject this teacher teaches in which class)</Label>

              {/* Add custom subject */}
              <div className="flex gap-2">
                <Input
                  value={customSubject}
                  onChange={e => setCustomSubject(e.target.value)}
                  placeholder="Add custom subject (e.g. Regional Language)"
                  className="text-sm"
                  onKeyDown={e => e.key === 'Enter' && handleAddCustomSubject()}
                />
                <Button variant="outline" size="sm" onClick={handleAddCustomSubject} disabled={!customSubject.trim()}>
                  <Plus className="h-3 w-3 mr-1" /> Add
                </Button>
              </div>

              <div className="border rounded-lg divide-y max-h-64 overflow-y-auto">
                {allSubjects.map(subject => {
                  const isSelected = subjectClassMap.some(m => m.subject === subject);
                  const mapping = subjectClassMap.find(m => m.subject === subject);

                  return (
                    <div key={subject} className="p-3">
                      <div className="flex items-center justify-between mb-1">
                        <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={(checked) => toggleSubject(subject, !!checked)}
                          />
                          {subject}
                        </label>
                        {isSelected && (
                          <Button variant="ghost" size="sm" className="text-[10px] h-6" onClick={() => selectAllClassesForSubject(subject)}>
                            Select All Classes
                          </Button>
                        )}
                      </div>
                      {isSelected && (
                        <div className="flex flex-wrap gap-1.5 ml-6 mt-2">
                          {enabledClasses.map(c => (
                            <label key={c.classId} className="flex items-center gap-1 text-[11px] cursor-pointer bg-muted/30 px-2 py-1 rounded">
                              <Checkbox
                                className="h-3 w-3"
                                checked={mapping?.classIds.includes(c.classId) || false}
                                onCheckedChange={(checked) => toggleClassForSubject(subject, c.classId, !!checked)}
                              />
                              {c.grade}-{c.section}
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Available Days</Label>
              <div className="flex flex-wrap gap-2">
                {DAYS.map(day => (
                  <label key={day} className="flex items-center gap-1.5 text-xs cursor-pointer">
                    <Checkbox
                      checked={availDays.includes(day)}
                      onCheckedChange={(checked) => {
                        setAvailDays(prev => checked ? [...prev, day] : prev.filter(d => d !== day));
                      }}
                    />
                    {day.slice(0, 3)}
                  </label>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>{editingTeacher ? 'Update' : 'Add'} Teacher</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TeachersPage;
