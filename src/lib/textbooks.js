/**
 * Available textbooks — managed by the app builder, not the end user.
 *
 * To add a textbook:
 *   1. Upload the PDF via the Files section (or ask Base44 to upload it for you).
 *   2. Copy the resulting file URL into `textbook_url` below.
 *   3. Set `language` to the textbook's language (e.g. "Bengali", "Arabic").
 *      When set, tutoring for this subject will be in that language.
 *   4. Optionally attach a syllabus JSON and/or YouTube videos JSON.
 *
 * Syllabus JSON format:
 *   { "syllabus": { "topics": [{ "id": "...", "name": "...", "subtopics": ["..."] }] } }
 *   — or —
 *   { "topics": [{ "id": "...", "name": "...", "subtopics": ["..."] }] }
 *
 * YouTube videos JSON format:
 *   { "videos": [{ "topic_id": "...", "topic_name": "...", "youtube_id": "..." }] }
 */
export const AVAILABLE_TEXTBOOKS = [
  // Example:
  // {
  //   id: "math_6_textbook",
  //   title: "6th Grade Math Textbook",
  //   language: "English",
  //   textbook_url: "",
  //   syllabus_url: "",
  //   youtube_videos_url: "",
  // },
  {
    id: "none",
    title: "No textbook",
    language: null,
    textbook_url: null,
    syllabus_url: null,
    youtube_videos_url: null,
  },
  {
    id: "math_6_7",
    title: "6th/7th Grade Math Curriculum",
    language: "English",
    subject: "Math",
    grade_levels: ["6th", "7th"],
    textbook_url: null,
    syllabus_url: "https://media.base44.com/files/public/6a3587c8e40e63059cdaac7f/cca66f00b_math_syllabus1.json",
    youtube_videos_url: null,
  },
  {
    id: "bengali_child_dev",
    title: "বাচ্চাদের শারীরিক ও মানসিক অবস্থার বিকাশ",
    language: "Bengali",
    subject: "Child Development",
    grade_levels: ["6th", "7th", "8th", "9th", "10th", "11th", "12th", "adaptive"],
    textbook_url: "https://media.base44.com/files/public/6a3587c8e40e63059cdaac7f/d8f43a7bb_______.docx",
    syllabus_url: null,
    youtube_videos_url: null,
    // Pre-broken-down topics so this book can be used directly as a study guide,
    // without needing the AI to regenerate a syllabus each time.
    topics: [
      {
        id: "physical_development",
        name: "শারীরিক বিকাশ",
        subtopics: ["জন্মপূর্ব বিকাশ", "শৈশবকালীন শারীরিক বিকাশ", "বয়ঃসন্ধিকালীন পরিবর্তন", "গতি দক্ষতার (motor skills) উন্নয়ন"],
        description: "শিশুর শরীরের বৃদ্ধি ও শারীরিক পরিবর্তনসমূহ",
        difficulty: "beginner",
      },
      {
        id: "cognitive_development",
        name: "মানসিক (জ্ঞানীয়) বিকাশ",
        subtopics: ["চিন্তাশক্তির বিকাশ", "ভাষার বিকাশ", "স্মৃতিশক্তির বিকাশ", "সমস্যা সমাধান দক্ষতা"],
        description: "শিশুর চিন্তা, ভাষা ও শেখার সক্ষমতার বিকাশ",
        difficulty: "beginner",
      },
      {
        id: "social_emotional_development",
        name: "সামাজিক ও আবেগীয় বিকাশ",
        subtopics: ["সংযুক্তি (Attachment)", "আবেগ নিয়ন্ত্রণ", "সামাজিক দক্ষতা", "আত্মপরিচয়ের বিকাশ"],
        description: "শিশুর অনুভূতি নিয়ন্ত্রণ ও অন্যদের সাথে সম্পর্ক গঠনের বিকাশ",
        difficulty: "beginner",
      },
      {
        id: "developmental_stages",
        name: "বিকাশের পর্যায়সমূহ",
        subtopics: ["শৈশবকাল", "কৈশোরকাল", "বয়ঃসন্ধিকাল"],
        description: "বয়সভিত্তিক বিকাশের ধাপসমূহ",
        difficulty: "intermediate",
      },
      {
        id: "developmental_factors",
        name: "বিকাশে প্রভাবক বিষয়সমূহ",
        subtopics: ["পারিবারিক পরিবেশ", "পুষ্টি", "শিক্ষা", "সামাজিক-অর্থনৈতিক অবস্থা"],
        description: "শিশুর বিকাশকে প্রভাবিত করে এমন উপাদানসমূহ",
        difficulty: "intermediate",
      },
    ],
  },
];