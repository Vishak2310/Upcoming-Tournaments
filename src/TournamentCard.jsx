import React from 'react';
import { FileText, MapPin, CalendarDays } from 'lucide-react';

function parseFilename(name) {
  if (!name) return { dateRange: '', monthYear: '', type: '', location: '', country: 'Unknown' };
  const noExt = name.replace(/\.pdf$/i, '');
  const parts = noExt.split(' ');
  if (parts.length < 4) return { dateRange: '', monthYear: '', type: '', location: '', country: 'Unknown' };
  const [range, monthYear, type, ...rest] = parts;
  const locationCountry = rest.join(' ');
  const [location = '', countryRaw = 'Unknown'] = locationCountry.split(',').map(s => s.trim());
  return { dateRange: range, monthYear, type, location, country: countryRaw };
}

export function TournamentCard({ file }) {
  const { dateRange, monthYear, type, location, country } = parseFilename(file?.name);
  return (
    <div className="group bg-white rounded-xl p-4 shadow-md flex flex-col border border-orange-100 transition-all duration-300 ease-in-out transform hover:shadow-2xl hover:border-orange-300 hover:scale-[1.015]">
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold uppercase tracking-wide text-orange-600 bg-orange-100 px-2 py-0.5 rounded">
            {type || 'Tournament'}
          </span>
          <span className="text-gray-400 italic">{monthYear}</span>
        </div>
        <h4 className="text-base font-semibold text-gray-800 leading-snug">
          {file?.name?.replace(/\.pdf$/i, '') || 'Untitled Tournament'}
        </h4>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <CalendarDays className="h-4 w-4 text-orange-500 transition-transform duration-300 ease-in-out group-hover:rotate-6" />
          <span>{dateRange}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <MapPin className="h-4 w-4 text-orange-500 transition-transform duration-300 ease-in-out group-hover:-rotate-6" />
          <span>{location}, {country}</span>
        </div>
      </div>
      <div className="pt-4 mt-auto">
        <a
          href={file?.webViewLink || '#'}
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full px-4 py-1.5 bg-orange-500 text-white text-sm font-medium rounded-md transition-all duration-300 ease-in-out group-hover:bg-orange-600 text-center"
        >
          <FileText className="inline-block mr-1 -mt-1 transition-transform duration-300 ease-in-out group-hover:scale-110" /> View PDF
        </a>
      </div>
    </div>
  );
}
