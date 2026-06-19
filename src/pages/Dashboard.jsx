import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { BookOpen, ArrowRight, FileText } from "lucide-react";
import { useStudentProfile, useTopicMasteries, useStudyGuides } from "@/hooks/useStudentProfile";
import { SYLLABUS_TOPICS } from "@/lib/syllabus";
import StatsOverview from "@/components/dashboard/StatsOverview";
import TopicCard from "@/components/dashboard/TopicCard";
import { Skeleton } from "@/components/ui/skeleton";

export default function Dashboard() {
  const { profile, isLoading: profileLoading } = useStudentProfile();
  const { masteries, isLoading: masteryLoading } = useTopicMasteries();
  const { latestGuide } = useStudyGuides();
  const navigate = useNavigate();

  if (profileLoading || masteryLoading) {
    return (
      <div className="p-6 md:p-10 space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-28 rounded-2xl" />)}
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3,4,5,6].map(i => <Skeleton key={i} className="h-32 rounded-2xl" />)}
        </div>
      </div>
    );
  }

  if (!profile) {
    navigate("/onboarding");
    return null;
  }

  const relevantTopics = SYLLABUS_TOPICS.filter(t =>
    t.grades.includes(profile.grade_level) || profile.grade_level === "adaptive"
  );

  const currentTopicData = relevantTopics.find(t => t.name === profile.current_topic);

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground mb-1">Welcome back</p>
          <h1 className="text-3xl font-display font-bold text-foreground">Your Dashboard</h1>
        </div>
        <div className="flex gap-3">
          {latestGuide?.status === "pending" && (
            <Link to="/study-guide">
              <Button variant="outline" size="sm" className="gap-2">
                <FileText className="w-4 h-4" />
                Review Study Guide
              </Button>
            </Link>
          )}
          <Link to="/practice">
            <Button size="sm" className="gap-2">
              <BookOpen className="w-4 h-4" />
              Start Practice
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats */}
      <StatsOverview masteries={masteries} profile={profile} />

      {/* Current Focus */}
      {currentTopicData && (
        <Card className="p-6 border-primary/20 bg-primary/5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-primary font-medium uppercase tracking-wide mb-1">Current Focus</p>
              <h3 className="text-lg font-display font-bold text-foreground">{currentTopicData.name}</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {masteries.find(m => m.topic === currentTopicData.name)?.mastery_score || 0}% mastered · {currentTopicData.subtopics.length} subtopics
              </p>
            </div>
            <Link to="/practice">
              <Button size="sm" className="gap-2">
                Continue <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </Card>
      )}

      {/* Topic Grid */}
      <div>
        <h2 className="text-lg font-display font-semibold text-foreground mb-4">All Topics</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {relevantTopics.map(topic => (
            <TopicCard
              key={topic.id}
              topic={topic}
              mastery={masteries.find(m => m.topic === topic.name)}
              onClick={() => navigate(`/practice?topic=${topic.id}`)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}