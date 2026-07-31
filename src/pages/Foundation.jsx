import React, { useState, useEffect, useCallback } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, BookOpen, Lightbulb, CheckCircle, XCircle, Loader2, ChevronDown, ChevronUp, ArrowRight, Sparkles, Library, Youtube } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { useStudentProfile, useTopicMasteries } from "@/hooks/useStudentProfile";
import { useI18n } from "@/hooks/useI18n";
import { SYLLABUS_TOPICS, getTopicById } from "@/lib/syllabus";
import { AVAILABLE_TEXTBOOKS } from "@/lib/textbooks";
import { useTextbookTopics } from "@/hooks/useTextbookTopics";
import StyledMarkdown from "@/components/ui/markdown";
import HelpChat from "@/components/help/HelpChat";
import VideoPlayerOverlay from "@/components/video/VideoPlayerOverlay";
import BookModeSelector from "@/components/foundation/BookModeSelector";
import { useYouTubeVideos, getVideosForTopic } from "@/hooks/useYouTubeVideos";
import { getSubjectLanguage, getLanguageInstruction } from "@/lib/languageUtils";

const BOOKS = AVAILABLE_TEXTBOOKS.filter(tb => tb.id !== "none");

export default function Foundation() {
  const [searchParams] = useSearchParams();
  const { profile } = useStudentProfile();
  const { masteries, upsertMastery } = useTopicMasteries();
  const { t } = useI18n();

  const [selectedTopicId, setSelectedTopicId] = useState(searchParams.get("topic") || "");
  const [content, setContent] = useState(null);
  const [loading, setLoading] = useState(false);
  const [expandedSection, setExpandedSection] = useState(null);
  const [lessonMode, setLessonMode] = useState("ai");
  const [activeVideo, setActiveVideo] = useState(null);

  const [practiceAnswers, setPracticeAnswers] = useState({});
  const [practiceResults, setPracticeResults] = useState(null);
  const [evaluating, setEvaluating] = useState(false);

  const subjectId = searchParams.get("subject");
  const syllabusTopic = selectedTopicId ? getTopicById(selectedTopicId) : null;
  const [customTopic, setCustomTopic] = useState(null);
  const [loadedSubject, setLoadedSubject] = useState(null);

  const [bookId, setBookId] = useState("");
  const [bookTopicId, setBookTopicId] = useState("");
  const selectedBook = BOOKS.find(b => b.id === bookId);
  const { topics: bookTopics } = useTextbookTopics(selectedBook);
  const bookTopic = bookTopics.find(tp => tp.id === bookTopicId);

  useEffect(() => {
    if (subjectId) {
      base44.entities.Subject.get(subjectId).then(setLoadedSubject).catch(() => {});
    } else {
      setLoadedSubject(null);
    }
  }, [subjectId]);

  useEffect(() => {
    if (selectedTopicId && !syllabusTopic && loadedSubject) {
      const topic = (loadedSubject.topics || []).find(tp => tp.id === selectedTopicId);
      setCustomTopic(topic || null);
    } else {
      setCustomTopic(null);
    }
  }, [selectedTopicId, syllabusTopic, loadedSubject]);

  const selectedTopic = lessonMode === "book" ? bookTopic : (syllabusTopic || customTopic);
  const topicMastery = masteries.find(m => m.topic === selectedTopic?.name);
  const tutoringLanguage = lessonMode === "book" && selectedBook ? selectedBook.language : getSubjectLanguage(loadedSubject, profile);
  const { videos: youtubeVideos } = useYouTubeVideos(lessonMode === "book" ? selectedBook?.youtube_videos_url : loadedSubject?.youtube_videos_url);
  const topicVideos = getVideosForTopic(youtubeVideos, selectedTopic);

  const weakTopics = SYLLABUS_TOPICS.filter(tp => {
    const m = masteries.find(ms => ms.topic === tp.name);
    return m && (m.mastery_score < 30 || m.status === "needs_review");
  });

  const loadContent = useCallback(async (topicOverride) => {
    const topic = topicOverride || selectedTopic;
    if (!topic) return;
    setLoading(true);
    setContent(null);
    setPracticeAnswers({});
    setPracticeResults(null);

    const useTextbookFile = lessonMode === "book" && !!selectedBook?.textbook_url;
    const llmParams = {
      prompt: `${useTextbookFile ? "Use the attached textbook as your primary reference. Base the lesson content, examples, and practice problems on the material from the textbook.\n\n" : ""}You are a teacher creating a structured study guide for the topic "${topic.name}".
Student grade: ${profile?.grade_level || "adaptive"}
Preferred learning style: ${profile?.preferred_explanation_style || "step-by-step"}
Subtopics: ${(topic.subtopics || []).join(", ")}

Create a comprehensive foundational lesson following this structure:

1. Conceptual Foundation — What is this topic? Why does it matter? Give a clear, friendly explanation with a real-world analogy.
2. Key Formulas — List the essential formulas or rules with brief explanations of each part.
3. Worked Examples — Provide 2 fully worked examples with step-by-step solutions.
4. Common Mistakes — List 3 common errors students make and how to avoid them.
5. Practice Problems — Create exactly 4 practice problems (labeled A, B, C, D) at beginner difficulty with their correct answers. Make them straightforward.

Do not include links to external videos or websites in your response.

Formatting rules: Write in plain Markdown only. Never use LaTeX syntax (no \(...\), \[...\], $...$, or \frac, \times, \cdot commands). Write formulas using plain text and standard symbols instead (e.g. x², √x, ×, ÷, ±, ≈, π). Use markdown bold/headers/lists for structure.

Return JSON:
{
  "conceptual_foundation": "markdown text",
  "key_formulas": "markdown text with formulas",
  "worked_examples": "markdown text with 2 examples",
  "common_mistakes": "markdown text",
  "practice_problems": [
    { "label": "A", "question": "...", "correct_answer": "..." },
    { "label": "B", "question": "...", "correct_answer": "..." },
    { "label": "C", "question": "...", "correct_answer": "..." },
    { "label": "D", "question": "...", "correct_answer": "..." }
  ]
}${getLanguageInstruction(tutoringLanguage)}`,
      response_json_schema: {
        type: "object",
        properties: {
          conceptual_foundation: { type: "string" },
          key_formulas: { type: "string" },
          worked_examples: { type: "string" },
          common_mistakes: { type: "string" },
          practice_problems: {
            type: "array",
            items: {
              type: "object",
              properties: {
                label: { type: "string" },
                question: { type: "string" },
                correct_answer: { type: "string" },
              }
            }
          }
        }
      }
    };

    if (useTextbookFile) llmParams.file_urls = [selectedBook.textbook_url];
    const response = await base44.integrations.Core.InvokeLLM(llmParams);
    setContent(response);
    setExpandedSection("conceptual_foundation");
    setLoading(false);
  }, [selectedTopic, lessonMode, selectedBook, tutoringLanguage, profile]);

  // Auto-load when the resolved topic changes and no content is loaded yet
  useEffect(() => {
    if (selectedTopic && !content && !loading) {
      loadContent(selectedTopic);
    }
  }, [selectedTopic?.id, selectedTopic?.name]);

  const submitPractice = async () => {
    if (!content) return;
    setEvaluating(true);

    const results = await Promise.all(
      content.practice_problems.map(async (p) => {
        const answer = practiceAnswers[p.label] || "";
        if (!answer.trim()) return { label: p.label, is_correct: false, question: p.question, correct_answer: p.correct_answer, student_answer: "" };

        const evalRes = await base44.integrations.Core.InvokeLLM({
          prompt: `Evaluation.
Question: ${p.question}
Correct Answer: ${p.correct_answer}
Student Answer: ${answer}
Is correct? Consider equivalent forms. Return JSON: {"is_correct": true/false}${getLanguageInstruction(tutoringLanguage)}`,
          response_json_schema: {
            type: "object",
            properties: { is_correct: { type: "boolean" } }
          }
        });
        return { label: p.label, is_correct: evalRes.is_correct, question: p.question, correct_answer: p.correct_answer, student_answer: answer };
      })
    );

    const correct = results.filter(r => r.is_correct).length;
    const score = Math.round((correct / results.length) * 100);
    setPracticeResults(results);

    const current = topicMastery || { questions_attempted: 0, questions_correct: 0, mastery_score: 0, consecutive_failures: 0 };
    const newAttempted = (current.questions_attempted || 0) + results.length;
    const newCorrect = (current.questions_correct || 0) + correct;
    const newScore = Math.max(current.mastery_score || 0, score);
    const newStatus = newScore >= 50 ? "in_progress" : "needs_review";

    await upsertMastery.mutateAsync({
      topic: selectedTopic.name,
      updates: {
        mastery_score: newScore,
        questions_attempted: newAttempted,
        questions_correct: newCorrect,
        consecutive_failures: correct > 0 ? 0 : (current.consecutive_failures || 0) + 1,
        status: newStatus,
        last_practiced: new Date().toISOString(),
      }
    });

    setEvaluating(false);
  };

  const sections = content ? [
    { key: "conceptual_foundation", label: t("foundation.conceptual"), icon: <BookOpen className="w-4 h-4" />, content: content.conceptual_foundation },
    { key: "key_formulas", label: t("foundation.formulas"), icon: <Lightbulb className="w-4 h-4" />, content: content.key_formulas },
    { key: "worked_examples", label: t("foundation.examples"), icon: <CheckCircle className="w-4 h-4" />, content: content.worked_examples },
    { key: "common_mistakes", label: t("foundation.mistakes"), icon: <XCircle className="w-4 h-4" />, content: content.common_mistakes },
  ] : [];

  const allAnswered = content && content.practice_problems.every(p => practiceAnswers[p.label]?.trim());

  const handleTopicSelect = (v) => {
    setSelectedTopicId(v);
    setContent(null);
    setPracticeResults(null);
    setPracticeAnswers({});
    setActiveVideo(null);
  };

  const handleBookSelect = (v) => {
    setBookId(v);
    setBookTopicId("");
    setContent(null);
    setPracticeResults(null);
    setPracticeAnswers({});
    setActiveVideo(null);
  };

  const handleBookTopicSelect = (v) => {
    setBookTopicId(v);
    setContent(null);
    setPracticeResults(null);
    setPracticeAnswers({});
    setActiveVideo(null);
  };

  const handleModeChange = (mode) => {
    setLessonMode(mode);
    setContent(null);
    setActiveVideo(null);
  };

  return (
    <div className="p-6 md:p-10 max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link to="/practice">
          <Button variant="ghost" size="icon"><ArrowLeft className="w-4 h-4" /></Button>
        </Link>
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">{t("foundation.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("foundation.subtitle")}</p>
        </div>
      </div>

      {/* Lesson Mode Toggle */}
      <div className="flex gap-2 p-1 bg-muted rounded-xl">
        <button
          onClick={() => handleModeChange("ai")}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
            lessonMode === "ai" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
          }`}
        >
          <Sparkles className="w-4 h-4" /> {t("foundation.aiLesson")}
        </button>
        <button
          onClick={() => handleModeChange("book")}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
            lessonMode === "book" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
          }`}
        >
          <Library className="w-4 h-4" /> {t("foundation.fromBook")}
        </button>
      </div>

      {/* Topic selector */}
      <Card className="p-4">
        {lessonMode === "ai" && (
          <>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <Select value={selectedTopicId} onValueChange={handleTopicSelect}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("foundation.chooseTopic")} />
                  </SelectTrigger>
                  <SelectContent>
                    {loadedSubject?.topics?.length
                      ? loadedSubject.topics.map(tp => (
                        <SelectItem key={tp.id} value={tp.id}>{tp.name}</SelectItem>
                      ))
                      : weakTopics.length > 0 ? weakTopics.map(tp => (
                        <SelectItem key={tp.id} value={tp.id}>
                          {tp.name} — {masteries.find(m => m.topic === tp.name)?.mastery_score || 0}%
                        </SelectItem>
                      )) : SYLLABUS_TOPICS.map(tp => (
                        <SelectItem key={tp.id} value={tp.id}>{tp.name}</SelectItem>
                      ))
                    }
                  </SelectContent>
                </Select>
              </div>
              {selectedTopicId && (
                <Button onClick={() => loadContent()} disabled={loading}>
                  {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  {content ? t("foundation.reload") : t("foundation.loadLesson")}
                </Button>
              )}
            </div>

            {weakTopics.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2 items-center">
                <span className="text-xs text-muted-foreground">{t("foundation.topicsNeedingWork")}</span>
                {weakTopics.map(tp => (
                  <button key={tp.id} onClick={() => handleTopicSelect(tp.id)} className="text-xs">
                    <Badge variant="outline" className="cursor-pointer hover:bg-amber-50 border-amber-300 text-amber-700">
                      {tp.name}
                    </Badge>
                  </button>
                ))}
              </div>
            )}
          </>
        )}

        {lessonMode === "book" && (
          <BookModeSelector
            books={BOOKS}
            bookId={bookId}
            onBookChange={handleBookSelect}
            selectedBook={selectedBook}
            bookTopics={bookTopics}
            bookTopicId={bookTopicId}
            onBookTopicChange={handleBookTopicSelect}
            loading={loading}
            content={content}
            onLoad={() => loadContent()}
            t={t}
          />
        )}
      </Card>

      {/* Loading state */}
      {loading && (
        <Card className="p-10 text-center">
          <Loader2 className="w-10 h-10 text-primary animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">{t("foundation.building")}</p>
        </Card>
      )}

      {/* Lesson Sections */}
      {content && !loading && (
        <>
          <div className="space-y-3">
            {sections.map((sec) => (
              <Card key={sec.key} className="overflow-hidden">
                <button
                  className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/30 transition-colors"
                  onClick={() => setExpandedSection(expandedSection === sec.key ? null : sec.key)}
                >
                  <span className="flex items-center gap-2 font-display font-semibold text-foreground text-sm">
                    <span className="text-primary">{sec.icon}</span>
                    {sec.label}
                  </span>
                  {expandedSection === sec.key
                    ? <ChevronUp className="w-4 h-4 text-muted-foreground" />
                    : <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  }
                </button>
                <AnimatePresence>
                  {expandedSection === sec.key && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <div className="px-4 pb-4 border-t border-border pt-4">
                        <StyledMarkdown>{sec.content}</StyledMarkdown>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </Card>
            ))}
          </div>

          {/* Practice Problems */}
          <Card className="p-5 space-y-4">
            <h3 className="font-display font-semibold text-foreground flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">5</span>
              {t("foundation.practice")}
            </h3>
            <p className="text-xs text-muted-foreground">{t("foundation.completeAll")}</p>

            {!practiceResults ? (
              <>
                <div className="space-y-4">
                  {content.practice_problems.map((p) => (
                    <div key={p.label} className="space-y-2">
                      <p className="text-sm font-medium text-foreground">
                        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-bold mr-2">{p.label}</span>
                        {p.question}
                      </p>
                      <Input
                        placeholder={t("foundation.yourAnswer")}
                        value={practiceAnswers[p.label] || ""}
                        onChange={e => setPracticeAnswers(prev => ({ ...prev, [p.label]: e.target.value }))}
                        disabled={evaluating}
                      />
                    </div>
                  ))}
                </div>
                <Button onClick={submitPractice} disabled={!allAnswered || evaluating}>
                  {evaluating ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />{t("foundation.checking")}</> : t("foundation.checkAnswers")}
                </Button>
              </>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground">
                    {t("foundation.score")} {practiceResults.filter(r => r.is_correct).length}/{practiceResults.length}
                  </span>
                  <Badge className={practiceResults.filter(r => r.is_correct).length >= 3 ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}>
                    {Math.round((practiceResults.filter(r => r.is_correct).length / practiceResults.length) * 100)}%
                  </Badge>
                </div>
                {practiceResults.map((r) => (
                  <div key={r.label} className={`p-3 rounded-xl border flex items-start gap-3 text-sm ${r.is_correct ? "bg-emerald-50 border-emerald-200" : "bg-rose-50 border-rose-200"}`}>
                    {r.is_correct
                      ? <CheckCircle className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                      : <XCircle className="w-4 h-4 text-rose-600 mt-0.5 flex-shrink-0" />
                    }
                    <div>
                      <p className="font-medium text-foreground">{r.label}. {r.question}</p>
                      {!r.is_correct && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {t("foundation.yourAnswerLabel")} <span className="line-through">{r.student_answer || "—"}</span> · {t("foundation.correctLabel")} <span className="font-medium text-foreground">{r.correct_answer}</span>
                        </p>
                      )}
                    </div>
                  </div>
                ))}
                <div className="flex gap-2 pt-2">
                  <Button variant="outline" onClick={() => { setPracticeResults(null); setPracticeAnswers({}); }}>{t("foundation.tryAgain")}</Button>
                  <Link to="/practice">
                    <Button className="gap-2">{t("foundation.continuePracticing")} <ArrowRight className="w-4 h-4" /></Button>
                  </Link>
                </div>
              </div>
            )}
          </Card>
        </>
      )}

      {/* YouTube Videos */}
      {topicVideos.length > 0 && content && !loading && (
        <div className="space-y-2">
          <h3 className="font-display font-semibold text-foreground flex items-center gap-2">
            <Youtube className="w-5 h-5 text-primary" /> {t("foundation.videoLessons")}
          </h3>
          <div className="flex flex-wrap gap-2">
            {topicVideos.map((vid, i) => (
              <Button
                key={i}
                variant="outline"
                size="sm"
                onClick={() => setActiveVideo(vid)}
                className="gap-2"
              >
                <Youtube className="w-4 h-4" /> {t("foundation.watchVideo")}{topicVideos.length > 1 ? ` ${i + 1}` : ""}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!selectedTopic && !loading && (
        <Card className="p-10 text-center">
          <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="font-display font-semibold text-foreground mb-2">{t("foundation.chooseToBegin")}</h3>
          <p className="text-sm text-muted-foreground">
            {lessonMode === "ai" && weakTopics.length === 1
              ? t("foundation.weakTopicsSingular")
              : lessonMode === "ai" && weakTopics.length > 1
                ? t("foundation.weakTopicsPlural").replace("{n}", weakTopics.length)
                : t("foundation.selectAnyTopic")}
          </p>
        </Card>
      )}

      <HelpChat context={selectedTopic ? `Foundation lesson on ${selectedTopic.name}` : "Foundation lessons"} language={tutoringLanguage} />

      {activeVideo && (
        <VideoPlayerOverlay videoId={activeVideo} title={selectedTopic?.name} onClose={() => setActiveVideo(null)} />
      )}
    </div>
  );
}