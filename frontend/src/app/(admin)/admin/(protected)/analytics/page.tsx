"use client";

import { useEffect, useState } from "react";
import { adminAnalyticsApi, AdminAnalyticsResponse } from "@/lib/api/admin-analytics-api";
import { GlowCard } from "@/components/effects/glow-card";
import { Activity, Users, FileText, BrainCircuit } from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';

export default function AnalyticsPage() {
  const [data, setData] = useState<AdminAnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await adminAnalyticsApi.getAnalytics(days);
        setData(res);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [days]);

  const chartData = data
    ? data.new_users.map((item, i) => ({
        date: new Date(item.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        Users: item.value,
        Documents: data.document_uploads[i]?.value || 0,
        AIRequests: data.ai_requests[i]?.value || 0
      }))
    : [];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-secondary border border-border rounded-xl p-3 shadow-xl">
          <p className="text-muted-foreground text-xs mb-2">{label}</p>
          {payload.map((entry: any) => (
            <p key={entry.dataKey} className="text-sm font-medium" style={{ color: entry.color }}>
              {entry.name}: <span className="font-bold">{entry.value}</span>
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-8 animate-in fade-in max-w-7xl mx-auto pb-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">Platform Analytics</h1>
          <p className="text-muted-foreground">Time-series aggregations for all platform metrics.</p>
        </div>
        <select
          value={days}
          onChange={e => setDays(Number(e.target.value))}
          className="bg-secondary border border-border/50 rounded-lg px-4 py-2 text-sm text-muted-foreground focus:outline-none focus:border-indigo-500"
        >
          <option value={7}>Last 7 Days</option>
          <option value={30}>Last 30 Days</option>
          <option value={90}>Last 90 Days</option>
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Activity className="w-8 h-8 animate-spin text-indigo-500" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Main combined chart */}
          <GlowCard className="p-6">
            <h2 className="text-lg font-bold mb-6 flex items-center gap-2">
              <Activity className="w-5 h-5 text-indigo-400" /> All Metrics Trend
            </h2>
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="date" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                  <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ paddingTop: '16px', fontSize: '13px' }} />
                  <Line type="monotone" dataKey="Users" stroke="#818cf8" strokeWidth={2.5} dot={false} activeDot={{ r: 5 }} />
                  <Line type="monotone" dataKey="Documents" stroke="#34d399" strokeWidth={2.5} dot={false} activeDot={{ r: 5 }} />
                  <Line type="monotone" dataKey="AIRequests" stroke="#fbbf24" strokeWidth={2.5} dot={false} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </GlowCard>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <GlowCard className="p-6">
              <h2 className="text-base font-bold mb-4 flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-400" /> New Users
              </h2>
              <div className="text-3xl font-bold text-foreground mb-1">
                {data?.new_users.reduce((s, p) => s + p.value, 0).toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground mb-4">Total in period</p>
              <div className="h-32">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <Line type="monotone" dataKey="Users" stroke="#818cf8" strokeWidth={2} dot={false} />
                    <Tooltip content={<CustomTooltip />} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </GlowCard>

            <GlowCard className="p-6">
              <h2 className="text-base font-bold mb-4 flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-400" /> Document Uploads
              </h2>
              <div className="text-3xl font-bold text-foreground mb-1">
                {data?.document_uploads.reduce((s, p) => s + p.value, 0).toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground mb-4">Total in period</p>
              <div className="h-32">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <Line type="monotone" dataKey="Documents" stroke="#34d399" strokeWidth={2} dot={false} />
                    <Tooltip content={<CustomTooltip />} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </GlowCard>

            <GlowCard className="p-6">
              <h2 className="text-base font-bold mb-4 flex items-center gap-2">
                <BrainCircuit className="w-4 h-4 text-amber-400" /> AI Requests
              </h2>
              <div className="text-3xl font-bold text-foreground mb-1">
                {data?.ai_requests.reduce((s, p) => s + p.value, 0).toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground mb-4">Total in period</p>
              <div className="h-32">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <Line type="monotone" dataKey="AIRequests" stroke="#fbbf24" strokeWidth={2} dot={false} />
                    <Tooltip content={<CustomTooltip />} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </GlowCard>
          </div>
        </div>
      )}
    </div>
  );
}
