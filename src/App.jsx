import React, { useEffect, useState, useMemo } from 'react';

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

  // group by country→month
  const grouped = useMemo(() => {
    return filtered.reduce((acc, f) => {
      const { country, monthYear } = parseFilename(f.name);
      acc[country] = acc[country] || {};
      acc[country][monthYear] = acc[country][monthYear] || [];
      acc[country][monthYear].push(f);
      return acc;
    }, {});
  }, [filtered]);

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
          {Object.keys(grouped).length === 0
            ? <p className="text-center text-gray-600 dark:text-gray-400">No tournaments found.</p>
            : Object.entries(grouped).map(([country, months]) => (
                <section key={country}>
                  <h2 className="text-3xl font-bold text-gray-800 dark:text-gray-200 mb-4">{country}</h2>
                  {Object.entries(months).map(([mon, arr]) => (
                    <div key={mon} className="mb-8">
                      <h3 className="text-2xl font-semibold text-gray-700 dark:text-gray-300 mb-3">{mon}</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                        {arr.map(f => (
                          <div
                            key={f.id}
                            className={`${COMMON_BG} ${COMMON_SHADOW} rounded-xl transform hover:-translate-y-1 ${COMMON_TRANSITION}`}
                          >
                            <div className="p-6">
                              <h4 className="text-lg font-semibold truncate text-gray-900 dark:text-gray-100">
                                {f.name.replace(/\.pdf$/i, '')}
                              </h4>
                              <a
                                href={f.webViewLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-block mt-4 px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition"
                              >
                                View PDF
                              </a>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </section>
              ))
          }
        </div>
      </div>
    </div>
  );
}
