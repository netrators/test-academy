import { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import TeacherPanel from './components/TeacherPanel';
import StudentPanel from './components/StudentPanel';

export default function App() {
  const [session, setSession] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchRole(session.user.id);
      else setLoading(false);
    });

    supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) fetchRole(session.user.id);
      else {
        setRole(null);
        setLoading(false);
      }
    });
  }, []);

  const fetchRole = async (userId) => {
    const { data } = await supabase.from('profiles').select('role').eq('id', userId).single();
    if (data) setRole(data.role);
    setLoading(false);
  };

  const login = async (e) => {
    e.preventDefault();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) alert("Error al iniciar sesión: " + error.message);
  };

  if (loading) return <div className="p-10 text-center">Cargando...</div>;

  if (!session) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-100">
        <form onSubmit={login} className="p-8 bg-white shadow-lg rounded-lg text-center flex flex-col gap-4 w-96">
          <h1 className="text-2xl font-bold mb-4">Sistema de Tareas</h1>
          <input 
            type="email" 
            placeholder="Tu correo" 
            className="border p-2 rounded" 
            value={email} 
            onChange={e => setEmail(e.target.value)} 
            required 
          />
          <input 
            type="password" 
            placeholder="Tu contraseña" 
            className="border p-2 rounded" 
            value={password} 
            onChange={e => setPassword(e.target.value)} 
            required 
          />
          <button type="submit" className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700">
            Iniciar Sesión
          </button>
        </form>
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
