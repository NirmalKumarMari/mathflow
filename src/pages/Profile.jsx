import React from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { base44 } from "@/api/base44Client";
import { useStudentProfile } from "@/hooks/useStudentProfile";
import { useSubjects } from "@/hooks/useSubjects";
import { COUNTRIES } from "@/lib/countries";
import { LogOut, MapPin, GraduationCap, Globe, Languages, Calendar, BookOpen, ChevronRight, User } from "lucide-react";

export default function Profile() {
  const navigate = useNavigate();
  const { profile, isLoading } = useStudentProfile();
  const { subjects } = useSubjects();

  if (isLoading) {
    return (
      <div className="p-6 md:p-10 max-w-2xl mx-auto space-y-6">
        <Skeleton className="h-32 rounded-3xl" />
        <Skeleton className="h-48 rounded-3xl" />
      </div>
    );
  }

  if (!profile) {
    navigate("/onboarding");
    return null;
  }

  const handleLogout = () => {
    base44.auth.logout("/login");
  };

  const countryInfo = COUNTRIES.find(c => c.name === profile.country);

  const infoItems = [
    { icon: Calendar, label: "Age", value: profile.age ? `${profile.age} years old` : "—" },
    { icon: GraduationCap, label: "Grade Level", value: profile.grade_level ? `${profile.grade_level} Grade` : "—" },
    { icon: MapPin, label: "Country", value: profile.country || "—" },
    { icon: BookOpen, label: "Syllabus", value: profile.syllabus || "—" },
    { icon: Languages, label: "Tutoring Language", value: profile.language || "English" },
  ];

  return (
    <div className="p-6 md:p-10 max-w-2xl mx-auto space-y-6">
      {/* Hero Card */}
      <Card className="overflow-hidden border-0 bg-foreground text-background rounded-3xl">
        <div className="p-8">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-background/15 flex items-center justify-center flex-shrink-0">
              <User className="w-8 h-8 text-background" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-background/60 uppercase tracking-wider font-medium">Student Profile</p>
              <h1 className="text-2xl font-display font-bold truncate">My Account</h1>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-4 text-sm text-background/70">
            <Globe className="w-4 h-4" />
            <span>{profile.country || "Location not set"}</span>
            {profile.language && profile.language !== "English" && (
              <>
                <span className="text-background/30">·</span>
                <Languages className="w-4 h-4" />
                <span>{profile.language}</span>
              </>
            )}
          </div>
        </div>
      </Card>

      {/* Basic Info */}
      <Card className="p-6 rounded-2xl">
        <h2 className="font-display font-semibold text-foreground mb-4">Basic Information</h2>
        <div className="space-y-1">
          {infoItems.map((item) => (
            <div key={item.label} className="flex items-center justify-between py-3 border-b border-border last:border-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center">
                  <item.icon className="w-4 h-4 text-muted-foreground" />
                </div>
                <span className="text-sm text-muted-foreground">{item.label}</span>
              </div>
              <span className="text-sm font-medium text-foreground">{item.value}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Subjects */}
      <Card className="p-6 rounded-2xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-semibold text-foreground">My Subjects</h2>
          <Badge variant="secondary">{subjects.length}</Badge>
        </div>
        {subjects.length > 0 ? (
          <div className="space-y-2">
            {subjects.map(subject => (
              <button
                key={subject.id}
                onClick={() => navigate(subject.placement_completed === false ? `/subject/${subject.id}/placement` : `/subject/${subject.id}`)}
                className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-muted transition-colors text-left"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <BookOpen className="w-5 h-5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{subject.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {subject.grade_level ? `${subject.grade_level} Grade` : "Custom"}
                      {subject.language && subject.language !== "English" ? ` · ${subject.language}` : ""}
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              </button>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">No subjects yet.</p>
        )}
      </Card>

      {/* Goals */}
      {profile.goals && (
        <Card className="p-6 rounded-2xl">
          <h2 className="font-display font-semibold text-foreground mb-2">My Goals</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">{profile.goals}</p>
        </Card>
      )}

      {/* Sign Out */}
      <Button
        variant="outline"
        className="w-full gap-2 rounded-xl h-12"
        onClick={handleLogout}
      >
        <LogOut className="w-4 h-4" /> Sign Out
      </Button>
    </div>
  );
}