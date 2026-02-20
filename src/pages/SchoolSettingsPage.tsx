import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Save, School, Plus, Trash2 } from 'lucide-react';
import { useSchoolData } from '@/context/SchoolDataContext';
import { BoardType } from '@/types/school';
import { ALL_GRADES } from '@/data/mockData';
import { toast } from 'sonner';

const SchoolSettingsPage = () => {
  const { school, setSchool, updateDivisions } = useSchoolData();
  const [name, setName] = useState(school.schoolName);
  const [board, setBoard] = useState<BoardType>(school.boardType);
  const [year, setYear] = useState(school.academicYear);

  const handleSave = () => {
    setSchool(prev => ({ ...prev, schoolName: name, boardType: board, academicYear: year }));
    toast.success('School information updated');
  };

  const addDivision = (grade: string) => {
    const current = school.divisionsPerGrade[grade] || ['A'];
    const nextLetter = String.fromCharCode(65 + current.length); // A=65
    if (current.length >= 10) { toast.error('Max 10 divisions per grade'); return; }
    updateDivisions(grade, [...current, nextLetter]);
    toast.success(`Added division ${nextLetter} to Grade ${grade}`);
  };

  const removeDivision = (grade: string) => {
    const current = school.divisionsPerGrade[grade] || ['A'];
    if (current.length <= 1) { toast.error('Must have at least 1 division'); return; }
    updateDivisions(grade, current.slice(0, -1));
    toast.success(`Removed last division from Grade ${grade}`);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">School Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">Edit school information and configure divisions per grade</p>
        </div>
        <Button className="gap-2" onClick={handleSave}>
          <Save className="h-4 w-4" /> Save Changes
        </Button>
      </div>

      <Card className="glass-card max-w-2xl">
        <CardHeader className="pb-4">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <School className="h-4 w-4 text-primary" /> School Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label className="text-sm">School Name</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Enter school name" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm">Board Type</Label>
              <Select value={board} onValueChange={(v) => setBoard(v as BoardType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="CBSE">CBSE</SelectItem>
                  <SelectItem value="ICSE">ICSE</SelectItem>
                  <SelectItem value="STATE">State Board</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Academic Year</Label>
              <Input value={year} onChange={e => setYear(e.target.value)} placeholder="e.g. 2025-26" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardHeader className="pb-4">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <School className="h-4 w-4 text-primary" /> Divisions per Grade
          </CardTitle>
          <p className="text-xs text-muted-foreground">Add or remove divisions (sections) for each grade. Classes & subjects auto-update.</p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {ALL_GRADES.map(grade => {
              const sections = school.divisionsPerGrade[grade] || ['A', 'B'];
              return (
                <div key={grade} className="flex items-center justify-between p-3 rounded-lg border border-border">
                  <div>
                    <p className="text-sm font-medium text-foreground">Grade {grade}</p>
                    <div className="flex gap-1 mt-1">
                      {sections.map(s => (
                        <Badge key={s} variant="outline" className="text-[10px]">{grade}-{s}</Badge>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => addDivision(grade)}>
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive" onClick={() => removeDivision(grade)} disabled={sections.length <= 1}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SchoolSettingsPage;
