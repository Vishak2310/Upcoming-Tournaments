import React from 'react';
import { FileText, MapPin, CalendarDays, Download } from 'lucide-react'; // Import the Download icon

// Note: parseFilename is defined here for direct use within TournamentCard.
// If you move it to a utils file, ensure to import it correctly here.
function parseFilename(name) {
    if (!name) return { dateRange: '', monthYear: '', type: '', location: '', country: 'Unknown' };
    const noExt = name.replace(/\.pdf$/i, '');
    const parts = noExt.split(' ');
    // Added a more robust check for minimum parts needed for parsing
    // This handles cases where filename might be shorter than expected structure.
    if (parts.length < 4) {
        // Attempt to extract what's available
        const dateRange = parts[0] || '';
        const monthYear = parts[1] || '';
        const type = parts[2] || '';
        const locationCountry = parts.slice(3).join(' '); // This will be empty if parts.length < 4
        const [location = '', countryRaw = 'Unknown'] = locationCountry.split(',').map(s => s.trim());
        return { dateRange, monthYear, type, location, country: countryRaw };
    }

    const [range, monthYear, type, ...rest] = parts;
    const locationCountry = rest.join(' ');
    const [location = '', countryRaw = 'Unknown'] = locationCountry.split(',').map(s => s.trim());
    return { dateRange: range, monthYear, type, location, country: countryRaw };
}

export function TournamentCard({ file }) {
    const { dateRange, monthYear, type, location, country } = parseFilename(file?.name);

    // Get API_KEY from environment variables, same as in App.jsx
    const API_KEY = import.meta.env.VITE_API_KEY;

    // Function to handle PDF download
    const handleDownload = () => {
        if (!file?.id || !API_KEY) {
            console.error('File ID or API Key is missing, cannot download.');
            return;
        }
        // Construct the download URL using the file ID and your API Key
        // The 'alt=media' parameter is crucial for directly downloading the file content
        const downloadUrl = `https://www.googleapis.com/drive/v3/files/${file.id}?alt=media&key=${API_KEY}`;

        // Create a temporary anchor element to trigger the download
        const link = document.createElement('a');
        link.href = downloadUrl;
        // The 'download' attribute suggests a filename. Use file?.name for this.
        link.setAttribute('download', file?.name || 'tournament.pdf');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

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
            <div className="pt-4 mt-auto flex space-x-2"> {/* Added flex and space-x-2 */}
                {/* View PDF Button */}
                <a
                    href={file?.webViewLink || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 block px-4 py-1.5 bg-orange-500 text-white text-sm font-medium rounded-md transition-all duration-300 ease-in-out group-hover:bg-orange-600 text-center"
                >
                    <FileText className="inline-block mr-1 -mt-1 transition-transform duration-300 ease-in-out group-hover:scale-110" /> View PDF
                </a>

                {/* Download PDF Button */}
                <button
                    onClick={handleDownload}
                    className="flex-1 block px-4 py-1.5 border border-orange-400 text-orange-700 bg-white text-sm font-medium rounded-md transition-all duration-300 ease-in-out hover:bg-orange-50 hover:text-orange-800 text-center"
                >
                    <Download className="inline-block mr-1 -mt-1 transition-transform duration-300 ease-in-out group-hover:scale-110" /> Download PDF
                </button>
            </div>
        </div>
    );
}