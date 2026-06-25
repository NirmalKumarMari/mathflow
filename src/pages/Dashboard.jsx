import React from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { BookOpen, ArrowRight, FileText, ArrowLeft } from "lucide-react";
import { useStudentProfile, useTopicMasteries, useStudyGuides } from "@/hooks/useStudentProfile";
import { useSubjects } from "@/hooks/useSubjects";
import { SYLLABUS_TOPICS } from "@/lib/syllabus";
import StatsOverview from "@/components/dashboard/StatsOverview";
import TopicCard from "@/components/dashboard/TopicCard";
import { Skeleton } from "@/components/ui/skeleton";

export default function Dashboard() {
  const { subjectId } = useParams();
  const navigate = useNavigate();
  const { profile, isLoading: profileLoading } = useStudentProfile();
  const { masteries, isLoading: masteryLoading } = useTopicMasteries();
  const { latestGuide } = useStudyGuides();
  const { subjects, isLoading: subjectsLoading } = useSubjects();

  const subject = subjects.find(s => s.id === subjectId);

  if (profileLoading || masteryLoading || subjectsLoading) {
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

  if (!subject) {
    return (
      <div className="p-6 md:p-10 max-w-3xl mx-auto text-center">
        <Card className="p-10">
          <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-display font-bold text-foreground mb-2">Subject not found</h2>
          <Button onClick={() => navigate("/")} className="gap-2">
            <ArrowLeft className="w-4 h-4" /> Back to Subjects
          </Button>
        </Card>
      </div>
    );
  }

  // Build topics list based on subject type
  const topics = subject.subject_type === "math"
    ? SYLLABUS_TOPICS.filter(t =>
        t.grades.includes(subject.grade_level) || subject.grade_level === "adaptive"
      )
    : (subject.topics || []);

  const currentTopicData = topics.find(t => t.name === profile.current_topic);
  const subjectMastery = masteries.filter(m => topics.some(t => t.name === m.topic));

  const goToPractice = (topic) => {
    const params = new URLSearchParams({ topic: topic.id });
    if (subject.subject_type === "custom") params.set("subject", subject.id);
    navigate(`/practice?${params.toString()}`);
  };

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <Link to="/" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 mb-2">
            <ArrowLeft className="w-3 h-3" /> All Subjects
          </Link>
          <h1 className="text-3xl font-display font-bold text-foreground">{subject.name}</h1>
          <p className="text-sm text-muted-foreground mt-1">{subject.description}</p>
        </div>
        <div className="flex gap-3">
          {latestGuide?.status === "pending" && (
            <Link to="/study-guide">
              <Button variant="outline" size="sm" className="gap-2">
                <FileText className="w-4 h-4" /> Review Study Guide
              </Button>
            </Link>
          )}
          <Button size="sm" className="gap-2" onClick={() => topics[0] && goToPractice(topics[0])}>
            <BookOpen className="w-4 h-4" /> Start Practice
          </Button>
        </div>
      </div>

      {/* Stats */}
      <StatsOverview masteries={subjectMastery} profile={profile} />

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
            <Button size="sm" className="gap-2" onClick={() => goToPractice(currentTopicData)}>
              Continue <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </Card>
      )}

      {/* Topic Grid */}
      <div>
        <h2 className="text-lg font-display font-semibold text-foreground mb-4">All Topics</h2>
        {topics.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {topics.map(topic => (
              <TopicCard
                key={topic.id}
                topic={topic}
                mastery={masteries.find(m => m.topic === topic.name)}
                onClick={() => goToPractice(topic)}
              />
            ))}
          </div>
        ) : (
          <Card className="p-10 text-center">
            <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-sm text-muted-foreground">No topics found for this subject.</p>
          </Card>
        )}
      </div>
    </div>
  );
}