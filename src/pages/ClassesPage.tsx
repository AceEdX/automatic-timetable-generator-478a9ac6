import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Pencil, Plus, Trash2, BookOpen } from 'lucide-react';
import { useSchoolData } from '@/context/SchoolDataContext';
import { Subject, SubjectPriority } from '@/types/school';
import { toast } from 'sonner';

const ClassesPage = () => {
  const { classes, setClasses, subjects, setSubjects, teachers } = useSchoolData();
  const [subjectDialogOpen, setSubjectDialogOpen] = useState(false);
  const [ctDialogOpen, setCtDialogOpen] = useState(false);
  const [activeClassId, setActiveClassId] = useState<string | null>(null);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);

  // Subject form
  const [subName, setSubName] = useState('');
  const [periodsPerWeek, setPeriodsPerWeek] = useState(5);
  const [maxPerDay, setMaxPerDay] = useState(2);
  const [isLab, setIsLab] = useState(false);
  const [needsPlayground, setNeedsPlayground] = useState(false);
  const [priority, setPriority] = useState<SubjectPriority>('Core');

  // CT form
  const [selectedCT, setSelectedCT] = useState('');

  const openAddSubject = (classId: string) => {
    setActiveClassId(classId);
    setEditingSubject(null);
    setSubName('');
    setPeriodsPerWeek(5);
    setMaxPerDay(2);
    setIsLab(false);
    setNeedsPlayground(false);
    setPriority('Core');
    setSubjectDialogOpen(true);
  };

  const openEditSubject = (subj: Subject) => {
    setActiveClassId(subj.classId);
    setEditingSubject(subj);
    setSubName(subj.subjectName);
    setPeriodsPerWeek(subj.periodsPerWeek);
    setMaxPerDay(subj.maxPerDay);
    setIsLab(subj.isLab);
    setNeedsPlayground(subj.needsPlayground || false);
    setPriority(subj.priority);
    setSubjectDialogOpen(true);
  };

  const handleSaveSubject = () => {
    if (!subName.trim() || !activeClassId) return;

    if (editingSubject) {
      setSubjects(prev => prev.map(s =>
        s.subjectId === editingSubject.subjectId
          ? { ...s, subjectName: subName.trim(), periodsPerWeek, maxPerDay, isLab, needsPlayground, priority, allowDoublePeriod: isLab }
          : s
      ));
      toast.success('Subject updated');
    } else {
      const newSubject: Subject = {
        subjectId: `s_${activeClassId}_${Date.now()}`,
        classId: activeClassId,
        subjectName: subName.trim(),
        periodsPerWeek,
        maxPerDay,
        isLab,
        allowDoublePeriod: isLab,
        priority,
        qualifiedTeacherIds: teachers
          .filter(t => t.subjectsCanTeach.some(s => s.toLowerCase() === subName.trim().toLowerCase()) && t.classesHandled.includes(activeClassId))
          .map(t => t.teacherId),
        needsPlayground,
      };
      setSubjects(prev => [...prev, newSubject]);
      toast.success('Subject added');
    }
    setSubjectDialogOpen(false);
  };

  const handleDeleteSubject = (subjectId: string) => {
    setSubjects(prev => prev.filter(s => s.subjectId !== subjectId));
    toast.success('Subject removed');
  };

  const openCTDialog = (classId: string) => {
    setActiveClassId(classId);
    const cls = classes.find(c => c.classId === classId);
    setSelectedCT(cls?.classTeacherId || '');
    setCtDialogOpen(true);
  };

  const handleSaveCT = () => {
    if (!activeClassId) return;
    setClasses(prev => prev.map(c =>
      c.classId === activeClassId ? { ...c, classTeacherId: selectedCT } : c
    ));
    toast.success('Class teacher assigned');
    setCtDialogOpen(false);
  };

  // Group classes by grade
  const gradeGroups = classes.reduce((acc, cls) => {
    if (!acc[cls.grade]) acc[cls.grade] = [];
    acc[cls.grade].push(cls);
    return acc;
  }, {} as Record<string, typeof classes>);

  const sortedGrades = Object.keys(gradeGroups).sort((a, b) => parseInt(a) - parseInt(b));

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Classes & Subjects</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage all classes (Grade 1-10), subjects, and teacher assignments</p>
      </div>

      {sortedGrades.map(grade => (
        <div key={grade} className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-primary" />
            Grade {grade}
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {gradeGroups[grade].map(cls => {
              const classSubjects = subjects.filter(s => s.classId === cls.classId);
              const classTeacher = teachers.find(t => t.teacherId === cls.classTeacherId);
              const totalPeriodsPerWeek = classSubjects.reduce((sum, s) => sum + s.periodsPerWeek, 0);

              return (
                <Card key={cls.classId} className="glass-card">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                          <span className="text-xs font-bold text-primary">{cls.grade}{cls.section}</span>
                        </div>
                        Class {cls.grade}-{cls.section}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px]">{totalPeriodsPerWeek} periods/week</Badge>
                        <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => openCTDialog(cls.classId)}>
                          {classTeacher ? `CT: ${classTeacher.name}` : 'Assign CT'}
                        </Button>
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-2">
                    {classSubjects.length === 0 ? (
                      <p className="text-xs text-muted-foreground py-2">No subjects added</p>
                    ) : (
                      <div className="space-y-1.5">
                        {classSubjects.map(s => {
                          const assignedTeachers = s.qualifiedTeacherIds
                            .map(tid => teachers.find(t => t.teacherId === tid)?.name)
                            .filter(Boolean);

                          return (
                            <div key={s.subjectId} className="flex items-center justify-between p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors group">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-medium text-foreground">{s.subjectName}</span>
                                <Badge variant="outline" className="text-[9px] h-4">{s.periodsPerWeek}/w</Badge>
                                {s.isLab && <Badge variant="outline" className="text-[9px] h-4 border-info/30 text-info">Lab</Badge>}
                                {s.needsPlayground && <Badge variant="outline" className="text-[9px] h-4 border-success/30 text-success">Ground</Badge>}
                              </div>
                              <div className="flex items-center gap-1">
                                <span className="text-[10px] text-muted-foreground">
                                  {assignedTeachers.length > 0 ? assignedTeachers.join(', ') : <span className="text-warning">No teacher</span>}
                                </span>
                                <button onClick={() => openEditSubject(s)} className="p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Pencil className="h-3 w-3 text-muted-foreground" />
                                </button>
                                <button onClick={() => handleDeleteSubject(s.subjectId)} className="p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Trash2 className="h-3 w-3 text-destructive" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    <Button variant="outline" size="sm" className="text-xs mt-2 w-full" onClick={() => openAddSubject(cls.classId)}>
                      <Plus className="h-3 w-3 mr-1" /> Add Subject
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      ))}

      {/* Subject Dialog */}
      <Dialog open={subjectDialogOpen} onOpenChange={setSubjectDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingSubject ? 'Edit Subject' : 'Add Subject'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Subject Name</Label>
              <Input value={subName} onChange={e => setSubName(e.target.value)} placeholder="e.g. Mathematics" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Periods/Week</Label>
                <Input type="number" value={periodsPerWeek} onChange={e => setPeriodsPerWeek(Number(e.target.value))} min={1} max={12} />
              </div>
              <div className="space-y-2">
                <Label>Max/Day</Label>
                <Input type="number" value={maxPerDay} onChange={e => setMaxPerDay(Number(e.target.value))} min={1} max={4} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={priority} onValueChange={v => setPriority(v as SubjectPriority)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Core">Core</SelectItem>
                  <SelectItem value="Elective">Elective</SelectItem>
                  <SelectItem value="Activity">Activity</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={isLab} onChange={e => setIsLab(e.target.checked)} className="rounded" />
                Needs Lab
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={needsPlayground} onChange={e => setNeedsPlayground(e.target.checked)} className="rounded" />
                Needs Playground
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSubjectDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveSubject}>{editingSubject ? 'Update' : 'Add'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Class Teacher Dialog */}
      <Dialog open={ctDialogOpen} onOpenChange={setCtDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Assign Class Teacher</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Select value={selectedCT} onValueChange={setSelectedCT}>
              <SelectTrigger><SelectValue placeholder="Select teacher" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">None</SelectItem>
                {teachers.map(t => (
                  <SelectItem key={t.teacherId} value={t.teacherId}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCtDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveCT}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ClassesPage;
