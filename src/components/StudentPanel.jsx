import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { BookOpen, CheckCircle, Clock, Award, UploadCloud, MessageSquare, FileText } from 'lucide-react';

export default function StudentPanel({ user }) {
  const [assignments, setAssignments] = useState([]);
  const [mySubmissions, setMySubmissions] = useState({});
  const [selectedTask, setSelectedTask] = useState(null);
  const [file, setFile] = useState(null);
  const [studentComment, setStudentComment] = useState('');
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const { data: tasks } = await supabase.from('assignments').select('*').order('created_at', { ascending: false });
    setAssignments(tasks || []);

    const { data: subs } = await supabase.from('submissions').select('*').eq('student_id', user.id);
    const subMap = {};
    subs?.forEach(sub => { subMap[sub.assignment_id] = sub; });
    setMySubmissions(subMap);
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file || file.type !== 'application/pdf') return alert('Por favor selecciona un archivo PDF válido.');
    
    setUploading(true);
    const fileName = `${user.id}-${selectedTask.id}-${Date.now()}.pdf`;
    
    const { error: uploadError } = await supabase.storage
      .from('submissions_pdfs')
      .upload(fileName, file);

    if (uploadError) {
      alert('Error al subir el archivo.');
      setUploading(false);
      return;
    }

    const { data: publicUrl } = supabase.storage.from('submissions_pdfs').getPublicUrl(fileName);

    await supabase.from('submissions').insert({
      assignment_id: selectedTask.id,
      student_id: user.id,
      pdf_url: publicUrl.publicUrl,
      student_comment: studentComment,
      status: 'subido'
    });

    setFile(null);
    setStudentComment('');
    setUploading(false);
    fetchData();
  };

  // Cálculos para el Resumen
  const totalTasks = assignments.length;
  const submittedTasks = Object.values(mySubmissions).length;
  const gradedTasks = Object.values(mySubmissions).filter(s => s.status === 'revisado').length;
  const averageGrade = gradedTasks > 0 
    ? (Object.values(mySubmissions).reduce((acc, curr) => acc + (curr.grade || 0), 0) / gradedTasks).toFixed(1) 
    : 0;

  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* Dashboard Resumen */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 border border-blue-200 p-4 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1 flex items-center gap-4">
          <div className="p-3 bg-blue-200 text-blue-700 rounded-xl"><BookOpen size={24} /></div>
          <div><p className="text-sm text-blue-600 font-medium">Asignadas</p><p className="text-2xl font-bold text-blue-800">{totalTasks}</p></div>
        </div>
        <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1 flex items-center gap-4">
          <div className="p-3 bg-amber-200 text-amber-700 rounded-xl"><Clock size={24} /></div>
          <div><p className="text-sm text-amber-600 font-medium">Entregadas</p><p className="text-2xl font-bold text-amber-800">{submittedTasks}</p></div>
        </div>
        <div className="bg-green-50 border border-green-200 p-4 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1 flex items-center gap-4">
          <div className="p-3 bg-green-200 text-green-700 rounded-xl"><CheckCircle size={24} /></div>
          <div><p className="text-sm text-green-600 font-medium">Revisadas</p><p className="text-2xl font-bold text-green-800">{gradedTasks}</p></div>
        </div>
        <div className="bg-purple-50 border border-purple-200 p-4 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1 flex items-center gap-4">
          <div className="p-3 bg-purple-200 text-purple-700 rounded-xl"><Award size={24} /></div>
          <div><p className="text-sm text-purple-600 font-medium">Promedio</p><p className="text-2xl font-bold text-purple-800">{averageGrade}</p></div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Lista de Tareas */}
        <div className="lg:col-span-1 bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
          <h2 className="text-xl font-bold mb-6 text-gray-800">Tus Tareas</h2>
          <div className="space-y-4">
            {assignments.length === 0 && <p className="text-gray-500 text-center py-4">No hay tareas asignadas aún.</p>}
            
            {assignments.map((task) => {
              const mySub = mySubmissions[task.id];
              const isSelected = selectedTask?.id === task.id;
              let statusColor = 'bg-gray-50 border-gray-200';
              let statusText = 'Pendiente';
              
              if (mySub) {
                if (mySub.status === 'revisado') {
                  statusColor = 'bg-green-50 border-green-200';
                  statusText = `Calificación: ${mySub.grade}`;
                } else {
                  statusColor = 'bg-amber-50 border-amber-200';
                  statusText = 'En revisión';
                }
              }

              return (
                <div 
                  key={task.id} 
                  onClick={() => setSelectedTask(task)}
                  className={`p-4 rounded-2xl border-2 cursor-pointer transition-all duration-300 hover:scale-[1.02] ${isSelected ? 'ring-2 ring-indigo-400 ring-offset-2' : ''} ${statusColor}`}
                >
                  <h3 className="font-bold text-gray-800">{task.title}</h3>
                  <p className="text-sm text-gray-600 mt-1 line-clamp-2">{task.description}</p>
                  <div className="mt-3 inline-block px-3 py-1 rounded-full bg-white/60 text-xs font-semibold shadow-sm">
                    {statusText}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Panel de Detalles y Visor */}
        <div className="lg:col-span-2">
          {!selectedTask ? (
            <div className="h-full min-h-[400px] flex flex-col items-center justify-center bg-indigo-50/50 rounded-3xl border border-indigo-100 p-8 text-center">
              <FileText size={64} className="text-indigo-200 mb-4" />
              <h2 className="text-2xl font-bold text-indigo-900 mb-2">Selecciona una tarea</h2>
              <p className="text-indigo-500">Haz clic en una tarea de la lista para ver los detalles, subir tu documento o ver tus calificaciones.</p>
            </div>
          ) : (
            <div className="bg-white p-6 md:p-8 rounded-3xl shadow-lg border border-indigo-50 animate-fade-in">
              <h2 className="text-3xl font-extrabold text-gray-800 mb-2">{selectedTask.title}</h2>
              <p className="text-gray-600 mb-8">{selectedTask.description}</p>

              {/* Si ya entregó */}
              {mySubmissions[selectedTask.id] ? (
                <div className="space-y-6">
                  <div className={`p-6 rounded-2xl border-2 ${mySubmissions[selectedTask.id].status === 'revisado' ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
                    <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                      {mySubmissions[selectedTask.id].status === 'revisado' ? <CheckCircle className="text-green-600"/> : <Clock className="text-amber-600"/>}
                      {mySubmissions[selectedTask.id].status === 'revisado' ? 'Tarea Revisada' : 'Entrega en Revisión'}
                    </h3>
                    
                    {mySubmissions[selectedTask.id].status === 'revisado' && (
                      <div className="mb-6 p-4 bg-white rounded-xl shadow-sm">
                        <p className="text-sm text-gray-500 font-semibold mb-1">Tu calificación:</p>
                        <p className="text-4xl font-black text-green-600">{mySubmissions[selectedTask.id].grade}<span className="text-lg text-gray-400">/100</span></p>
                        {mySubmissions[selectedTask.id].teacher_comment && (
                          <div className="mt-4 p-4 bg-blue-50 border border-blue-100 rounded-lg">
                            <p className="text-xs font-bold text-blue-800 uppercase tracking-wider mb-1 flex items-center gap-1"><MessageSquare size={14}/> Comentario del Maestro</p>
                            <p className="text-blue-900">{mySubmissions[selectedTask.id].teacher_comment}</p>
                          </div>
                        )}
                      </div>
                    )}

                    {mySubmissions[selectedTask.id].student_comment && (
                      <div className="mb-6 p-4 bg-white/60 rounded-xl">
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Tu comentario</p>
                        <p className="text-gray-800">{mySubmissions[selectedTask.id].student_comment}</p>
                      </div>
                    )}

                    <h4 className="font-bold text-gray-700 mb-2">Tu documento entregado:</h4>
                    <iframe src={mySubmissions[selectedTask.id].pdf_url} className="w-full h-96 border-2 border-white rounded-xl shadow-sm bg-white" title="PDF Viewer" />
                  </div>
                </div>
              ) : (
                /* Si no ha entregado */
                <form onSubmit={handleUpload} className="bg-indigo-50 border border-indigo-100 p-6 md:p-8 rounded-2xl space-y-6">
                  <div>
                    <label className="block text-sm font-bold text-indigo-900 mb-2">Selecciona tu PDF</label>
                    <div className="flex items-center justify-center w-full">
                      <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-indigo-300 border-dashed rounded-xl cursor-pointer bg-white hover:bg-indigo-50 transition-colors">
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                          <UploadCloud className="w-10 h-10 mb-3 text-indigo-400" />
                          <p className="mb-2 text-sm text-gray-500"><span className="font-semibold">Haz clic para buscar</span> o arrastra tu archivo</p>
                          <p className="text-xs text-indigo-500 font-medium">{file ? file.name : 'Solo documentos PDF'}</p>
                        </div>
                        <input type="file" accept="application/pdf" className="hidden" onChange={(e) => setFile(e.target.files[0])} />
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-indigo-900 mb-2">Comentario (Opcional)</label>
                    <textarea 
                      rows="3" 
                      className="w-full p-4 rounded-xl border border-indigo-200 focus:ring-2 focus:ring-indigo-400 outline-none transition-shadow bg-white"
                      placeholder="Agrega un mensaje para tu maestro..."
                      value={studentComment}
                      onChange={(e) => setStudentComment(e.target.value)}
                    ></textarea>
                  </div>

                  <button 
                    type="submit" 
                    disabled={uploading || !file}
                    className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold py-4 px-6 rounded-xl hover:shadow-lg hover:from-indigo-600 hover:to-purple-700 transition-all duration-300 transform hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {uploading ? 'Enviando Tarea...' : 'Entregar Tarea'}
                  </button>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
