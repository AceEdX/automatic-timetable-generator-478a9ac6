import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Save, School } from 'lucide-react';
import { useSchoolData } from '@/context/SchoolDataContext';
import { BoardType } from '@/types/school';
import { toast } from 'sonner';

const SchoolSettingsPage = () => {
  const { school, setSchool } = useSchoolData();
  const [name, setName] = useState(school.schoolName);
  const [board, setBoard] = useState<BoardType>(school.boardType);
  const [year, setYear] = useState(school.academicYear);

  const handleSave = () => {
    setSchool(prev => ({ ...prev, schoolName: name, boardType: board, academicYear: year }));
    toast.success('School information updated');
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">School Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">Edit your school's basic information</p>
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
    </div>
  );
};

export default SchoolSettingsPage;
