import React, { useEffect, useState, useMemo } from 'react';
import { TournamentCard } from './TournamentCard';

// light & dark fallbacks
const COMMON_BG          = 'bg-white dark:bg-gray-800';
const COMMON_BORDER      = 'border border-gray-300 dark:border-gray-600';
const COMMON_TEXT        = 'text-gray-800 dark:text-gray-100';
const COMMON_PLACEHOLDER = 'placeholder-gray-500 dark:placeholder-400';
const COMMON_FOCUS       = 'focus:outline-none focus:ring-2 focus:ring-blue-400';
const COMMON_TRANSITION  = 'transition';
const COMMON_SHADOW      = 'shadow-lg hover:shadow-2xl';

const API_KEY   = import.meta.env.VITE_API_KEY;
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
    type:      type,
    location:  location,
    country:   countryRaw || 'Unknown'
  };
}

export default function App() {
  const [files, setFiles]       = useState([]);
  const [darkMode, setDarkMode] = useState(false);
  const [search, setSearch]     = useState('');
  const [monthFilter, setMonth] = useState('All');
  const [countryFilter, setCountry] = useState('All');
  const [typeFilter, setType]   = useState('All');

  // fetch PDF list
  useEffect(() => {
    if (!API_KEY || !FOLDER_ID) {
    console.error('Missing VITE_API_KEY or VITE_FOLDER_ID');
    return;
  }

  const fetchAllFiles = async () => {
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
        break; // Stop fetching if an error occurs
      }
    } while (nextPageToken);

    setFiles(allFiles);
  };

  fetchAllFiles().catch(console.error);
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
  // It takes the current filter being considered (e.g., 'monthYear' for month dropdown)
  // and filters the full list of files based on *other* active filters.
  const getFilteredCounts = (attribute, currentMonth, currentCountry, currentType, currentSearch) => {
    const counts = new Map();
    files.forEach(file => {
      const { monthYear, country, type } = parseFilename(file.name);
      const matchesSearch = file.name.toLowerCase().includes(currentSearch.toLowerCase());

      // Check if the file matches *other* active filters
      const matchesOtherFilters =
        (attribute === 'monthYear' || currentMonth === 'All' || monthYear === currentMonth) &&
        (attribute === 'country'   || currentCountry === 'All' || country === currentCountry) &&
        (attribute === 'type'      || currentType === 'All' || type === currentType);

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
      {/* Background color changed to a lighter orange, text color adjusted for contrast */}
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

      {/* Filters */}
      <section className="w-full bg-orange-100 py-8">
  <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-6 px-6">
    <div>
      <label className="block mb-1 text-sm font-medium text-gray-700">Search</label>
      <input
        type="text"
        placeholder="Search tournaments…"
        value={search}
        onChange={e => setSearch(e.target.value)}
        className={`${COMMON_BORDER} ${COMMON_BG} ${COMMON_TEXT} ${COMMON_PLACEHOLDER} ${COMMON_FOCUS} rounded-xl px-4 py-2.5 ${COMMON_TRANSITION} w-full`}
      />
    </div>
    <div>
      <label className="block mb-1 text-sm font-medium text-gray-700">Month</label>
      <select
        value={monthFilter}
        onChange={e => setMonth(e.target.value)}
        className={`${COMMON_BORDER} ${COMMON_BG} ${COMMON_TEXT} ${COMMON_FOCUS} rounded-xl px-4 py-2.5 ${COMMON_TRANSITION} w-full`}
      >
        {/* Render month options with counts */}
        {monthOptions.map(m => (
          <option key={m.value} value={m.value}>{m.label}</option>
        ))}
      </select>
    </div>
    <div>
      <label className="block mb-1 text-sm font-medium text-gray-700">Country</label>
      <select
        value={countryFilter}
        onChange={e => setCountry(e.target.value)}
        className={`${COMMON_BORDER} ${COMMON_BG} ${COMMON_TEXT} ${COMMON_FOCUS} rounded-xl px-4 py-2.5 ${COMMON_TRANSITION} w-full`}
      >
        {/* Render country options with counts */}
        {countryOptions.map(c => (
          <option key={c.value} value={c.value}>{c.label}</option>
        ))}
      </select>
    </div>
    <div>
      <label className="block mb-1 text-sm font-medium text-gray-700">Type</label>
      <select
        value={typeFilter}
        onChange={e => setType(e.target.value)}
        className={`${COMMON_BORDER} ${COMMON_BG} ${COMMON_TEXT} ${COMMON_FOCUS} rounded-xl px-4 py-2.5 ${COMMON_TRANSITION} w-full`}
      >
        {/* Render type options with counts */}
        {typeOptions.map(t => (
          <option key={t.value} value={t.value}>{t.label}</option>
        ))}
      </select>
    </div>
  </div>
</section>

      {/* List */}
      <div className="w-full bg-orange-100 dark:bg-gray-800 py-10">
        <div className="max-w-7xl mx-auto px-8 space-y-12">
          {filteredFiles.length === 0 ? (
  <p className="text-center text-gray-600">No tournaments found.</p>
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