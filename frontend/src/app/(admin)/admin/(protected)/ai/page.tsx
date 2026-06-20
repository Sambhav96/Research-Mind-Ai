"use client";

import { useEffect, useState } from "react";
import { adminAiMonitoringApi, AIAggregationsResponse, AILogResponse } from "@/lib/api/admin-ai-monitoring-api";
import { GlowCard } from "@/components/effects/glow-card";
import { Activity, Clock, Database, CheckCircle2, XCircle, ChevronLeft, ChevronRight, Filter, Eye } from "lucide-react";

export default function AIMonitoringPage() {
  const [aggregations, setAggregations] = useState<AIAggregationsResponse | null>(null);
  const [logs, setLogs] = useState<AILogResponse[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("All");
  const [modelFilter, setModelFilter] = useState("All");
  const [timeRange, setTimeRange] = useState("7d");
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<AILogResponse | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [aggRes, logsRes] = await Promise.all([
        adminAiMonitoringApi.getAggregations(timeRange),
        adminAiMonitoringApi.getLogs({ page, size: 10, status: statusFilter, model: modelFilter })
      ]);
      setAggregations(aggRes);
      setLogs(logsRes.logs);
      setTotal(logsRes.total);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [page, statusFilter, modelFilter, timeRange]);

  const totalPages = Math.ceil(total / 10);

  return (
    <div className="space-y-8 animate-in fade-in max-w-7xl mx-auto pb-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">AI Monitoring</h1>
          <p className="text-muted-foreground">Monitor AI performance, costs, and review logs.</p>
        </div>
        <select 
          value={timeRange} 
          onChange={e => { setTimeRange(e.target.value); setPage(1); }}
          className="bg-secondary border border-border/50 rounded-lg px-4 py-2 text-sm text-muted-foreground focus:outline-none focus:border-indigo-500"
        >
          <option value="24h">Last 24 Hours</option>
          <option value="7d">Last 7 Days</option>
          <option value="30d">Last 30 Days</option>
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <GlowCard className="p-6 flex items-center gap-4">
          <div className="p-3 bg-indigo-500/10 rounded-xl"><Activity className="w-6 h-6 text-indigo-500"/></div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Total Requests</p>
            <h3 className="text-2xl font-bold text-foreground">{aggregations?.total_requests.toLocaleString() || 0}</h3>
          </div>
        </GlowCard>
        <GlowCard className="p-6 flex items-center gap-4">
          <div className="p-3 bg-emerald-500/10 rounded-xl"><CheckCircle2 className="w-6 h-6 text-emerald-500"/></div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Success Rate</p>
            <h3 className="text-2xl font-bold text-foreground">{aggregations?.success_rate.toFixed(1) || 0}%</h3>
          </div>
        </GlowCard>
        <GlowCard className="p-6 flex items-center gap-4">
          <div className="p-3 bg-amber-500/10 rounded-xl"><Clock className="w-6 h-6 text-amber-500"/></div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Avg Latency</p>
            <h3 className="text-2xl font-bold text-foreground">{aggregations?.avg_latency_ms.toFixed(0) || 0} ms</h3>
          </div>
        </GlowCard>
        <GlowCard className="p-6 flex items-center gap-4">
          <div className="p-3 bg-rose-500/10 rounded-xl"><Database className="w-6 h-6 text-rose-500"/></div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Total Tokens / Cost</p>
            <h3 className="text-xl font-bold text-foreground">{aggregations?.total_tokens.toLocaleString() || 0} / ${aggregations?.total_cost.toFixed(2) || "0.00"}</h3>
          </div>
        </GlowCard>
      </div>

      <GlowCard className="p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <h2 className="text-xl font-bold flex items-center gap-2"><Database className="w-5 h-5 text-indigo-400" /> Recent AI Requests</h2>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <select value={modelFilter} onChange={e => { setModelFilter(e.target.value); setPage(1); }} className="bg-background border border-border/50 rounded-lg px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none">
              <option value="All">All Models</option>
              <option value="gpt-4">GPT-4</option>
              <option value="gpt-3.5-turbo">GPT-3.5</option>
              <option value="claude-3-opus">Claude 3 Opus</option>
              <option value="claude-3-sonnet">Claude 3 Sonnet</option>
              <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
            </select>
            <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }} className="bg-background border border-border/50 rounded-lg px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none">
              <option value="All">All Status</option>
              <option value="success">Success</option>
              <option value="error">Error</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-background/50 text-muted-foreground border-y border-border/50">
              <tr>
                <th className="px-4 py-3 font-medium">Time</th>
                <th className="px-4 py-3 font-medium">Model</th>
                <th className="px-4 py-3 font-medium">Latency</th>
                <th className="px-4 py-3 font-medium">Tokens / Cost</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-secondary/50 transition-colors">
                  <td className="px-4 py-3 text-muted-foreground">{new Date(log.created_at).toLocaleString()}</td>
                  <td className="px-4 py-3 font-medium text-foreground">{log.model}</td>
                  <td className="px-4 py-3 text-muted-foreground">{log.latency_ms} ms</td>
                  <td className="px-4 py-3 text-muted-foreground">{log.tokens_used} / ${log.cost.toFixed(4)}</td>
                  <td className="px-4 py-3">
                    {log.status === 'success' ? (
                      <span className="text-emerald-500 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Success</span>
                    ) : (
                      <span className="text-rose-500 flex items-center gap-1"><XCircle className="w-3.5 h-3.5" /> Error</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => setSelectedLog(log)} className="p-1.5 bg-secondary hover:bg-indigo-600 rounded-md transition-colors text-muted-foreground hover:text-white">
                      <Eye className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {logs.length === 0 && !loading && (
                <tr>
                  <td colSpan={6} className="text-center py-6 text-muted-foreground">No logs found matching your filters.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-between mt-6 pt-6 border-t border-border/50">
            <div className="text-sm text-muted-foreground">
              Showing <span className="font-medium text-muted-foreground">{((page - 1) * 10) + 1}</span> to <span className="font-medium text-muted-foreground">{Math.min(page * 10, total)}</span> of <span className="font-medium text-muted-foreground">{total}</span>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-1.5 rounded-lg border border-border/50 bg-secondary text-muted-foreground hover:text-foreground disabled:opacity-50">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="text-sm font-medium px-2">{page} / {totalPages}</span>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-1.5 rounded-lg border border-border/50 bg-secondary text-muted-foreground hover:text-foreground disabled:opacity-50">
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </GlowCard>

      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-background border border-border/50 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
            <div className="p-4 border-b border-border/50 flex justify-between items-center bg-secondary/50">
              <h3 className="text-lg font-bold">Log Details - {selectedLog.model}</h3>
              <button onClick={() => setSelectedLog(null)} className="p-1 text-muted-foreground hover:text-foreground"><XCircle className="w-6 h-6"/></button>
            </div>
            <div className="p-6 overflow-y-auto space-y-6">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                <div><span className="text-muted-foreground block">Time</span>{new Date(selectedLog.created_at).toLocaleString()}</div>
                <div><span className="text-muted-foreground block">Latency</span>{selectedLog.latency_ms} ms</div>
                <div><span className="text-muted-foreground block">Tokens</span>{selectedLog.tokens_used}</div>
                <div><span className="text-muted-foreground block">Cost</span>${selectedLog.cost.toFixed(4)}</div>
              </div>
              
              {selectedLog.error_message && (
                <div className="p-4 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm">
                  <span className="font-bold block mb-1">Error:</span>
                  {selectedLog.error_message}
                </div>
              )}

              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-2">Prompt</h4>
                <div className="bg-secondary border border-border/50 rounded-lg p-4 text-sm font-mono text-muted-foreground overflow-x-auto max-h-64">
                  <pre className="whitespace-pre-wrap break-words">{selectedLog.prompt || "No prompt recorded"}</pre>
                </div>
              </div>
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-2">Response</h4>
                <div className="bg-secondary border border-border/50 rounded-lg p-4 text-sm font-mono text-muted-foreground overflow-x-auto max-h-64">
                  <pre className="whitespace-pre-wrap break-words">{selectedLog.response || "No response recorded"}</pre>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
