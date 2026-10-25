import React, { useState } from 'react';
import { mockDb } from '../../lib/supabaseClient';
import { FileSpreadsheet, Printer, Award, TrendingUp, Filter } from 'lucide-react';

export const ReportsView: React.FC = () => {
  const classes = mockDb.getClasses();
  const subjects = mockDb.getSubjects();
  const activities = mockDb.getActivities();
  const grades = mockDb.getGrades();
  const profiles = mockDb.getProfiles().filter((p) => p.role === 'student');
  const enrollments = mockDb.getEnrollments();

  const [selectedClassId, setSelectedClassId] = useState(classes[0]?.id || '');
  const [selectedSubjectId, setSelectedSubjectId] = useState(subjects[0]?.id || '');

  // Seçili sınıf ve dersteki çalışmalar
  const targetActivities = activities
    .filter((a) => a.class_id === selectedClassId && a.subject_id === selectedSubjectId)
    .sort((a, b) => a.week_number - b.week_number);

  // Seçili sınıf ve derse kayıtlı öğrenciler
  const enrolledStudentIds = enrollments
    .filter((e) => e.class_id === selectedClassId && e.subject_id === selectedSubjectId)
    .map((e) => e.student_id);

  const targetStudents = profiles.filter((p) => enrolledStudentIds.includes(p.id));

  // Her öğrenci için puan dökümü ve ortalama
  const reportData = targetStudents.map((st) => {
    const studentGrades = grades.filter((g) => g.student_id === st.id);
    const activityScores = targetActivities.map((act) => {
      const g = studentGrades.find((gr) => gr.activity_id === act.id);
      return {
        activityId: act.id,
        score: g ? g.score : null,
        maxScore: act.max_score,
      };
    });

    const enteredScores = activityScores.filter((s) => s.score !== null);
    const avgPercentage =
      enteredScores.length > 0
        ? Math.round(
            enteredScores.reduce((acc, curr) => acc + (curr.score! / curr.maxScore) * 100, 0) /
              enteredScores.length
          )
        : null;

    return {
      student: st,
      activityScores,
      avgPercentage,
    };
  });

  // Sıralama: En yüksek ortalamadan en düşüğe
  reportData.sort((a, b) => (b.avgPercentage || 0) - (a.avgPercentage || 0));

  const classAvg =
    reportData.filter((r) => r.avgPercentage !== null).length > 0
      ? Math.round(
          reportData
            .filter((r) => r.avgPercentage !== null)
            .reduce((acc, curr) => acc + curr.avgPercentage!, 0) /
            reportData.filter((r) => r.avgPercentage !== null).length
        )
      : null;

  return (
    <div className="space-y-6">
      {/* Üst Filtre & Rapor Seçimi */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900">Puan ve Başarı Raporları</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Sınıf ve ders bazlı haftalık gelişim ve karne dökümü
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
            className="px-3 py-1.5 text-xs border border-slate-300 rounded-md bg-white font-medium"
          >
            {classes.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          <select
            value={selectedSubjectId}
            onChange={(e) => setSelectedSubjectId(e.target.value)}
            className="px-3 py-1.5 text-xs border border-slate-300 rounded-md bg-white font-medium"
          >
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>

          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Raporu Yazdır</span>
          </button>
        </div>
      </div>

      {/* Rapor İstatistik Kartları */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <span className="text-xs text-slate-500">Sınıf Başarı Ortalaması</span>
          <div className="text-xl font-bold text-slate-900 font-mono tabular-nums mt-1">
            {classAvg !== null ? `%${classAvg}` : 'Veri yok'}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            Yapılan {targetActivities.length} haftalık çalışma üzerinden
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <span className="text-xs text-slate-500">Kayıtlı Öğrenci Sayısı</span>
          <div className="text-xl font-bold text-slate-900 font-mono tabular-nums mt-1">
            {targetStudents.length}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            Bu sınıf ve derse aktif kayıtlı
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <span className="text-xs text-slate-500">En Yüksek Öğrenci Ortalaması</span>
          <div className="text-xl font-bold text-emerald-700 font-mono tabular-nums mt-1">
            {reportData[0]?.avgPercentage ? `%${reportData[0].avgPercentage}` : '-'}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5 truncate">
            {reportData[0] ? `${reportData[0].student.first_name} ${reportData[0].student.last_name}` : ''}
          </div>
        </div>
      </div>

      {/* Detaylı Rapor Matrisi Tablosu */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-900 flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-slate-500" />
            <span>Haftalık Not Dağılım Matrisi</span>
          </h3>
          <span className="text-xs text-slate-500">Not / Maks. Puan</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-600 border-b border-slate-200">
                <th className="py-2.5 px-4 font-semibold w-12 text-center">Sıra</th>
                <th className="py-2.5 px-4 font-semibold w-24">Öğr. No</th>
                <th className="py-2.5 px-4 font-semibold">Öğrenci Adı Soyadı</th>
                {targetActivities.map((act) => (
                  <th key={act.id} className="py-2.5 px-3 font-semibold text-center whitespace-nowrap">
                    H.{act.week_number} <span className="text-[10px] text-slate-400">({act.max_score}p)</span>
                  </th>
                ))}
                <th className="py-2.5 px-4 font-semibold text-right w-24">Genel Ort.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {reportData.length === 0 ? (
                <tr>
                  <td colSpan={4 + targetActivities.length} className="py-8 text-center text-slate-400">
                    Seçilen kriterlerde kayıtlı veri bulunamadı.
                  </td>
                </tr>
              ) : (
                reportData.map((row, idx) => (
                  <tr key={row.student.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-2.5 px-4 text-center font-mono tabular-nums text-slate-400">
                      {idx + 1}
                    </td>
                    <td className="py-2.5 px-4 font-mono tabular-nums text-slate-700 font-medium">
                      {row.student.student_number || '-'}
                    </td>
                    <td className="py-2.5 px-4 font-semibold text-slate-900">
                      {row.student.first_name} {row.student.last_name}
                    </td>
                    {row.activityScores.map((scoreObj, sIdx) => (
                      <td key={sIdx} className="py-2.5 px-3 text-center font-mono tabular-nums">
                        {scoreObj.score !== null ? (
                          <span className={`font-semibold ${
                            (scoreObj.score / scoreObj.maxScore) >= 0.85
                              ? 'text-emerald-700'
                              : (scoreObj.score / scoreObj.maxScore) >= 0.7
                              ? 'text-slate-800'
                              : 'text-rose-700'
                          }`}>
                            {scoreObj.score}
                          </span>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>
                    ))}
                    <td className="py-2.5 px-4 text-right font-mono tabular-nums font-bold text-slate-900">
                      {row.avgPercentage !== null ? `%${row.avgPercentage}` : '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
