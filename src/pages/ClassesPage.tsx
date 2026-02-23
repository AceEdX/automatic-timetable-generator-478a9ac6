import { useState, useMemo, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Pencil, Plus, Trash2, BookOpen, CheckCircle, AlertTriangle, Copy } from 'lucide-react';
import { useSchoolData } from '@/context/SchoolDataContext';
import { Subject, SubjectPriority } from '@/types/school';
import { toast } from 'sonner';

const ClassesPage = () => {
  const { classes, setClasses, subjects, setSubjects, teachers, weekdaySlots, saturdaySlots, getPeriodsPerWeekForClass, getAllSubjectNames } = useSchoolData();
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [subjectDialogOpen, setSubjectDialogOpen] = useState(false);
  const [ctDialogOpen, setCtDialogOpen] = useState(false);
  const [activeClassId, setActiveClassId] = useState<string | null>(null);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [activeTab, setActiveTab] = useState('classes');

  // Subject form
  const [subName, setSubName] = useState('');
  const [periodsPerWeek, setPeriodsPerWeek] = useState(5);
  const [maxPerDay, setMaxPerDay] = useState(2);
  const [isLab, setIsLab] = useState(false);
  const [needsPlayground, setNeedsPlayground] = useState(false);
  const [priority, setPriority] = useState<SubjectPriority>('Core');

  // CT form
  const [selectedCT, setSelectedCT] = useState('none');

  const weekdayPeriods = weekdaySlots.filter(s => !s.isBreak).length;
  const satPeriods = saturdaySlots.filter(s => !s.isBreak).length;
  const totalSlotsPerWeek = weekdayPeriods * 5 + satPeriods;

  const toggleClassEnabled = (classId: string) => {
    setClasses(prev => prev.map(c =>
      c.classId === classId ? { ...c, isEnabled: !c.isEnabled } : c
    ));
  };

  const openAddSubject = (classId: string) => {
    setActiveClassId(classId);
    setEditingSubject(null);
    setSubName(''); setPeriodsPerWeek(5); setMaxPerDay(2);
    setIsLab(false); setNeedsPlayground(false); setPriority('Core');
    setSubjectDialogOpen(true);
  };

  const openEditSubject = (subj: Subject) => {
    setActiveClassId(subj.classId);
    setEditingSubject(subj);
    setSubName(subj.subjectName); setPeriodsPerWeek(subj.periodsPerWeek);
    setMaxPerDay(subj.maxPerDay); setIsLab(subj.isLab);
    setNeedsPlayground(subj.needsPlayground || false); setPriority(subj.priority);
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
        periodsPerWeek, maxPerDay, isLab,
        allowDoublePeriod: isLab,
        priority,
        qualifiedTeacherIds: teachers
          .filter(t => t.subjectClassMap?.some(m => m.subject.toLowerCase() === subName.trim().toLowerCase() && m.classIds.includes(activeClassId!)))
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
    setSelectedCT(cls?.classTeacherId || 'none');
    setCtDialogOpen(true);
  };

  const handleSaveCT = () => {
    if (!activeClassId) return;
    const teacherId = selectedCT === 'none' ? '' : selectedCT;
    setClasses(prev => prev.map(c =>
      c.classId === activeClassId ? { ...c, classTeacherId: teacherId } : c
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
        <p className="text-sm text-muted-foreground mt-1">Manage classes, subjects, and check period fulfillment. Auto-synced from teacher data.</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="classes">Classes & Subjects</TabsTrigger>
          <TabsTrigger value="fulfillment">Period Fulfillment</TabsTrigger>
        </TabsList>

        <TabsContent value="classes" className="space-y-4 mt-4">
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
                    <Card key={cls.classId} className={`glass-card ${!cls.isEnabled ? 'opacity-50' : ''}`}>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-semibold flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Checkbox
                              checked={cls.isEnabled}
                              onCheckedChange={() => toggleClassEnabled(cls.classId)}
                            />
                            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                              <span className="text-xs font-bold text-primary">{cls.grade}{cls.section}</span>
                            </div>
                            Class {cls.grade}-{cls.section}
                            {!cls.isEnabled && <Badge variant="outline" className="text-[10px] border-muted-foreground/30">Disabled</Badge>}
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className={`text-[10px] ${
                              totalPeriodsPerWeek === totalSlotsPerWeek ? 'border-success/30 text-success' :
                              totalPeriodsPerWeek > totalSlotsPerWeek ? 'border-destructive/30 text-destructive' :
                              'border-warning/30 text-warning'
                            }`}>
                              {totalPeriodsPerWeek}/{totalSlotsPerWeek} periods
                            </Badge>
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
                        <div className="flex gap-2 mt-2">
                          <Button variant="outline" size="sm" className="text-xs flex-1" onClick={() => openAddSubject(cls.classId)}>
                            <Plus className="h-3 w-3 mr-1" /> Add Subject
                          </Button>
                          {(() => {
                            // Find previous class (same grade previous section, or previous grade last section)
                            const sortedClasses = classes.filter(c => c.isEnabled).sort((a, b) => parseInt(a.grade) - parseInt(b.grade) || a.section.localeCompare(b.section));
                            const idx = sortedClasses.findIndex(c => c.classId === cls.classId);
                            const prevClass = idx > 0 ? sortedClasses[idx - 1] : null;
                            if (!prevClass) return null;
                            const prevSubjects = subjects.filter(s => s.classId === prevClass.classId);
                            if (prevSubjects.length === 0) return null;
                            return (
                              <Button variant="outline" size="sm" className="text-xs" onClick={() => {
                                const existing = subjects.filter(s => s.classId === cls.classId).map(s => s.subjectName.toLowerCase());
                                const newSubs = prevSubjects
                                  .filter(ps => !existing.includes(ps.subjectName.toLowerCase()))
                                  .map(ps => {
                                    // Auto-match teachers who teach this subject for this class
                                    const matchedTeacherIds = teachers
                                      .filter(t => t.subjectClassMap?.some(m => 
                                        m.subject.toLowerCase() === ps.subjectName.toLowerCase() && m.classIds.includes(cls.classId)
                                      ))
                                      .map(t => t.teacherId);
                                    return {
                                      ...ps,
                                      subjectId: `s_${cls.classId}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
                                      classId: cls.classId,
                                      periodsPerWeek: ps.periodsPerWeek,
                                      maxPerDay: ps.maxPerDay,
                                      priority: ps.priority,
                                      isLab: ps.isLab,
                                      allowDoublePeriod: ps.allowDoublePeriod,
                                      needsPlayground: ps.needsPlayground,
                                      qualifiedTeacherIds: matchedTeacherIds,
                                    };
                                  });
                                if (newSubs.length === 0) { toast.info('All subjects already exist'); return; }
                                setSubjects(prev => [...prev, ...newSubs]);
                                toast.success(`Copied ${newSubs.length} subjects from ${prevClass.grade}-${prevClass.section}`);
                              }}>
                                <Copy className="h-3 w-3 mr-1" /> Copy from {prevClass.grade}-{prevClass.section}
                              </Button>
                            );
                          })()}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))}
        </TabsContent>

        <TabsContent value="fulfillment" className="space-y-4 mt-4">
          <Card className="glass-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Period Fulfillment Check</CardTitle>
              <p className="text-xs text-muted-foreground">
                Each class needs {totalSlotsPerWeek} periods/week ({weekdayPeriods}×5 weekdays + {satPeriods} Saturday)
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {classes.filter(c => c.isEnabled).sort((a, b) => parseInt(a.grade) - parseInt(b.grade) || a.section.localeCompare(b.section)).map(cls => {
                  const { total, available, gap } = getPeriodsPerWeekForClass(cls.classId);
                  const classSubjects = subjects.filter(s => s.classId === cls.classId);
                  const allHaveTeachers = classSubjects.every(s => s.qualifiedTeacherIds.length > 0);
                  const isFulfilled = total === available && allHaveTeachers;
                  const isOver = total > available;

                  return (
                    <div key={cls.classId} className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors">
                      <div className="flex items-center gap-3">
                        {isFulfilled ? (
                          <CheckCircle className="h-4 w-4 text-success shrink-0" />
                        ) : (
                          <AlertTriangle className={`h-4 w-4 shrink-0 ${isOver ? 'text-destructive' : 'text-warning'}`} />
                        )}
                        <div>
                          <p className="text-sm font-medium text-foreground">Class {cls.grade}-{cls.section}</p>
                          <p className="text-xs text-muted-foreground">
                            {classSubjects.length} subjects • {classSubjects.filter(s => s.qualifiedTeacherIds.length > 0).length}/{classSubjects.length} have teachers
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 text-right">
                        <div>
                          <p className="text-sm font-bold text-foreground">{total}/{available}</p>
                          <p className={`text-[10px] ${gap === 0 ? 'text-success' : gap > 0 ? 'text-warning' : 'text-destructive'}`}>
                            {gap === 0 ? 'Perfect' : gap > 0 ? `${gap} slots unfilled` : `${Math.abs(gap)} over`}
                          </p>
                        </div>
                        <Badge variant={isFulfilled ? 'default' : 'outline'}
                          className={`text-[10px] ${isFulfilled ? 'bg-success text-success-foreground' : ''}`}>
                          {isFulfilled ? 'Ready' : 'Incomplete'}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Subject Dialog */}
      <Dialog open={subjectDialogOpen} onOpenChange={setSubjectDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingSubject ? 'Edit Subject' : 'Add Subject'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2 relative">
              <Label>Subject Name</Label>
              <Input
                value={subName}
                onChange={e => { setSubName(e.target.value); setShowSuggestions(true); }}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                placeholder="e.g. Mathematics"
                autoComplete="off"
              />
              {showSuggestions && subName.trim().length > 0 && (() => {
                const allNames = getAllSubjectNames();
                const filtered = allNames.filter(n => n.toLowerCase().includes(subName.toLowerCase()) && n.toLowerCase() !== subName.toLowerCase());
                if (filtered.length === 0) return null;
                return (
                  <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border border-border rounded-md shadow-md max-h-40 overflow-y-auto">
                    {filtered.map(name => (
                      <button
                        key={name}
                        className="w-full text-left px-3 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
                        onMouseDown={(e) => { e.preventDefault(); setSubName(name); setShowSuggestions(false); }}
                      >
                        {name}
                      </button>
                    ))}
                  </div>
                );
              })()}
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
                <SelectItem value="none">None</SelectItem>
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
