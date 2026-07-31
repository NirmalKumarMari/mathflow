import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GraduationCap, ArrowRight, ArrowLeft, Sparkles, CheckCircle, XCircle, Loader2, MapPin, BookOpen, BookText, Globe } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useStudentProfile } from "@/hooks/useStudentProfile";
import { SYLLABUS_TOPICS } from "@/lib/syllabus";
import { COUNTRIES, getSyllabiForCountry } from "@/lib/countries";
import { languageFromCountry, getLanguageInstruction } from "@/lib/languageUtils";
import { AVAILABLE_TEXTBOOKS } from "@/lib/textbooks";
import { base44 } from "@/api/base44Client";

const ONBOARDING_TEXTBOOKS = AVAILABLE_TEXTBOOKS.filter(tb => tb.topics?.length > 0);
const LANGUAGE_OPTIONS = ["English", "Bengali", "Hindi", "Arabic", "French", "Spanish", "German", "Urdu"];

const STEPS = ["Welcome", "About You", "Country & Syllabus", "Your Goals", "Getting Started", "Quick Quiz"];

export default function Onboarding() {
  const [step, setStep] = useState(0);
  const [formData, setFormData] = useState({
    age: "",
    grade_level: "",
    country: "",
    syllabus: "",
    language: "English",
    goals: "",
    use_case: "",
    preferred_explanation_style: "step-by-step",
  });
  const [loading, setLoading] = useState(false);
  const [quizQuestions, setQuizQuestions] = useState([]);
  const [quizAnswers, setQuizAnswers] = useState({});
  const [quizResults, setQuizResults] = useState(null);
  const [quizLoading, setQuizLoading] = useState(false);
  const [generatingQuiz, setGeneratingQuiz] = useState(false);
  const [syllabusMode, setSyllabusMode] = useState("country");
  const [textbookId, setTextbookId] = useState("");
  const { createProfile } = useStudentProfile();
  const navigate = useNavigate();

  const selectedTextbook = ONBOARDING_TEXTBOOKS.find(tb => tb.id === textbookId);
  const subjectName = syllabusMode === "textbook" && selectedTextbook
    ? (selectedTextbook.subject || selectedTextbook.title)
    : "math";

  const getTopicsForGrade = () => {
    if (syllabusMode === "textbook" && selectedTextbook) {
      return selectedTextbook.topics;
    }
    const relevant = SYLLABUS_TOPICS.filter(t =>
      t.grades.includes(formData.grade_level) || formData.grade_level === "adaptive"
    );
    return relevant.length > 0 ? relevant : SYLLABUS_TOPICS;
  };

  const generateQuiz = async () => {
    setGeneratingQuiz(true);
    const topics = getTopicsForGrade();
    // Pick up to 5 topics to quiz on (one question each)
    const topicsToQuiz = topics.slice(0, Math.min(5, topics.length));

    const response = await base44.integrations.Core.InvokeLLM({
      prompt: `Generate a short diagnostic quiz for a ${formData.grade_level} grade ${subjectName} student (age ${formData.age}).
Goals: "${formData.goals}"

Create exactly ${topicsToQuiz.length} questions, one for each of these topics: ${topicsToQuiz.map(t => t.name).join(", ")}.

Each question should be a simple, clear math problem appropriate for a student just starting this topic.

Return JSON:
{
  "questions": [
    {
      "topic": "exact topic name from list",
      "question": "the question text",
      "correct_answer": "the correct answer (brief)",
      "hint": "a short hint"
    }
  ]
}${getLanguageInstruction(formData.language)}`,
      response_json_schema: {
        type: "object",
        properties: {
          questions: {
            type: "array",
            items: {
              type: "object",
              properties: {
                topic: { type: "string" },
                question: { type: "string" },
                correct_answer: { type: "string" },
                hint: { type: "string" },
              }
            }
          }
        }
      }
    });

    setQuizQuestions(response.questions || []);
    setGeneratingQuiz(false);
  };

  const submitQuiz = async () => {
    setQuizLoading(true);

    // Evaluate each answer with LLM
    const evaluations = await Promise.all(
      quizQuestions.map(async (q) => {
        const answer = quizAnswers[q.topic] || "";
        if (!answer.trim()) return { topic: q.topic, is_correct: false, score: 0 };

        const evalRes = await base44.integrations.Core.InvokeLLM({
          prompt: `Math answer evaluation.
Question: ${q.question}
Correct Answer: ${q.correct_answer}
Student Answer: ${answer}
Is the student's answer correct? Consider equivalent forms. Return JSON: {"is_correct": true/false}${getLanguageInstruction(formData.language)}`,
          response_json_schema: {
            type: "object",
            properties: { is_correct: { type: "boolean" } }
          }
        });
        return { topic: q.topic, is_correct: evalRes.is_correct, question: q.question, correct_answer: q.correct_answer, student_answer: answer };
      })
    );

    setQuizResults(evaluations);
    setQuizLoading(false);
  };

  const handleFinish = async () => {
    setLoading(true);

    const topics = getTopicsForGrade();
    const results = quizResults || [];
    const correctTopics = results.filter(r => r.is_correct).map(r => r.topic);
    const weakTopics = results.filter(r => !r.is_correct).map(r => r.topic);

    // Calculate scores per topic from quiz results
    const topicScores = {};
    results.forEach(r => {
      topicScores[r.topic] = r.is_correct ? 60 : 10; // initial seed score
    });

    // Generate study guide based on quiz results
    const guideResponse = await base44.integrations.Core.InvokeLLM({
      prompt: `You are an educational planning assistant. A ${formData.grade_level} grade student (age ${formData.age}) just completed a diagnostic quiz.

Quiz Results:
- Answered correctly: ${correctTopics.length > 0 ? correctTopics.join(", ") : "none"}
- Needs work on: ${weakTopics.length > 0 ? weakTopics.join(", ") : "all topics need assessment"}
- Goals: "${formData.goals}"
- Learning style: ${formData.preferred_explanation_style}

Available topics: ${topics.map(t => t.name).join(", ")}

Create a personalized study guide. Return JSON:
{
  "strengths": ["topics they showed strength in"],
  "gaps": ["topics to focus on, especially weak quiz topics"],
  "next_topics": ["first 3 topics to study in priority order"],
  "plan_details": "A friendly, detailed study plan paragraph based on their quiz performance"
}${getLanguageInstruction(formData.language)}`,
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
      country: formData.country,
      syllabus: formData.syllabus,
      language: formData.language || "English",
      onboarding_complete: true,
      overall_mastery: results.length > 0 ? Math.round((correctTopics.length / results.length) * 100) : 0,
      current_topic: guideResponse.next_topics?.[0] || topics[0].name,
    });

    let createdSubjectId = null;
    if (syllabusMode === "textbook" && selectedTextbook) {
      const subject = await base44.entities.Subject.create({
        name: selectedTextbook.title,
        subject_type: "custom",
        grade_level: formData.grade_level,
        description: `Study guide for ${selectedTextbook.title}`,
        color: "violet",
        language: formData.language || selectedTextbook.language,
        topics: selectedTextbook.topics,
        textbook_url: selectedTextbook.textbook_url,
        textbook_title: selectedTextbook.title,
        placement_completed: false,
      });
      createdSubjectId = subject.id;
    }

    await base44.entities.StudyGuide.create({
      version: 1,
      status: "pending",
      subject_id: createdSubjectId,
      strengths: guideResponse.strengths || [],
      gaps: guideResponse.gaps || [],
      next_topics: guideResponse.next_topics || [],
      plan_details: guideResponse.plan_details || `Let's get started with your ${subjectName} journey!`,
    });

    // Initialize topic masteries with quiz scores
    const topicsToCreate = topics;
    await base44.entities.TopicMastery.bulkCreate(
      topicsToCreate.map(t => ({
        topic: t.name,
        mastery_score: topicScores[t.name] ?? 0,
        questions_attempted: topicScores[t.name] !== undefined ? 1 : 0,
        questions_correct: topicScores[t.name] >= 60 ? 1 : 0,
        consecutive_failures: topicScores[t.name] !== undefined && topicScores[t.name] < 30 ? 1 : 0,
        difficulty_level: "beginner",
        status: topicScores[t.name] >= 60 ? "in_progress" : topicScores[t.name] !== undefined ? "needs_review" : "not_started",
      }))
    );

    setLoading(false);
    navigate("/study-guide");
  };

  const canProceed = () => {
    if (step === 1) return formData.age && formData.grade_level;
    if (step === 2) return syllabusMode === "textbook" ? !!textbookId : (formData.country && formData.syllabus);
    if (step === 3) return formData.goals;
    if (step === 4) return formData.use_case;
    return true;
  };

  const allQuizAnswered = quizQuestions.length > 0 && quizQuestions.every(q => quizAnswers[q.topic]?.trim());

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Progress */}
        <div className="flex items-center gap-2 mb-8">
          {STEPS.map((s, i) => (
            <div key={i} className="flex-1">
              <div className={`h-1.5 rounded-full transition-all ${i <= step ? "bg-primary" : "bg-border"}`} />
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
                  <h1 className="text-3xl font-display font-bold text-foreground mb-3">Welcome to StudyTutor</h1>
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
                        {["6th", "7th"].map(g => (
                          <SelectItem key={g} value={g}>{`${g} Grade`}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>How do you learn best?</Label>
                    <Select value={formData.preferred_explanation_style} onValueChange={v => setFormData({ ...formData, preferred_explanation_style: v })}>
                      <SelectTrigger className="mt-2"><SelectValue /></SelectTrigger>
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
                  <h2 className="text-2xl font-display font-bold text-foreground mb-2">Choose Your Curriculum</h2>
                  <p className="text-muted-foreground">Tell us where you study, or pick a ready-made textbook.</p>
                </div>

                <div className="flex gap-2 p-1 bg-muted rounded-xl">
                  <button
                    onClick={() => setSyllabusMode("country")}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
                      syllabusMode === "country" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
                    }`}
                  >
                    <Globe className="w-4 h-4" /> My Country's Syllabus
                  </button>
                  <button
                    onClick={() => setSyllabusMode("textbook")}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
                      syllabusMode === "textbook" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
                    }`}
                  >
                    <BookText className="w-4 h-4" /> Use a Textbook
                  </button>
                </div>

                {syllabusMode === "country" && (
                  <div className="space-y-4">
                    <div>
                      <Label>Which country are you from?</Label>
                      <Select
                        value={formData.country}
                        onValueChange={v => setFormData({
                          ...formData,
                          country: v,
                          syllabus: "",
                          language: languageFromCountry(v),
                        })}
                      >
                        <SelectTrigger className="mt-2">
                          <SelectValue placeholder="Select your country" />
                        </SelectTrigger>
                        <SelectContent>
                          {COUNTRIES.map(c => (
                            <SelectItem key={c.code} value={c.name}>
                              <span className="flex items-center gap-2">
                                <MapPin className="w-3.5 h-3.5 text-muted-foreground" /> {c.name}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Which syllabus do you follow?</Label>
                      <Select
                        value={formData.syllabus}
                        onValueChange={v => setFormData({ ...formData, syllabus: v })}
                        disabled={!formData.country}
                      >
                        <SelectTrigger className="mt-2">
                          <SelectValue placeholder={formData.country ? "Select your syllabus" : "Select a country first"} />
                        </SelectTrigger>
                        <SelectContent>
                          {getSyllabiForCountry(formData.country).map(s => (
                            <SelectItem key={s.id} value={s.name}>
                              <span className="flex items-center gap-2">
                                <BookOpen className="w-3.5 h-3.5 text-muted-foreground" /> {s.name}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {formData.country && (
                      <div>
                        <Label>Language for lessons & practice</Label>
                        <Select value={formData.language} onValueChange={v => setFormData({ ...formData, language: v })}>
                          <SelectTrigger className="mt-2"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {LANGUAGE_OPTIONS.map(lang => (
                              <SelectItem key={lang} value={lang}>{lang}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground mt-1">Defaulted based on your country — change it if you'd prefer a different language.</p>
                      </div>
                    )}
                  </div>
                )}

                {syllabusMode === "textbook" && (
                  <div className="space-y-4">
                    <div>
                      <Label>Choose a textbook</Label>
                      <Select value={textbookId} onValueChange={v => {
                        const tb = ONBOARDING_TEXTBOOKS.find(x => x.id === v);
                        setTextbookId(v);
                        setFormData({ ...formData, language: tb?.language || "English" });
                      }}>
                        <SelectTrigger className="mt-2">
                          <SelectValue placeholder="Select a textbook" />
                        </SelectTrigger>
                        <SelectContent>
                          {ONBOARDING_TEXTBOOKS.map(tb => (
                            <SelectItem key={tb.id} value={tb.id}>
                              <span className="flex items-center gap-2">
                                <BookText className="w-3.5 h-3.5 text-muted-foreground" /> {tb.title}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {selectedTextbook && (
                      <>
                        <div className="p-3 rounded-xl bg-primary/5 border border-primary/20 text-sm text-muted-foreground">
                          This book's content will drive your lessons, practice, and flashcards. <span className="font-medium text-foreground">{selectedTextbook.language}</span> is used by default, but you can change it below.
                        </div>
                        <div>
                          <Label>Language for lessons & practice</Label>
                          <Select value={formData.language} onValueChange={v => setFormData({ ...formData, language: v })}>
                            <SelectTrigger className="mt-2"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {LANGUAGE_OPTIONS.map(lang => (
                                <SelectItem key={lang} value={lang}>{lang}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <p className="text-xs text-muted-foreground mt-1">Content will still follow the book — only the language changes.</p>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}

            {step === 3 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-display font-bold text-foreground mb-2">Your Goals</h2>
                  <p className="text-muted-foreground">What would you like to achieve?</p>
                </div>
                <div>
                  <Label htmlFor="goals">Describe your math goals</Label>
                  <Textarea
                    id="goals"
                    placeholder="e.g., I want to improve my algebra skills for an upcoming test..."
                    value={formData.goals}
                    onChange={e => setFormData({ ...formData, goals: e.target.value })}
                    className="mt-2 h-32"
                  />
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-display font-bold text-foreground mb-2">Almost There!</h2>
                  <p className="text-muted-foreground">One more thing — how will you use StudyTutor?</p>
                </div>
                <div>
                  <Label htmlFor="use_case">What do you want to use this app for?</Label>
                  <Textarea
                    id="use_case"
                    placeholder="e.g., Daily practice, homework help, exam preparation..."
                    value={formData.use_case}
                    onChange={e => setFormData({ ...formData, use_case: e.target.value })}
                    className="mt-2 h-32"
                  />
                </div>
              </div>
            )}

            {step === 5 && (
              <div className="space-y-5">
                <div>
                  <h2 className="text-2xl font-display font-bold text-foreground mb-1">Quick Diagnostic Quiz</h2>
                  <p className="text-muted-foreground text-sm">
                    Answer a few questions so we can understand where you are. Don't worry — there's no pressure!
                  </p>
                </div>

                {quizQuestions.length === 0 && !generatingQuiz && (
                  <Card className="p-6 text-center">
                    <Sparkles className="w-10 h-10 text-primary mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground mb-4">We'll generate a short quiz tailored to your grade level to understand your current knowledge.</p>
                    <Button onClick={generateQuiz}>Generate My Quiz</Button>
                  </Card>
                )}

                {generatingQuiz && (
                  <Card className="p-8 text-center">
                    <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">Creating your personalized quiz...</p>
                  </Card>
                )}

                {quizQuestions.length > 0 && !quizResults && (
                  <div className="space-y-4">
                    {quizQuestions.map((q, i) => (
                      <Card key={i} className="p-4 space-y-3">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">{q.topic}</Badge>
                          <span className="text-xs text-muted-foreground">Question {i + 1}</span>
                        </div>
                        <p className="text-sm font-medium text-foreground">{q.question}</p>
                        <Input
                          placeholder="Your answer..."
                          value={quizAnswers[q.topic] || ""}
                          onChange={e => setQuizAnswers(prev => ({ ...prev, [q.topic]: e.target.value }))}
                          onKeyDown={e => e.key === "Enter" && allQuizAnswered && !quizLoading && submitQuiz()}
                        />
                      </Card>
                    ))}
                    {quizLoading && (
                      <div className="text-center py-2">
                        <Loader2 className="w-5 h-5 text-primary animate-spin inline" />
                        <span className="text-sm text-muted-foreground ml-2">Evaluating answers...</span>
                      </div>
                    )}
                  </div>
                )}

                {quizResults && (
                  <div className="space-y-3">
                    <p className="text-sm font-medium text-foreground">
                      Results: {quizResults.filter(r => r.is_correct).length}/{quizResults.length} correct
                    </p>
                    {quizResults.map((r, i) => (
                      <Card key={i} className={`p-3 flex items-start gap-3 ${r.is_correct ? "border-emerald-200 bg-emerald-50" : "border-rose-200 bg-rose-50"}`}>
                        {r.is_correct
                          ? <CheckCircle className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                          : <XCircle className="w-4 h-4 text-rose-600 mt-0.5 flex-shrink-0" />
                        }
                        <div className="text-xs">
                          <p className="font-medium text-foreground">{r.topic}</p>
                          {!r.is_correct && (
                            <p className="text-muted-foreground mt-0.5">
                              Your answer: <span className="line-through">{r.student_answer || "—"}</span> · Correct: <span className="font-medium">{r.correct_answer}</span>
                            </p>
                          )}
                        </div>
                      </Card>
                    ))}
                    <p className="text-xs text-muted-foreground pt-1">
                      We'll use these results to build your personalized study plan.
                    </p>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        <div className="flex justify-between mt-8">
          {step > 0 ? (
            <Button variant="ghost" onClick={() => setStep(step - 1)} disabled={loading || quizLoading || generatingQuiz}>
              <ArrowLeft className="w-4 h-4 mr-2" /> Back
            </Button>
          ) : <div />}

          {step < 4 && (
            <Button onClick={() => setStep(step + 1)} disabled={!canProceed()}>
              Continue <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          )}

          {step === 4 && (
            <Button onClick={() => setStep(5)} disabled={!canProceed()}>
              Continue <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          )}

          {step === 5 && !quizResults && quizQuestions.length > 0 && (
            <Button onClick={submitQuiz} disabled={!allQuizAnswered || quizLoading}>
              {quizLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Submit Quiz
            </Button>
          )}

          {step === 5 && quizResults && (
            <Button onClick={handleFinish} disabled={loading}>
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