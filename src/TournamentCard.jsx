import React from 'react';

// Common Tailwind CSS classes for consistency
const COMMON_BG           = 'bg-white dark:bg-gray-800';
const COMMON_BORDER       = 'border border-gray-200 dark:border-gray-700';
const COMMON_TEXT         = 'text-gray-800 dark:text-gray-100';
const COMMON_SHADOW       = 'shadow-lg hover:shadow-xl';
const COMMON_TRANSITION   = 'transition duration-300 ease-in-out';

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

export function TournamentCard({ file }) {
  const { name, webViewLink } = file;
  const { dateRange, monthYear, type, location, country } = parseFilename(name);

  // Function to format date range for display
  const formatDisplayDate = (dateRange, monthYear) => {
    const month = monthYear.match(/[A-Za-z]+/)?.[0] || '';
    const year = monthYear.match(/\d{4}/)?.[0] || '';

    // Handle single day vs. range
    if (dateRange.includes('-')) {
      const [startDay, endDay] = dateRange.split('-');
      if (startDay === endDay) {
        return `${startDay} ${month} ${year}`;
      }
      return `${dateRange} ${month} ${year}`;
    }
    return `${dateRange} ${month} ${year}`;
  };

  const displayDate = formatDisplayDate(dateRange, monthYear);

  return (
    <div className={`${COMMON_BG} ${COMMON_BORDER} ${COMMON_SHADOW} ${COMMON_TRANSITION} rounded-xl p-6 flex flex-col justify-between`}>
      <div>
        {/* Type and Month/Year at the top right */}
        <div className="flex justify-between items-start mb-2">
          {type && (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800 dark:bg-orange-700 dark:text-orange-100">
              {type}
            </span>
          )}
          <span className="text-sm font-semibold text-gray-500 dark:text-gray-400">
            {monthYear}
          </span>
        </div>

        {/* Tournament Name (filename without extension) */}
        <h3 className={`${COMMON_TEXT} text-lg font-bold mb-3 leading-tight`}>
          {name.replace(/\.pdf$/i, '')}
        </h3>

        {/* Enhanced Details with Icons */}
        <div className="space-y-2 text-gray-700 dark:text-gray-300 text-sm mb-4">
          {/* Date Range */}
          {dateRange && (
            <p className="flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {displayDate}
            </p>
          )}

          {/* Location */}
          {location && (
            <p className="flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {location}{country && `, ${country}`}
            </p>
          )}
        </div>
      </div>

      {/* Buttons */}
      <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2 mt-4">
        <a
          href={webViewLink}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-orange-500 hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
          View PDF
        </a>
        {/* Placeholder for Download PDF, currently links to View PDF */}
        <a
          href={webViewLink} // For actual download, this would be a direct download link if available
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 inline-flex items-center justify-center px-4 py-2 border border-orange-400 rounded-md shadow-sm text-sm font-medium text-orange-700 bg-white hover:bg-orange-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-400"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Download PDF
        </a>
      </div>
    </div>
  );
}