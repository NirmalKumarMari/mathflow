import React from "react";
import { Card } from "@/components/ui/card";
import { TrendingUp, Target, BookOpen, Zap } from "lucide-react";

export default function StatsOverview({ masteries, profile }) {
  const totalTopics = masteries.length || 1;
  const masteredTopics = masteries.filter(m => m.status === "mastered").length;
  const totalQuestions = masteries.reduce((s, m) => s + (m.questions_attempted || 0), 0);
  const totalCorrect = masteries.reduce((s, m) => s + (m.questions_correct || 0), 0);
  const accuracy = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;
  const overallMastery = masteries.length > 0
    ? Math.round(masteries.reduce((s, m) => s + (m.mastery_score || 0), 0) / totalTopics)
    : 0;

  const stats = [
    { label: "Overall Mastery", value: `${overallMastery}%`, icon: TrendingUp, color: "text-primary bg-primary/10" },
    { label: "Topics Mastered", value: `${masteredTopics}/${totalTopics}`, icon: Target, color: "text-emerald-600 bg-emerald-100" },
    { label: "Questions Done", value: totalQuestions, icon: BookOpen, color: "text-amber-600 bg-amber-100" },
    { label: "Accuracy", value: `${accuracy}%`, icon: Zap, color: "text-violet-600 bg-violet-100" },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map(stat => (
        <Card key={stat.label} className="p-4 border-border/50">
          <div className={`w-10 h-10 rounded-xl ${stat.color} flex items-center justify-center mb-3`}>
            <stat.icon className="w-5 h-5" />
          </div>
          <p className="text-2xl font-display font-bold text-foreground">{stat.value}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
        </Card>
      ))}
    </div>
  );
}