export interface SubmitReportResponse {
  id?: string;
  status?: string;
  privacyFlags?: string[];
  isSeriousAllegation?: boolean;
  message?: string;
  error?: string;
  statusCode?: number;
}

export interface ReportItem {
  id: string;
  category: string;
  scopeId: string;
  content: string;
  sanitizedContent?: string;
  status: 'approved_for_aggregation' | 'needs_sanitization' | 'held_for_privacy_review' | 'rejected';
  privacyFlags: string[];
  isSeriousAllegation: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface FeedbackSummaryItem {
  category: string;
  scopeId: string;
  totalContributors: number;
  thresholdMet: boolean;
  minThreshold: number;
  sanitizedExcerpts?: string[];
  message?: string;
}

export interface GroupStateResponse {
  commitments: string[];
  root: string;
  depth: number;
}

export interface TopicItem {
  id: number;
  name: string;
  category: string;
  period: string;
  active: boolean;
  created_at: string;
}

export interface TopicResolveResponse {
  topicId: number;
  scopeId: string;
}

const API_BASE = '/api';

export async function checkHealth() {
  try {
    const res = await fetch(`${API_BASE}/health`);
    return await res.json();
  } catch (err) {
    return { status: 'error' };
  }
}

export async function enrollIdentityCommitment(studentTicket: string, identityCommitment: string) {
  const res = await fetch(`${API_BASE}/enroll`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ studentTicket, identityCommitment }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Enrollment failed');
  }
  return data;
}

export async function fetchGroupState(): Promise<GroupStateResponse> {
  const res = await fetch(`${API_BASE}/group/state`);
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to fetch group state');
  }
  return data;
}

export async function fetchTopics(): Promise<TopicItem[]> {
  const res = await fetch(`${API_BASE}/topics`);
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to fetch topics');
  }
  return data.topics;
}

export async function resolveTopicId(category: string, period: string): Promise<TopicResolveResponse> {
  const params = new URLSearchParams({ category, period });
  const res = await fetch(`${API_BASE}/topics/resolve?${params.toString()}`);
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to resolve topic');
  }
  return data;
}

export async function submitReportPayload(payload: {
  category: string;
  scopeId: string;
  content: string;
  proof: {
    merkleTreeDepth: number;
    merkleTreeRoot: string;
    nullifier: string;
    message: string;
    scope: string;
    points: string[];
  };
}): Promise<SubmitReportResponse> {
  const res = await fetch(`${API_BASE}/reports`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok && res.status !== 409) {
    throw new Error(data.error || 'Submission failed');
  }
  return { ...data, statusCode: res.status } as any;
}

export async function fetchModeratorReports(token: string, status?: string): Promise<ReportItem[]> {
  const url = status && status !== 'all'
    ? `${API_BASE}/admin/reports?status=${encodeURIComponent(status)}`
    : `${API_BASE}/admin/reports`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to fetch moderator reports');
  }
  return data.reports;
}

export async function updateReportStatus(
  token: string,
  id: string,
  status: string,
  sanitizedContent?: string
) {
  const res = await fetch(`${API_BASE}/admin/reports/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ status, sanitizedContent }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to update report status');
  }
  return data;
}

export async function fetchFeedbackSummary(category?: string, scopeId?: string): Promise<FeedbackSummaryItem[]> {
  let url = `${API_BASE}/feedback/summary`;
  const params = new URLSearchParams();
  if (category && category !== 'all') params.append('category', category);
  if (scopeId && scopeId !== 'all') params.append('scopeId', scopeId);

  if (params.toString()) {
    url += `?${params.toString()}`;
  }

  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to fetch feedback summary');
  }
  return data.summaries;
}
