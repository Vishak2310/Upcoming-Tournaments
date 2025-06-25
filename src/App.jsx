import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { TournamentCard } from './TournamentCard';

const API_KEY = import.meta.env.VITE_API_KEY;
const FOLDER_ID = import.meta.env.VITE_FOLDER_ID;

// ... (parseFilename function remains the same)
function parseFilename(name) {
  const noExt = name.replace(/\.pdf$/i, '');
  const parts = noExt.split(' ').filter(p => p.trim() !== '');

  let dateRange = '';
  let monthYear = '';
  let type = '';
  let locationCountry = '';

  if (parts.length > 0) {
    dateRange = parts[0];
  }
  if (parts.length > 1) {
    monthYear = parts[1];
  }
  if (parts.length > 2) {
    type = parts[2];
  }
  if (parts.length > 3) {
    locationCountry = parts.slice(3).join(' ');
  }

  const [location, countryRaw] = locationCountry.split(',').map(s => s.trim());

  let startDate = null;
  const dayMatch = dateRange.match(/^\d+/);
  if (dayMatch && monthYear) {
    const monthNameMatch = monthYear.match(/[a-zA-Z]+/);
    const yearMatch = monthYear.match(/\d{4}/);

    if (monthNameMatch && yearMatch) {
      try {
        const dateString = `${monthNameMatch[0]} ${dayMatch[0]}, ${yearMatch[0]}`;
        startDate = new Date(dateString);
      } catch (e) {
        console.error("Error parsing start date for:", name, e);
        startDate = null;
      }
    }
  }

  return {
    dateRange: dateRange,
    monthYear: monthYear,
    type:      type,
    location:  location,
    country:   countryRaw || 'Unknown',
    startDate: startDate
  };
}

