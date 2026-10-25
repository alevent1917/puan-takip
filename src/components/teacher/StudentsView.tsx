import React, { useState } from 'react';
import { Profile, ClassItem, SubjectItem, Enrollment } from '../../types/database';
import { mockDb, isLiveSupabaseActive, supabase } from '../../lib/supabaseClient';
import {
  Users,
  UserPlus,
  CheckCircle2,
  AlertCircle,
  FileText,
  UserCheck,
  ShieldCheck,
  Plus,
} from 'lucide-react';

export const StudentsView: React.FC = () => {
  const isLive = isLiveSupabaseActive();

  const [profiles, setProfiles] = useState<Profile[]>(mockDb.getProfiles());
  const classes = mockDb.getClasses();
  const subjects = mockDb.getSubjects();
  const [enrollments, setEnrollments] = useState<Enrollment[]>(mockDb.getEnrollments());

  // Sekme Seçimi: 'list' | 'single' | 'bulk' | 'teachers'
  const [activeTab, setActiveTab] = useState<'list' | 'single' | 'bulk' | 'teachers'>('list');

  // Tek Öğrenci Ekle Formu
  const [singleFirstName, setSingleFirstName] = useState('');
  const [singleLastName, setSingleLastName] = useState('');
  const [singleNumber, setSingleNumber] = useState('');
  const [singleClassId, setSingleClassId] = useState(classes[0]?.id || '');
  const [singleSubjectId, setSingleSubjectId] = useState(subjects[0]?.id || '');

  // Toplu Öğrenci Ekle Formu
  const [bulkClassId, setBulkClassId] = useState(classes[0]?.id || '');
  const [bulkText, setBulkText] = useState(
    `101, Ali Yılmaz\n102, Ayşe Kaya\n103, Burak Çelik\n104, Ceren Şahin`
  );

  // Öğrenciyi Mevcut Sınıfa/Derse Kaydetme
  const [enrollStudentId, setEnrollStudentId] = useState('');
  const [enrollClassId, setEnrollClassId] = useState(classes[0]?.id || '');
  const [enrollSubjectId, setEnrollSubjectId] = useState(subjects[0]?.id || '');

  // Yeni Öğretmen Ekle Formu
  const [newTeacherFirst, setNewTeacherFirst] = useState('');
  const [newTeacherLast, setNewTeacherLast] = useState('');

  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const studentProfiles = profiles.filter((p) => p.role === 'student');
  const teacherProfiles = profiles.filter((p) => p.role === 'teacher');

  // 1. Tek Öğrenci Ekle
  const handleAddSingleStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!singleFirstName.trim() || !singleLastName.trim()) {
      setNotification({ type: 'error', message: 'Lütfen öğrenci adı ve soyadını giriniz.' });
      return;
    }

    try {
      if (isLive && supabase) {
        // Canlı Supabase için profiles tablosuna insert
        const { data: newProfile, error: pErr } = await supabase
          .from('profiles')
          .insert({
            first_name: singleFirstName.trim(),
            last_name: singleLastName.trim(),
            student_number: singleNumber.trim() || null,
            role: 'student',
          })
          .select()
          .single();

        if (pErr) throw pErr;

        if (newProfile && singleClassId && singleSubjectId) {
          await supabase.from('enrollments').insert({
            student_id: newProfile.id,
            class_id: singleClassId,
            subject_id: singleSubjectId,
          });
        }

        setProfiles((prev) => [...prev, newProfile as Profile]);
      } else {
        // Mock Store
        const created = mockDb.bulkAddStudents(
          [
            {
              firstName: singleFirstName.trim(),
              lastName: singleLastName.trim(),
              studentNumber: singleNumber.trim(),
            },
          ],
          singleClassId,
          singleSubjectId ? [singleSubjectId] : []
        );

        setProfiles(mockDb.getProfiles());
        setEnrollments(mockDb.getEnrollments());
      }

      setNotification({
        type: 'success',
        message: `${singleFirstName} ${singleLastName} başarıyla sisteme ve sınıfa kaydedildi.`,
      });
      setSingleFirstName('');
      setSingleLastName('');
      setSingleNumber('');
      setActiveTab('list');
    } catch (err: any) {
      setNotification({ type: 'error', message: err?.message || 'Öğrenci eklenirken hata oluştu.' });
    }
  };

  // 2. Toplu Öğrenci Ekle (Excel / Liste Yapıştırma)
  const handleBulkAddStudents = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkText.trim()) return;

    const lines = bulkText.split('\n');
    const parsedList: { firstName: string; lastName: string; studentNumber: string }[] = [];

    lines.forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed) return;

      // Örnek formatlar: "101, Ali Yılmaz" veya "Ali Yılmaz" veya "101 Ali Yılmaz"
      if (trimmed.includes(',')) {
        const parts = trimmed.split(',');
        const num = parts[0].trim();
        const names = parts[1].trim().split(' ');
        const lName = names.pop() || '';
        const fName = names.join(' ') || 'Öğrenci';
        parsedList.push({ firstName: fName, lastName: lName, studentNumber: num });
      } else {
        const names = trimmed.split(' ');
        const lName = names.pop() || '';
        const fName = names.join(' ') || 'Öğrenci';
        parsedList.push({ firstName: fName, lastName: lName, studentNumber: '' });
      }
    });

    if (parsedList.length === 0) {
      setNotification({ type: 'error', message: 'Geçerli öğrenci satırı bulunamadı.' });
      return;
    }

    // Seçili sınıfa ait dersleri bul
    const classSubIds = mockDb
      .getClassSubjects()
      .filter((cs) => cs.class_id === bulkClassId)
      .map((cs) => cs.subject_id);

    mockDb.bulkAddStudents(parsedList, bulkClassId, classSubIds);
    setProfiles(mockDb.getProfiles());
    setEnrollments(mockDb.getEnrollments());

    setNotification({
      type: 'success',
      message: `${parsedList.length} öğrenci tek tıkla sisteme eklendi ve seçilen sınıfa kaydedildi!`,
    });
    setBulkText('');
    setActiveTab('list');
  };

  // 3. Mevcut Öğrenciyi Sınıfa/Derse Ata
  const handleEnrollExisting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!enrollStudentId || !enrollClassId || !enrollSubjectId) {
      setNotification({ type: 'error', message: 'Lütfen öğrenci, sınıf ve ders seçiniz.' });
      return;
    }

    if (isLive && supabase) {
      const { data, error } = await supabase
        .from('enrollments')
        .insert({
          student_id: enrollStudentId,
          class_id: enrollClassId,
          subject_id: enrollSubjectId,
        })
        .select()
        .single();

      if (!error && data) {
        setEnrollments((prev) => [...prev, data as Enrollment]);
      }
    } else {
      mockDb.addEnrollment(enrollStudentId, enrollClassId, enrollSubjectId);
      setEnrollments(mockDb.getEnrollments());
    }

    setNotification({ type: 'success', message: 'Öğrenci sınıfa ve derse başarıyla atandı.' });
  };

  // 4. Yeni Öğretmen Ekle
  const handleAddTeacher = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeacherFirst.trim() || !newTeacherLast.trim()) return;

    mockDb.addTeacher(newTeacherFirst.trim(), newTeacherLast.trim());
    setProfiles(mockDb.getProfiles());
    setNewTeacherFirst('');
    setNewTeacherLast('');
    setNotification({
      type: 'success',
      message: 'Yeni öğretmen profili başarıyla oluşturuldu. Artık derslere atanabilir.',
    });
  };

  return (
    <div className="space-y-6">
      {/* Üst Başlık & Sekmeler */}
      <div className="bg-white p-5 rounded-xl border border-slate-200">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">Öğrenci ve Öğretmen Yönetim Paneli</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Tek tek veya toplu liste yapıştırarak öğrenci ekleyin, sınıflara atayın ve öğretmen kadrosunu yönetin.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 rounded-lg text-xs font-medium">
            <button
              onClick={() => setActiveTab('list')}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                activeTab === 'list' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Öğrenci Listesi ({studentProfiles.length})
            </button>
            <button
              onClick={() => setActiveTab('single')}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                activeTab === 'single' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              + Tek Öğrenci Ekle
            </button>
            <button
              onClick={() => setActiveTab('bulk')}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                activeTab === 'bulk' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              📋 Toplu Öğrenci İçe Aktar
            </button>
            <button
              onClick={() => setActiveTab('teachers')}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                activeTab === 'teachers' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              👨‍🏫 Öğretmenler ({teacherProfiles.length})
            </button>
          </div>
        </div>
      </div>

      {notification && (
        <div
          className={`p-3.5 rounded-lg border text-xs flex items-center justify-between ${
            notification.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{notification.message}</span>
          </div>
          <button onClick={() => setNotification(null)} className="text-slate-400 hover:text-slate-600">✕</button>
        </div>
      )}

      {/* SEKME 1: TEK ÖĞRENCİ EKLEME */}
      {activeTab === 'single' && (
        <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-4">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-slate-500" />
            <span>Yeni Öğrenci Bilgileri</span>
          </h3>

          <form onSubmit={handleAddSingleStudent} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Öğrenci Adı</label>
                <input
                  type="text"
                  required
                  placeholder="Örn: Burak"
                  value={singleFirstName}
                  onChange={(e) => setSingleFirstName(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-md focus:outline-hidden focus:ring-1 focus:ring-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Soyadı</label>
                <input
                  type="text"
                  required
                  placeholder="Örn: Yılmaz"
                  value={singleLastName}
                  onChange={(e) => setSingleLastName(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-md focus:outline-hidden focus:ring-1 focus:ring-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Okul Numarası</label>
                <input
                  type="text"
                  placeholder="Örn: 1042"
                  value={singleNumber}
                  onChange={(e) => setSingleNumber(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-md focus:outline-hidden focus:ring-1 focus:ring-slate-900 font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Doğrudan Kaydedileceği Sınıf</label>
                <select
                  value={singleClassId}
                  onChange={(e) => setSingleClassId(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-md bg-white focus:outline-hidden focus:ring-1 focus:ring-slate-900"
                >
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>{c.name} ({c.school_year})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Kayıtlı Ders</label>
                <select
                  value={singleSubjectId}
                  onChange={(e) => setSingleSubjectId(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-md bg-white focus:outline-hidden focus:ring-1 focus:ring-slate-900"
                >
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <button
              type="submit"
              className="py-2 px-4 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-md transition-colors"
            >
              Öğrenciyi Sisteme Kaydet
            </button>
          </form>
        </div>
      )}

      {/* SEKME 2: TOPLU ÖĞRENCİ İÇE AKTAR (EXCEL / LİSTE KOPYALA-YAPIŞTIR) */}
      {activeTab === 'bulk' && (
        <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <FileText className="w-4 h-4 text-slate-500" />
              <span>Toplu Öğrenci Listesi Yapıştır (Excel / e-Okul)</span>
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Excel'den veya e-okuldan aldığınız listeyi doğrudan buraya yapıştırabilirsiniz. Sistem satır satır ayrıştırıp tüm öğrencileri tek tıkla seçilen sınıfa ekler.
            </p>
          </div>

          <form onSubmit={handleBulkAddStudents} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Eklenecek Sınıf</label>
              <select
                value={bulkClassId}
                onChange={(e) => setBulkClassId(e.target.value)}
                className="w-full sm:w-64 px-3 py-1.5 text-xs border border-slate-300 rounded-md bg-white focus:outline-hidden focus:ring-1 focus:ring-slate-900"
              >
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>{c.name} ({c.school_year})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Öğrenci Listesi (Format: <code>Numara, Ad Soyad</code> veya her satırda bir isim)
              </label>
              <textarea
                rows={6}
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
                className="w-full p-3 text-xs font-mono border border-slate-300 rounded-md focus:outline-hidden focus:ring-1 focus:ring-slate-900 leading-relaxed"
                placeholder="101, Ali Yılmaz&#10;102, Ayşe Kaya&#10;103, Can Demir"
              />
            </div>

            <button
              type="submit"
              className="py-2 px-4 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-md transition-colors"
            >
              Listeyi İçe Aktar ve Sınıfa Kaydet
            </button>
          </form>
        </div>
      )}

      {/* SEKME 3: ÖĞRETMENLER KADROSU */}
      {activeTab === 'teachers' && (
        <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-slate-500" />
                <span>Tanımlı Öğretmenler ({teacherProfiles.length})</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Derslerden sorumlu öğretmenler ve yetkili kullanıcılar
              </p>
            </div>
          </div>

          <form onSubmit={handleAddTeacher} className="flex gap-2">
            <input
              type="text"
              required
              placeholder="Öğretmen Adı (Örn: Selin)"
              value={newTeacherFirst}
              onChange={(e) => setNewTeacherFirst(e.target.value)}
              className="flex-1 px-3 py-1.5 text-xs border border-slate-300 rounded-md focus:outline-hidden focus:ring-1 focus:ring-slate-900"
            />
            <input
              type="text"
              required
              placeholder="Soyadı (Örn: Koç)"
              value={newTeacherLast}
              onChange={(e) => setNewTeacherLast(e.target.value)}
              className="flex-1 px-3 py-1.5 text-xs border border-slate-300 rounded-md focus:outline-hidden focus:ring-1 focus:ring-slate-900"
            />
            <button
              type="submit"
              className="px-4 py-1.5 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-md transition-colors"
            >
              Öğretmen Ekle
            </button>
          </form>

          <div className="divide-y divide-slate-100 border border-slate-100 rounded-lg overflow-hidden">
            {teacherProfiles.map((t) => {
              const teacherSubjects = subjects.filter((s) => s.teacher_id === t.id);
              return (
                <div key={t.id} className="p-3 text-xs flex items-center justify-between hover:bg-slate-50">
                  <div>
                    <span className="font-semibold text-slate-900">{t.first_name} {t.last_name}</span>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      {teacherSubjects.length > 0
                        ? `Verdiği Dersler: ${teacherSubjects.map((s) => s.name).join(', ')}`
                        : 'Henüz atanmış dersi yok'}
                    </div>
                  </div>
                  <span className="text-[11px] bg-slate-100 text-slate-800 font-semibold px-2.5 py-0.5 rounded border border-slate-200">
                    Öğretmen (Teacher)
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SEKME 4: ÖĞRENCİ LİSTESİ VE MEVCUT ÖĞRENCİYİ DERSE ATAMA */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-4 h-4 text-slate-500" />
            <span>Kayıtlı Öğrenciler ve Şubeleri ({studentProfiles.length})</span>
          </h3>
          <span className="text-xs text-slate-500">Rol: Öğrenci (Student)</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-600 border-b border-slate-200">
                <th className="py-2.5 px-4 font-semibold w-24">Öğr. No</th>
                <th className="py-2.5 px-4 font-semibold">Öğrenci Adı Soyadı</th>
                <th className="py-2.5 px-4 font-semibold">Kayıtlı Olduğu Dersler &amp; Sınıflar</th>
                <th className="py-2.5 px-4 font-semibold w-28 text-right">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {studentProfiles.map((p) => {
                const studentEnrollments = enrollments.filter((e) => e.student_id === p.id);

                return (
                  <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 font-mono tabular-nums font-semibold text-slate-700">
                      {p.student_number || '-'}
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-900">
                      {p.first_name} {p.last_name}
                    </td>
                    <td className="py-3 px-4">
                      {studentEnrollments.length === 0 ? (
                        <span className="text-slate-400">Henüz bir derse atanmadı</span>
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          {studentEnrollments.map((en) => {
                            const cls = classes.find((c) => c.id === en.class_id);
                            const sub = subjects.find((s) => s.id === en.subject_id);
                            return (
                              <span
                                key={en.id}
                                className="inline-block text-[11px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200"
                              >
                                {cls?.name}: {sub?.name}
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => {
                          setEnrollStudentId(p.id);
                          setActiveTab('single');
                        }}
                        className="text-xs text-slate-700 hover:text-slate-900 font-medium underline"
                      >
                        Düzenle
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
