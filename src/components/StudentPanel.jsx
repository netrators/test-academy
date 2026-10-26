import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export default function StudentPanel({ user }) {
  const [assignments, setAssignments] = useState([]);
  const [mySubmissions, setMySubmissions] = useState({});
  const [uploading, setUploading] = useState(false);
  const [viewingPdf, setViewingPdf] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const { data: tasks } = await supabase.from('assignments').select('*');
    setAssignments(tasks || []);

    const { data: subs } = await supabase
      .from('submissions')
      .select('*')
      .eq('student_id', user.id);
    
    const subMap = {};
    subs?.forEach(sub => { subMap[sub.assignment_id] = sub; });
    setMySubmissions(subMap);
  };

  const handleFileUpload = async (e, assignmentId) => {
    const file = e.target.files[0];
    if (!file || file.type !== 'application/pdf') return alert('Solo PDFs');
    
    setUploading(true);
    const fileName = `${user.id}-${assignmentId}-${Date.now()}.pdf`;
    
    const { error: uploadError } = await supabase.storage
      .from('submissions_pdfs')
      .upload(fileName, file);

    if (uploadError) {
      alert('Error al subir');
      setUploading(false);
      return;
    }

    const { data: publicUrl } = supabase.storage
      .from('submissions_pdfs')
      .getPublicUrl(fileName);

    await supabase.from('submissions').insert({
      assignment_id: assignmentId,
      student_id: user.id,
      pdf_url: publicUrl.publicUrl
    });

    setUploading(false);
    fetchData();
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-bold mb-4">Mis Tareas</h2>
        <div className="space-y-4">
          {assignments.map((task) => {
            const mySub = mySubmissions[task.id];
            return (
              <div key={task.id} className="border p-4 rounded-lg flex justify-between items-center">
                <div>
                  <p className="font-semibold">{task.title}</p>
                  {mySub ? (
                    <p className="text-sm font-bold text-green-600">
                      Calificación: {mySub.grade ? mySub.grade : 'Pendiente'}
                    </p>
                  ) : (
                    <p className="text-sm text-red-500">No entregado</p>
                  )}
                </div>
                
                <div className="flex gap-2">
                  {mySub ? (
                    <button 
                      onClick={() => setViewingPdf(mySub.pdf_url)}
                      className="bg-blue-100 text-blue-700 px-4 py-2 rounded hover:bg-blue-200"
                    >
                      Ver mi entrega
                    </button>
                  ) : (
                    <label className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 cursor-pointer">
                      {uploading ? 'Subiendo...' : 'Subir PDF'}
                      <input 
                        type="file" 
                        accept="application/pdf" 
                        className="hidden" 
                        onChange={(e) => handleFileUpload(e, task.id)}
                        disabled={uploading}
                      />
                    </label>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {viewingPdf && (
         <div className="bg-white p-6 rounded-lg shadow">
         <h2 className="text-xl font-bold mb-4">Visor de Documento</h2>
         <iframe 
           src={viewingPdf} 
           className="w-full h-96 border rounded"
           title="Mi PDF"
         />
       </div>
      )}
    </div>
  );
}
