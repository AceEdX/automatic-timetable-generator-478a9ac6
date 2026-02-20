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
import { Teacher, Day, TeacherRole } from '@/types/school';
import { DAYS, ALL_GRADES, ALL_SECTIONS } from '@/data/mockData';
import { toast } from 'sonner';

const AVAILABLE_SUBJECTS = [
  'English', 'Mathematics', 'Hindi', 'Science', 'Social Science',
  'Computer Science', 'Physical Education', 'Art', 'EVS', 'Sanskrit',
  'Music', 'Geography', 'History', 'Physics', 'Chemistry', 'Biology',
];

const TeachersPage = () => {
  const { teachers, setTeachers, classes, subjects, setSubjects, getTeacherWeeklyPeriods } = useSchoolData();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [role, setRole] = useState<TeacherRole>('SubjectTeacher');
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  const [maxPerDay, setMaxPerDay] = useState(6);
  const [maxPerWeek, setMaxPerWeek] = useState(30);
  const [availDays, setAvailDays] = useState<Day[]>([...DAYS]);

  const resetForm = () => {
    setName('');
    setRole('SubjectTeacher');
    setSelectedSubjects([]);
    setSelectedClasses([]);
    setMaxPerDay(6);
    setMaxPerWeek(30);
    setAvailDays([...DAYS]);
    setEditingTeacher(null);
  };

  const openAdd = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEdit = (t: Teacher) => {
    setEditingTeacher(t);
    setName(t.name);
    setRole(t.teacherRole);
    setSelectedSubjects(t.subjectsCanTeach);
    setSelectedClasses(t.classesHandled);
    setMaxPerDay(t.maxPeriodsPerDay);
    setMaxPerWeek(t.maxPeriodsPerWeek);
    setAvailDays(t.availableDays);
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!name.trim()) { toast.error('Enter teacher name'); return; }
    if (selectedSubjects.length === 0) { toast.error('Select at least one subject'); return; }
    if (selectedClasses.length === 0) { toast.error('Select at least one class'); return; }

    if (editingTeacher) {
      const updated: Teacher = {
        ...editingTeacher,
        name: name.trim(),
        teacherRole: role,
        subjectsCanTeach: selectedSubjects,
        classesHandled: selectedClasses,
        maxPeriodsPerDay: maxPerDay,
        maxPeriodsPerWeek: maxPerWeek,
        availableDays: availDays,
      };
      setTeachers(prev => prev.map(t => t.teacherId === updated.teacherId ? updated : t));

      // Auto-sync: update subject qualified teacher IDs
      setSubjects(prev => prev.map(s => {
        const classHandled = selectedClasses.includes(s.classId);
        const subjectMatch = selectedSubjects.some(sub =>
          s.subjectName.toLowerCase() === sub.toLowerCase()
        );
        if (classHandled && subjectMatch) {
          if (!s.qualifiedTeacherIds.includes(updated.teacherId)) {
            return { ...s, qualifiedTeacherIds: [...s.qualifiedTeacherIds, updated.teacherId] };
          }
        } else {
          return { ...s, qualifiedTeacherIds: s.qualifiedTeacherIds.filter(id => id !== updated.teacherId) };
        }
        return s;
      }));

      toast.success('Teacher updated');
    } else {
      const newTeacher: Teacher = {
        teacherId: `t_${Date.now()}`,
        schoolId: 's1',
        name: name.trim(),
        teacherRole: role,
        subjectsCanTeach: selectedSubjects,
        classesHandled: selectedClasses,
        maxPeriodsPerDay: maxPerDay,
        maxPeriodsPerWeek: maxPerWeek,
        availableDays: availDays,
        isAbsent: false,
      };
      setTeachers(prev => [...prev, newTeacher]);

      // Auto-sync subjects
      setSubjects(prev => prev.map(s => {
        const classHandled = selectedClasses.includes(s.classId);
        const subjectMatch = selectedSubjects.some(sub =>
          s.subjectName.toLowerCase() === sub.toLowerCase()
        );
        if (classHandled && subjectMatch && !s.qualifiedTeacherIds.includes(newTeacher.teacherId)) {
          return { ...s, qualifiedTeacherIds: [...s.qualifiedTeacherIds, newTeacher.teacherId] };
        }
        return s;
      }));

      toast.success('Teacher added');
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

  const allClassOptions = classes.map(c => ({ id: c.classId, label: `${c.grade}-${c.section}` }));

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Teachers</h1>
          <p className="text-sm text-muted-foreground mt-1">Add and manage teachers, their subjects, classes, and workload</p>
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
            <p className="text-sm text-muted-foreground mt-1">Click "Add Teacher" to start adding teachers to your school</p>
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
                        <p className="text-sm font-semibold text-foreground">{teacher.name}</p>
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
                    <button
                      onClick={() => toggleAbsent(teacher.teacherId)}
                      className={`text-[10px] px-2 py-0.5 rounded-full border cursor-pointer transition-colors ${
                        teacher.isAbsent ? 'border-warning/30 text-warning bg-warning/10' : 'border-success/30 text-success bg-success/10'
                      }`}
                    >
                      {teacher.isAbsent ? 'Absent' : 'Present'}
                    </button>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Subjects</span>
                      <span className="font-medium text-foreground text-right max-w-[60%]">{teacher.subjectsCanTeach.join(', ')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Classes</span>
                      <span className="font-medium text-foreground text-right max-w-[60%]">
                        {teacher.classesHandled.map(cid => {
                          const c = classes.find(cl => cl.classId === cid);
                          return c ? `${c.grade}-${c.section}` : cid;
                        }).join(', ')}
                      </span>
                    </div>
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
                      <Badge variant="secondary" className="text-xs font-bold">{total}</Badge>
                    </div>
                  </div>

                  {breakdown.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-border">
                      <p className="text-[10px] uppercase tracking-wider font-medium text-muted-foreground mb-2">Teaching Assignments</p>
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
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingTeacher ? 'Edit Teacher' : 'Add New Teacher'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Teacher Name</Label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Mrs. Sharma" />
            </div>

            <div className="grid grid-cols-2 gap-4">
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
              <div className="space-y-2">
                <Label>Max Periods/Day</Label>
                <Input type="number" value={maxPerDay} onChange={e => setMaxPerDay(Number(e.target.value))} min={1} max={10} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Max Periods/Week</Label>
              <Input type="number" value={maxPerWeek} onChange={e => setMaxPerWeek(Number(e.target.value))} min={1} max={50} />
            </div>

            <div className="space-y-2">
              <Label>Subjects Can Teach</Label>
              <div className="flex flex-wrap gap-2 p-3 border rounded-lg bg-muted/30 max-h-32 overflow-y-auto">
                {AVAILABLE_SUBJECTS.map(sub => (
                  <label key={sub} className="flex items-center gap-1.5 text-xs cursor-pointer">
                    <Checkbox
                      checked={selectedSubjects.includes(sub)}
                      onCheckedChange={(checked) => {
                        setSelectedSubjects(prev => checked ? [...prev, sub] : prev.filter(s => s !== sub));
                      }}
                    />
                    {sub}
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Classes Handled (Grade 1-10)</Label>
              <div className="flex flex-wrap gap-2 p-3 border rounded-lg bg-muted/30 max-h-40 overflow-y-auto">
                {allClassOptions.map(opt => (
                  <label key={opt.id} className="flex items-center gap-1.5 text-xs cursor-pointer">
                    <Checkbox
                      checked={selectedClasses.includes(opt.id)}
                      onCheckedChange={(checked) => {
                        setSelectedClasses(prev => checked ? [...prev, opt.id] : prev.filter(c => c !== opt.id));
                      }}
                    />
                    {opt.label}
                  </label>
                ))}
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
