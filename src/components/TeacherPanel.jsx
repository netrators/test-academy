import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { createClient } from '@supabase/supabase-js';

// Creamos un "Cliente Administrador" usando la llave maestra
// Esto permite crear alumnos sin que se cierre tu sesión de maestro
const supabaseAdmin = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export default function TeacherPanel() {
  const [submissions, setSubmissions] = useState([]);
  const [selectedPdf, setSelectedPdf] = useState(null);
  const [gradeInput, setGradeInput] = useState('');
  const [currentSubmissionId, setCurrentSubmissionId] = useState(null);

  // Estados para el formulario de nuevo alumno
  const [studentName, setStudentName] = useState('');
  const [studentEmail, setStudentEmail] = useState('');
  const [studentPassword, setStudentPassword] = useState('');
  const [creatingUser, setCreatingUser] = useState(false);

  useEffect(() => {
    fetchSubmissions();
  }, []);

  const fetchSubmissions = async () => {
    const { data } = await supabase
      .from('submissions')
      .select('*, profiles(full_name), assignments(title)');
    setSubmissions(data || []);
  };

  const saveGrade = async () => {
    await supabase
      .from('submissions')
      .update({ grade: parseFloat(gradeInput) })
      .eq('id', currentSubmissionId);
    
    setSelectedPdf(null);
    setGradeInput('');
    fetchSubmissions();
    alert('Calificación guardada correctamente');
  };

  const handleCreateStudent = async (e) => {
    e.preventDefault();
    setCreatingUser(true);

    // 1. Crear el usuario en el sistema de Autenticación de Supabase
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: studentEmail,
      password: studentPassword,
      email_confirm: true // Se marca como confirmado automáticamente
    });

    if (authError) {
      alert('Error al crear cuenta: ' + authError.message);
      setCreatingUser(false);
      return;
    }

    // 2. Guardar su perfil en nuestra tabla de "profiles"
    // Usamos supabaseAdmin para saltarnos las reglas de seguridad e insertarlo directo
    const { error: profileError } = await supabaseAdmin.from('profiles').insert({
      id: authData.user.id,
      role: 'student',
      full_name: studentName
    });

    if (profileError) {
      alert('Alumno creado, pero hubo un error al guardar su nombre.');
    } else {
      alert('¡Alumno creado con éxito! Ya puede iniciar sesión.');
      setStudentName('');
      setStudentEmail('');
      setStudentPassword('');
    }
    setCreatingUser(false);
  };

  return (
    <div className="space-y-8">
      
      {/* SECCIÓN 1: Formulario para crear alumnos */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-bold mb-4">Registrar Nuevo Alumno</h2>
        <form onSubmit={handleCreateStudent} className="flex flex-col md:flex-row gap-4">
          <input 
            type="text" 
            placeholder="Nombre completo" 
            required 
            className="border p-2 rounded flex-1" 
            value={studentName} 
            onChange={e => setStudentName(e.target.value)} 
          />
          <input 
            type="email" 
            placeholder="Correo del alumno" 
            required 
            className="border p-2 rounded flex-1" 
            value={studentEmail} 
            onChange={e => setStudentEmail(e.target.value)} 
          />
          <input 
            type="password" 
            placeholder="Asignar contraseña" 
            required 
            className="border p-2 rounded flex-1" 
            value={studentPassword} 
            onChange={e => setStudentPassword(e.target.value)} 
          />
          <button 
            type="submit" 
            disabled={creatingUser} 
            className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:bg-blue-400 font-semibold"
          >
            {creatingUser ? 'Creando...' : 'Crear Alumno'}
          </button>
        </form>
      </div>

      {/* SECCIÓN 2: Lista de Entregas y Visor PDF */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-bold mb-4">Entregas Recientes</h2>
          <div className="space-y-4">
            {submissions.map((sub) => (
              <div key={sub.id} className="border p-4 rounded-lg flex justify-between items-center">
                <div>
                  <p className="font-semibold">{sub.profiles?.full_name || 'Alumno'}</p>
                  <p className="text-sm text-gray-500">Tarea: {sub.assignments?.title}</p>
                  <p className="text-sm font-bold text-blue-600">
                    Calificación: {sub.grade ? sub.grade : 'Sin calificar'}
                  </p>
                </div>
                <button 
                  onClick={() => {
                    setSelectedPdf(sub.pdf_url);
                    setCurrentSubmissionId(sub.id);
                    setGradeInput(sub.grade || '');
                  }}
                  className="bg-indigo-100 text-indigo-700 px-4 py-2 rounded hover:bg-indigo-200"
                >
                  Revisar PDF
                </button>
              </div>
            ))}
          </div>
        </div>

        {selectedPdf && (
          <div className="bg-white p-6 rounded-lg shadow flex flex-col">
            <h2 className="text-xl font-bold mb-4">Revisión de Documento</h2>
            <iframe 
              src={selectedPdf} 
              className="w-full h-96 border rounded mb-4"
              title="PDF Viewer"
            />
            <div className="flex gap-4 mt-auto">
              <input 
                type="number" 
                placeholder="Calificación (0-100)"
                value={gradeInput}
                onChange={(e) => setGradeInput(e.target.value)}
                className="border p-2 rounded flex-1"
              />
              <button onClick={saveGrade} className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700">
                Guardar
              </button>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
