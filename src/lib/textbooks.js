/**
 * Available textbooks — managed by the app builder, not the end user.
 *
 * To add a textbook:
 *   1. Upload the PDF via the Files section (or ask Base44 to upload it for you).
 *   2. Copy the resulting file URL into `textbook_url` below.
 *   3. Optionally attach a syllabus JSON and/or YouTube videos JSON.
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
  //   textbook_url: "",
  //   syllabus_url: "",
  //   youtube_videos_url: "",
  // },
  {
    id: "none",
    title: "No textbook",
    textbook_url: null,
    syllabus_url: null,
    youtube_videos_url: null,
  },
];