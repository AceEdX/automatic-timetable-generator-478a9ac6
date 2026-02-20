import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { mockClasses, mockTeachers, mockSubjects } from '@/data/mockData';

const ClassesPage = () => {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Classes</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage class sections and subject assignments</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {mockClasses.map((cls) => {
          const classTeacher = mockTeachers.find(t => t.teacherId === cls.classTeacherId);
          const subjects = mockSubjects.filter(s => s.classId === cls.classId);

          return (
            <Card key={cls.classId} className="glass-card hover:shadow-md transition-all">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                      <span className="text-lg font-bold text-primary">{cls.grade}</span>
                    </div>
                    <div>
                      <p className="text-base font-semibold text-foreground">Class {cls.grade}-{cls.section}</p>
                      <p className="text-xs text-muted-foreground">CT: {classTeacher?.name || 'Unassigned'}</p>
                    </div>
                  </div>
                </div>

                {subjects.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-[10px] uppercase tracking-wider font-medium text-muted-foreground mb-2">Subjects</p>
                    <div className="flex flex-wrap gap-1.5">
                      {subjects.map(s => (
                        <Badge key={s.subjectId} variant="outline" className="text-[10px]">
                          {s.subjectName}
                          <span className="ml-1 opacity-60">{s.periodsPerWeek}/w</span>
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default ClassesPage;
