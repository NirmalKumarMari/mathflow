import React from "react";
import { Progress } from "@/components/ui/progress";
import { TOPIC_COLORS } from "@/lib/syllabus";
import { CheckCircle, Circle, AlertCircle } from "lucide-react";

const statusIcons = {
  mastered: <CheckCircle className="w-4 h-4 text-emerald-500" />,
  in_progress: <Circle className="w-4 h-4 text-primary" />,
  needs_review: <AlertCircle className="w-4 h-4 text-amber-500" />,
  not_started: <Circle className="w-4 h-4 text-muted-foreground" />,
};

export default function TopicCard({ topic, mastery, onClick }) {
  const colors = TOPIC_COLORS[topic.id] || TOPIC_COLORS.ratios;
  const score = mastery?.mastery_score || 0;
  const status = mastery?.status || "not_started";

  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-4 rounded-2xl border ${colors.border} ${colors.bg} hover:shadow-md transition-all group`}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className={`font-heading font-semibold text-sm ${colors.text}`}>{topic.name}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {topic.subtopics.length} subtopics{topic.grades ? ` · ${topic.grades.join(", ")}` : ""}
          </p>
        </div>
        {statusIcons[status]}
      </div>
      <Progress value={score} className="h-1.5" />
      <p className="text-xs text-muted-foreground mt-2">{Math.round(score)}% mastered</p>
    </button>
  );
}