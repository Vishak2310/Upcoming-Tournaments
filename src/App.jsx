import React, { useEffect, useState, useMemo } from 'react';
import { TournamentCard } from './TournamentCard';

// light & dark fallbacks
const COMMON_BG          = 'bg-white dark:bg-gray-800';
const COMMON_BORDER      = 'border border-gray-300 dark:border-gray-600';
const COMMON_TEXT        = 'text-gray-800 dark:text-gray-100';
const COMMON_PLACEHOLDER = 'placeholder-gray-500 dark:placeholder-gray-400';
const COMMON_FOCUS       = 'focus:outline-none focus:ring-2 focus:ring-blue-400';
const COMMON_TRANSITION  = 'transition';
const COMMON_SHADOW      = 'shadow-lg hover:shadow-2xl';

const API_KEY   = import.meta.env.VITE_API_KEY;
const FOLDER_ID = import.meta.env.VITE_FOLDER_ID;

// parse name "14-15 June2025 Classical Paris, France.pdf"
function parseFilename(name) {
  const noExt = name.replace(/\.pdf$/i, '');
  const [range, monthYear, type, ...rest] = noExt.split(' ');
  const locationCountry = rest.join(' ');
  const [location, countryRaw] = locationCountry.split(',').map(s => s.trim());
  return {
    dateRange: range || '',
    monthYear: monthYear || '',
    type:      type      || '',
    location:  location  || '',
    country:   countryRaw || 'Unknown'
  };
}

export default function App() {
  const [files, setFiles]       = useState([]);
  const [darkMode, setDarkMode] = useState(false);
  const [search, setSearch]     = useState('');
  const [monthFilter, setMonth] = useState('All');
  const [countryFilter, setCountry] = useState('All');
  const [typeFilter, setType]   = useState('All');
  const filteredFiles = files.filter(file => {
  const name = file.name.toLowerCase();

  const matchesSearch = name.includes(search.toLowerCase());
  const matchesMonth = monthFilter === 'All' || name.includes(monthFilter.toLowerCase());
  const matchesCountry = countryFilter === 'All' || name.includes(countryFilter.toLowerCase());
  const matchesType = typeFilter === 'All' || name.includes(typeFilter.toLowerCase());

  return matchesSearch && matchesMonth && matchesCountry && matchesType;
});

  // fetch PDF list
  useEffect(() => {
    if (!API_KEY || !FOLDER_ID) {
      console.error('Missing VITE_API_KEY or VITE_FOLDER_ID');
      return;
    }
    const q   = `'${FOLDER_ID}' in parents and mimeType='application/pdf'`;
    const url =
      `https://www.googleapis.com/drive/v3/files`
      + `?q=${encodeURIComponent(q)}`
      + `&supportsAllDrives=true`
      + `&fields=files(id,name,webViewLink)`
      + `&key=${API_KEY}`;

    fetch(url)
      .then(r => r.json())
      .then(data => setFiles(data.files || []))
      .catch(console.error);
  }, []);

  // toggle the <html class="dark">
  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

  // derive selects
  const monthOptions = useMemo(() => {
    const s = new Set(files.map(f => parseFilename(f.name).monthYear).filter(Boolean));
    return ['All', ...s];
  }, [files]);
  const countryOptions = useMemo(() => {
    const s = new Set(files.map(f => parseFilename(f.name).country).filter(Boolean));
    return ['All', ...s];
  }, [files]);
  const typeOptions = useMemo(() => {
    const s = new Set(files.map(f => parseFilename(f.name).type).filter(Boolean));
    return ['All', ...s];
  }, [files]);

  // apply filters
  const filtered = useMemo(() =>
    files.filter(f => {
      const { monthYear, country, type } = parseFilename(f.name);
      return (
        f.name.toLowerCase().includes(search.toLowerCase()) &&
        (monthFilter   === 'All' || monthYear  === monthFilter) &&
        (countryFilter === 'All' || country    === countryFilter) &&
        (typeFilter    === 'All' || type       === typeFilter)
      );
    })
  , [files, search, monthFilter, countryFilter, typeFilter]);
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
        {monthOptions.map(m => <option key={m} value={m}>{m}</option>)}
      </select>
    </div>
    <div>
      <label className="block mb-1 text-sm font-medium text-gray-700">Country</label>
      <select
        value={countryFilter}
        onChange={e => setCountry(e.target.value)}
        className={`${COMMON_BORDER} ${COMMON_BG} ${COMMON_TEXT} ${COMMON_FOCUS} rounded-xl px-4 py-2.5 ${COMMON_TRANSITION} w-full`}
      >
        {countryOptions.map(c => <option key={c} value={c}>{c}</option>)}
      </select>
    </div>
    <div>
      <label className="block mb-1 text-sm font-medium text-gray-700">Type</label>
      <select
        value={typeFilter}
        onChange={e => setType(e.target.value)}
        className={`${COMMON_BORDER} ${COMMON_BG} ${COMMON_TEXT} ${COMMON_FOCUS} rounded-xl px-4 py-2.5 ${COMMON_TRANSITION} w-full`}
      >
        {typeOptions.map(t => <option key={t} value={t}>{t}</option>)}
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
