import React, { createContext, useContext, useEffect, useState } from 'react';
import { Profile, UserRole } from '../types/database';
import { supabase, isLiveSupabaseActive, mockDb } from '../lib/supabaseClient';

interface AuthContextType {
  user: Profile | null;
  email: string | null;
  role: UserRole | null;
  isLoading: boolean;
  isLiveSupabase: boolean;
  isDemoMode: boolean;
  setDemoMode: (val: boolean) => void;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signUp: (data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    studentNumber?: string;
  }) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  switchDemoUser: (role: UserRole, studentId?: string) => void;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<Profile | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const isLive = isLiveSupabaseActive();

  // Oracle Cloud / Canlı Üretim Ortamı Kontrolü
  // Üretimde (PROD) demo modu kesinlikle kapatılır
  const isInitiallyProduction = import.meta.env.PROD || (isLive && !import.meta.env.DEV);
  const [isDemoMode, setIsDemoMode] = useState<boolean>(
    !isInitiallyProduction && (typeof window !== 'undefined' ? localStorage.getItem('pt_demo_mode') !== 'false' : true)
  );

  const setDemoMode = (val: boolean) => {
    // Üretimde demo modunu açmaya izin verme
    if (import.meta.env.PROD) return;
    setIsDemoMode(val);
    if (typeof window !== 'undefined') {
      localStorage.setItem('pt_demo_mode', String(val));
    }
    if (!val) {
      // Demo kapatıldığında sahte kullanıcı oturumunu temizle
      setUser(null);
      setEmail(null);
    } else {
      const profiles = mockDb.getProfiles();
      const defaultTeacher = profiles.find((p) => p.role === 'teacher') || profiles[0];
      setUser(defaultTeacher);
      setEmail('ogretmen@okul.k12.tr');
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      setIsLoading(true);

      if (isLive && supabase) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            setEmail(session.user.email || null);
            const { data: profile } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', session.user.id)
              .single();

            if (profile) {
              setUser(profile as Profile);
            }
          } else if (!isDemoMode) {
            setUser(null);
            setEmail(null);
          }
        } catch (err) {
          console.warn('Canlı Supabase oturum kontrolü hatası:', err);
        }
      } else if (isDemoMode) {
        // Yalnızca geliştirme/demo modunda örnek öğretmen profilini yükle
        const profiles = mockDb.getProfiles();
        const defaultTeacher = profiles.find((p) => p.role === 'teacher') || profiles[0];
        setUser(defaultTeacher);
        setEmail('ogretmen@okul.k12.tr');
      } else {
        // Canlı / Üretim modunda başlangıçta giriş yapılmalıdır
        setUser(null);
        setEmail(null);
      }

      setIsLoading(false);
    };

    initAuth();

    if (isLive && supabase) {
      const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, session) => {
        if (session?.user) {
          setEmail(session.user.email || null);
          const { data: profile } = await supabase!
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();
          if (profile) {
            setUser(profile as Profile);
          }
        } else {
          setUser(null);
          setEmail(null);
        }
      });

      return () => {
        authListener.subscription.unsubscribe();
      };
    }
  }, [isLive]);

  const signIn = async (inputEmail: string, password: string) => {
    setIsLoading(true);
    try {
      if (isLive && supabase) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: inputEmail,
          password,
        });

        if (error) {
          setIsLoading(false);
          return { success: false, error: error.message };
        }

        if (data.user) {
          setEmail(data.user.email || null);
          const { data: profile, error: pError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', data.user.id)
            .single();

          if (pError || !profile) {
            setIsLoading(false);
            return { success: false, error: 'Kullanıcı profili bulunamadı.' };
          }

          setUser(profile as Profile);
          setIsLoading(false);
          return { success: true };
        }
      } else {
        // Demo Girişi
        const profiles = mockDb.getProfiles();
        const trimmed = inputEmail.trim().toLowerCase();

        if (trimmed.includes('ogretmen') || trimmed.includes('teacher')) {
          const teacher = profiles.find((p) => p.role === 'teacher') || profiles[0];
          setUser(teacher);
          setEmail(inputEmail);
          setIsLoading(false);
          return { success: true };
        } else {
          const student = profiles.find((p) => p.role === 'student') || profiles[1];
          setUser(student);
          setEmail(inputEmail);
          setIsLoading(false);
          return { success: true };
        }
      }
      return { success: false, error: 'Bilinmeyen oturum hatası' };
    } catch (e: any) {
      setIsLoading(false);
      return { success: false, error: e?.message || 'Giriş yapılamadı.' };
    }
  };

  const signUp = async (data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    studentNumber?: string;
  }) => {
    setIsLoading(true);
    try {
      if (isLive && supabase) {
        // Güvenlik Kuralı: Dışarıdan role parametresi ASLA 'teacher' olarak kabul edilmez.
        const { data: authData, error } = await supabase.auth.signUp({
          email: data.email,
          password: data.password,
          options: {
            data: {
              first_name: data.firstName,
              last_name: data.lastName,
              student_number: data.studentNumber || null,
              role: 'student', // Zorunlu student
            },
          },
        });

        if (error) {
          setIsLoading(false);
          return { success: false, error: error.message };
        }

        if (authData.user) {
          setEmail(authData.user.email || null);

          // Profil tetikleyicisini yedeklemek için profili doğrudan da doğrula/ekle
          try {
            await supabase.from('profiles').upsert({
              id: authData.user.id,
              first_name: data.firstName,
              last_name: data.lastName,
              student_number: data.studentNumber || null,
              role: 'student',
            });
          } catch (pErr) {
            console.warn('Profil yedek kaydı:', pErr);
          }

          // Eğer otomatik oturum açıldıysa kullanıcıyı hemen ata
          if (authData.session) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', authData.user.id)
              .single();
            if (profile) {
              setUser(profile as Profile);
            }
          }

          setIsLoading(false);
          return {
            success: true,
            error: !authData.session
              ? 'Kayıt başarılı! Eğer e-posta doğrulaması açıksa lütfen gelen kutunuzu kontrol ediniz veya Supabase Auth ayarlarından "Confirm email" seçeneğini kapatınız.'
              : undefined,
          };
        }
      } else {
        // Mock yeni öğrenci kaydı
        const newStudent: Profile = {
          id: 's-' + Date.now(),
          first_name: data.firstName,
          last_name: data.lastName,
          role: 'student', // Zorunlu student
          student_number: data.studentNumber || '9999',
          created_at: new Date().toISOString(),
        };

        const profiles = mockDb.getProfiles();
        profiles.push(newStudent);
        localStorage.setItem('pt_profiles', JSON.stringify(profiles));

        setUser(newStudent);
        setEmail(data.email);
        setIsLoading(false);
        return { success: true };
      }
      return { success: false, error: 'Kayıt tamamlanamadı.' };
    } catch (e: any) {
      setIsLoading(false);
      return { success: false, error: e?.message || 'Kayıt sırasında hata oluştu.' };
    }
  };

  const signOut = async () => {
    if (isLive && supabase) {
      await supabase.auth.signOut();
    }
    setUser(null);
    setEmail(null);
  };

  const switchDemoUser = (targetRole: UserRole, studentId?: string) => {
    const profiles = mockDb.getProfiles();
    if (targetRole === 'teacher') {
      const teacher = profiles.find((p) => p.role === 'teacher') || profiles[0];
      setUser(teacher);
      setEmail('ogretmen@okul.k12.tr');
    } else {
      const student = studentId
        ? profiles.find((p) => p.id === studentId) || profiles.find((p) => p.role === 'student')
        : profiles.find((p) => p.role === 'student');
      if (student) {
        setUser(student);
        setEmail(`${student.first_name.toLowerCase()}@okul.k12.tr`);
      }
    }
  };

  const refreshProfile = async () => {
    if (isLive && supabase && user?.id) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      if (profile) {
        setUser(profile as Profile);
      }
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        email,
        role: user?.role || null,
        isLoading,
        isLiveSupabase: isLive,
        isDemoMode,
        setDemoMode,
        signIn,
        signUp,
        signOut,
        switchDemoUser,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
