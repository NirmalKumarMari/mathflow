import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle, AlertTriangle, ArrowRight, ThumbsUp, Pencil, RotateCcw, Loader2, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { useStudentProfile, useTopicMasteries, useStudyGuides } from "@/hooks/useStudentProfile";
import { SYLLABUS_TOPICS } from "@/lib/syllabus";
import ReactMarkdown from "react-markdown";

export default function StudyGuidePage() {
  const navigate = useNavigate();
  const { profile, isLoading: profileLoading } = useStudentProfile();
  const { masteries } = useTopicMasteries();
  const { guides, latestGuide, isLoading: guidesLoading, updateGuide, createGuide } = useStudyGuides();
  const [adjustText, setAdjustText] = useState("");
  const [showAdjust, setShowAdjust] = useState(false);
  const [loading, setLoading] = useState(false);

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

    const response = await base44.integrations.Core.InvokeLLM({
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
}`,
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

    const response = await base44.integrations.Core.InvokeLLM({
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
}`,
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
          <h2 className="text-xl font-display font-bold text-foreground mb-2">No Study Guide Yet</h2>
          <p className="text-muted-foreground mb-6">Complete the onboarding to generate your first personalized study guide.</p>
          <Button onClick={() => navigate("/onboarding")}>Get Started</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-10 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground mb-1">Your Study Guide</h1>
          <div className="flex items-center gap-2">
            <Badge variant="outline">Version {latestGuide.version || 1}</Badge>
            <Badge className={
              latestGuide.status === "approved" ? "bg-emerald-100 text-emerald-700" :
              latestGuide.status === "pending" ? "bg-amber-100 text-amber-700" :
              "bg-muted text-muted-foreground"
            }>
              {latestGuide.status === "approved" ? "Active" : latestGuide.status === "pending" ? "Pending Review" : latestGuide.status}
            </Badge>
          </div>
        </div>
      </div>

      {/* Strengths */}
      {latestGuide.strengths?.length > 0 && (
        <Card className="p-5">
          <h3 className="font-display font-semibold text-foreground mb-3 flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-emerald-500" /> Your Strengths
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
            <AlertTriangle className="w-5 h-5 text-amber-500" /> Areas to Improve
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
            <ArrowRight className="w-5 h-5 text-primary" /> Recommended Next Steps
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

      {/* Plan Details */}
      {latestGuide.plan_details && (
        <Card className="p-5">
          <h3 className="font-display font-semibold text-foreground mb-3">Study Plan</h3>
          <div className="prose prose-sm max-w-none text-muted-foreground">
            <ReactMarkdown>{latestGuide.plan_details}</ReactMarkdown>
          </div>
        </Card>
      )}

      {/* Action Buttons */}
      {latestGuide.status === "pending" && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <Card className="p-5 border-primary/20 bg-primary/5">
            <p className="text-sm text-foreground mb-4">Do you agree with this study plan?</p>
            <div className="flex flex-wrap gap-3">
              <Button onClick={handleApprove} className="gap-2" disabled={loading}>
                <ThumbsUp className="w-4 h-4" /> Agree & Start
              </Button>
              <Button variant="outline" onClick={() => setShowAdjust(!showAdjust)} className="gap-2" disabled={loading}>
                <Pencil className="w-4 h-4" /> Adjust
              </Button>
              <Button variant="ghost" onClick={handleDecline} className="gap-2 text-muted-foreground" disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
                Generate New Plan
              </Button>
            </div>
          </Card>

          {showAdjust && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <Card className="p-5">
                <Textarea
                  value={adjustText}
                  onChange={e => setAdjustText(e.target.value)}
                  placeholder="Tell us what you'd like to change about this study plan..."
                  className="mb-3 h-24"
                />
                <Button onClick={handleAdjust} disabled={!adjustText.trim() || loading} className="gap-2">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  Update My Plan
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
              <span className="font-medium">Study plan active</span>
            </div>
            <Button size="sm" onClick={() => navigate("/practice")} className="gap-2">
              Start Practicing <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </Card>
      )}

      {/* Version History */}
      {guides.length > 1 && (
        <div className="pt-4 border-t border-border">
          <h3 className="text-sm font-medium text-muted-foreground mb-3">Plan History</h3>
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