/**
 * Countries configuration — maps each country to its language and available syllabi.
 *
 * This is a PLACEHOLDER. The full country/syllabus data will be provided as a JSON
 * structure and loaded here. For now, a few entries are included so the UI works.
 *
 * Expected final JSON format (to replace this file):
 * [
 *   {
 *     "code": "US",
 *     "name": "United States",
 *     "language": "English",
 *     "syllabi": [
 *       { "id": "common_core", "name": "Common Core" }
 *     ]
 *   }
 * ]
 */
export const COUNTRIES = [
  {
    code: "US",
    name: "United States",
    language: "English",
    syllabi: [
      { id: "common_core", name: "Common Core" },
      { id: "teks", name: "TEKS (Texas)" },
    ],
  },
  {
    code: "GB",
    name: "United Kingdom",
    language: "English",
    syllabi: [
      { id: "national_curriculum", name: "National Curriculum (Key Stage 3)" },
    ],
  },
  {
    code: "BD",
    name: "Bangladesh",
    language: "Bengali",
    syllabi: [
      { id: "nctb", name: "NCTB National Curriculum" },
    ],
  },
  {
    code: "IN",
    name: "India",
    language: "Hindi",
    syllabi: [
      { id: "cbse", name: "CBSE" },
      { id: "icse", name: "ICSE" },
    ],
  },
  {
    code: "AU",
    name: "Australia",
    language: "English",
    syllabi: [
      { id: "aus_curriculum", name: "Australian Curriculum" },
    ],
  },
  {
    code: "CA",
    name: "Canada",
    language: "English",
    syllabi: [
      { id: "ontario", name: "Ontario Curriculum" },
    ],
  },
  {
    code: "SG",
    name: "Singapore",
    language: "English",
    syllabi: [
      { id: "singapore_moe", name: "Singapore MOE Syllabus" },
    ],
  },
  {
    code: "AE",
    name: "United Arab Emirates",
    language: "Arabic",
    syllabi: [
      { id: "moae", name: "UAE Ministry of Education" },
    ],
  },
  {
    code: "SA",
    name: "Saudi Arabia",
    language: "Arabic",
    syllabi: [
      { id: "saudi_moe", name: "Saudi Ministry of Education" },
    ],
  },
  {
    code: "FR",
    name: "France",
    language: "French",
    syllabi: [
      { id: "education_nationale", name: "Éducation Nationale" },
    ],
  },
  {
    code: "ES",
    name: "Spain",
    language: "Spanish",
    syllabi: [
      { id: "lomloe", name: "LOMLOE" },
    ],
  },
  {
    code: "DE",
    name: "Germany",
    language: "German",
    syllabi: [
      { id: "kultusminister", name: "Kultusministerkonferenz" },
    ],
  },
];

export function getCountryByName(name) {
  return COUNTRIES.find(c => c.name === name);
}

export function getLanguageForCountry(countryName) {
  return getCountryByName(countryName)?.language || "English";
}

export function getSyllabiForCountry(countryName) {
  return getCountryByName(countryName)?.syllabi || [];
}