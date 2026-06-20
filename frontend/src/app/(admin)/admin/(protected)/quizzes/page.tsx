"use client";

import { useEffect, useState } from "react";
import { adminContentApi, AdminQuizList } from "@/lib/api/admin-content-api";
import { GlowCard } from "@/components/effects/glow-card";
import { Layers, Trash2, Search, Eye, XCircle, CheckCircle2 } from "lucide-react";

export default function QuizzesPage() {
  const [quizzes, setQuizzes] = useState<AdminQuizList[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedQuiz, setSelectedQuiz] = useState<any>(null);

  const fetchQuizzes = async () => {
    setLoading(true);
    try {
      const res = await adminContentApi.listQuizzes();
      setQuizzes(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuizzes();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this quiz? This action cannot be undone.")) return;
    try {
      await adminContentApi.deleteQuiz(id);
      setQuizzes(quizzes.filter(q => q.id !== id));
      if (selectedQuiz?.id === id) setSelectedQuiz(null);
    } catch (err) {
      alert("Failed to delete quiz");
    }
  };

  const handleView = async (id: string) => {
    try {
      const res = await adminContentApi.getQuiz(id);
      setSelectedQuiz(res);
    } catch (err) {
      alert("Failed to load quiz details");
    }
  };

  const filteredQuizzes = quizzes.filter(q => 
    q.owner_email.toLowerCase().includes(search.toLowerCase()) ||
    (q.title && q.title.toLowerCase().includes(search.toLowerCase())) ||
    (q.document_name && q.document_name.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-8 animate-in fade-in max-w-7xl mx-auto pb-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">Quizzes Moderation</h1>
          <p className="text-muted-foreground">Monitor and manage user-generated quizzes.</p>
        </div>
        <div className="relative w-full md:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input 
            type="text" 
            placeholder="Search by email or doc..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-secondary border border-border/50 rounded-lg text-sm text-foreground focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      <GlowCard className="p-6">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-background/50 text-muted-foreground border-y border-border/50">
              <tr>
                <th className="px-4 py-3 font-medium">Owner</th>
                <th className="px-4 py-3 font-medium">Title / Source</th>
                <th className="px-4 py-3 font-medium">Questions</th>
                <th className="px-4 py-3 font-medium">Created At</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {filteredQuizzes.map(quiz => (
                <tr key={quiz.id} className="hover:bg-secondary/50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-medium text-foreground">{quiz.owner_name || "User"}</div>
                    <div className="text-xs text-muted-foreground">{quiz.owner_email}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-foreground font-medium">{quiz.title || "Untitled Quiz"}</div>
                    <div className="text-xs text-muted-foreground max-w-[200px] truncate" title={quiz.document_name || "Direct Generation"}>
                      {quiz.document_name ? <span className="flex items-center gap-1"><Layers className="w-3 h-3 text-indigo-400"/> {quiz.document_name}</span> : <span>Direct Generation</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{quiz.question_count}</td>
                  <td className="px-4 py-3 text-muted-foreground">{new Date(quiz.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-right space-x-2">
                    <button onClick={() => handleView(quiz.id)} className="p-1.5 bg-secondary text-muted-foreground hover:bg-indigo-500 hover:text-white rounded transition-colors">
                      <Eye className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(quiz.id)} className="p-1.5 bg-secondary text-rose-400 hover:bg-rose-500 hover:text-white rounded transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {filteredQuizzes.length === 0 && !loading && (
                <tr>
                  <td colSpan={5} className="text-center py-6 text-muted-foreground">No quizzes found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </GlowCard>

      {selectedQuiz && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-background border border-border/50 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl">
            <div className="p-4 border-b border-border/50 flex justify-between items-center bg-secondary/50">
              <h3 className="text-lg font-bold">Quiz Review: {selectedQuiz.title || "Untitled Quiz"}</h3>
              <button onClick={() => setSelectedQuiz(null)} className="p-1 text-muted-foreground hover:text-foreground"><XCircle className="w-6 h-6"/></button>
            </div>
            <div className="p-6 overflow-y-auto space-y-6">
              <div className="flex justify-between items-center pb-4 border-b border-border/50">
                <div className="text-sm">
                  <span className="text-muted-foreground block">Owner</span>
                  <span className="text-muted-foreground">{selectedQuiz.owner_email}</span>
                </div>
                <div className="text-sm text-right">
                  <span className="text-muted-foreground block">Total Questions</span>
                  <span className="text-muted-foreground">{selectedQuiz.questions?.length || 0}</span>
                </div>
              </div>

              {selectedQuiz.questions?.map((q: any, idx: number) => (
                <div key={q.id} className="p-4 bg-secondary border border-border/50 rounded-xl space-y-3">
                  <div className="flex gap-3">
                    <div className="w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-xs font-bold shrink-0">{idx + 1}</div>
                    <div className="text-sm font-medium text-foreground mt-0.5">{q.question}</div>
                  </div>
                  
                  <div className="space-y-2 pl-9">
                    {q.options.map((opt: string, optIdx: number) => (
                      <div key={optIdx} className={`text-sm p-2 rounded-lg border ${optIdx === q.correct_answer ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-background border-border/50 text-muted-foreground'}`}>
                        {optIdx === q.correct_answer && <CheckCircle2 className="w-4 h-4 inline-block mr-2 text-emerald-500"/>}
                        {opt}
                      </div>
                    ))}
                  </div>

                  {q.explanation && (
                    <div className="mt-3 pl-9">
                      <div className="text-xs font-medium text-muted-foreground uppercase mb-1">Explanation</div>
                      <p className="text-xs text-muted-foreground">{q.explanation}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
