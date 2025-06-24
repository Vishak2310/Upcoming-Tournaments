import React, { useEffect, useState, useMemo } from 'react';
import { TournamentCard } from './TournamentCard';

// light & dark fallbacks
const COMMON_BG           = 'bg-white dark:bg-gray-800';
const COMMON_BORDER       = 'border border-gray-300 dark:border-gray-600';
const COMMON_TEXT         = 'text-gray-800 dark:text-gray-100';
const COMMON_PLACEHOLDER  = 'placeholder-gray-500 dark:placeholder-400';
const COMMON_FOCUS        = 'focus:outline-none focus:ring-2 focus:ring-blue-400';
const COMMON_TRANSITION   = 'transition';
const COMMON_SHADOW       = 'shadow-lg hover:shadow-2xl';

const API_KEY     = import.meta.env.VITE_API_KEY;
const FOLDER_ID = import.meta.env.VITE_FOLDER_ID;

// parse name "14-15 June2025 Classical Paris, France.pdf"
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

  return {
    dateRange: dateRange,
    monthYear: monthYear,
    type:      type,
    location:  location,
    country:   countryRaw || 'Unknown'
  };
}

export default function App() {
  const [files, setFiles]         = useState([]);
  const [darkMode, setDarkMode]   = useState(false);
  const [search, setSearch]       = useState('');
  const [monthFilter, setMonth]   = useState('All');
  const [countryFilter, setCountry] = useState('All');
  const [typeFilter, setType]     = useState('All');
  const [loading, setLoading]     = useState(true); // NEW: Add loading state
  const [error, setError]         = useState(null); // NEW: Add error state for API issues

  // fetch PDF list
  useEffect(() => {
    if (!API_KEY || !FOLDER_ID) {
      console.error('Missing VITE_API_KEY or VITE_FOLDER_ID');
      setError('Configuration error: API Key or Folder ID is missing. Please check your .env file.'); // NEW: Set user-friendly error
      setLoading(false); // NEW: Stop loading
      return;
    }

    const fetchAllFiles = async () => {
      setLoading(true); // NEW: Start loading
      setError(null);   // NEW: Clear previous errors
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
          setError(`Failed to load tournaments: ${error.message}. Please try again later.`); // NEW: Set user-friendly error
          break; // Stop fetching if an error occurs
        }
      } while (nextPageToken);

      setFiles(allFiles);
      setLoading(false); // NEW: Stop loading when done or error
    };

    fetchAllFiles().catch(console.error); // Catch any unhandled errors from fetchAllFiles
  }, []);

  // toggle the <html class="dark">
  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

  // This is the final filtered list of files that are displayed
  const filteredFiles = useMemo(() =>
    files.filter(f => {
      const { monthYear, country, type } = parseFilename(f.name);
      const matchesSearch = f.name.toLowerCase().includes(search.toLowerCase());
      const matchesMonth = monthFilter === 'All' || monthYear === monthFilter;
      const matchesCountry = countryFilter === 'All' || country === countryFilter;
      const matchesType = typeFilter === 'All' || type === typeFilter;
      return matchesSearch && matchesMonth && matchesCountry && matchesType;
    })
  , [files, search, monthFilter, countryFilter, typeFilter]);


  // Helper function to get distinct options and their counts for a given attribute
  const getFilteredCounts = (attribute, currentMonth, currentCountry, currentType, currentSearch) => {
    const counts = new Map();
    files.forEach(file => {
      const { monthYear, country, type } = parseFilename(file.name);
      const matchesSearch = file.name.toLowerCase().includes(currentSearch.toLowerCase());

      const matchesOtherFilters =
        (attribute === 'monthYear' || currentMonth === 'All' || monthYear === currentMonth) &&
        (attribute === 'country'   || currentCountry === 'All' || country === currentCountry) &&
        (attribute === 'type'      || currentType === 'All' || type === currentType);

      if (matchesSearch && matchesOtherFilters) {
        const value = parseFilename(file.name)[attribute];
        if (value) {
          counts.set(value, (counts.get(value) || 0) + 1);
        }
      }
    });
    return counts;
  };

  // Define a fixed order for months
  const MONTH_ORDER = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  // Helper function to extract month name (e.g., "August" from "August2025")
  const getMonthName = (monthYearString) => {
    if (!monthYearString) return '';
    const firstDigitIndex = monthYearString.search(/\d/);
    return firstDigitIndex !== -1 ? monthYearString.substring(0, firstDigitIndex) : monthYearString;
  };


  // Derive select options with counts, now dynamically updating based on other filters
  const monthOptions = useMemo(() => {
    const counts = getFilteredCounts('monthYear', 'All', countryFilter, typeFilter, search);
    const uniqueMonths = Array.from(counts.keys());

    const sortedMonths = uniqueMonths.sort((a, b) => {
      const monthA = getMonthName(a);
      const yearA = parseInt(a.match(/\d{4}/)?.[0] || '0', 10);
      const monthB = getMonthName(b);
      const yearB = parseInt(b.match(/\d{4}/)?.[0] || '0', 10);

      if (yearA !== yearB) {
        return yearA - yearB;
      }

      const indexA = MONTH_ORDER.indexOf(monthA);
      const indexB = MONTH_ORDER.indexOf(monthB);

      return indexA - indexB;
    });

    return ['All', ...sortedMonths].map(m => ({
      value: m,
      label: m === 'All' ? 'All' : `${m} (${counts.get(m) || 0})`
    }));
  }, [files, search, countryFilter, typeFilter]);


  const countryOptions = useMemo(() => {
    const counts = getFilteredCounts('country', monthFilter, 'All', typeFilter, search);
    const s = new Set(Array.from(counts.keys()));
    const sortedCountries = Array.from(s).sort();
    return ['All', ...sortedCountries].map(c => ({
      value: c,
      label: c === 'All' ? 'All' : `${c} (${counts.get(c) || 0})`
    }));
  }, [files, search, monthFilter, typeFilter]);


  const typeOptions = useMemo(() => {
    const counts = getFilteredCounts('type', monthFilter, countryFilter, 'All', search);
    const s = new Set(Array.from(counts.keys()));
    const sortedTypes = Array.from(s).sort();
    return ['All', ...sortedTypes].map(t => ({
      value: t,
      label: t === 'All' ? 'All' : `${t} (${counts.get(t) || 0})`
    }));
  }, [files, search, monthFilter, countryFilter]);

  // Function to clear all filters
  const clearFilters = () => {
    setSearch('');
    setMonth('All');
    setCountry('All');
    setType('All');
  };


  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">

      {/* Header */}
      <header className="bg-gradient-to-r from-orange-300 via-orange-200 to-yellow-100 px-6 py-8 shadow-xl rounded-b-3xl text-center">
        <h1 className="text-4xl font-extrabold text-orange-900 tracking-tight inline-flex items-center justify-center gap-3">
          <span>🏆</span>
          Global Chess Tournament Finder
        </h1>
        <p className="mt-2 text-sm text-orange-800 italic">Browse and filter the best offline chess events</p>
      </header>

      {/* NEW: Scrolling Disclaimer Banner */}
      <div className="w-full bg-orange-200 text-gray-800 py-2 overflow-hidden relative shadow-md">
        <p className="text-sm font-medium animate-scroll">
          {/* Repeated message for continuous scroll. Add more repetitions if necessary for wider screens. */}
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

      {/* Filters Section - Corrected Layout */}
      <section className="w-full bg-orange-100 py-10">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-6 items-end"> {/* Changed to 6 columns for desktop */}
            {/* Search Input - takes 2 columns on desktop */}
            <div className="md:col-span-2">
              <label htmlFor="search-input" className="block mb-1 text-sm font-medium text-gray-700">Search</label>
              <input
                id="search-input"
                type="text"
                placeholder="Search tournaments…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className={`${COMMON_BORDER} ${COMMON_BG} ${COMMON_TEXT} ${COMMON_PLACEHOLDER} ${COMMON_FOCUS} rounded-xl px-4 py-2.5 ${COMMON_TRANSITION} w-full`}
              />
            </div>
            {/* Month Filter */}
            <div> {/* This will take 1 column */}
              <label htmlFor="month-select" className="block mb-1 text-sm font-medium text-gray-700">Month</label>
              <select
                id="month-select"
                value={monthFilter}
                onChange={e => setMonth(e.target.value)}
                className={`${COMMON_BORDER} ${COMMON_BG} ${COMMON_TEXT} ${COMMON_FOCUS} rounded-xl px-4 py-2.5 ${COMMON_TRANSITION} w-full`}
              >
                {monthOptions.map(m => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>
            {/* Country Filter */}
            <div> {/* This will take 1 column */}
              <label htmlFor="country-select" className="block mb-1 text-sm font-medium text-gray-700">Country</label>
              <select
                id="country-select"
                value={countryFilter}
                onChange={e => setCountry(e.target.value)}
                className={`${COMMON_BORDER} ${COMMON_BG} ${COMMON_TEXT} ${COMMON_FOCUS} rounded-xl px-4 py-2.5 ${COMMON_TRANSITION} w-full`}
              >
                {countryOptions.map(c => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
            {/* Type Filter - Added back! */}
            <div> {/* This will take 1 column */}
              <label htmlFor="type-select" className="block mb-1 text-sm font-medium text-gray-700">Type</label>
              <select
                id="type-select"
                value={typeFilter}
                onChange={e => setType(e.target.value)}
                className={`${COMMON_BORDER} ${COMMON_BG} ${COMMON_TEXT} ${COMMON_FOCUS} rounded-xl px-4 py-2.5 ${COMMON_TRANSITION} w-full`}
              >
                {typeOptions.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            {/* Clear Filters Button - Now positioned in the last column */}
            <div className="mt-4 md:mt-0"> {/* This will take 1 column */}
              <button
                onClick={clearFilters}
                className={`
                  w-full
                  inline-flex items-center justify-center
                  px-4 py-2.5
                  border border-gray-300 rounded-xl
                  shadow-sm
                  text-sm font-medium
                  text-gray-700 hover:text-gray-900
                  bg-white hover:bg-gray-50
                  focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-300
                  ${COMMON_TRANSITION}
                `}
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* List */}
      <div className="w-full bg-orange-100 dark:bg-gray-800 py-10">
        <div className="max-w-7xl mx-auto px-8 space-y-12">
          {error && ( // NEW: Display error message if there's an error
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
              <strong className="font-bold">Error:</strong>
              <span className="block sm:inline"> {error}</span>
            </div>
          )}

          {loading && !error ? ( // NEW: Display loading state
            <div className="text-center text-gray-600 dark:text-gray-300 py-10">
              <svg className="animate-spin h-8 w-8 text-orange-600 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <p className="mt-3 text-lg font-medium">Loading tournaments...</p>
            </div>
          ) : filteredFiles.length === 0 && !error ? ( // NEW: Display improved empty state only when not loading and no error
            <div className="text-center text-gray-600 dark:text-gray-300 py-10">
              <p className="text-xl font-semibold mb-2">No tournaments found!</p>
              <p className="text-md">
                Try adjusting your filters or clearing them to see more results.
              </p>
              {(search !== '' || monthFilter !== 'All' || countryFilter !== 'All' || typeFilter !== 'All') && (
                <button
                  onClick={clearFilters}
                  className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-orange-500 hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
                >
                  Clear All Filters
                </button>
              )}
            </div>
          ) : ( // NEW: Display cards only when not loading, no error, and files exist
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
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