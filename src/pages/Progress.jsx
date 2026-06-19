import React from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useStudentProfile, useTopicMasteries } from "@/hooks/useStudentProfile";
import { SYLLABUS_TOPICS, TOPIC_COLORS } from "@/lib/syllabus";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, Radar } from "recharts";
import { CheckCircle, Circle, AlertCircle, Target } from "lucide-react";

const statusConfig = {
  mastered: { label: "Mastered", color: "bg-emerald-100 text-emerald-700", icon: CheckCircle },
  in_progress: { label: "In Progress", color: "bg-blue-100 text-blue-700", icon: Circle },
  needs_review: { label: "Needs Review", color: "bg-amber-100 text-amber-700", icon: AlertCircle },
  not_started: { label: "Not Started", color: "bg-muted text-muted-foreground", icon: Circle },
};

export default function ProgressPage() {
  const { profile, isLoading: profileLoading } = useStudentProfile();
  const { masteries, isLoading: masteryLoading } = useTopicMasteries();
  const navigate = useNavigate();

  if (profileLoading || masteryLoading) {
    return (
      <div className="p-6 md:p-10 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 rounded-2xl" />
        <Skeleton className="h-96 rounded-2xl" />
      </div>
    );
  }

  if (!profile) { navigate("/onboarding"); return null; }

  const chartData = masteries.map(m => ({
    topic: m.topic?.length > 15 ? m.topic.substring(0, 15) + "…" : m.topic,
    fullName: m.topic,
    mastery: m.mastery_score || 0,
    attempted: m.questions_attempted || 0,
    correct: m.questions_correct || 0,
  }));

  const radarData = masteries.map(m => ({
    subject: m.topic?.split(" ")[0] || "",
    score: m.mastery_score || 0,
    fullMark: 100,
  }));

  const totalAttempted = masteries.reduce((s, m) => s + (m.questions_attempted || 0), 0);
  const totalCorrect = masteries.reduce((s, m) => s + (m.questions_correct || 0), 0);

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground mb-1">Your Progress</h1>
        <p className="text-sm text-muted-foreground">
          {totalAttempted} questions attempted · {totalCorrect} correct · {masteries.filter(m => m.status === "mastered").length} topics mastered
        </p>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="font-display font-semibold text-foreground mb-4">Mastery by Topic</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical" margin={{ left: 10, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 12 }} />
                <YAxis dataKey="topic" type="category" width={120} tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(value) => `${value}%`}
                  contentStyle={{ borderRadius: "12px", border: "1px solid hsl(var(--border))" }}
                />
                <Bar dataKey="mastery" fill="hsl(var(--primary))" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="font-display font-semibold text-foreground mb-4">Skill Radar</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
                <PolarGrid stroke="hsl(var(--border))" />
                <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                <Radar name="Mastery" dataKey="score" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.2} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Topic Detail List */}
      <div>
        <h3 className="font-display font-semibold text-foreground mb-4">Topic Details</h3>
        <div className="space-y-3">
          {masteries.map(m => {
            const config = statusConfig[m.status || "not_started"];
            const accuracy = m.questions_attempted > 0 
              ? Math.round((m.questions_correct / m.questions_attempted) * 100)
              : 0;
            const topicData = SYLLABUS_TOPICS.find(t => t.name === m.topic);
            const colors = topicData ? TOPIC_COLORS[topicData.id] : { bg: "bg-muted", text: "text-muted-foreground" };

            return (
              <Card key={m.id} className="p-4">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-medium text-foreground truncate">{m.topic}</h4>
                      <Badge className={`${config.color} text-xs`}>{config.label}</Badge>
                    </div>
                    <Progress value={m.mastery_score || 0} className="h-2 mb-2" />
                    <div className="flex gap-4 text-xs text-muted-foreground">
                      <span>{m.mastery_score || 0}% mastered</span>
                      <span>{m.questions_attempted || 0} attempted</span>
                      <span>{accuracy}% accuracy</span>
                      <span className="capitalize">{m.difficulty_level || "beginner"} level</span>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}