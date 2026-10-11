import React, { useState, useEffect } from 'react';
import { fetchFeedbackSummary, FeedbackSummaryItem } from '../services/api';
import { PageHeader } from '../components/PageHeader';
import { BarChart3, ShieldCheck, Lock, AlertOctagon, Filter, CheckCircle2, RefreshCw, Quote } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid } from 'recharts';

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

  // Privacy protection: only chart exact counts once the scope threshold is met.
  const chartData = summaries
    .filter((s) => s.thresholdMet && s.totalContributors !== null)
    .map((s) => ({
      name: `${s.category} ${s.scopeId.split(':')[1] ?? ''}`.trim(),
      scopeId: s.scopeId,
      contributors: s.totalContributors as number,
      thresholdMet: s.thresholdMet,
      category: s.category,
    }));

  return (
    <div className="space-y-8 py-4">
      <PageHeader
        icon={BarChart3}
        kicker="Recipient dashboard"
        title="Aggregated feedback"
        description="Institutional feedback summaries with micro-targeting protection switched on."
      >
        <div className="flex items-center gap-3">
          <label htmlFor="category-filter" className="sr-only">Filter by category</label>
          <Filter className="h-4 w-4 text-signal" strokeWidth={2.75} aria-hidden="true" />
          <select
            id="category-filter"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="brut-field !w-auto min-w-[12rem]"
          >
            <option value="all">All categories</option>
            <option value="teaching">Teaching & Academics</option>
            <option value="facilities">Campus Facilities</option>
            <option value="administration">Administration</option>
            <option value="welfare">Student Welfare</option>
            <option value="safety">Campus Safety</option>
          </select>
          <button type="button" onClick={loadSummaries} className="brut-btn brut-btn-sm" aria-label="Refresh dashboard">
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} strokeWidth={3} />
          </button>
        </div>
      </PageHeader>

      {/* Threshold banner */}
      <div className="brut-card-yellow flex items-start gap-3 p-4 !shadow-hard-sm">
        <ShieldCheck className="mt-0.5 h-6 w-6 flex-shrink-0" strokeWidth={2.75} />
        <p className="text-sm leading-relaxed">
          <strong className="uppercase tracking-wider">Minimum-contributor threshold.</strong> Results stay hidden unless
          at least <strong>3 verified contributors</strong> submitted feedback in the exact same scope. This stops
          department heads from picking out individuals in small groups.
        </p>
      </div>

      {/* Chart */}
      {chartData.length > 0 && (
        <section className="brut-card">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b-[3px] border-ink bg-ink px-5 py-3 text-paper">
            <h2 className="font-display text-3xl uppercase tracking-wide">Contributor volume</h2>
            <div className="flex items-center gap-4 font-mono text-[0.68rem] font-bold uppercase tracking-wider">
              <span className="flex items-center gap-2"><span className="h-3 w-3 border-2 border-paper bg-go" />Threshold met</span>
              <span className="flex items-center gap-2"><span className="h-3 w-3 border-2 border-paper bg-alarm" />Suppressed</span>
            </div>
          </div>

          <div className="h-72 w-full p-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
                <CartesianGrid stroke="#0B0B0B" strokeOpacity={0.15} strokeDasharray="4 4" vertical={false} />
                <XAxis
                  dataKey="name"
                  stroke="#0B0B0B"
                  tickLine={false}
                  axisLine={{ strokeWidth: 3 }}
                  tick={{ fontSize: 11, fontFamily: '"Space Mono", monospace', fill: '#0B0B0B' }}
                />
                <YAxis
                  stroke="#0B0B0B"
                  allowDecimals={false}
                  tickLine={false}
                  axisLine={{ strokeWidth: 3 }}
                  tick={{ fontSize: 11, fontFamily: '"Space Mono", monospace', fill: '#0B0B0B' }}
                />
                <Tooltip
                  cursor={{ fill: 'rgba(255, 210, 63, 0.35)' }}
                  labelFormatter={(_label, payload) => (payload?.[0]?.payload?.scopeId as string) ?? ''}
                  contentStyle={{
                    backgroundColor: '#FBF8EE',
                    border: '3px solid #0B0B0B',
                    borderRadius: 0,
                    boxShadow: '4px 4px 0 0 #0B0B0B',
                    color: '#0B0B0B',
                    fontFamily: '"Space Mono", monospace',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="contributors" maxBarSize={90}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.thresholdMet ? '#2FBF71' : '#FF4D3D'} stroke="#0B0B0B" strokeWidth={3} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {summaries.map((summary, idx) => (
          <article key={idx} className="brut-card overflow-hidden">
            <div
              className={`flex flex-wrap items-center justify-between gap-2 border-b-[3px] border-ink px-4 py-3 ${
                summary.thresholdMet ? 'bg-go' : 'bg-alarm'
              }`}
            >
              <div>
                <h3 className="font-display text-3xl uppercase leading-none tracking-wide">{summary.category}</h3>
                <div className="mt-1 font-mono text-[0.7rem] font-bold">Scope: {summary.scopeId}</div>
              </div>

              {summary.thresholdMet ? (
                <span className="brut-tag">
                  <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={3} />
                  Met / {summary.totalContributors === null ? `threshold ${summary.minThreshold}+` : `${summary.totalContributors} contributors`}
                </span>
              ) : (
                <span className="brut-tag">
                  <AlertOctagon className="h-3.5 w-3.5" strokeWidth={3} />
                  Suppressed / minimum {summary.minThreshold} required
                </span>
              )}
            </div>

            <div className="p-4">
              {summary.thresholdMet ? (
                <div className="space-y-3">
                  <div className="brut-label !mb-0">Sanitized feedback excerpts</div>
                  <div className="max-h-52 space-y-3 overflow-y-auto pr-1">
                    {summary.sanitizedExcerpts?.map((excerpt, i) => (
                      <div key={i} className="brut-inset flex gap-3 p-3 text-sm leading-relaxed">
                        <Quote className="mt-0.5 h-4 w-4 flex-shrink-0" strokeWidth={2.75} />
                        <span>{excerpt}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-3 border-[3px] border-dashed border-ink p-4 text-sm leading-relaxed">
                  <Lock className="mt-0.5 h-5 w-5 flex-shrink-0" strokeWidth={2.75} />
                  <span>{summary.message}</span>
                </div>
              )}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
};
