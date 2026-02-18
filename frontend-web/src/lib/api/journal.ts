import { apiClient } from './client';
import { deduplicateRequest } from '../utils/requestUtils';

export interface JournalEntry {
  id: number;
  content: string;
  sentiment_score?: number;
  mood_score?: number;
  mood_rating?: number; // 1-10 scale
  energy_level?: number; // 1-10 scale
  stress_level?: number; // 1-10 scale
  tags?: string[];
  patterns?: string[]; // AI-detected emotional patterns
  created_at: string;
  updated_at: string;
}

export interface JournalListResponse {
  entries: JournalEntry[];
  total: number;
  page: number;
  page_size: number;
}

export interface CreateJournalEntry {
  content: string;
  tags?: string[];
  mood_rating?: number;
  energy_level?: number;
  stress_level?: number;
}

export interface JournalAnalytics {
  total_entries: number;
  average_sentiment?: number;
  most_common_mood?: string;
  streak_days: number;
}

export interface JournalFilters {
  startDate?: string;
  endDate?: string;
  moodMin?: number;
  moodMax?: number;
  tags?: string[];
  search?: string;
}

export const journalApi = {
  async listEntries(page: number = 1, limit: number = 10, filters?: JournalFilters): Promise<JournalListResponse> {
    const params = new URLSearchParams();
    params.append('skip', ((page - 1) * limit).toString());
    params.append('limit', limit.toString());
    
    if (filters?.startDate) params.append('start_date', filters.startDate);
    if (filters?.endDate) params.append('end_date', filters.endDate);
    if (filters?.moodMin !== undefined) params.append('mood_min', filters.moodMin.toString());
    if (filters?.moodMax !== undefined) params.append('mood_max', filters.moodMax.toString());
    if (filters?.tags?.length) params.append('tags', filters.tags.join(','));
    if (filters?.search) params.append('search', filters.search);

    const query = params.toString();
    const url = `/journal${query ? `?${query}` : ''}`;
    
    return deduplicateRequest(`journal-list-${page}-${limit}-${JSON.stringify(filters)}`, () =>
      apiClient(url, { retry: true })
    );
  },

  async getEntry(id: number): Promise<JournalEntry> {
    return apiClient(`/journal/${id}`);
  },

  async createEntry(data: CreateJournalEntry): Promise<JournalEntry> {
    return apiClient('/journal', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateEntry(id: number, data: Partial<CreateJournalEntry>): Promise<JournalEntry> {
    return apiClient(`/journal/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async deleteEntry(id: number): Promise<void> {
    return apiClient(`/journal/${id}`, {
      method: 'DELETE',
    });
  },

  async getAnalytics(): Promise<JournalAnalytics> {
    return deduplicateRequest('journal-analytics', () =>
      apiClient('/journal/analytics', { retry: true })
    );
  },

  async searchEntries(query: string, page: number = 1): Promise<JournalListResponse> {
    return apiClient(`/journal/search?q=${encodeURIComponent(query)}&page=${page}`);
  },
};
