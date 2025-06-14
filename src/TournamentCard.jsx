import React from 'react';
import { FileText, MapPin, CalendarDays } from 'lucide-react';

function parseFilename(name) {
  const noExt = name.replace(/\.pdf$/i, '');
  const [range, monthYear, type, ...rest] = noExt.split(' ');
  const locationCountry = rest.join(' ');
  const [location = '', countryRaw = 'Unknown'] = locationCountry.split(',').map(s => s.trim());
  return {
    dateRange: range || '',
    monthYear: monthYear || '',
    type: type || '',
    location: location || '',
    country: countryRaw || 'Unknown'
  };
}

export function TournamentCard({ file }) {
  const { dateRange, monthYear, type, location, country } = parseFilename(file.name);

  return (
    <div className="bg-white rounded-2xl border border-orange-200 hover:border-orange-300 transform hover:-translate-y-1 transition shadow-xl">
      <div className="p-5 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wide text-orange-500 bg-orange-100 px-2 py-0.5 rounded-md">
            {type || 'Tournament'}
          </span>
          <span className="text-xs text-gray-400 italic">{monthYear}</span>
        </div>
        <h4 className="text-lg font-bold text-gray-800 line-clamp-2">
          {file.name.replace(/\.pdf$/i, '')}
        </h4>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <CalendarDays className="h-4 w-4 text-orange-500" />
          <span>{dateRange}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <MapPin className="h-4 w-4 text-orange-500" />
          <span>{location}, {country}</span>
        </div>
        <a
          href={file.webViewLink}
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full text-center mt-4 px-4 py-2 bg-orange-500 text-white text-sm font-semibold rounded-md hover:bg-orange-600 transition"
        >
          <FileText className="inline-block mr-1 -mt-1" /> View PDF
        </a>
      </div>
    </div>
  );
}
