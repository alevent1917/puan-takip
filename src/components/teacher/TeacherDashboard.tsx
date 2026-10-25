import React, { useState } from 'react';
import {
  LayoutDashboard,
  CheckSquare,
  Calendar,
  Layers,
  Users,
  FileSpreadsheet,
  Database,
  UserCheck,
} from 'lucide-react';
import { OverviewView } from './OverviewView';
import { BulkGradingView } from './BulkGradingView';
import { WeeklyActivitiesView } from './WeeklyActivitiesView';
import { ClassesSubjectsView } from './ClassesSubjectsView';
import { StudentsView } from './StudentsView';
import { ReportsView } from './ReportsView';
import { SqlSetupView } from './SqlSetupView';
import { useAuth } from '../../context/AuthContext';

type TeacherTab =
  | 'overview'
  | 'bulk-grading'
  | 'activities'
  | 'classes'
  | 'students'
  | 'reports'
  | 'sql-setup'
  | 'profile';

export const TeacherDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TeacherTab>('bulk-grading'); // Başlangıçta doğrudan en önemli ekran
  const { user } = useAuth();

  const menuItems = [
    { id: 'overview' as TeacherTab, label: 'Genel Bakış', icon: LayoutDashboard },
    { id: 'bulk-grading' as TeacherTab, label: 'Toplu Puan Girişi', icon: CheckSquare, highlight: true },
    { id: 'activities' as TeacherTab, label: 'Haftalık Çalışmalar', icon: Calendar },
    { id: 'classes' as TeacherTab, label: 'Sınıflar ve Dersler', icon: Layers },
    { id: 'students' as TeacherTab, label: 'Öğrenci Kayıtları', icon: Users },
    { id: 'reports' as TeacherTab, label: 'Puan Raporları', icon: FileSpreadsheet },
    { id: 'sql-setup' as TeacherTab, label: 'Supabase SQL Kurulumu', icon: Database },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Sol Menü (Sidebar) */}
        <aside className="lg:col-span-3 bg-white rounded-xl border border-slate-200 p-3 space-y-1">
          <div className="p-3 mb-2 border-b border-slate-100">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Öğretmen Paneli
            </div>
            <div className="text-sm font-bold text-slate-900 mt-1">
              {user ? `${user.first_name} ${user.last_name}` : 'Öğretmen'}
            </div>
            <div className="text-[11px] text-slate-500">Yetkili Yönetici</div>
          </div>

          <nav className="space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2 text-xs font-medium rounded-lg transition-colors text-left ${
                    isActive
                      ? 'bg-slate-900 text-white shadow-xs font-semibold'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                  <span className="truncate">{item.label}</span>
                  {item.highlight && !isActive && (
                    <span className="ml-auto text-[10px] text-slate-500 font-semibold">Önemli</span>
                  )}
                </button>
              );
            })}
          </nav>

          <div className="pt-4 mt-4 border-t border-slate-100 p-3 text-[11px] text-slate-500 leading-relaxed">
            💡 <strong>Yetkilendirme Güvencesi:</strong> Puan girişleri PostgreSQL RLS ve yetkili öğretmen oturumu ile korunmaktadır.
          </div>
        </aside>

        {/* Ana İçerik Görünümü */}
        <main className="lg:col-span-9">
          {activeTab === 'overview' && (
            <OverviewView
              onNavigate={(tab) => {
                if (tab === 'bulk-grading') setActiveTab('bulk-grading');
                else if (tab === 'activities') setActiveTab('activities');
                else if (tab === 'classes') setActiveTab('classes');
                else if (tab === 'students') setActiveTab('students');
                else if (tab === 'reports') setActiveTab('reports');
              }}
            />
          )}

          {activeTab === 'bulk-grading' && <BulkGradingView />}
          {activeTab === 'activities' && <WeeklyActivitiesView />}
          {activeTab === 'classes' && <ClassesSubjectsView />}
          {activeTab === 'students' && <StudentsView />}
          {activeTab === 'reports' && <ReportsView />}
          {activeTab === 'sql-setup' && <SqlSetupView />}
        </main>
      </div>
    </div>
  );
};
