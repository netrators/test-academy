import { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import TeacherPanel from './components/TeacherPanel.jsx';
import StudentPanel from './components/StudentPanel.jsx';

export default function App() {
  const [session, setSession] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchRole(session.user.id);
    });

    supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) fetchRole(session.user.id);
      else setRole(null);
    });
  }, []);

  const fetchRole = async (userId) => {
    const { data } = await supabase.from('profiles').select('role').eq('id', userId).single();
    if (data) setRole(data.role);
    setLoading(false);
  };

  const login = async () => {
    await supabase.auth.signInWithOAuth({ provider: 'google' }); 
  };

  if (loading && session) return <div className="p-10 text-center">Cargando...</div>;

  if (!session) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-100">
        <div className="p-8 bg-white shadow-lg rounded-lg text-center">
          <h1 className="text-2xl font-bold mb-4">Sistema de Tareas</h1>
          <button onClick={login} className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700">
            Iniciar Sesión
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <header className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800">
          Panel {role === 'teacher' ? 'de Maestro' : 'de Estudiante'}
        </h1>
        <button onClick={() => supabase.auth.signOut()} className="text-red-500 font-semibold hover:underline">
          Cerrar Sesión
        </button>
      </header>
      
      {role === 'teacher' ? <TeacherPanel /> : <StudentPanel user={session.user} />}
    </div>
  );
}
