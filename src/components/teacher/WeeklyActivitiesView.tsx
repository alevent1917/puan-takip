import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { WeeklyActivity, ClassItem, SubjectItem } from '../../types/database';
import { mockDb, isLiveSupabaseActive, supabase } from '../../lib/supabaseClient';
import { Plus, Calendar, CheckCircle2, AlertCircle } from 'lucide-react';

export const WeeklyActivitiesView: React.FC = () => {
  const { user } = useAuth();
  const isLive = isLiveSupabaseActive();

  const [activities, setActivities] = useState<WeeklyActivity[]>(mockDb.getActivities());
  const classes = mockDb.getClasses();
  const subjects = mockDb.getSubjects();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [classId, setClassId] = useState(classes[0]?.id || '');
  const [subjectId, setSubjectId] = useState(subjects[0]?.id || '');
  const [weekNumber, setWeekNumber] = useState<number>(5);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [activityDate, setActivityDate] = useState(new Date().toISOString().split('T')[0]);
  const [maxScore, setMaxScore] = useState<number>(100);

  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setStatusMsg({ type: 'error', message: 'Lütfen çalışma başlığı giriniz.' });
      return;
    }
    if (maxScore <= 0) {
      setStatusMsg({ type: 'error', message: 'Maksimum puan 0\'dan büyük olmalıdır.' });
      return;
    }

    try {
      if (isLive && supabase && user) {
        const { data, error } = await supabase.from('weekly_activities').insert({
          class_id: classId,
          subject_id: subjectId,
          week_number: Number(weekNumber),
          title: title.trim(),
          description: description.trim() || null,
          activity_date: activityDate,
          max_score: Number(maxScore),
          teacher_id: user.id,
        }).select().single();

        if (error) throw error;
        if (data) {
          setActivities((prev) => [data as WeeklyActivity, ...prev]);
        }
      } else {
        const newAct = mockDb.addActivity({
          class_id: classId,
          subject_id: subjectId,
          week_number: Number(weekNumber),
          title: title.trim(),
          description: description.trim() || null,
          activity_date: activityDate,
          max_score: Number(maxScore),
          teacher_id: user?.id || 't1',
        });
        setActivities((prev) => [newAct, ...prev]);
      }

      setStatusMsg({ type: 'success', message: 'Haftalık çalışma başarıyla oluşturuldu.' });
      setIsModalOpen(false);
      setTitle('');
      setDescription('');
    } catch (err: any) {
      setStatusMsg({ type: 'error', message: err?.message || 'Çalışma eklenirken hata oluştu.' });
    }
  };

  return (
    <div className="space-y-6">
      {/* Üst Başlık & Yeni Ekle Butonu */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200">
        <div>
          <h2 className="text-base font-bold text-slate-900">Haftalık Çalışma ve Etkinlik Yönetimi</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Sınıf, ders ve haftalara göre ödev, sınav ve uygulama çalışmalarını tanımlayın.
          </p>
        </div>

        <button
          onClick={() => { setIsModalOpen(true); setStatusMsg(null); }}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-md transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Yeni Çalışma Tanımla</span>
        </button>
      </div>

      {statusMsg && (
        <div className={`p-3.5 rounded-lg border text-xs flex items-center gap-2 ${
          statusMsg.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'
        }`}>
          {statusMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-rose-600" />}
          <span>{statusMsg.message}</span>
        </div>
      )}

      {/* Çalışmalar Listesi */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-600 border-b border-slate-200">
                <th className="py-2.5 px-4 font-semibold w-16">Hafta</th>
                <th className="py-2.5 px-4 font-semibold w-24">Sınıf</th>
                <th className="py-2.5 px-4 font-semibold w-36">Ders</th>
                <th className="py-2.5 px-4 font-semibold">Çalışma Başlığı</th>
                <th className="py-2.5 px-4 font-semibold w-28">Tarih</th>
                <th className="py-2.5 px-4 font-semibold w-24 text-right">Maks. Puan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {activities.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    Henüz çalışma tanımlanmadı. "Yeni Çalışma Tanımla" butonu ile ekleyebilirsiniz.
                  </td>
                </tr>
              ) : (
                activities.map((act) => {
                  const cls = classes.find((c) => c.id === act.class_id);
                  const sub = subjects.find((s) => s.id === act.subject_id);

                  return (
                    <tr key={act.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4 font-mono tabular-nums font-semibold text-slate-900">
                        H.{act.week_number}
                      </td>
                      <td className="py-3 px-4 text-slate-700 font-medium">
                        {cls?.name || '10/A'}
                      </td>
                      <td className="py-3 px-4 text-slate-700">
                        {sub?.name || 'Ders'}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{act.title}</div>
                        {act.description && (
                          <div className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">{act.description}</div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-500 font-mono tabular-nums">
                        {act.activity_date || '-'}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums font-bold text-slate-900">
                        {act.max_score} p
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Yeni Çalışma Ekleme Modalı */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-lg w-full overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">Yeni Haftalık Çalışma Oluştur</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 text-sm">✕</button>
            </div>

            <form onSubmit={handleCreate} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Sınıf</label>
                  <select
                    value={classId}
                    onChange={(e) => setClassId(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-md bg-white focus:outline-hidden focus:ring-1 focus:ring-slate-900"
                  >
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Ders</label>
                  <select
                    value={subjectId}
                    onChange={(e) => setSubjectId(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-md bg-white focus:outline-hidden focus:ring-1 focus:ring-slate-900"
                  >
                    {subjects.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Hafta No</label>
                  <input
                    type="number"
                    min="1"
                    max="52"
                    required
                    value={weekNumber}
                    onChange={(e) => setWeekNumber(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-md focus:outline-hidden focus:ring-1 focus:ring-slate-900 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Tarih</label>
                  <input
                    type="date"
                    value={activityDate}
                    onChange={(e) => setActivityDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-md focus:outline-hidden focus:ring-1 focus:ring-slate-900 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Maks. Puan</label>
                  <input
                    type="number"
                    min="1"
                    max="1000"
                    required
                    value={maxScore}
                    onChange={(e) => setMaxScore(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-md focus:outline-hidden focus:ring-1 focus:ring-slate-900 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Çalışma / Etkinlik Başlığı</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Örn: Koşul ifadeleri ve mantıksal operatörler"
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-md focus:outline-hidden focus:ring-1 focus:ring-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Açıklama (İsteğe Bağlı)</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Öğrenciler için yönerge veya detaylar..."
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-md focus:outline-hidden focus:ring-1 focus:ring-slate-900"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-md"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-md transition-colors"
                >
                  Oluştur
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
