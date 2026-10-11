import React, { useState, useEffect } from 'react';
import { fetchFeedbackSummary, FeedbackSummaryItem } from '../services/api';
import { BarChart3, ShieldCheck, Lock, AlertOctagon, Filter, CheckCircle2, RefreshCw } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export const RecipientDashboardPage: React.FC = () => {
  const [summaries, setSummaries] = useState<FeedbackSummaryItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(false);

  const loadSummaries = async () => {
    setIsLoading(true);
    try {
      const data = await fetchFeedbackSummary(selectedCategory);
      setSummaries(data);
    } catch (err) {
      console.error('Failed to load feedback summaries:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSummaries();
  }, [selectedCategory]);

  // Suppressed scopes must not reveal exact contributor counts in charts.
  const chartData = summaries
    .filter((s) => s.thresholdMet && s.totalContributors !== null)
    .map((s) => ({
      name: `${s.category} (${s.scopeId})`,
      contributors: s.totalContributors as number,
      thresholdMet: s.thresholdMet,
      category: s.category,
    }));

  return (
    <div className="space-y-8 py-4">

      {/* Header Banner */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-teal-600/20 text-teal-400 border border-teal-500/30">
            <BarChart3 className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Feedback Recipient Dashboard</h1>
            <p className="text-slate-400 text-xs">
              Aggregated institutional feedback feed. Micro-targeting protection active.
            </p>
          </div>
        </div>

        {/* Category Filter */}
        <div className="flex items-center space-x-2">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-1.5 rounded-lg glass-input text-xs"
          >
            <option value="all" className="bg-slate-900">All Categories</option>
            <option value="teaching" className="bg-slate-900">Teaching & Academics</option>
            <option value="facilities" className="bg-slate-900">Campus Facilities</option>
            <option value="administration" className="bg-slate-900">Administration</option>
            <option value="welfare" className="bg-slate-900">Student Welfare</option>
            <option value="safety" className="bg-slate-900">Campus Safety</option>
          </select>
          <button
            onClick={loadSummaries}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all"
            title="Refresh dashboard"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Threshold Privacy Banner */}
      <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 text-xs text-slate-300 flex items-center space-x-3">
        <ShieldCheck className="w-5 h-5 text-teal-400 flex-shrink-0" />
        <p className="leading-relaxed">
          <strong>Differential Threshold Privacy Protection:</strong> Results are automatically suppressed unless at least <strong>3 verified contributors</strong> have submitted feedback in the exact same scope. This prevents department heads from identifying individuals in small groups.
        </p>
      </div>

      {/* Recharts Analytics Chart */}
      {chartData.length > 0 && (
        <div className="glass-card p-6 rounded-2xl border border-slate-800 space-y-4">
          <h3 className="font-bold text-white text-sm">Contributor Volume & Threshold Status</h3>

          <div className="h-64 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 20 }}>
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.5rem', color: '#f8fafc', fontSize: '12px' }}
                />
                <Bar dataKey="contributors" radius={[6, 6, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.thresholdMet ? '#14b8a6' : '#f43f5e'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Summary Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {summaries.map((summary, idx) => (
          <div
            key={idx}
            className={`glass-card p-6 rounded-2xl border transition-all space-y-4 ${
              summary.thresholdMet
                ? 'border-emerald-500/30 hover:border-emerald-500/50'
                : 'border-rose-500/30 bg-rose-950/10'
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <span className="font-bold text-white text-sm uppercase tracking-wide">
                  {summary.category}
                </span>
                <div className="text-slate-400 text-xs font-mono">Scope: {summary.scopeId}</div>
              </div>

              {summary.thresholdMet ? (
                <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center space-x-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Threshold Met ({summary.totalContributors ?? summary.minThreshold} Contributors)</span>
                </span>
              ) : (
                <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center space-x-1">
                  <AlertOctagon className="w-3.5 h-3.5 text-rose-400" />
                  <span>Suppressed (minimum {summary.minThreshold} required)</span>
                </span>
              )}
            </div>

            {/* Threshold Excerpts vs Suppressed Box */}
            {summary.thresholdMet ? (
              <div className="space-y-2">
                <div className="text-[11px] font-semibold text-slate-300">Sanitized Feedback Excerpts:</div>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {summary.sanitizedExcerpts?.map((excerpt, i) => (
                    <div key={i} className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-slate-200 text-xs leading-relaxed font-sans">
                      "{excerpt}"
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-rose-950/30 border border-rose-500/20 text-rose-200/90 text-xs leading-relaxed flex items-start space-x-2">
                <Lock className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                <span>Results remain hidden until at least {summary.minThreshold} contributors are present in this scope.</span>
              </div>
            )}
          </div>
        ))}
      </div>

    </div>
  );
};
