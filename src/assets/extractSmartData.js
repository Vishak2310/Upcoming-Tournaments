// src/extractSmartData.js

export function extractSmartDataFromPDF(file) {
  const name = file?.name?.toLowerCase() || '';

  // Example mock detection
  if (name.includes("delhi")) {
    return {
      title: "Delhi District Chess Association Tournament",
      date: "June 22-24, 2025",
      location: "Jawaharlal Nehru Stadium, Delhi",
      country: "India",
      website: "https://delhichess.com",
      organizer: "DDCA",
      contact: "+91-9876543210",
      pdfUrl: file.webViewLink,
    };
  } else if (name.includes("kerala")) {
    return {
      title: "Kerala Rapid Chess Championship 2025",
      date: "July 9-11, 2025",
      location: "Ernakulam Indoor Stadium, Kochi",
      country: "India",
      website: "https://keralachess.org",
      organizer: "Kerala Chess Federation",
      contact: "+91-9447000000",
      pdfUrl: file.webViewLink,
    };
  } else {
    return {
      title: "Unknown Tournament",
      date: "Unknown",
      location: "Unknown",
      country: "Unknown",
      website: "https://example.com",
      organizer: "Unknown Organizer",
      contact: "N/A",
      pdfUrl: file.webViewLink,
    };
  }
}
