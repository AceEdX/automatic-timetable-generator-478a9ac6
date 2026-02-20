import { CalendarDays, Users, BookOpen, Clock, AlertTriangle, CheckCircle, TrendingUp, Settings } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useSchoolData } from '@/context/SchoolDataContext';
import { Link } from 'react-router-dom';

const Dashboard = () => {
  const { school, teachers, classes, subjects, timetableVersion, weekdaySlots, saturdaySlots } = useSchoolData();
  const absentTeachers = teachers.filter(t => t.isAbsent);
  const weekdayPeriods = weekdaySlots.filter(s => !s.isBreak).length;
  const satPeriods = saturdaySlots.filter(s => !s.isBreak).length;
  const assignedSubjects = subjects.filter(s => s.qualifiedTeacherIds.length > 0).length;

  const stats = [
    { label: 'Classes', value: String(classes.length), icon: BookOpen, change: `Grades 1-10` },
    { label: 'Teachers', value: String(teachers.length), icon: Users, change: `${absentTeachers.length} absent today` },
    { label: 'Timetable', value: timetableVersion.entries.length > 0 ? `${timetableVersion.score}%` : '—', icon: CalendarDays, change: timetableVersion.entries.length > 0 ? timetableVersion.status : 'Not generated' },
    { label: 'Time Slots', value: `${weekdayPeriods}+${satPeriods}`, icon: Clock, change: 'Weekday + Saturday' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">{school.schoolName} • {school.boardType} • {school.academicYear}</p>
        </div>
        {timetableVersion.score > 0 && (
          <div className="score-badge text-sm px-4 py-1.5">
            <TrendingUp className="h-4 w-4 mr-1.5" />
            Score: {timetableVersion.score}%
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="glass-card hover:shadow-md transition-shadow">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{stat.label}</p>
                  <p className="text-2xl font-bold text-foreground mt-1">{stat.value}</p>
                  <p className="text-xs text-muted-foreground mt-1">{stat.change}</p>
                </div>
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <stat.icon className="h-5 w-5 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="glass-card lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-warning" />
              Absent Teachers
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {absentTeachers.length === 0 ? (
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-success" /> All teachers present
              </p>
            ) : (
              absentTeachers.map((teacher) => (
                <div key={teacher.teacherId} className="flex items-center justify-between p-3 rounded-lg bg-warning/5 border border-warning/15">
                  <div>
                    <p className="text-sm font-medium text-foreground">{teacher.name}</p>
                    <p className="text-xs text-muted-foreground">{teacher.subjectsCanTeach.join(', ')}</p>
                  </div>
                  <Badge variant="outline" className="border-warning/30 text-warning text-[10px]">Absent</Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="glass-card lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Setup Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { label: 'Time Slots Configured', done: weekdayPeriods > 0, detail: `${weekdayPeriods} weekday, ${satPeriods} Saturday`, href: '/time-slots' },
                { label: 'Teachers Added', done: teachers.length > 0, detail: `${teachers.length} teachers`, href: '/teachers' },
                { label: 'Subjects Assigned to Teachers', done: assignedSubjects > 0, detail: `${assignedSubjects}/${subjects.length} subjects have teachers`, href: '/classes' },
                { label: 'Timetable Generated', done: timetableVersion.entries.length > 0, detail: timetableVersion.entries.length > 0 ? `Score: ${timetableVersion.score}%` : 'Not yet', href: '/timetable' },
              ].map((item, i) => (
                <Link key={i} to={item.href} className="flex items-center gap-3 p-3 rounded-lg border border-border hover:border-primary/30 hover:bg-primary/5 transition-all">
                  {item.done ? (
                    <CheckCircle className="h-4 w-4 text-success shrink-0" />
                  ) : (
                    <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/30 shrink-0" />
                  )}
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">{item.label}</p>
                    <p className="text-xs text-muted-foreground">{item.detail}</p>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="glass-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {[
              { label: 'School Settings', icon: Settings, href: '/school-settings' },
              { label: 'Configure Slots', icon: Clock, href: '/time-slots' },
              { label: 'Manage Teachers', icon: Users, href: '/teachers' },
              { label: 'Classes & Subjects', icon: BookOpen, href: '/classes' },
              { label: 'Generate Timetable', icon: CalendarDays, href: '/timetable' },
            ].map((action) => (
              <Link
                key={action.label}
                to={action.href}
                className="flex flex-col items-center gap-2 p-4 rounded-lg border border-border hover:border-primary/30 hover:bg-primary/5 transition-all group"
              >
                <action.icon className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                <span className="text-xs font-medium text-muted-foreground group-hover:text-foreground text-center transition-colors">{action.label}</span>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
