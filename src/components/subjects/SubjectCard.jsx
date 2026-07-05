import React from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Trash2, Layers, Play, GraduationCap } from "lucide-react";
import { useTopicMasteries } from "@/hooks/useStudentProfile";

const COLOR_MAP = {
  violet: { bg: "bg-violet-50", border: "border-violet-200", icon: "bg-violet-100 text-violet-600", badge: "bg-violet-100 text-violet-700" },
  emerald: { bg: "bg-emerald-50", border: "border-emerald-200", icon: "bg-emerald-100 text-emerald-600", badge: "bg-emerald-100 text-emerald-700" },
  blue: { bg: "bg-blue-50", border: "border-blue-200", icon: "bg-blue-100 text-blue-600", badge: "bg-blue-100 text-blue-700" },
  amber: { bg: "bg-amber-50", border: "border-amber-200", icon: "bg-amber-100 text-amber-600", badge: "bg-amber-100 text-amber-700" },
  rose: { bg: "bg-rose-50", border: "border-rose-200", icon: "bg-rose-100 text-rose-600", badge: "bg-rose-100 text-rose-700" },
  teal: { bg: "bg-teal-50", border: "border-teal-200", icon: "bg-teal-100 text-teal-600", badge: "bg-teal-100 text-teal-700" },
  indigo: { bg: "bg-indigo-50", border: "border-indigo-200", icon: "bg-indigo-100 text-indigo-600", badge: "bg-indigo-100 text-indigo-700" },
  orange: { bg: "bg-orange-50", border: "border-orange-200", icon: "bg-orange-100 text-orange-600", badge: "bg-orange-100 text-orange-700" },
};

export default function SubjectCard({ subject, onDelete }) {
  const navigate = useNavigate();
  const { masteries } = useTopicMasteries();
  const colors = COLOR_MAP[subject.color] || COLOR_MAP.violet;

  const topicCount = subject.subject_type === "math"
    ? "Syllabus topics"
    : (subject.topics?.length || 0) + " topics";

  const needsPlacement = subject.placement_completed === false;

  const subjectMastery = masteries.filter(m =>
    (subject.topics || []).some(t => t.name === m.topic)
  );
  const avgMastery = subjectMastery.length > 0
    ? Math.round(subjectMastery.reduce((sum, m) => sum + (m.mastery_score || 0), 0) / subjectMastery.length)
    : null;

  return (
    <Card
      className={`p-5 cursor-pointer hover:shadow-lg transition-all group ${colors.bg} ${colors.border} border ${needsPlacement ? "ring-2 ring-primary/20" : ""}`}
      onClick={() => navigate(needsPlacement ? `/subject/${subject.id}/placement` : `/subject/${subject.id}`)}
    >
      <div className="flex items-start justify-between mb-3">
        <div className={`w-11 h-11 rounded-xl ${colors.icon} flex items-center justify-center`}>
          {needsPlacement ? <Play className="w-5 h-5" /> : <Layers className="w-5 h-5" />}
        </div>
        {onDelete && (
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(subject.id); }}
            className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
      <h3 className="font-display font-bold text-foreground text-lg mb-1">{subject.name}</h3>
      <p className="text-xs text-muted-foreground mb-3">
        {subject.description || (subject.subject_type === "math" ? `${subject.grade_level} grade mathematics` : "Custom subject")}
      </p>
      {needsPlacement ? (
        <div className="space-y-2">
          {subject.grade_level && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <GraduationCap className="w-3 h-3" /> {subject.grade_level} Grade
            </div>
          )}
          <div className="flex items-center justify-center py-2 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium gap-2">
            <Play className="w-4 h-4" /> Begin {subject.name}
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">{topicCount}</Badge>
            {subject.grade_level && (
              <Badge variant="secondary" className="text-xs gap-1">
                <GraduationCap className="w-3 h-3" /> {subject.grade_level}
              </Badge>
            )}
          </div>
          {avgMastery !== null && (
            <span className="text-xs font-medium text-muted-foreground">{avgMastery}% avg</span>
          )}
          <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-1 transition-all" />
        </div>
      )}
    </Card>
  );
}