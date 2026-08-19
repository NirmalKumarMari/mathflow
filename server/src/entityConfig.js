// Maps the base44 entity names the frontend already uses to their Postgres
// tables/columns. Column names are 1:1 with the JSON field names the
// frontend sends, so rows can be returned to the client as-is.
export const ENTITY_CONFIG = {
  StudentProfile: {
    table: 'student_profiles',
    owned: true,
    columns: [
      'age', 'grade_level', 'country', 'syllabus', 'language', 'goals', 'use_case',
      'preferred_explanation_style', 'current_topic', 'overall_mastery',
      'onboarding_complete', 'session_state',
    ],
    jsonColumns: ['session_state'],
  },
  TopicMastery: {
    table: 'topic_masteries',
    owned: true,
    columns: [
      'topic', 'subtopic', 'mastery_score', 'questions_attempted', 'questions_correct',
      'consecutive_failures', 'difficulty_level', 'status', 'last_practiced',
    ],
    jsonColumns: [],
  },
  StudyGuide: {
    table: 'study_guides',
    owned: true,
    columns: [
      'version', 'status', 'subject_id', 'strengths', 'gaps', 'next_topics',
      'plan_details', 'student_feedback', 'weekly_idea', 'weekly_review', 'last_review_date',
    ],
    jsonColumns: ['strengths', 'gaps', 'next_topics'],
  },
  PracticeQuestion: {
    table: 'practice_questions',
    owned: true,
    columns: [
      'topic', 'subtopic', 'difficulty', 'question_text', 'correct_answer',
      'student_answer', 'is_correct', 'explanation', 'hints', 'session_id',
    ],
    jsonColumns: [],
  },
  ProblemBank: {
    table: 'problem_bank',
    owned: false,
    columns: [
      'topic', 'subtopic', 'difficulty', 'question_text', 'correct_answer',
      'solution_steps', 'hints', 'language', 'subject_id', 'source', 'times_used',
    ],
    jsonColumns: [],
  },
  Subject: {
    table: 'subjects',
    owned: true,
    columns: [
      'name', 'subject_type', 'grade_level', 'description', 'color', 'country',
      'language', 'topics', 'textbook_url', 'textbook_title', 'syllabus_url',
      'youtube_videos_url', 'placement_completed',
    ],
    jsonColumns: ['topics'],
  },
};
