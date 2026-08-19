import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Layers, Loader2, ChevronLeft, ChevronRight, RotateCcw, CheckCircle2, RotateCw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "@/api/apiClient";
import { useStudentProfile } from "@/hooks/useStudentProfile";
import { useI18n } from "@/hooks/useI18n";
import { SYLLABUS_TOPICS, getTopicById } from "@/lib/syllabus";
import StyledMarkdown from "@/components/ui/markdown";
import { getSubjectLanguage, getLanguageInstruction } from "@/lib/languageUtils";

export default function Flashcards() {
  const [searchParams] = useSearchParams();
  const { profile } = useStudentProfile();
  const { t } = useI18n();

  const [selectedTopicId, setSelectedTopicId] = useState(searchParams.get("topic") || "");
  const [cards, setCards] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [loading, setLoading] = useState(false);
  const [knownCards, setKnownCards] = useState(new Set());
  const [reviewCards, setReviewCards] = useState(new Set());
  const [finished, setFinished] = useState(false);

  const subjectId = searchParams.get("subject");
  const syllabusTopic = selectedTopicId ? getTopicById(selectedTopicId) : null;
  const [customTopic, setCustomTopic] = useState(null);
  const [loadedSubject, setLoadedSubject] = useState(null);

  useEffect(() => {
    if (subjectId) {
      api.entities.Subject.get(subjectId).then(setLoadedSubject).catch(() => {});
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

  const selectedTopic = syllabusTopic || customTopic;

  const relevantTopics = loadedSubject?.topics?.length
    ? loadedSubject.topics
    : profile ? SYLLABUS_TOPICS.filter(tp =>
        tp.grades?.includes(profile.grade_level) || profile.grade_level === "adaptive"
      ) : SYLLABUS_TOPICS;

  const generateCards = async () => {
    if (!selectedTopic) return;
    setLoading(true);
    setCards([]);
    setCurrentIndex(0);
    setFlipped(false);
    setKnownCards(new Set());
    setReviewCards(new Set());
    setFinished(false);

    const tutoringLanguage = getSubjectLanguage(loadedSubject, profile);
    const response = await api.integrations.Core.InvokeLLM({
      prompt: `${loadedSubject?.textbook_url ? "Use the attached textbook as your primary reference. Base ALL flashcards on the material from the textbook.\n\n" : ""}You are creating study flashcards for the topic "${selectedTopic.name}".
Student grade: ${profile?.grade_level || "adaptive"}
Subtopics: ${(selectedTopic.subtopics || []).join(", ")}

Create 8 flashcards covering the key concepts, definitions, and formulas for this topic.
Each card should have a clear, concise front (term/concept/question) and a clear back (definition/explanation/answer).

Return JSON:
{
  "cards": [
    { "front": "the term or question", "back": "the definition or answer" }
  ]
}${getLanguageInstruction(tutoringLanguage)}`,
      ...(loadedSubject?.textbook_url ? { file_urls: [loadedSubject.textbook_url] } : {}),
      response_json_schema: {
        type: "object",
        properties: {
          cards: {
            type: "array",
            items: {
              type: "object",
              properties: {
                front: { type: "string" },
                back: { type: "string" },
              }
            }
          }
        }
      }
    });

    setCards(response.cards || []);
    setLoading(false);
  };

  const handleKnow = () => {
    setKnownCards(prev => new Set(prev).add(currentIndex));
    setReviewCards(prev => { const n = new Set(prev); n.delete(currentIndex); return n; });
    goNext();
  };

  const handleDontKnow = () => {
    setReviewCards(prev => new Set(prev).add(currentIndex));
    setKnownCards(prev => { const n = new Set(prev); n.delete(currentIndex); return n; });
    goNext();
  };

  const goNext = () => {
    setFlipped(false);
    if (currentIndex + 1 < cards.length) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setFinished(true);
    }
  };

  const goPrev = () => {
    setFlipped(false);
    if (currentIndex > 0) setCurrentIndex(currentIndex - 1);
  };

  const restart = () => {
    setCurrentIndex(0);
    setFlipped(false);
    setKnownCards(new Set());
    setReviewCards(new Set());
    setFinished(false);
  };

  const handleTopicSelect = (v) => {
    setSelectedTopicId(v);
    setCards([]);
    setFinished(false);
    setCurrentIndex(0);
  };

  return (
    <div className="p-6 md:p-10 max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground mb-1">{t("fc.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("fc.subtitle")}</p>
      </div>

      {/* Topic selector */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <Select value={selectedTopicId} onValueChange={handleTopicSelect}>
              <SelectTrigger>
                <SelectValue placeholder={t("fc.chooseTopic")} />
              </SelectTrigger>
              <SelectContent>
                {relevantTopics.map(tp => (
                  <SelectItem key={tp.id} value={tp.id}>{tp.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={generateCards} disabled={!selectedTopicId || loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Layers className="w-4 h-4 mr-2" />}
            {loading ? t("fc.generating") : t("fc.generate")}
          </Button>
        </div>
      </Card>

      {/* Loading */}
      {loading && (
        <Card className="p-10 text-center">
          <Loader2 className="w-10 h-10 text-primary animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">{t("fc.generating")}</p>
        </Card>
      )}

      {/* Flashcard area */}
      {cards.length > 0 && !loading && !finished && (
        <div className="space-y-4">
          {/* Progress */}
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>{currentIndex + 1} {t("fc.cardOf")} {cards.length}</span>
            <span>{t("fc.studied")}: {knownCards.size + reviewCards.size} {t("fc.cards")}</span>
          </div>

          {/* Card */}
          <div className="relative" style={{ perspective: "1000px" }}>
            <motion.div
              key={currentIndex}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.2 }}
            >
              <div
                onClick={() => setFlipped(!flipped)}
                className="cursor-pointer select-none"
                style={{ transformStyle: "preserve-3d", transition: "transform 0.5s", transform: flipped ? "rotateY(180deg)" : "" }}
              >
                {/* Front */}
                <Card className="p-8 min-h-[240px] flex items-center justify-center text-center" style={{ backfaceVisibility: "hidden" }}>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-4">{t("fc.flip")}</p>
                    <StyledMarkdown className="text-lg font-medium text-foreground">{cards[currentIndex].front}</StyledMarkdown>
                  </div>
                </Card>
                {/* Back */}
                <Card className="p-8 min-h-[240px] flex items-center justify-center text-center absolute inset-0 bg-primary/5" style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}>
                  <div>
                    <StyledMarkdown className="text-base text-foreground">{cards[currentIndex].back}</StyledMarkdown>
                  </div>
                </Card>
              </div>
            </motion.div>
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between gap-2">
            <Button variant="outline" size="icon" onClick={goPrev} disabled={currentIndex === 0}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <div className="flex gap-2 flex-1 justify-center">
              <Button variant="outline" onClick={handleDontKnow} className="gap-2 text-amber-700 border-amber-300 hover:bg-amber-50">
                <RotateCw className="w-4 h-4" /> {t("fc.dontKnow")}
              </Button>
              <Button onClick={handleKnow} className="gap-2 bg-emerald-600 hover:bg-emerald-700">
                <CheckCircle2 className="w-4 h-4" /> {t("fc.know")}
              </Button>
            </div>
            <Button variant="outline" size="icon" onClick={goNext} disabled={currentIndex === cards.length - 1}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Finished */}
      {finished && cards.length > 0 && (
        <Card className="p-8 text-center space-y-6">
          <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto" />
          <div>
            <h3 className="font-display font-semibold text-foreground mb-2 text-lg">{t("fc.allDone")}</h3>
            <div className="flex justify-center gap-6 mt-4">
              <div>
                <p className="text-2xl font-display font-bold text-emerald-600">{knownCards.size}</p>
                <p className="text-xs text-muted-foreground">{t("fc.mastered")}</p>
              </div>
              <div>
                <p className="text-2xl font-display font-bold text-amber-600">{reviewCards.size}</p>
                <p className="text-xs text-muted-foreground">{t("fc.review")}</p>
              </div>
            </div>
          </div>
          <Button onClick={restart} variant="outline" className="gap-2">
            <RotateCcw className="w-4 h-4" /> {t("fc.restart")}
          </Button>
        </Card>
      )}

      {/* Empty state */}
      {cards.length === 0 && !loading && (
        <Card className="p-10 text-center">
          <Layers className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="font-display font-semibold text-foreground mb-2">{t("fc.title")}</h3>
          <p className="text-sm text-muted-foreground">{t("fc.chooseAndGenerate")}</p>
        </Card>
      )}
    </div>
  );
}