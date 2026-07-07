import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { GraduationCap, Sparkles, BookOpen, ArrowRight, TrendingUp } from "lucide-react";
import { useStudentProfile, useStudyGuides } from "@/hooks/useStudentProfile";
import { useSubjects } from "@/hooks/useSubjects";
import { useI18n } from "@/hooks/useI18n";
import SubjectCard from "@/components/subjects/SubjectCard";
import AddSubjectDialog from "@/components/subjects/AddSubjectDialog";

export default function SubjectDashboard() {
  const navigate = useNavigate();
  const { profile, isLoading: profileLoading } = useStudentProfile();
  const { latestGuide } = useStudyGuides();
  const { subjects, isLoading: subjectsLoading, createSubject, deleteSubject } = useSubjects();
  const { t } = useI18n();

  useEffect(() => {
    if (!profileLoading && !profile) {
      navigate("/onboarding");
    }
  }, [profileLoading, profile]);

  useEffect(() => {
    if (!profileLoading && profile && !subjectsLoading && subjects.length === 0 && !createSubject.isPending) {
      createSubject.mutate({
        name: `${profile.grade_level} Grade Math`,
        subject_type: "math",
        grade_level: profile.grade_level,
        description: `${profile.grade_level} grade mathematics curriculum`,
        color: "violet",
        country: profile.country || "",
        language: profile.language || "English",
        placement_completed: true,
      });
    }
  }, [profile, subjects, subjectsLoading, profileLoading]);

  if (profileLoading || subjectsLoading) {
    return (
      <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-8">
        <Skeleton className="h-28 rounded-3xl" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3].map(i => <Skeleton key={i} className="h-40 rounded-2xl" />)}
        </div>
      </div>
    );
  }

  const greeting = (() => {
    const hour = new Date().getHours();
    if (hour < 12) return t("greeting.morning");
    if (hour < 18) return t("greeting.afternoon");
    return t("greeting.evening");
  })();

  const totalMastery = profile?.overall_mastery || 0;

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-8">
      {/* Hero Greeting — Uber-style */}
      <Card className="overflow-hidden border-0 bg-foreground text-background rounded-3xl">
        <div className="p-6 md:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-xs text-background/60 uppercase tracking-wider font-medium">{greeting}</p>
            <h1 className="text-2xl md:text-3xl font-display font-bold mt-1">{t("dashboard.yourSubjects")}</h1>
            <p className="text-sm text-background/70 mt-1">
              {profile?.country ? `${profile.country} · ` : ""}{profile?.grade_level} {t("dashboard.grade")}
              {profile?.language && profile.language !== "English" ? ` · ${profile.language}` : ""}
            </p>
          </div>
          {totalMastery > 0 && (
            <div className="flex items-center gap-3 bg-background/10 rounded-2xl px-5 py-3">
              <TrendingUp className="w-5 h-5 text-background/80" />
              <div>
                <p className="text-2xl font-display font-bold">{totalMastery}%</p>
                <p className="text-[10px] text-background/60 uppercase tracking-wider">{t("dashboard.overallMastery")}</p>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Subjects Grid */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-display font-semibold text-foreground">{t("dashboard.subjects")}</h2>
        <AddSubjectDialog onCreate={async (data) => { await createSubject.mutateAsync(data); }} />
      </div>

      {subjects.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {subjects.map(subject => (
            <SubjectCard key={subject.id} subject={subject} onDelete={deleteSubject.mutate} />
          ))}
        </div>
      ) : (
        <Card className="p-12 text-center rounded-2xl">
          <GraduationCap className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="font-display font-semibold text-foreground mb-2">{t("dashboard.noSubjects")}</h3>
          <p className="text-sm text-muted-foreground mb-6">{t("dashboard.addFirstSubject")}</p>
          <AddSubjectDialog onCreate={async (data) => { await createSubject.mutateAsync(data); }} />
        </Card>
      )}

      {/* Quick links */}
      <div className="pt-2">
        <Card className="p-5 flex items-center justify-between cursor-pointer hover:shadow-md transition-shadow rounded-2xl" onClick={() => navigate("/study-guide")}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-display font-semibold text-foreground">{t("dashboard.studyGuide")}</p>
              <p className="text-xs text-muted-foreground">{t("dashboard.viewPlan")}</p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-muted-foreground" />
        </Card>
      </div>
    </div>
  );
}