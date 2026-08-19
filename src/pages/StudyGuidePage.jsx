import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle, AlertTriangle, ArrowRight, ArrowLeft, ThumbsUp, Pencil, RotateCcw, Loader2, Sparkles, Calendar, Brain, Lightbulb, X, Youtube } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "@/api/apiClient";
import { useStudentProfile, useTopicMasteries, useStudyGuides } from "@/hooks/useStudentProfile";
import { SYLLABUS_TOPICS } from "@/lib/syllabus";
import StyledMarkdown from "@/components/ui/markdown";
import YouTubeEmbed from "@/components/ui/YouTubeEmbed";
import { useYouTubeVideos } from "@/hooks/useYouTubeVideos";
import { getSubjectLanguage, getLanguageInstruction } from "@/lib/languageUtils";
import { useI18n } from "@/hooks/useI18n";

export default function StudyGuidePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const subjectId = searchParams.get("subject");
  const { profile, isLoading: profileLoading } = useStudentProfile();
  const { masteries } = useTopicMasteries();
  const { guides, latestGuide, isLoading: guidesLoading, updateGuide, createGuide } = useStudyGuides(subjectId);
  const { t } = useI18n();
  const [adjustText, setAdjustText] = useState("");
  const [showAdjust, setShowAdjust] = useState(false);
  const [loading, setLoading] = useState(false);

  // Weekly review state
  const [weeklyReview, setWeeklyReview] = useState(null);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewNeeded, setReviewNeeded] = useState(false);

  // Subject context for YouTube videos
  const [subject, setSubject] = useState(null);
  useEffect(() => {
    if (subjectId) {
      api.entities.Subject.get(subjectId).then(setSubject).catch(() => {});
    } else {
      setSubject(null);
    }
  }, [subjectId]);
  const { videos: youtubeVideos } = useYouTubeVideos(subject?.youtube_videos_url);

  const guideTopicVideos = (latestGuide?.next_topics || [])
    .map(topicName => {
      const topic = subject?.topics?.find(t => t.name === topicName);
      if (!topic) return null;
      const fromTopic = topic.youtube_videos || [];
      const fromJson = youtubeVideos.filter(v =>
        v.topic_id === topic.id || v.topic_name?.toLowerCase() === topicName.toLowerCase()
      ).map(v => v.youtube_id || v.video_id);
      return { topicName, videos: [...fromTopic, ...fromJson].filter(Boolean) };
    })
    .filter(v => v && v.videos.length > 0);

  // Check if weekly review is needed
  useEffect(() => {
    if (!latestGuide) return;
    const lastReview = latestGuide.last_review_date ? new Date(latestGuide.last_review_date) : null;
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    if (!lastReview || lastReview < sevenDaysAgo) {
      setReviewNeeded(true);
    }
  }, [latestGuide]);

  // Auto-generate weekly review when needed
  useEffect(() => {
    if (reviewNeeded && latestGuide && !weeklyReview && !reviewLoading) {
      generateWeeklyReview();
    }
  }, [reviewNeeded, latestGuide]);

  const generateWeeklyReview = async () => {
    setReviewLoading(true);
    try {
      // Fetch recent practice questions
      const recentQuestions = await api.entities.PracticeQuestion.list("-created_date", 20);

      const response = await api.integrations.Core.InvokeLLM({
        prompt: `You are an educational AI analyzing a student's weekly performance to improve their study guide.

Student grade: ${profile?.grade_level || "adaptive"}
Goals: ${profile?.goals || "Not specified"}

Recent practice results (last 20 questions):
${recentQuestions.map(q => `- ${q.topic}: ${q.is_correct ? "Correct" : "Incorrect"} | Q: ${q.question_text?.substring(0, 80)} | Student: ${q.student_answer}`).join("\n") || "No practice data yet."}

Current study guide:
- Strengths: ${latestGuide?.strengths?.join(", ") || "None"}
- Gaps: ${latestGuide?.gaps?.join(", ") || "None"}
- Next topics: ${latestGuide?.next_topics?.join(", ") || "None"}

Analyze the student's problem-solving patterns and mistakes. Then:
1. Identify their thinking patterns — do they rush? Misread questions? Make calculation errors? Struggle with specific concepts?
2. Give specific, actionable tips on the mistakes they're making
3. Suggest an updated study guide with revised strengths, gaps, and next topics
4. Provide a "weekly idea" — one specific, actionable study strategy for this week

Return JSON:
{
  "analysis": "markdown analysis of their problem-solving patterns and mistakes",
  "tips": "markdown tips for improvement",
  "weekly_idea": "one specific actionable study idea for this week",
  "updated_strengths": ["revised strengths"],
  "updated_gaps": ["revised gaps"],
  "updated_next_topics": ["revised next topics"],
  "updated_plan": "revised study plan"
}${getLanguageInstruction(getSubjectLanguage(subject, profile))}`,
        response_json_schema: {
          type: "object",
          properties: {
            analysis: { type: "string" },
            tips: { type: "string" },
            weekly_idea: { type: "string" },
            updated_strengths: { type: "array", items: { type: "string" } },
            updated_gaps: { type: "array", items: { type: "string" } },
            updated_next_topics: { type: "array", items: { type: "string" } },
            updated_plan: { type: "string" }
          }
        }
      });

      setWeeklyReview(response);
    } catch {
      setReviewNeeded(false);
    }
    setReviewLoading(false);
  };

  const approveWeeklyReview = async () => {
    if (!weeklyReview || !latestGuide) return;
    setLoading(true);

    await createGuide.mutateAsync({
      version: (latestGuide.version || 1) + 1,
      status: "approved",
      strengths: weeklyReview.updated_strengths || latestGuide.strengths || [],
      gaps: weeklyReview.updated_gaps || latestGuide.gaps || [],
      next_topics: weeklyReview.updated_next_topics || latestGuide.next_topics || [],
      plan_details: weeklyReview.updated_plan || latestGuide.plan_details || "",
      weekly_idea: weeklyReview.weekly_idea,
      weekly_review: weeklyReview.analysis + "\n\n**Tips:**\n" + weeklyReview.tips,
      last_review_date: new Date().toISOString(),
    });

    await updateGuide.mutateAsync({ id: latestGuide.id, data: { status: "declined" } });

    setWeeklyReview(null);
    setReviewNeeded(false);
    setLoading(false);
  };

  const dismissWeeklyReview = async () => {
    if (!latestGuide) return;
    await updateGuide.mutateAsync({ id: latestGuide.id, data: { last_review_date: new Date().toISOString() } });
    setWeeklyReview(null);
    setReviewNeeded(false);
  };

  if (profileLoading || guidesLoading) {
    return (
      <div className="p-6 md:p-10 max-w-3xl mx-auto space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }

  if (!profile) { navigate("/onboarding"); return null; }

  const handleApprove = async () => {
    if (!latestGuide) return;
    await updateGuide.mutateAsync({ id: latestGuide.id, data: { status: "approved" } });
  };

  const handleAdjust = async () => {
    if (!latestGuide || !adjustText.trim()) return;
    setLoading(true);

    const response = await api.integrations.Core.InvokeLLM({
      prompt: `You are an educational planning assistant revising a study guide.

Current guide:
- Strengths: ${latestGuide.strengths?.join(", ") || "None identified yet"}
- Gaps: ${latestGuide.gaps?.join(", ") || "None identified yet"}
- Next topics: ${latestGuide.next_topics?.join(", ") || "None"}
- Details: ${latestGuide.plan_details}

Student's adjustment request: "${adjustText}"
Student grade: ${profile.grade_level}
Student goals: ${profile.goals}

Revise the study guide based on the student's request. Return JSON:
{
  "strengths": ["updated strengths"],
  "gaps": ["updated gaps"],
  "next_topics": ["updated recommended topics"],
  "plan_details": "updated detailed plan"
}${getLanguageInstruction(getSubjectLanguage(subject, profile))}`,
      response_json_schema: {
        type: "object",
        properties: {
          strengths: { type: "array", items: { type: "string" } },
          gaps: { type: "array", items: { type: "string" } },
          next_topics: { type: "array", items: { type: "string" } },
          plan_details: { type: "string" }
        }
      }
    });

    await updateGuide.mutateAsync({
      id: latestGuide.id,
      data: { status: "adjusted", student_feedback: adjustText }
    });

    await createGuide.mutateAsync({
      version: (latestGuide.version || 1) + 1,
      status: "pending",
      strengths: response.strengths || [],
      gaps: response.gaps || [],
      next_topics: response.next_topics || [],
      plan_details: response.plan_details || "",
    });

    setAdjustText("");
    setShowAdjust(false);
    setLoading(false);
  };

  const handleDecline = async () => {
    if (!latestGuide) return;
    setLoading(true);

    await updateGuide.mutateAsync({ id: latestGuide.id, data: { status: "declined" } });

    const response = await api.integrations.Core.InvokeLLM({
      prompt: `Create a completely new study guide for a ${profile.grade_level} grade student.
Goals: ${profile.goals}
Available topics: ${SYLLABUS_TOPICS.filter(t => t.grades.includes(profile.grade_level) || profile.grade_level === "adaptive").map(t => t.name).join(", ")}
Current mastery: ${masteries.map(m => `${m.topic}: ${m.mastery_score || 0}%`).join(", ")}

Return JSON:
{
  "strengths": ["topics with high mastery"],
  "gaps": ["topics needing work"],
  "next_topics": ["recommended next 3 topics"],
  "plan_details": "a fresh detailed study plan"
}${getLanguageInstruction(getSubjectLanguage(subject, profile))}`,
      response_json_schema: {
        type: "object",
        properties: {
          strengths: { type: "array", items: { type: "string" } },
          gaps: { type: "array", items: { type: "string" } },
          next_topics: { type: "array", items: { type: "string" } },
          plan_details: { type: "string" }
        }
      }
    });

    await createGuide.mutateAsync({
      version: (latestGuide.version || 1) + 1,
      status: "pending",
      strengths: response.strengths || [],
      gaps: response.gaps || [],
      next_topics: response.next_topics || [],
      plan_details: response.plan_details || "",
    });

    setLoading(false);
  };

  if (!latestGuide) {
    return (
      <div className="p-6 md:p-10 max-w-3xl mx-auto text-center">
        <Card className="p-10">
          <Sparkles className="w-12 h-12 text-primary mx-auto mb-4" />
          <h2 className="text-xl font-display font-bold text-foreground mb-2">{t("sg.noGuide")}</h2>
          <p className="text-muted-foreground mb-6">
            {subjectId
              ? t("sg.takePlacement")
              : t("sg.completeOnboarding")}
          </p>
          {subjectId
            ? <Button onClick={() => navigate(`/subject/${subjectId}/placement`)}>{t("sg.takePlacementTest")}</Button>
            : <Button onClick={() => navigate("/onboarding")}>{t("sg.getStarted")}</Button>}
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-10 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          {subjectId && (
            <Link to={`/subject/${subjectId}`} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 mb-2">
              <ArrowLeft className="w-3 h-3" /> {t("sg.backTo")} {subject?.name || t("sg.dashboard")}
            </Link>
          )}
          <h1 className="text-2xl font-display font-bold text-foreground mb-1">{subject?.name ? `${subject.name} ${t("sg.studyGuide")}` : t("sg.yourStudyGuide")}</h1>
          <div className="flex items-center gap-2">
            <Badge variant="outline">{t("sg.version")} {latestGuide.version || 1}</Badge>
            <Badge className={
              latestGuide.status === "approved" ? "bg-emerald-100 text-emerald-700" :
              latestGuide.status === "pending" ? "bg-amber-100 text-amber-700" :
              "bg-muted text-muted-foreground"
            }>
              {latestGuide.status === "approved" ? t("sg.active") : latestGuide.status === "pending" ? t("sg.pendingReview") : latestGuide.status}
            </Badge>
          </div>
        </div>
      </div>

      {/* Weekly Review Banner */}
      {reviewNeeded && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="p-5 border-primary/30 bg-primary/5">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Calendar className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="font-display font-semibold text-foreground">{t("sg.weeklyReady")}</p>
                <p className="text-xs text-muted-foreground">{t("sg.weeklySubtitle")}</p>
              </div>
            </div>

            {reviewLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                <Loader2 className="w-4 h-4 animate-spin" /> {t("sg.analyzing")}
              </div>
            ) : weeklyReview ? (
              <div className="space-y-4">
                {/* Analysis */}
                <div className="p-4 rounded-xl bg-card border border-border">
                  <p className="text-xs font-semibold text-primary flex items-center gap-1 mb-2">
                    <Brain className="w-3 h-3" /> {t("sg.analysis")}
                  </p>
                  <StyledMarkdown>{weeklyReview.analysis}</StyledMarkdown>
                </div>

                {/* Tips */}
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-200">
                  <p className="text-xs font-semibold text-amber-700 flex items-center gap-1 mb-2">
                    <Lightbulb className="w-3 h-3" /> {t("sg.tips")}
                  </p>
                  <StyledMarkdown>{weeklyReview.tips}</StyledMarkdown>
                </div>

                {/* Weekly Idea */}
                {weeklyReview.weekly_idea && (
                  <div className="p-4 rounded-xl bg-violet-50 border border-violet-200">
                    <p className="text-xs font-semibold text-violet-700 flex items-center gap-1 mb-2">
                      <Sparkles className="w-3 h-3" /> {t("sg.weeklyIdea")}
                    </p>
                    <p className="text-sm text-foreground">{weeklyReview.weekly_idea}</p>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button onClick={approveWeeklyReview} disabled={loading} className="gap-2">
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ThumbsUp className="w-4 h-4" />}
                    {t("sg.approveUpdate")}
                    </Button>
                    <Button variant="ghost" onClick={dismissWeeklyReview} className="gap-2 text-muted-foreground">
                    <X className="w-4 h-4" /> {t("sg.skipWeek")}
                  </Button>
                </div>
              </div>
            ) : null}
          </Card>
        </motion.div>
      )}

      {/* Current Weekly Idea (from approved guide) */}
      {latestGuide.weekly_idea && !reviewNeeded && (
        <Card className="p-5 border-violet-200 bg-violet-50">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-4 h-4 text-violet-600" />
            </div>
            <div>
              <p className="text-xs font-semibold text-violet-700 mb-1">{t("sg.weeklyIdea")}</p>
              <p className="text-sm text-foreground">{latestGuide.weekly_idea}</p>
            </div>
          </div>
        </Card>
      )}

      {/* Strengths */}
      {latestGuide.strengths?.length > 0 && (
        <Card className="p-5">
          <h3 className="font-display font-semibold text-foreground mb-3 flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-emerald-500" /> {t("sg.strengths")}
          </h3>
          <div className="flex flex-wrap gap-2">
            {latestGuide.strengths.map((s, i) => (
              <Badge key={i} className="bg-emerald-100 text-emerald-700">{s}</Badge>
            ))}
          </div>
        </Card>
      )}

      {/* Gaps */}
      {latestGuide.gaps?.length > 0 && (
        <Card className="p-5">
          <h3 className="font-display font-semibold text-foreground mb-3 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" /> {t("sg.areasToImprove")}
          </h3>
          <div className="flex flex-wrap gap-2">
            {latestGuide.gaps.map((g, i) => (
              <Badge key={i} className="bg-amber-100 text-amber-700">{g}</Badge>
            ))}
          </div>
        </Card>
      )}

      {/* Next Topics */}
      {latestGuide.next_topics?.length > 0 && (
        <Card className="p-5">
          <h3 className="font-display font-semibold text-foreground mb-3 flex items-center gap-2">
            <ArrowRight className="w-5 h-5 text-primary" /> {t("sg.nextSteps")}
          </h3>
          <ol className="space-y-2">
            {latestGuide.next_topics.map((t, i) => (
              <li key={i} className="flex items-center gap-3 text-sm">
                <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
                  {i + 1}
                </span>
                <span className="text-foreground">{t}</span>
              </li>
            ))}
          </ol>
        </Card>
      )}

      {/* YouTube Videos */}
      {guideTopicVideos.length > 0 && (
        <Card className="p-5">
          <h3 className="font-display font-semibold text-foreground mb-3 flex items-center gap-2">
            <Youtube className="w-5 h-5 text-primary" /> {t("sg.videoLessons")}
          </h3>
          <div className="space-y-4">
            {guideTopicVideos.map((vt, i) => (
              <div key={i} className="space-y-2">
                <p className="text-sm font-medium text-foreground">{vt.topicName}</p>
                {vt.videos.map((vid, j) => (
                  <YouTubeEmbed key={j} videoId={vid} title={`${vt.topicName} video ${j + 1}`} />
                ))}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Plan Details */}
      {latestGuide.plan_details && (
        <Card className="p-5">
          <h3 className="font-display font-semibold text-foreground mb-3">{t("sg.studyPlan")}</h3>
          <StyledMarkdown className="text-muted-foreground">{latestGuide.plan_details}</StyledMarkdown>
        </Card>
      )}

      {/* Action Buttons */}
      {latestGuide.status === "pending" && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <Card className="p-5 border-primary/20 bg-primary/5">
            <p className="text-sm text-foreground mb-4">{t("sg.agreePrompt")}</p>
            <div className="flex flex-wrap gap-3">
              <Button onClick={handleApprove} className="gap-2" disabled={loading}>
                <ThumbsUp className="w-4 h-4" /> {t("sg.agreeStart")}
              </Button>
              <Button variant="outline" onClick={() => setShowAdjust(!showAdjust)} className="gap-2" disabled={loading}>
                <Pencil className="w-4 h-4" /> {t("sg.adjust")}
              </Button>
              <Button variant="ghost" onClick={handleDecline} className="gap-2 text-muted-foreground" disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
                {t("sg.generateNew")}
              </Button>
            </div>
          </Card>

          {showAdjust && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <Card className="p-5">
                <Textarea
                  value={adjustText}
                  onChange={e => setAdjustText(e.target.value)}
                  placeholder={t("sg.adjustPlaceholder")}
                  className="mb-3 h-24"
                />
                <Button onClick={handleAdjust} disabled={!adjustText.trim() || loading} className="gap-2">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  {t("sg.updatePlan")}
                </Button>
              </Card>
            </motion.div>
          )}
        </motion.div>
      )}

      {latestGuide.status === "approved" && (
        <Card className="p-5 border-emerald-200 bg-emerald-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-emerald-700">
              <CheckCircle className="w-5 h-5" />
              <span className="font-medium">{t("sg.planActive")}</span>
            </div>
            <Button size="sm" onClick={() => navigate(subjectId ? `/practice?subject=${subjectId}` : "/practice")} className="gap-2">
              {t("sg.startPracticing")} <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </Card>
      )}

      {/* Version History */}
      {guides.length > 1 && (
        <div className="pt-4 border-t border-border">
          <h3 className="text-sm font-medium text-muted-foreground mb-3">{t("sg.planHistory")}</h3>
          <div className="space-y-2">
            {guides.slice(1).map(g => (
              <div key={g.id} className="flex items-center justify-between text-xs text-muted-foreground p-2 rounded-lg bg-muted/50">
                <span>Version {g.version} — {g.status}</span>
                <span>{new Date(g.created_date).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}