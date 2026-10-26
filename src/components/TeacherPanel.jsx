import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export default function TeacherPanel() {
  const [submissions, setSubmissions] = useState([]);
  const [selectedPdf, setSelectedPdf] = useState(null);
  const [gradeInput, setGradeInput] = useState('');
  const [currentSubmissionId, setCurrentSubmissionId] = useState(null);

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

  return (
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
  );
}
