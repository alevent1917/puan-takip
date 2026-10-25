import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { ClassItem, SubjectItem } from '../../types/database';
import { mockDb, isLiveSupabaseActive, supabase } from '../../lib/supabaseClient';
import { Plus, BookOpen, Layers, CheckCircle2, Link2 } from 'lucide-react';

export const ClassesSubjectsView: React.FC = () => {
  const { user } = useAuth();
  const isLive = isLiveSupabaseActive();

  const [classes, setClasses] = useState<ClassItem[]>(mockDb.getClasses());
  const [subjects, setSubjects] = useState<SubjectItem[]>(mockDb.getSubjects());
  const [classSubjects, setClassSubjects] = useState(mockDb.getClassSubjects());

  // Yeni Sınıf Formu
  const [newClassName, setNewClassName] = useState('');
  const [newSchoolYear, setNewSchoolYear] = useState('2026-2027');

  // Yeni Ders Formu
  const [newSubName, setNewSubName] = useState('');
  const [newSubDesc, setNewSubDesc] = useState('');

  // İlişkilendirme Formu
  const [linkClassId, setLinkClassId] = useState(classes[0]?.id || '');
  const [linkSubjectId, setLinkSubjectId] = useState(subjects[0]?.id || '');

  const [teachers, setTeachers] = useState(
    mockDb.getProfiles().filter((p) => p.role === 'teacher')
  );
  const [selectedTeacherId, setSelectedTeacherId] = useState(
    teachers[0]?.id || user?.id || ''
  );

  const [msg, setMsg] = useState<string | null>(null);

  const handleAddClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClassName.trim()) return;

    if (isLive && supabase) {
      const { data, error } = await supabase
        .from('classes')
        .insert({ name: newClassName.trim(), school_year: newSchoolYear })
        .select()
        .single();
      if (!error && data) {
        setClasses((prev) => [...prev, data as ClassItem]);
      }
    } else {
      const c = mockDb.addClass({ name: newClassName.trim(), school_year: newSchoolYear });
      setClasses((prev) => [...prev, c]);
    }
    setNewClassName('');
    setMsg('Yeni sınıf başarıyla eklendi.');
  };

  const handleAddSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubName.trim()) return;

    const assignedTeacherId = selectedTeacherId || user?.id || 't1';

    if (isLive && supabase) {
      const { data, error } = await supabase
        .from('subjects')
        .insert({
          name: newSubName.trim(),
          description: newSubDesc.trim() || null,
          teacher_id: assignedTeacherId,
        })
        .select()
        .single();
      if (!error && data) {
        setSubjects((prev) => [...prev, data as SubjectItem]);
      }
    } else {
      const s = mockDb.addSubject({
        name: newSubName.trim(),
        description: newSubDesc.trim() || null,
        teacher_id: assignedTeacherId,
      });
      setSubjects((prev) => [...prev, s]);
    }
    setNewSubName('');
    setNewSubDesc('');
    setMsg('Yeni ders ve sorumlu öğretmen başarıyla kaydedildi.');
  };

  const handleLinkClassSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkClassId || !linkSubjectId) return;

    if (isLive && supabase) {
      const { error } = await supabase
        .from('class_subjects')
        .insert({ class_id: linkClassId, subject_id: linkSubjectId });
      if (!error) {
        setClassSubjects((prev) => [...prev, { id: 'cs-' + Date.now(), class_id: linkClassId, subject_id: linkSubjectId }]);
      }
    } else {
      const cs = mockDb.linkClassSubject(linkClassId, linkSubjectId);
      setClassSubjects(mockDb.getClassSubjects());
    }
    setMsg('Ders seçilen sınıfa başarıyla tanımlandı.');
  };

  return (
    <div className="space-y-6">
      {/* Başlık */}
      <div className="bg-white p-5 rounded-xl border border-slate-200">
        <h2 className="text-base font-bold text-slate-900">Sınıf ve Ders Yönetimi</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Eğitim öğretim yılı şubelerini oluşturun, dersleri tanımlayın ve sınıflarla eşleştirin.
        </p>
      </div>

      {msg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{msg}</span>
        </div>
      )}

      {/* 2 Kolon Grid: Sınıflar ve Dersler */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sınıflar */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Layers className="w-4 h-4 text-slate-500" />
            <span>Tanımlı Sınıflar</span>
          </h3>

          <form onSubmit={handleAddClass} className="flex gap-2">
            <input
              type="text"
              required
              placeholder="Sınıf Adı (Örn: 10/C)"
              value={newClassName}
              onChange={(e) => setNewClassName(e.target.value)}
              className="flex-1 px-3 py-1.5 text-xs border border-slate-300 rounded-md focus:outline-hidden focus:ring-1 focus:ring-slate-900"
            />
            <input
              type="text"
              required
              value={newSchoolYear}
              onChange={(e) => setNewSchoolYear(e.target.value)}
              className="w-28 px-3 py-1.5 text-xs border border-slate-300 rounded-md focus:outline-hidden focus:ring-1 focus:ring-slate-900 font-mono"
            />
            <button
              type="submit"
              className="px-3.5 py-1.5 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-md transition-colors"
            >
              Ekle
            </button>
          </form>

          <div className="divide-y divide-slate-100 border border-slate-100 rounded-lg overflow-hidden">
            {classes.map((c) => (
              <div key={c.id} className="p-3 text-xs flex items-center justify-between hover:bg-slate-50">
                <span className="font-semibold text-slate-900">{c.name}</span>
                <span className="text-slate-500 font-mono">{c.school_year}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Dersler */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-slate-500" />
            <span>Müfredat Dersleri</span>
          </h3>

          <form onSubmit={handleAddSubject} className="space-y-2">
            <input
              type="text"
              required
              placeholder="Ders Adı (Örn: Web Tabanlı Uygulama Geliştirme)"
              value={newSubName}
              onChange={(e) => setNewSubName(e.target.value)}
              className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-md focus:outline-hidden focus:ring-1 focus:ring-slate-900"
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="Açıklama (İsteğe bağlı)"
                value={newSubDesc}
                onChange={(e) => setNewSubDesc(e.target.value)}
                className="px-3 py-1.5 text-xs border border-slate-300 rounded-md focus:outline-hidden focus:ring-1 focus:ring-slate-900"
              />
              <select
                value={selectedTeacherId}
                onChange={(e) => setSelectedTeacherId(e.target.value)}
                className="px-3 py-1.5 text-xs border border-slate-300 rounded-md bg-white focus:outline-hidden focus:ring-1 focus:ring-slate-900"
              >
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    Öğretmen: {t.first_name} {t.last_name}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              className="w-full py-1.5 px-3.5 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-md transition-colors"
            >
              Ders ve Sorumlu Öğretmeni Kaydet
            </button>
          </form>

          <div className="divide-y divide-slate-100 border border-slate-100 rounded-lg overflow-hidden">
            {subjects.map((s) => {
              const teacher = teachers.find((t) => t.id === s.teacher_id);
              return (
                <div key={s.id} className="p-3 text-xs hover:bg-slate-50 flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-slate-900">{s.name}</div>
                    {s.description && (
                      <div className="text-[11px] text-slate-500 mt-0.5">{s.description}</div>
                    )}
                  </div>
                  <span className="text-[11px] text-slate-600 bg-slate-100 px-2 py-0.5 rounded font-medium">
                    {teacher ? `${teacher.first_name} ${teacher.last_name}` : 'Öğretmen'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Sınıf - Ders Eşleştirme Bölümü */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <Link2 className="w-4 h-4 text-slate-500" />
          <span>Sınıfa Ders Atama (Müfredat Eşleştirme)</span>
        </h3>

        <form onSubmit={handleLinkClassSubject} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Sınıf</label>
            <select
              value={linkClassId}
              onChange={(e) => setLinkClassId(e.target.value)}
              className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-md bg-white focus:outline-hidden focus:ring-1 focus:ring-slate-900"
            >
              {classes.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Ders</label>
            <select
              value={linkSubjectId}
              onChange={(e) => setLinkSubjectId(e.target.value)}
              className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-md bg-white focus:outline-hidden focus:ring-1 focus:ring-slate-900"
            >
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              className="w-full py-1.5 px-4 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-md transition-colors"
            >
              Bu Sınıfa Dersi Ata
            </button>
          </div>
        </form>

        <div className="text-xs text-slate-600">
          <p className="font-semibold mb-2">Mevcut Sınıf - Ders Tanımları:</p>
          <div className="flex flex-wrap gap-2">
            {classSubjects.map((cs) => {
              const c = classes.find((cl) => cl.id === cs.class_id);
              const s = subjects.find((sb) => sb.id === cs.subject_id);
              return (
                <span key={cs.id} className="text-xs bg-slate-100 text-slate-800 px-2.5 py-1 rounded-md border border-slate-200">
                  <strong>{c?.name}</strong>: {s?.name}
                </span>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
