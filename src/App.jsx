import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { TournamentCard } from './TournamentCard';

// You would typically define your API_KEY and FOLDER_ID in a .env file
// and access them via import.meta.env (for Vite) or process.env (for Create-React-App)
const API_KEY = import.meta.env.VITE_API_KEY;
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

  // --- START MODIFIED LOGIC FOR START DATE ---
  let startDate = null;
  const dayMatch = dateRange.match(/^\d+/); // Get the first number in the dateRange (e.g., "14" from "14-15")
  if (dayMatch && monthYear) {
    // Extract month name (e.g., "June" from "June2025") and year (e.g., "2025")
    const monthNameMatch = monthYear.match(/[a-zA-Z]+/);
    const yearMatch = monthYear.match(/\d{4}/);

    if (monthNameMatch && yearMatch) {
      try {
        // Construct a date string in a format Date.parse can understand
        const dateString = `${monthNameMatch[0]} ${dayMatch[0]}, ${yearMatch[0]}`;
        startDate = new Date(dateString);
      } catch (e) {
        console.error("Error parsing start date for:", name, e);
        startDate = null; // Set to null if parsing fails
      }
    }
  }
  // --- END MODIFIED LOGIC FOR START DATE ---

  return {
    dateRange: dateRange,
    monthYear: monthYear,
    type:      type,
    location:  location,
    country:   countryRaw || 'Unknown',
    startDate: startDate // Add the new startDate property
  };
}


