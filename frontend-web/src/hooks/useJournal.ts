'use client';

import { useState, useCallback, useMemo } from 'react';
import { useApi } from './useApi';
import { journalApi, JournalEntry, JournalFilters, CreateJournalEntry } from '@/lib/api/journal';

interface UseJournalOptions {
  page?: number;
  limit?: number;
  filters?: JournalFilters;
}

interface UseJournalReturn {
  entries: JournalEntry[];
  total: number;
  loading: boolean;
  error: string | null;
  page: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  setPage: (page: number) => void;
  setFilters: (filters: JournalFilters) => void;
  filters: JournalFilters;
  refetch: () => void;
  loadMore: () => void; // for infinite scroll

  fetchEntry: (id:number) => Promise<JournalEntry>;
  createEntry: (data: CreateJournalEntry) => Promise<JournalEntry>;
  updateEntry: (id:number, data: Partial<CreateJournalEntry>) => Promise<JournalEntry>;
  deleteEntry: (id: number) => Promise<void>;
}

export function useJournal(options: UseJournalOptions = {}): UseJournalReturn {
  const [page, setPage] = useState(options.page || 1);
  const [filters, setFilters] = useState<JournalFilters>(options.filters || {});
  const limit = options.limit || 10;
  const [entriesState, setEntries] = useState<JournalEntry[]>([]);
  const [entry, setEntry] = useState<JournalEntry | null>(null);
  
  const {
    data,
    loading,
    error,
    refetch,
  } = useApi({
    apiFn: () => journalApi.listEntries(page, limit, filters),
    deps: [page, filters],
  });

  const entries = data?.entries || entriesState;
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / limit);

  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1;

  const handleSetPage = useCallback((newPage: number) => {
    setPage(newPage);
  }, []);

  const handleSetFilters = useCallback((newFilters: JournalFilters) => {
    setFilters(newFilters);
    setPage(1); // Reset to first page when filters change
  }, []);

  const loadMore = useCallback(() => {
    if (hasNextPage && !loading) {
      setPage(prev => prev + 1);
    }
  }, [hasNextPage, loading]);

  //fetch single entry
    const fetchEntry = useCallback(async(id:number) =>{
        const result = await journalApi.getEntry(id);
        setEntry(result);
        return result;
    }, []);
    
    //create entry 
    const createEntry = useCallback(async(newEntry: CreateJournalEntry)=>{
        const tempId = Date.now();

        const optimisticEntry: JournalEntry = {
            id: tempId,
            content: newEntry.content,
            mood_rating: 0,
            energy_level: newEntry.energy_level ?? 0,
            stress_level: newEntry.stress_level ?? 0,
            tags: newEntry.tags ?? [],
            sentiment_score: 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        };
        setEntries(prev => [optimisticEntry, ...prev]);

        try {
            
            const saved = await journalApi.createEntry(newEntry);

            setEntries(prev =>
                prev.map(e => (e.id === tempId? saved : e))
            );
            return saved;
        } catch(err) {
            setEntries(prev =>
                 prev.filter(e=>e.id!==tempId)
            );
            throw err;
        }
    },[]);
    //update entry 
    const updateEntry = useCallback(async(id: number, updates: Partial<CreateJournalEntry>)=>{
        const previous = entries;

        setEntries(prev=> 
           prev.map(e => (e.id === id ? {...e, ...updates}: e))
    );

        try {
            //if(!res.ok) throw new Error("Failed to update entry");

            const updated = await journalApi.updateEntry(id, updates);

            setEntries(prev =>
                prev.map(e=> (e.id === id? updated : e))
            );
            return updated;
        } catch(err: any) {
            setEntries(previous);
            throw err;
        }
    },[entries]);
    //delete entry
    const deleteEntry = useCallback(async(id: number)=>{
        const previous = entries;

        setEntries(prev=> 
           prev.filter(e => e.id !== id));
        try {
            await journalApi.deleteEntry(id);
           
        } catch(err: any) {
            setEntries(previous);
            throw err;
        }
    },[entries]);
  return {
    entries,
    total,
    loading,
    error,
    page,
    totalPages,
    hasNextPage,
    hasPrevPage,
    setPage: handleSetPage,
    setFilters: handleSetFilters,
    filters,
    refetch,
    loadMore,
    fetchEntry,
    createEntry,
    updateEntry,
    deleteEntry,
    
  };
}