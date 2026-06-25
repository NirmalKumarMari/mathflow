import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { GraduationCap, Sparkles, BookOpen, ArrowRight } from "lucide-react";
import { useStudentProfile, useStudyGuides } from "@/hooks/useStudentProfile";
import { useSubjects } from "@/hooks/useSubjects";
import SubjectCard from "@/components/subjects/SubjectCard";
import AddSubjectDialog from "@/components/subjects/AddSubjectDialog";

export default function SubjectDashboard() {
  const navigate = useNavigate();
  const { profile, isLoading: profileLoading } = useStudentProfile();
  const { latestGuide } = useStudyGuides();
  const { subjects, isLoading: subjectsLoading, createSubject, deleteSubject } = useSubjects();

  useEffect(() => {
    if (!profileLoading && !profile) {
      navigate("/onboarding");
    }
  }, [profileLoading, profile]);

  // Auto-create a default math subject if none exist and profile has a grade
  useEffect(() => {
    if (!profileLoading && profile && !subjectsLoading && subjects.length === 0 && !createSubject.isPending) {
      createSubject.mutate({
        name: `${profile.grade_level} Grade Math`,
        subject_type: "math",
        grade_level: profile.grade_level,
        description: `${profile.grade_level} grade mathematics curriculum`,
        color: "violet",
      });
    }
  }, [profile, subjects, subjectsLoading, profileLoading]);

  if (profileLoading || subjectsLoading) {
    return (
      <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-8">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3].map(i => <Skeleton key={i} className="h-40 rounded-2xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground mb-1">Welcome back</p>
          <h1 className="text-3xl font-display font-bold text-foreground">Your Subjects</h1>
          <p className="text-sm text-muted-foreground mt-1">Choose a subject to view topics, practice, and track progress</p>
        </div>
        <div className="flex gap-3">
          {latestGuide?.status === "pending" && (
            <Button variant="outline" size="sm" className="gap-2" onClick={() => navigate("/study-guide")}>
              <Sparkles className="w-4 h-4" /> Review Study Guide
            </Button>
          )}
          <AddSubjectDialog onCreate={async (data) => { await createSubject.mutateAsync(data); }} />
        </div>
      </div>

      {/* Subjects Grid */}
      {subjects.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {subjects.map(subject => (
            <SubjectCard key={subject.id} subject={subject} onDelete={deleteSubject.mutate} />
          ))}
        </div>
      ) : (
        <Card className="p-12 text-center">
          <GraduationCap className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="font-display font-semibold text-foreground mb-2">No subjects yet</h3>
          <p className="text-sm text-muted-foreground mb-6">Add your first subject to get started.</p>
          <AddSubjectDialog onCreate={async (data) => { await createSubject.mutateAsync(data); }} />
        </Card>
      )}

      {/* Quick links */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
        <Card className="p-5 flex items-center justify-between cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("/study-guide")}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-display font-semibold text-foreground">Study Guide</p>
              <p className="text-xs text-muted-foreground">View your personalized plan</p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-muted-foreground" />
        </Card>
        <Card className="p-5 flex items-center justify-between cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("/progress")}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-accent" />
            </div>
            <div>
              <p className="font-display font-semibold text-foreground">Progress</p>
              <p className="text-xs text-muted-foreground">Track your mastery over time</p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-muted-foreground" />
        </Card>
      </div>
    </div>
  );
}