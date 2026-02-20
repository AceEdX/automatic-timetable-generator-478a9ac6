import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useSchoolData } from '@/context/SchoolDataContext';

const TeachersPage = () => {
  const { teachers, getTeacherWeeklyPeriods, classes } = useSchoolData();

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Teachers</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage teacher profiles, availability, and workload</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {teachers.map((teacher) => {
          const { total, breakdown } = getTeacherWeeklyPeriods(teacher.teacherId);
          const classTeacherOf = classes.find(c => c.classTeacherId === teacher.teacherId);

          return (
            <Card key={teacher.teacherId} className={`glass-card hover:shadow-md transition-all ${teacher.isAbsent ? 'ring-2 ring-warning/30' : ''}`}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                      {teacher.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{teacher.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {teacher.teacherRole === 'ClassTeacher' ? 'Class Teacher' : 'Subject Teacher'}
                        {classTeacherOf && <span className="text-primary"> • CT of {classTeacherOf.grade}-{classTeacherOf.section}</span>}
                      </p>
                    </div>
                  </div>
                  {teacher.isAbsent ? (
                    <Badge variant="outline" className="border-warning/30 text-warning text-[10px]">Absent</Badge>
                  ) : (
                    <Badge variant="outline" className="border-success/30 text-success text-[10px]">Present</Badge>
                  )}
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subjects</span>
                    <span className="font-medium text-foreground">{teacher.subjectsCanTeach.join(', ')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Max/Day</span>
                    <span className="font-medium text-foreground">{teacher.maxPeriodsPerDay} periods</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Max/Week</span>
                    <span className="font-medium text-foreground">{teacher.maxPeriodsPerWeek} periods</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Available</span>
                    <span className="font-medium text-foreground">{teacher.availableDays.length} days</span>
                  </div>
                  <div className="flex justify-between items-center pt-1 border-t border-border">
                    <span className="text-muted-foreground font-medium">Total Periods/Week</span>
                    <Badge variant="secondary" className="text-xs font-bold">{total}</Badge>
                  </div>
                </div>

                {/* Class-Subject Breakdown */}
                {breakdown.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-border">
                    <p className="text-[10px] uppercase tracking-wider font-medium text-muted-foreground mb-2">Teaching Assignments</p>
                    <div className="space-y-1">
                      {breakdown.map((b, i) => (
                        <div key={i} className="flex items-center justify-between text-xs">
                          <span className="text-foreground">
                            <span className="font-medium">{b.subjectName}</span>
                            <span className="text-muted-foreground"> → Class {b.className}</span>
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
    </div>
  );
};

export default TeachersPage;
