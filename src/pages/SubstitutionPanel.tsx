import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { AlertTriangle, UserCheck, ChevronRight, Sparkles } from 'lucide-react';
import { useSchoolData } from '@/context/SchoolDataContext';
import { toast } from 'sonner';

const SubstitutionPanel = () => {
  const { teachers, subjects, assignSubstitute, timetableVersion, classes } = useSchoolData();
  const absentTeachers = teachers.filter(t => t.isAbsent);

  const getSuggestions = (absentTeacher: typeof teachers[0]) => {
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long' }) as any;
    const absentEntries = timetableVersion.entries.filter(e => e.teacherId === absentTeacher.teacherId && e.day === today);
    if (absentEntries.length === 0) return [];

    // Find free teachers for each period
    return teachers
      .filter(t => !t.isAbsent && t.teacherId !== absentTeacher.teacherId)
      .map(t => {
        const busyPeriods = timetableVersion.entries.filter(e => e.teacherId === t.teacherId && e.day === today).map(e => e.period);
        const freePeriods = absentEntries.filter(e => !busyPeriods.includes(e.period));
        const subjectMatch = t.subjectsCanTeach.some(s => absentTeacher.subjectsCanTeach.includes(s));
        const load = busyPeriods.length;
        const compatibility = subjectMatch ? 80 + Math.max(0, 20 - load * 3) : 40 + Math.max(0, 20 - load * 3);

        return {
          teacherId: t.teacherId,
          teacherName: t.name,
          reason: subjectMatch ? 'Same subject expertise, available' : 'Available this period, different subject',
          compatibility: Math.min(100, Math.max(10, compatibility)),
          currentLoad: load,
          freePeriods: freePeriods.length,
        };
      })
      .filter(s => s.freePeriods > 0)
      .sort((a, b) => b.compatibility - a.compatibility)
      .slice(0, 3);
  };

  const handleAssign = (absentTeacherId: string, substituteId: string, substituteName: string) => {
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long' }) as any;
    const entries = timetableVersion.entries.filter(e => e.teacherId === absentTeacherId && e.day === today);
    entries.forEach(entry => {
      assignSubstitute(absentTeacherId, substituteId, entry.day, entry.period);
    });
    toast.success(`${substituteName} assigned as substitute`);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Substitution Management</h1>
        <p className="text-sm text-muted-foreground mt-1">Handle teacher absences with smart substitute suggestions</p>
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
            <p className="text-sm text-muted-foreground mt-1">No substitutions needed today. Mark teachers absent from the Teachers page.</p>
          </CardContent>
        </Card>
      ) : (
        absentTeachers.map((teacher) => {
          const suggestions = getSuggestions(teacher);
          return (
            <Card key={teacher.teacherId} className="glass-card overflow-hidden">
              <CardHeader className="pb-3 bg-warning/5 border-b border-warning/10">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-warning" />
                  {teacher.name} — Absent Today
                  <Badge variant="outline" className="ml-auto text-[10px] border-warning/30 text-warning">
                    {teacher.subjectsCanTeach.join(', ')}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="h-4 w-4 text-accent" />
                  <span className="text-xs font-medium text-muted-foreground">Substitute Suggestions</span>
                </div>

                {suggestions.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No suitable substitutes found for today's periods</p>
                ) : (
                  suggestions.map((suggestion, i) => (
                    <div key={suggestion.teacherId} className="flex items-center gap-4 p-3 rounded-lg border border-border hover:border-primary/20 transition-all group">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                        #{i + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground">{suggestion.teacherName}</p>
                        <p className="text-xs text-muted-foreground">{suggestion.reason}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-muted-foreground">Match</span>
                          <Progress value={suggestion.compatibility} className="w-16 h-1.5" />
                          <span className="text-xs font-bold text-foreground">{suggestion.compatibility}%</span>
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-0.5">Load: {suggestion.currentLoad} periods</p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs"
                        onClick={() => handleAssign(teacher.teacherId, suggestion.teacherId, suggestion.teacherName)}
                      >
                        Assign <ChevronRight className="h-3 w-3 ml-1" />
                      </Button>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );
};

export default SubstitutionPanel;
