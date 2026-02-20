import { CalendarDays, Users, BookOpen, Clock, AlertTriangle, CheckCircle, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { mockTeachers, mockClasses, mockTimetableVersion } from '@/data/mockData';

const stats = [
  { label: 'Classes', value: '3', icon: BookOpen, change: 'X-A, X-B, IX-A' },
  { label: 'Teachers', value: '7', icon: Users, change: '1 absent today' },
  { label: 'Active Timetable', value: 'v1', icon: CalendarDays, change: 'Score: 92%' },
  { label: 'Time Slots', value: '8+5', icon: Clock, change: 'Weekday + Saturday' },
];

const recentActivity = [
  { text: 'Timetable v1 generated for Class X-A', time: '10:30 AM', type: 'success' as const },
  { text: 'Ms. Gupta marked absent', time: '08:15 AM', type: 'warning' as const },
  { text: 'Substitution assigned: Mrs. Reddy → Period 3', time: '08:20 AM', type: 'info' as const },
  { text: 'Time slots updated for Saturday', time: 'Yesterday', type: 'neutral' as const },
];

const Dashboard = () => {
  const absentTeachers = mockTeachers.filter(t => t.isAbsent);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">Delhi Public School • CBSE • Academic Year 2025-26</p>
        </div>
        <div className="score-badge text-sm px-4 py-1.5">
          <TrendingUp className="h-4 w-4 mr-1.5" />
          Timetable Score: {mockTimetableVersion.score}%
        </div>
      </div>

      {/* Stats Grid */}
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
        {/* Absent Teachers Alert */}
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
                <CheckCircle className="h-4 w-4 text-success" />
                All teachers present
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

        {/* Recent Activity */}
        <Card className="glass-card lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentActivity.map((activity, i) => (
                <div key={i} className="flex items-start gap-3 animate-slide-in" style={{ animationDelay: `${i * 80}ms` }}>
                  <div className={`h-2 w-2 rounded-full mt-1.5 shrink-0 ${
                    activity.type === 'success' ? 'bg-success' :
                    activity.type === 'warning' ? 'bg-warning' :
                    activity.type === 'info' ? 'bg-info' : 'bg-muted-foreground/30'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground">{activity.text}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="glass-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Generate Timetable', icon: CalendarDays, href: '/timetable' },
              { label: 'Configure Slots', icon: Clock, href: '/time-slots' },
              { label: 'Handle Substitution', icon: Users, href: '/substitution' },
              { label: 'View Teachers', icon: BookOpen, href: '/teachers' },
            ].map((action) => (
              <a
                key={action.label}
                href={action.href}
                className="flex flex-col items-center gap-2 p-4 rounded-lg border border-border hover:border-primary/30 hover:bg-primary/5 transition-all group"
              >
                <action.icon className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                <span className="text-xs font-medium text-muted-foreground group-hover:text-foreground text-center transition-colors">{action.label}</span>
              </a>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
