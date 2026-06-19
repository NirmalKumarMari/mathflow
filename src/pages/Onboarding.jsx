import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { GraduationCap, ArrowRight, ArrowLeft, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useStudentProfile } from "@/hooks/useStudentProfile";
import { SYLLABUS_TOPICS } from "@/lib/syllabus";
import { base44 } from "@/api/base44Client";

const STEPS = ["Welcome", "About You", "Your Goals", "Getting Started"];

export default function Onboarding() {
  const [step, setStep] = useState(0);
  const [formData, setFormData] = useState({
    age: "",
    grade_level: "",
    goals: "",
    use_case: "",
    preferred_explanation_style: "step-by-step",
  });
  const [loading, setLoading] = useState(false);
  const { createProfile } = useStudentProfile();
  const navigate = useNavigate();

  const handleSubmit = async () => {
    setLoading(true);
    
    // Generate initial study guide
    const guideResponse = await base44.integrations.Core.InvokeLLM({
      prompt: `You are an educational planning assistant. A ${formData.grade_level} grade student (age ${formData.age}) wants to study math. Their goal: "${formData.goals}". They plan to use this app for: "${formData.use_case}".

Based on these topics: ${SYLLABUS_TOPICS.filter(t => t.grades.includes(formData.grade_level)).map(t => t.name).join(", ")}

Create a personalized initial study guide. Return JSON:
{
  "strengths": [],
  "gaps": ["list topics they should start with based on grade level"],
  "next_topics": ["first 3 topics to study in order"],
  "plan_details": "A friendly, detailed study plan paragraph"
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

    await createProfile.mutateAsync({
      ...formData,
      age: parseInt(formData.age),
      onboarding_complete: true,
      overall_mastery: 0,
      current_topic: guideResponse.next_topics?.[0] || SYLLABUS_TOPICS[0].name,
    });

    await base44.entities.StudyGuide.create({
      version: 1,
      status: "pending",
      strengths: guideResponse.strengths || [],
      gaps: guideResponse.gaps || [],
      next_topics: guideResponse.next_topics || [],
      plan_details: guideResponse.plan_details || "Let's get started with your math journey!",
    });

    // Initialize topic masteries
    const relevantTopics = SYLLABUS_TOPICS.filter(t => 
      t.grades.includes(formData.grade_level) || formData.grade_level === "adaptive"
    );
    await base44.entities.TopicMastery.bulkCreate(
      relevantTopics.map(t => ({
        topic: t.name,
        mastery_score: 0,
        questions_attempted: 0,
        questions_correct: 0,
        consecutive_failures: 0,
        difficulty_level: "beginner",
        status: "not_started",
      }))
    );

    setLoading(false);
    navigate("/study-guide");
  };

  const canProceed = () => {
    if (step === 1) return formData.age && formData.grade_level;
    if (step === 2) return formData.goals;
    if (step === 3) return formData.use_case;
    return true;
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Progress */}
        <div className="flex items-center gap-2 mb-8">
          {STEPS.map((s, i) => (
            <div key={i} className="flex-1 flex items-center gap-2">
              <div className={`h-1.5 flex-1 rounded-full transition-all ${
                i <= step ? "bg-primary" : "bg-border"
              }`} />
            </div>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            {step === 0 && (
              <div className="text-center space-y-6">
                <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
                  <GraduationCap className="w-10 h-10 text-primary" />
                </div>
                <div>
                  <h1 className="text-3xl font-display font-bold text-foreground mb-3">
                    Welcome to StudyTutor
                  </h1>
                  <p className="text-muted-foreground text-lg leading-relaxed">
                    Your personal AI math tutor that adapts to the way you learn. 
                    Let's set up your profile so we can create the perfect study plan for you.
                  </p>
                </div>
              </div>
            )}

            {step === 1 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-display font-bold text-foreground mb-2">About You</h2>
                  <p className="text-muted-foreground">Help us personalize your experience.</p>
                </div>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="age">How old are you?</Label>
                    <Input
                      id="age"
                      type="number"
                      placeholder="Enter your age"
                      value={formData.age}
                      onChange={e => setFormData({ ...formData, age: e.target.value })}
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label>What grade are you in?</Label>
                    <Select value={formData.grade_level} onValueChange={v => setFormData({ ...formData, grade_level: v })}>
                      <SelectTrigger className="mt-2">
                        <SelectValue placeholder="Select your grade" />
                      </SelectTrigger>
                      <SelectContent>
                        {["6th", "7th", "8th", "9th", "10th", "11th", "12th", "adaptive"].map(g => (
                          <SelectItem key={g} value={g}>
                            {g === "adaptive" ? "Not sure / Adaptive" : `${g} Grade`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>How do you learn best?</Label>
                    <Select value={formData.preferred_explanation_style} onValueChange={v => setFormData({ ...formData, preferred_explanation_style: v })}>
                      <SelectTrigger className="mt-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="visual">Visual diagrams & charts</SelectItem>
                        <SelectItem value="step-by-step">Step-by-step instructions</SelectItem>
                        <SelectItem value="analogy">Real-world analogies</SelectItem>
                        <SelectItem value="socratic">Guided questions (Socratic)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-display font-bold text-foreground mb-2">Your Goals</h2>
                  <p className="text-muted-foreground">What would you like to achieve?</p>
                </div>
                <div>
                  <Label htmlFor="goals">Describe your math goals</Label>
                  <Textarea
                    id="goals"
                    placeholder="e.g., I want to improve my algebra skills for an upcoming test, or I want to get better at word problems..."
                    value={formData.goals}
                    onChange={e => setFormData({ ...formData, goals: e.target.value })}
                    className="mt-2 h-32"
                  />
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-display font-bold text-foreground mb-2">Almost There!</h2>
                  <p className="text-muted-foreground">One more thing — how will you use StudyTutor?</p>
                </div>
                <div>
                  <Label htmlFor="use_case">What do you want to use this app for?</Label>
                  <Textarea
                    id="use_case"
                    placeholder="e.g., Daily practice, homework help, exam preparation, catching up on missed concepts..."
                    value={formData.use_case}
                    onChange={e => setFormData({ ...formData, use_case: e.target.value })}
                    className="mt-2 h-32"
                  />
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        <div className="flex justify-between mt-8">
          {step > 0 ? (
            <Button variant="ghost" onClick={() => setStep(step - 1)}>
              <ArrowLeft className="w-4 h-4 mr-2" /> Back
            </Button>
          ) : <div />}
          
          {step < 3 ? (
            <Button onClick={() => setStep(step + 1)} disabled={!canProceed()}>
              Continue <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={!canProceed() || loading}>
              {loading ? (
                <span className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  Creating your plan...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4" /> Generate My Study Plan
                </span>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}