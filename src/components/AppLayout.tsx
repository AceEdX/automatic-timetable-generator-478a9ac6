import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Clock,
  CalendarDays,
  Users,
  UserCheck,
  GraduationCap,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  Settings,
  LogOut,
} from 'lucide-react';
import { useSchoolData } from '@/context/SchoolDataContext';
import { useAuth } from '@/hooks/useAuth';

const navItems = [
  { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/school-settings', icon: Settings, label: 'School Settings' },
  { path: '/time-slots', icon: Clock, label: 'Time Slots' },
  { path: '/teachers', icon: Users, label: 'Teachers' },
  { path: '/classes', icon: BookOpen, label: 'Classes' },
  { path: '/timetable', icon: CalendarDays, label: 'Timetable' },
  { path: '/substitution', icon: UserCheck, label: 'Substitution' },
];

interface AppLayoutProps {
  children: React.ReactNode;
}

const AppLayout = ({ children }: AppLayoutProps) => {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const { school } = useSchoolData();
  const { signOut, user } = useAuth();

  return (
    <div className="flex h-screen overflow-hidden">
      <aside
        className={`${
          collapsed ? 'w-16' : 'w-60'
        } flex flex-col bg-sidebar text-sidebar-foreground transition-all duration-300 ease-in-out relative`}
      >
        <div className="flex items-center gap-3 px-4 py-5 border-b border-sidebar-border">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sidebar-primary shrink-0">
            <GraduationCap className="h-5 w-5 text-sidebar-primary-foreground" />
          </div>
          {!collapsed && (
            <div className="animate-fade-in">
              <h1 className="text-sm font-bold tracking-wide text-sidebar-foreground">AceEdX</h1>
              <p className="text-[10px] text-sidebar-foreground/60">Timetable System</p>
            </div>
          )}
        </div>

        <nav className="flex-1 py-4 px-2 space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 group ${
                  isActive
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                    : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
                }`}
              >
                <item.icon className={`h-4.5 w-4.5 shrink-0 ${isActive ? 'text-sidebar-primary' : ''}`} />
                {!collapsed && <span className="animate-fade-in">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {!collapsed && (
          <div className="p-4 border-t border-sidebar-border animate-fade-in">
            <div className="text-[11px] text-sidebar-foreground/50">
              <p className="font-medium text-sidebar-foreground/70">{school.schoolName}</p>
              <p>{school.boardType} • {school.academicYear}</p>
              {user && <p className="mt-1 truncate">{user.email}</p>}
            </div>
            <button
              onClick={signOut}
              className="mt-2 flex items-center gap-2 text-xs text-sidebar-foreground/60 hover:text-sidebar-foreground transition-colors"
            >
              <LogOut className="h-3 w-3" /> Sign Out
            </button>
          </div>
        )}

        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-8 h-6 w-6 rounded-full bg-card border border-border flex items-center justify-center shadow-sm hover:shadow-md transition-shadow"
        >
          {collapsed ? (
            <ChevronRight className="h-3 w-3 text-foreground" />
          ) : (
            <ChevronLeft className="h-3 w-3 text-foreground" />
          )}
        </button>
      </aside>

      <main className="flex-1 overflow-auto bg-background">
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
};

export default AppLayout;
