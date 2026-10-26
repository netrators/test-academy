import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { createClient } from '@supabase/supabase-js';
import { UserPlus, PlusCircle, FileText, CheckCircle, Clock } from 'lucide-react';

const supabaseAdmin = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export default function TeacherPanel() {
  const [submissions, setSubmissions] = useState([]);
  
  // Estados para calificar
  const [selectedSub, setSelectedSub] = useState(null);
  const [gradeInput, setGradeInput] = useState('');
  const [teacherComment, setTeacherComment] = useState('');

  // Estados para creación
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  
  const [studentName, setStudentName] = useState('');
  const [studentEmail, setStudentEmail] = useState('');
  const [studentPassword, setStudentPassword] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchSubmissions();
  }, []);

  const fetchSubmissions = async () => {
    const { data } = await supabase
      .from('submissions')
      .select('*, profiles(full_name), assignments(title)')
      .order('created_at', { ascending: false });
    setSubmissions(data || []);
  };

  const handleCreateAssignment = async (e) => {
    e.preventDefault();
    await supabase.from('assignments').insert({ title: taskTitle, description: taskDesc });
    alert('Tarea creada con éxito');
    setTaskTitle('');
    setTaskDesc('');
  };

  const handleCreateStudent = async (e) => {
    e.preventDefault();
    setCreating(true);
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: studentEmail, password: studentPassword, email_confirm: true
    });

    if (authError) alert('Error: ' + authError.message);
    else {
      await supabaseAdmin.from('profiles').insert({ id: authData.user.id, role: 'student', full_name: studentName });
      alert('Alumno creado con éxito');
      setStudentName(''); setStudentEmail(''); setStudentPassword('');
    }
    setCreating(false);
  };

  const saveGrade = async () => {
    await supabase
      .from('submissions')
      .update({ 
        grade: parseFloat(gradeInput),
        teacher_comment: teacherComment,
        status: 'revisado'
      })
      .eq('id', selectedSub.id);
    
    setSelectedSub(null);
    setGradeInput('');
    setTeacherComment('');
    fetchSubmissions();
  };

  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* Controles de Administración */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Crear Alumno */}
        <div className="bg-emerald-50 border border-emerald-200 p-6 rounded-3xl shadow-sm hover:shadow-md transition-shadow">
          <h2 className="text-xl font-bold mb-4 text-emerald-800 flex items-center gap-2"><UserPlus /> Registrar Alumno</h2>
          <form onSubmit={handleCreateStudent} className="space-y-3">
            <input type="text" placeholder="Nombre completo" required className="w-full border-none p-3 rounded-xl shadow-sm focus:ring-2 focus:ring-emerald-400" value={studentName} onChange={e => setStudentName(e.target.value)} />
            <div className="flex gap-3">
              <input type="email" placeholder="Correo" required className="w-full border-none p-3 rounded-xl shadow-sm focus:ring-2 focus:ring-emerald-400" value={studentEmail} onChange={e => setStudentEmail(e.target.value)} />
              <input type="password" placeholder="Contraseña" required className="w-full border-none p-3 rounded-xl shadow-sm focus:ring-2 focus:ring-emerald-400" value={studentPassword} onChange={e => setStudentPassword(e.target.value)} />
            </div>
            <button type="submit" disabled={creating} className="w-full bg-emerald-600 text-white font-bold py-3 rounded-xl hover:bg-emerald-700 transition-colors">{creating ? 'Creando...' : 'Crear Alumno'}</button>
          </form>
        </div>

        {/* Crear Tarea */}
        <div className="bg-blue-50 border border-blue-200 p-6 rounded-3xl shadow-sm hover:shadow-md transition-shadow">
          <h2 className="text-xl font-bold mb-4 text-blue-800 flex items-center gap-2"><PlusCircle /> Nueva Tarea</h2>
          <form onSubmit={handleCreateAssignment} className="space-y-3">
            <input type="text" placeholder="Título de la tarea" required className="w-full border-none p-3 rounded-xl shadow-sm focus:ring-2 focus:ring-blue-400" value={taskTitle} onChange={e => setTaskTitle(e.target.value)} />
            <textarea placeholder="Descripción / Instrucciones" required rows="2" className="w-full border-none p-3 rounded-xl shadow-sm focus:ring-2 focus:ring-blue-400" value={taskDesc} onChange={e => setTaskDesc(e.target.value)}></textarea>
            <button type="submit" className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 transition-colors">Publicar Tarea</button>
          </form>
        </div>
      </div>

      {/* Entregas y Revisión */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Lista de Entregas */}
        <div className="lg:col-span-1 bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
          <h2 className="text-xl font-bold mb-6 text-gray-800 flex items-center gap-2"><FileText /> Entregas de Alumnos</h2>
          <div className="space-y-4">
            {submissions.map((sub) => {
              const isSelected = selectedSub?.id === sub.id;
              const isReviewed = sub.status === 'revisado';
              
              return (
                <div 
                  key={sub.id} 
                  onClick={() => {
                    setSelectedSub(sub);
                    setGradeInput(sub.grade || '');
                    setTeacherComment(sub.teacher_comment || '');
                  }}
                  className={`p-4 rounded-2xl border-2 cursor-pointer transition-all duration-300 hover:scale-[1.02] ${isSelected ? 'ring-2 ring-indigo-400' : ''} ${isReviewed ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <p className="font-bold text-gray-800">{sub.profiles?.full_name}</p>
                    {isReviewed ? <CheckCircle size={18} className="text-green-600"/> : <Clock size={18} className="text-amber-600"/>}
                  </div>
                  <p className="text-sm text-gray-600 line-clamp-1">{sub.assignments?.title}</p>
                  <p className={`text-xs font-bold mt-2 ${isReviewed ? 'text-green-700' : 'text-amber-700'}`}>
                    {isReviewed ? `Calificación: ${sub.grade}/100` : 'Requiere revisión'}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Visor y Calificador */}
        <div className="lg:col-span-2">
          {!selectedSub ? (
             <div className="h-full min-h-[400px] flex flex-col items-center justify-center bg-gray-50 rounded-3xl border border-gray-200 p-8 text-center">
             <FileText size={64} className="text-gray-300 mb-4" />
             <h2 className="text-2xl font-bold text-gray-500">Selecciona una entrega</h2>
             <p className="text-gray-400">Haz clic en una entrega del panel izquierdo para visualizar el documento y asignar una calificación.</p>
           </div>
          ) : (
            <div className="bg-white p-6 md:p-8 rounded-3xl shadow-lg border border-indigo-50">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">{selectedSub.profiles?.full_name}</h2>
                  <p className="text-indigo-600 font-medium">{selectedSub.assignments?.title}</p>
                </div>
                <div className={`px-4 py-1 rounded-full font-bold text-sm ${selectedSub.status === 'revisado' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                  {selectedSub.status === 'revisado' ? 'Revisado' : 'Pendiente'}
                </div>
              </div>

              {selectedSub.student_comment && (
                <div className="mb-6 p-4 bg-indigo-50 border border-indigo-100 rounded-xl">
                  <p className="text-xs font-bold text-indigo-400 uppercase mb-1">Comentario del alumno:</p>
                  <p className="text-indigo-900 italic">"{selectedSub.student_comment}"</p>
                </div>
              )}

              <iframe src={selectedSub.pdf_url} className="w-full h-96 border-2 border-gray-100 rounded-xl shadow-inner mb-6 bg-gray-50" title="PDF Viewer" />
              
              <div className="bg-gray-50 p-6 rounded-2xl border border-gray-200">
                <h3 className="font-bold text-gray-800 mb-4">Evaluación</h3>
                <div className="flex flex-col md:flex-row gap-4 mb-4">
                  <div className="flex-1">
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Comentario para el alumno</label>
                    <textarea 
                      rows="2"
                      placeholder="Excelente trabajo, pero te faltó..."
                      value={teacherComment}
                      onChange={(e) => setTeacherComment(e.target.value)}
                      className="w-full p-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-indigo-400 outline-none"
                    ></textarea>
                  </div>
                  <div className="w-full md:w-32">
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Calificación</label>
                    <input 
                      type="number" 
                      placeholder="0-100"
                      value={gradeInput}
                      onChange={(e) => setGradeInput(e.target.value)}
                      className="w-full p-3 text-xl font-bold text-center rounded-xl border border-gray-300 focus:ring-2 focus:ring-indigo-400 outline-none"
                    />
                  </div>
                </div>
                <button onClick={saveGrade} className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl hover:bg-indigo-700 hover:shadow-lg transition-all hover:-translate-y-0.5">
                  Guardar Evaluación y Regresar Tarea
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