export default function App() {
  const [files, setFiles] = useState([]);
  const [search, setSearch] = useState('');
  const [monthFilter, setMonth] = useState('All');
  const [countryFilter, setCountry] = useState('All');
  const [typeFilter, setType] = useState('All');
  const [statusFilter, setStatusFilter] = useState('Upcoming');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  const COMMON_BORDER       = 'border border-gray-300';
  const COMMON_BG           = 'bg-white';
  const COMMON_TEXT         = 'text-gray-800';
  const COMMON_PLACEHOLDER  = 'placeholder-gray-500';
  const COMMON_FOCUS        = 'focus:outline-none focus:ring-2 focus:ring-blue-400';
  const COMMON_TRANSITION   = 'transition';
  const COMMON_FORM_HEIGHT  = 'h-11';

  useEffect(() => {
    if (!API_KEY || !FOLDER_ID) {
      console.error('Missing VITE_API_KEY or VITE_FOLDER_ID');
      setError('Configuration error: API Key or Folder ID is missing. Please check your .env file.');
      setLoading(false);
      return;
    }

    const fetchAllFiles = async () => {
      setLoading(true);
      setError(null);
      let allFiles = [];
      let nextPageToken = null;

      do {
        const q = `'${FOLDER_ID}' in parents and mimeType='application/pdf'`;
        const url = new URL('https://www.googleapis.com/drive/v3/files');
        url.searchParams.set('q', q);
        url.searchParams.set('supportsAllDrives', 'true');
        url.searchParams.set('includeItemsFromAllDrives', 'true');
        url.searchParams.set('fields', 'nextPageToken, files(id,name,webViewLink)');
        url.searchParams.set('key', API_KEY);
        if (nextPageToken) {
          url.searchParams.set('pageToken', nextPageToken);
        }

        try {
          const response = await fetch(url.toString());
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          const data = await response.json();
          allFiles = [...allFiles, ...(data.files || [])];
          nextPageToken = data.nextPageToken;
        } catch (error) {
          console.error('Error fetching files:', error);
          setError(`Failed to load tournaments: ${error.message}. Please try again later.`);
          break;
        }
      } while (nextPageToken);

      setFiles(allFiles);
      setLoading(false);
    };

    fetchAllFiles().catch(console.error);
  }, []);

  const filteredFiles = useMemo(() => {
      const now = new Date(); 

      let filtered = files.filter(f => {
          const parsed = f.parsedData || parseFilename(f.name);
          f.parsedData = parsed;

          const matchesSearch = f.name.toLowerCase().includes(search.toLowerCase());
          const matchesMonth = monthFilter === 'All' || parsed.monthYear === monthFilter;
          const matchesCountry = countryFilter === 'All' || parsed.country === countryFilter;
          const matchesType = typeFilter === 'All' || parsed.type === typeFilter;

          const isUpcoming = parsed.startDate && parsed.startDate >= now;
          const isCompleted = parsed.startDate && parsed.startDate < now;

          let matchesStatus = true;
          if (statusFilter === 'Upcoming') {
              matchesStatus = isUpcoming;
          } else if (statusFilter === 'Completed') {
              matchesStatus = isCompleted;
          }
          
          return matchesSearch && matchesMonth && matchesCountry && matchesType && matchesStatus;
      });

      filtered.sort((a, b) => {
          const dateA = a.parsedData.startDate;
          const dateB = b.parsedData.startDate;

          if (!dateA && !dateB) return 0;
          if (!dateA) return 1;
          if (!dateB) return -1;

          return dateA.getTime() - dateB.getTime();
      });

      return filtered;
  }, [files, search, monthFilter, countryFilter, typeFilter, statusFilter]);


  const getFilteredCounts = (attribute, currentMonth, currentCountry, currentType, currentSearch, currentStatus) => {
    const counts = new Map();
    const now = new Date();
    files.forEach(file => {
      const parsed = parseFilename(file.name);
      const { monthYear, country, type } = parsed;
      const matchesSearch = file.name.toLowerCase().includes(currentSearch.toLowerCase());

      const matchesOtherFilters =
        (attribute === 'monthYear' || currentMonth === 'All' || monthYear === currentMonth) &&
        (attribute === 'country'   || currentCountry === 'All' || country === currentCountry) &&
        (attribute === 'type'      || currentType === 'All' || type === currentType);

      const isUpcoming = parsed.startDate && parsed.startDate >= now;
      const isCompleted = parsed.startDate && parsed.startDate < now;
      let matchesStatus = true;
      if (currentStatus === 'Upcoming') {
          matchesStatus = isUpcoming;
      } else if (currentStatus === 'Completed') {
          matchesStatus = isCompleted;
      }

      if (matchesSearch && matchesOtherFilters && matchesStatus) {
        const value = parsed[attribute];
        if (value) {
          counts.set(value, (counts.get(value) || 0) + 1);
        }
      }
    });
    return counts;
  };

  const MONTH_ORDER = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const getMonthName = (monthYearString) => {
    if (!monthYearString) return '';
    const firstDigitIndex = monthYearString.search(/\d/);
    return firstDigitIndex !== -1 ? monthYearString.substring(0, firstDigitIndex) : monthYearString;
  };

  const getYear = (monthYearString) => {
    if (!monthYearString) return 0;
    const yearMatch = monthYearString.match(/\d{4}/);
    return yearMatch ? parseInt(yearMatch[0], 10) : 0;
  };


  const monthOptions = useMemo(() => {
    const counts = getFilteredCounts('monthYear', 'All', countryFilter, typeFilter, search, statusFilter);
    const uniqueMonths = Array.from(counts.keys());

    const sortedMonths = uniqueMonths.sort((a, b) => {
      const yearA = getYear(a);
      const yearB = getYear(b);

      if (yearA !== yearB) {
        return yearA - yearB;
      }

      const monthA = getMonthName(a);
      const monthB = getMonthName(b);

      const indexA = MONTH_ORDER.indexOf(monthA);
      const indexB = MONTH_ORDER.indexOf(monthB);

      return indexA - indexB;
    });

    const monthNameOccurrences = new Map();
    uniqueMonths.forEach(m => {
        const name = getMonthName(m);
        monthNameOccurrences.set(name, (monthNameOccurrences.get(name) || 0) + 1);
    });

    return ['All', ...sortedMonths].map(m => {
      if (m === 'All') {
        return { value: 'All', label: 'All' };
      }
      const monthName = getMonthName(m);
      const year = getYear(m);
      
      let displayLabel = monthName;
      if (monthNameOccurrences.get(monthName) > 1) {
          displayLabel += ` ${year}`;
      }
      
      return {
        value: m,
        label: `${displayLabel} (${counts.get(m) || 0})`
      };
    });
  }, [files, search, countryFilter, typeFilter, statusFilter]);


  const countryOptions = useMemo(() => {
    const counts = getFilteredCounts('country', monthFilter, 'All', typeFilter, search, statusFilter);
    const s = new Set(Array.from(counts.keys()));
    const sortedCountries = Array.from(s).sort();
    return ['All', ...sortedCountries].map(c => ({
      value: c,
      label: c === 'All' ? 'All' : `${c} (${counts.get(c) || 0})`
    }));
  }, [files, search, monthFilter, typeFilter, statusFilter]);


  const typeOptions = useMemo(() => {
    const counts = getFilteredCounts('type', monthFilter, countryFilter, 'All', search, statusFilter);
    const s = new Set(Array.from(counts.keys()));
    const sortedTypes = Array.from(s).sort();
    return ['All', ...sortedTypes].map(t => ({
      value: t,
      label: t === 'All' ? 'All' : `${t} (${counts.get(t) || 0})`
    }));
  }, [files, search, monthFilter, countryFilter, statusFilter]);

  const statusOptions = useMemo(() => ([
    { value: 'All', label: 'All' },
    { value: 'Upcoming', label: 'Upcoming' },
    { value: 'Completed', label: 'Completed' },
  ]), []);

  const areFiltersActive = useMemo(() => {
    return search !== '' || monthFilter !== 'All' || countryFilter !== 'All' || typeFilter !== 'All' || statusFilter !== 'Upcoming';
  }, [search, monthFilter, countryFilter, typeFilter, statusFilter]);

  const clearFilters = useCallback(() => {
    setSearch('');
    setMonth('All');
    setCountry('All');
    setType('All');
    setStatusFilter('Upcoming');
    setShowMobileFilters(false); // Close filters after clearing on mobile
  }, []);


  return (
    <div className="min-h-screen bg-gray-50 transition-colors duration-300">

      {/* Header */}
      <header className="bg-gradient-to-r from-orange-300 via-orange-200 to-yellow-100 px-6 py-8 shadow-xl rounded-b-3xl text-center relative">
        <h1 className="text-4xl font-extrabold text-orange-900 tracking-tight inline-flex items-center justify-center gap-3">
          <span>🏆</span>
          Global Chess Tournament Finder
        </h1>
        <p className="mt-2 text-sm text-orange-800 italic">Simplifying your search for chess tournaments across the globe</p>
      </header>

      {/* Scrolling Disclaimer Banner */}
      <div className="w-full bg-orange-200 text-gray-800 py-2 overflow-hidden relative shadow-md">
        <p className="text-sm font-medium animate-scroll">
          <span className="inline-block px-8">While we strive for accuracy, event details can change. We recommend contacting organizers for confirmation.</span>
          <span className="inline-block px-8">While we strive for accuracy, event details can change. We recommend contacting organizers for confirmation.</span>
          <span className="inline-block px-8">While we strive for accuracy, event details can change. We recommend contacting organizers for confirmation.</span>
          <span className="inline-block px-8">While we strive for accuracy, event details can change. We recommend contacting organizers for confirmation.</span>
          <span className="inline-block px-8">While we strive for accuracy, event details can change. We recommend contacting organizers for confirmation.</span>
          <span className="inline-block px-8">While we strive for accuracy, event details can change. We recommend contacting organizers for confirmation.</span>
          <span className="inline-block px-8">While we strive for accuracy, event details can change. We recommend contacting organizers for confirmation.</span>
          <span className="inline-block px-8">While we strive for accuracy, event details can change. We recommend contacting organizers for confirmation.</span>
          <span className="inline-block px-8">While we strive for accuracy, event details can change. We recommend contacting organizers for confirmation.</span>
          <span className="inline-block px-8">While we strive for accuracy, event details can change. We recommend contacting organizers for confirmation.</span>
          <span className="inline-block px-8">While we strive for accuracy, event details can change. We recommend contacting organizers for confirmation.</span>
          <span className="inline-block px-8">While we strive for accuracy, event details can change. We recommend contacting organizers for confirmation.</span>
          <span className="inline-block px-8">While we strive for accuracy, event details can change. We recommend contacting organizers for confirmation.</span>
          <span className="inline-block px-8">While we strive for accuracy, event details can change. We recommend contacting organizers for confirmation.</span>
          <span className="inline-block px-8">While we strive for accuracy, event details can change. We recommend contacting organizers for confirmation.</span>
          <span className="inline-block px-8">While we strive for accuracy, event details can change. We recommend contacting organizers for confirmation.</span>
          <span className="inline-block px-8">While we strive for accuracy, event details can change. We recommend contacting organizers for confirmation.</span>
          <span className="inline-block px-8">While we strive for accuracy, event details can change. We recommend contacting organizers for confirmation.</span>
          <span className="inline-block px-8">While we strive for accuracy, event details can change. We recommend contacting organizers for confirmation.</span>
          <span className="inline-block px-8">While we strive for accuracy, event details can change. We recommend contacting organizers for confirmation.</span>
          <span className="inline-block px-8">While we strive for accuracy, event details can change. We recommend contacting organizers for confirmation.</span>
          <span className="inline-block px-8">While we strive for accuracy, event details can change. We recommend contacting organizers for confirmation.</span>
          <span className="inline-block px-8">While we strive for accuracy, event details can change. We recommend contacting organizers for confirmation.</span>
          <span className="inline-block px-8">While we strive for accuracy, event details can change. We recommend contacting organizers for confirmation.</span>
          <span className="inline-block px-8">While we strive for accuracy, event details can change. We recommend contacting organizers for confirmation.</span>
          <span className="inline-block px-8">While we strive for accuracy, event details can change. We recommend contacting organizers for confirmation.</span>
          <span className="inline-block px-8">While we strive for accuracy, event details can change. We recommend contacting organizers for confirmation.</span>
          <span className="inline-block px-8">While we strive for accuracy, event details can change. We recommend contacting organizers for confirmation.</span>
        </p>
      </div>

      {/* Filters Section */}
      <section className="w-full bg-orange-100 py-6 sm:py-10">
        <div className="max-w-7xl mx-auto px-6">
          {/* Mobile Filter Toggle Button (visible on small screens) */}
          <div className="md:hidden flex justify-between items-center mb-4">
            <button
              onClick={() => setShowMobileFilters(!showMobileFilters)}
              className="flex items-center px-4 py-2 bg-orange-500 text-white rounded-xl shadow-sm text-base font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-300 transition-all duration-300"
            >
              Filters
              <svg className={`ml-2 h-5 w-5 transition-transform duration-300 ${showMobileFilters ? 'rotate-180' : ''}`} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
            {/* Clear Filters button - always visible on mobile */}
            <button
              onClick={clearFilters}
              className={`
                inline-flex items-center justify-center
                px-4 py-2.5
                rounded-xl
                shadow-sm
                text-sm font-medium
                ${areFiltersActive
                  ? 'bg-red-500 hover:bg-red-600 text-white focus:ring-red-300'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200 opacity-70'
                }
                focus:outline-none focus:ring-2 focus:ring-offset-2
                ${COMMON_TRANSITION}
              `}
              disabled={!areFiltersActive}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
              Clear
            </button>
          </div>

          {/* Filter Grid - hidden on mobile by default, shown when showMobileFilters is true or on md screens and up */}
          <div className={`grid grid-cols-1 gap-y-4 md:gap-6 md:grid-cols-7 items-end ${showMobileFilters ? 'block' : 'hidden md:grid'}`}>
            {/* Search Input */}
            <div className="md:col-span-2">
              <label htmlFor="search-input" className="block mb-1 text-sm font-medium text-gray-700">Search</label>
              <input
                id="search-input"
                type="text"
                placeholder="Search tournaments…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className={`${COMMON_BORDER} ${COMMON_BG} ${COMMON_TEXT} ${COMMON_PLACEHOLDER} ${COMMON_FOCUS} rounded-xl px-4 py-2.5 ${COMMON_TRANSITION} w-full ${COMMON_FORM_HEIGHT}`}
              />
            </div>
            {/* Month Filter */}
            <div>
              <label htmlFor="month-select" className="block mb-1 text-sm font-medium text-gray-700">Month</label>
              <div className="relative">
                <select
                  id="month-select"
                  value={monthFilter}
                  onChange={e => setMonth(e.target.value)}
                  className={`${COMMON_BORDER} ${COMMON_BG} ${COMMON_TEXT} ${COMMON_FOCUS} rounded-xl px-4 py-2.5 pr-10 ${COMMON_TRANSITION} w-full appearance-none ${COMMON_FORM_HEIGHT}`}
                >
                  {monthOptions.map(m => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                  <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
            </div>
            {/* Country Filter */}
            <div>
              <label htmlFor="country-select" className="block mb-1 text-sm font-medium text-gray-700">Country</label>
              <div className="relative">
                <select
                  id="country-select"
                  value={countryFilter}
                  onChange={e => setCountry(e.target.value)}
                  className={`${COMMON_BORDER} ${COMMON_BG} ${COMMON_TEXT} ${COMMON_FOCUS} rounded-xl px-4 py-2.5 pr-10 ${COMMON_TRANSITION} w-full appearance-none ${COMMON_FORM_HEIGHT}`}
                >
                  {countryOptions.map(c => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                  <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
            </div>
            {/* Type Filter */}
            <div>
              <label htmlFor="type-select" className="block mb-1 text-sm font-medium text-gray-700">Type</label>
              <div className="relative">
                <select
                  id="type-select"
                  value={typeFilter}
                  onChange={e => setType(e.target.value)}
                  className={`${COMMON_BORDER} ${COMMON_BG} ${COMMON_TEXT} ${COMMON_FOCUS} rounded-xl px-4 py-2.5 pr-10 ${COMMON_TRANSITION} w-full appearance-none ${COMMON_FORM_HEIGHT}`}
                >
                  {typeOptions.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                  <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
            </div>
            {/* Status Filter */}
            <div>
              <label htmlFor="status-select" className="block mb-1 text-sm font-medium text-gray-700">Status</label>
              <div className="relative">
                <select
                  id="status-select"
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value)}
                  className={`${COMMON_BORDER} ${COMMON_BG} ${COMMON_TEXT} ${COMMON_FOCUS} rounded-xl px-4 py-2.5 pr-10 ${COMMON_TRANSITION} w-full appearance-none ${COMMON_FORM_HEIGHT}`}
                >
                  {statusOptions.map(s => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                  <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
            </div>
            {/* Original Clear Filters Button - now hidden on mobile */}
            <div className="mt-4 md:mt-0 hidden md:block">
              <button
                onClick={clearFilters}
                className={`
                  w-full
                  inline-flex items-center justify-center
                  px-4 py-2.5
                  rounded-xl
                  shadow-sm
                  text-sm font-medium
                  ${areFiltersActive
                    ? 'bg-red-500 hover:bg-red-600 text-white focus:ring-red-300'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200 opacity-70'
                  }
                  focus:outline-none focus:ring-2 focus:ring-offset-2
                  ${COMMON_TRANSITION}
                `}
                disabled={!areFiltersActive}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
                Clear Filters
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* List Section */}
      <div className="w-full bg-orange-100 py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 space-y-12">
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
              <strong className="font-bold">Error:</strong>
              <span className="block sm:inline"> {error}</span>
            </div>
          )}

          {loading && !error ? (
            <div className="text-center text-gray-600 py-10">
              <svg className="animate-spin h-8 w-8 text-orange-600 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <p className="mt-3 text-lg font-medium">Loading tournaments...</p>
            </div>
          ) : filteredFiles.length === 0 && !error ? (
            <div className="text-center text-gray-600 py-10">
              <p className="text-xl font-semibold mb-2">No tournaments found!</p>
              <p className="text-md">
                Try adjusting your filters or clearing them to see more results.
              </p>
              {areFiltersActive && (
                <button
                  onClick={clearFilters}
                  className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-orange-500 hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
                >
                  Clear All Filters
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-6"> {/* MODIFIED GRID CLASSES */}
              {filteredFiles.map(f => (
                <TournamentCard key={f.id} file={f} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}