export default function App() {
  const [files, setFiles] = useState([]);
  const [search, setSearch] = useState('');
  const [monthFilter, setMonth] = useState('All');
  const [countryFilter, setCountry] = useState('All');
  const [typeFilter, setType] = useState('All');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Common Tailwind CSS classes for consistency
  const COMMON_BORDER       = 'border border-gray-300';
  const COMMON_BG           = 'bg-white';
  const COMMON_TEXT         = 'text-gray-800';
  const COMMON_PLACEHOLDER  = 'placeholder-gray-500';
  const COMMON_FOCUS        = 'focus:outline-none focus:ring-2 focus:ring-blue-400';
  const COMMON_TRANSITION   = 'transition';

  // fetch PDF list from Google Drive
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
          break; // Stop fetching if an error occurs
        }
      } while (nextPageToken);

      setFiles(allFiles);
      setLoading(false);
    };

    fetchAllFiles().catch(console.error);
  }, []);

  // This is the final filtered and *sorted* list of files that are displayed
  const filteredFiles = useMemo(() => {
      const now = new Date(); // Get today's date and time for comparison

      // 1. Filter the files based on search and selected filters
      let filtered = files.filter(f => {
          // Ensure parsedData is attached, even if it was done elsewhere,
          // it's good to have it consistent here for safety within the memo.
          const parsed = f.parsedData || parseFilename(f.name); // Use existing parsedData or parse if not present
          f.parsedData = parsed; // Attach parsed data to file object for easier access

          const matchesSearch = f.name.toLowerCase().includes(search.toLowerCase());
          const matchesMonth = monthFilter === 'All' || parsed.monthYear === monthFilter;
          const matchesCountry = countryFilter === 'All' || parsed.country === countryFilter;
          const matchesType = typeFilter === 'All' || parsed.type === typeFilter;

          // Logic to filter out past events in the default view:
          // Only show events from today onwards by default if no specific filters are active.
          // If filters (month, country, type, search) are applied, assume the user might want to see all dates matching those filters.
          const isAnyFilterActive = search !== '' || monthFilter !== 'All' || countryFilter !== 'All' || typeFilter !== 'All';

          if (!isAnyFilterActive && parsed.startDate && parsed.startDate < now) {
              // In the default "All" view with no other filters, exclude past events.
              return false;
          }

          return matchesSearch && matchesMonth && matchesCountry && matchesType;
      });

      // 2. Sort the filtered files by their start date (earliest upcoming first)
      filtered.sort((a, b) => {
          const dateA = a.parsedData.startDate;
          const dateB = b.parsedData.startDate;

          // Handle cases where startDate might be null or invalid
          // Invalid dates (null) will be pushed to the end of the list.
          if (!dateA && !dateB) return 0; // Both invalid, maintain original relative order
          if (!dateA) return 1;          // A is invalid, push A towards the end
          if (!dateB) return -1;         // B is invalid, push B towards the end (A comes before B)

          // Sort valid dates in ascending order (earliest date first)
          return dateA.getTime() - dateB.getTime();
      });

      return filtered;
  }, [files, search, monthFilter, countryFilter, typeFilter]); // Dependencies remain the same


  // Helper function to get distinct options and their counts for a given attribute
  const getFilteredCounts = (attribute, currentMonth, currentCountry, currentType, currentSearch) => {
    const counts = new Map();
    files.forEach(file => {
      const parsed = parseFilename(file.name); // Re-parse each file for consistent data
      const { monthYear, country, type } = parsed;
      const matchesSearch = file.name.toLowerCase().includes(currentSearch.toLowerCase());

      const matchesOtherFilters =
        (attribute === 'monthYear' || currentMonth === 'All' || monthYear === currentMonth) &&
        (attribute === 'country'   || currentCountry === 'All' || country === currentCountry) &&
        (attribute === 'type'      || currentType === 'All' || type === currentType);

      if (matchesSearch && matchesOtherFilters) {
        const value = parsed[attribute];
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

  // Helper function to extract year (e.g., "2025" from "August2025")
  const getYear = (monthYearString) => {
    if (!monthYearString) return 0;
    const yearMatch = monthYearString.match(/\d{4}/);
    return yearMatch ? parseInt(yearMatch[0], 10) : 0;
  };


  // Derive select options with counts, now dynamically updating based on other filters
  const monthOptions = useMemo(() => {
    const counts = getFilteredCounts('monthYear', 'All', countryFilter, typeFilter, search);
    const uniqueMonths = Array.from(counts.keys());

    const sortedMonths = uniqueMonths.sort((a, b) => {
      const yearA = getYear(a);
      const yearB = getYear(b);

      if (yearA !== yearB) {
        return yearA - yearB; // Sort by year first
      }

      const monthA = getMonthName(a);
      const monthB = getMonthName(b);

      const indexA = MONTH_ORDER.indexOf(monthA);
      const indexB = MONTH_ORDER.indexOf(monthB);

      return indexA - indexB; // Then sort by chronological month order
    });

    // Determine if we have multiple years for the same month name
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
      // If a month name appears in more than one year, add the year to distinguish it
      if (monthNameOccurrences.get(monthName) > 1) {
          displayLabel += ` ${year}`;
      }
      
      return {
        value: m, // Keep the full "MonthYear" string as the value for accurate filtering
        label: `${displayLabel} (${counts.get(m) || 0})` // Append count
      };
    });
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

  // Function to check if any filters are active
  const areFiltersActive = useMemo(() => {
    return search !== '' || monthFilter !== 'All' || countryFilter !== 'All' || typeFilter !== 'All';
  }, [search, monthFilter, countryFilter, typeFilter]);

  // Function to clear all filters
  const clearFilters = useCallback(() => {
    setSearch('');
    setMonth('All');
    setCountry('All');
    setType('All');
  }, []);


  return (
    <div className="min-h-screen bg-gray-50 transition-colors duration-300">

      {/* Header */}
      <header className="bg-gradient-to-r from-orange-300 via-orange-200 to-yellow-100 px-6 py-8 shadow-xl rounded-b-3xl text-center relative">
        <h1 className="text-4xl font-extrabold text-orange-900 tracking-tight inline-flex items-center justify-center gap-3">
          <span>🏆</span>
          Global Chess Tournament Finder
        </h1>
        <p className="mt-2 text-sm text-orange-800 italic">Simplifying your search for international chess tournaments</p>
      </header>

      {/* Scrolling Disclaimer Banner */}
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

      {/* Filters Section */}
      <section className="w-full bg-orange-100 py-10">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-6 items-end">
            {/* Search Input */}
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
            <div>
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
            <div>
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
            {/* Type Filter */}
            <div>
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
            {/* Clear Filters Button */}
            <div className="mt-4 md:mt-0">
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
                    : 'bg-gray-200 text-gray-500 cursor-not-allowed border border-gray-300'
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
        <div className="max-w-7xl mx-auto px-8 space-y-12">
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