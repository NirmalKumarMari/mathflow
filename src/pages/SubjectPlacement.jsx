import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Sparkles, Loader2, CheckCircle, XCircle, Play, FileText, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { useSubjects } from "@/hooks/useSubjects";
import { useStudentProfile, useStudyGuides } from "@/hooks/useStudentProfile";
import { SYLLABUS_TOPICS } from "@/lib/syllabus";
import { getSubjectLanguage, getLanguageInstruction } from "@/lib/languageUtils";

export default function SubjectPlacement() {
  const { subjectId } = useParams();
  const navigate = useNavigate();
  const { subjects, isLoading: subjectsLoading, updateSubject } = useSubjects();
  const { profile } = useStudentProfile();
  const { createGuide } = useStudyGuides(subjectId);

  const subject = subjects.find(s => s.id === subjectId);
  const tutoringLanguage = getSubjectLanguage(subject, profile);

  const [phase, setPhase] = useState("intro");
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!subjectsLoading && !subject) navigate("/");
  }, [subjectsLoading, subject]);

  useEffect(() => {
    if (subject?.placement_completed) navigate(`/subject/${subjectId}`);
  }, [subject]);

  if (subjectsLoading || !subject) {
    return (
      <div className="p-6 md:p-10 max-w-2xl mx-auto space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }

  const topics = subject.subject_type === "math" && !subject.topics?.length
    ? SYLLABUS_TOPICS.filter(t => t.grades?.includes(subject.grade_level) || subject.grade_level === "adaptive")
    : (subject.topics || []);

  const startPlacement = async () => {
    setLoading(true);
    const topicList = topics.map(t => `- ${t.id}: ${t.name} (subtopics: ${(t.subtopics || []).join(", ")})`).join("\n");

    const llmParams = {
      prompt: `Generate a placement test for the subject "${subject.name}".
Description: ${subject.description || "General " + subject.name}
Grade level: ${subject.grade_level}
Country: ${subject.country || "Not specified"}

Topics in this subject:
${topicList}

Create exactly 8 questions spanning different topics — 2 easy, 4 medium, 2 hard. Each question should test a different topic area.

Return JSON:
{
  "questions": [
    {
      "topic_id": "the topic id from the list above",
      "topic_name": "the topic name",
      "question": "the question text",
      "correct_answer": "the correct answer (brief)",
      "difficulty": "easy|medium|hard"
    }
  ]
}`,
      response_json_schema: {
        type: "object",
        properties: {
          questions: {
            type: "array",
            items: {
              type: "object",
              properties: {
                topic_id: { type: "string" },
                topic_name: { type: "string" },
                question: { type: "string" },
                correct_answer: { type: "string" },
                difficulty: { type: "string" }
              }
            }
          }
        }
      }
    };

    llmParams.prompt += getLanguageInstruction(tutoringLanguage);

    if (subject.textbook_url) {
      llmParams.file_urls = [subject.textbook_url];
      llmParams.prompt = `Use the attached textbook as the primary reference for creating this placement test.\n\n${llmParams.prompt}`;
    }

    const response = await base44.integrations.Core.InvokeLLM(llmParams);
    setQuestions(response.questions || []);
    setPhase("questions");
    setLoading(false);
  };

  const submitPlacement = async () => {
    setPhase("evaluating");
    const evaluations = await Promise.all(
      questions.map(async (q, i) => {
        const answer = answers[i] || "";
        if (!answer.trim()) return { ...q, is_correct: false, student_answer: "" };
        const evalRes = await base44.integrations.Core.InvokeLLM({
          prompt: `Evaluate this answer.
Question: ${q.question}
Correct Answer: ${q.correct_answer}
Student Answer: ${answer}
Is correct? Consider equivalent forms. Return JSON: {"is_correct": true/false}`,
          response_json_schema: {
            type: "object",
            properties: { is_correct: { type: "boolean" } }
          }
        });
        return { ...q, is_correct: evalRes.is_correct, student_answer: answer };
      })
    );
    setResults(evaluations);
    setPhase("generating");

    const topicResults = {};
    evaluations.forEach(r => {
      if (!topicResults[r.topic_name]) topicResults[r.topic_name] = { correct: 0, total: 0 };
      topicResults[r.topic_name].total++;
      if (r.is_correct) topicResults[r.topic_name].correct++;
    });

    const guideResponse = await base44.integrations.Core.InvokeLLM({
      prompt: `Create a personalized study guide for a student in "${subject.name}".

Placement test results:
${evaluations.map(r => `- ${r.topic_name} (${r.difficulty}): ${r.is_correct ? "Correct" : "Incorrect"} — Q: ${r.question} | Student: ${r.student_answer || "No answer"} | Correct: ${r.correct_answer}`).join("\n")}

Topic performance summary:
${Object.entries(topicResults).map(([topic, { correct, total }]) => `- ${topic}: ${correct}/${total} correct (${Math.round(correct / total * 100)}%)`).join("\n")}

Student grade: ${profile?.grade_level || subject.grade_level}
Country: ${subject.country || "Not specified"}

Based on these results, create a study guide:
1. strengths: topics where the student scored well
2. gaps: topics where the student struggled
3. next_topics: recommended next 3-5 topics to study (in order)
4. plan_details: a detailed, week-by-week study plan

Return JSON:
{
  "strengths": ["topic1", "topic2"],
  "gaps": ["topic3", "topic4"],
  "next_topics": ["topic5", "topic6", "topic7"],
  "plan_details": "detailed study plan text"
}${getLanguageInstruction(tutoringLanguage)}`,
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

    await createGuide.mutateAsync({
      version: 1,
      status: "pending",
      subject_id: subjectId,
      strengths: guideResponse.strengths || [],
      gaps: guideResponse.gaps || [],
      next_topics: guideResponse.next_topics || [],
      plan_details: guideResponse.plan_details || "",
    });

    await updateSubject.mutateAsync({ id: subjectId, data: { placement_completed: true } });
    setPhase("results");
  };

  const allAnswered = questions.length > 0 && questions.every((_, i) => answers[i]?.trim());
  const correctCount = results?.filter(r => r.is_correct).length || 0;

  return (
    <div className="p-6 md:p-10 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/">
          <Button variant="ghost" size="icon"><ArrowLeft className="w-4 h-4" /></Button>
        </Link>
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">{subject.name}</h1>
          <p className="text-sm text-muted-foreground">Placement Test</p>
        </div>
      </div>

      {phase === "intro" && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="p-8 text-center">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-xl font-display font-bold text-foreground mb-2">Begin {subject.name}</h2>
            <p className="text-sm text-muted-foreground mb-2 max-w-md mx-auto">
              Take a quick placement test so we can assess your current level and create a personalized study guide for you.
            </p>
            {subject.textbook_url && (
              <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground mb-6">
                <FileText className="w-3 h-3" /> Questions based on your uploaded textbook
              </div>
            )}
            <div className="flex items-center justify-center gap-4 mb-6 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><Play className="w-3 h-3" /> 8 questions</span>
              <span>•</span>
              <span>~5 minutes</span>
              <span>•</span>
              <span>{topics.length} topics</span>
            </div>
            <Button onClick={startPlacement} disabled={loading} size="lg" className="gap-2">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              Start Placement Test
            </Button>
            <button
              onClick={() => navigate(`/subject/${subjectId}`)}
              className="block mx-auto mt-4 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Skip for now
            </button>
          </Card>
        </motion.div>
      )}

      {phase === "questions" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Answer all {questions.length} questions. Don't worry if you don't know some — this helps us place you at the right level.
          </p>
          {questions.map((q, i) => (
            <Card key={i} className="p-4 space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">{q.topic_name}</Badge>
                <Badge variant="secondary" className="text-xs capitalize">{q.difficulty}</Badge>
                <span className="text-xs text-muted-foreground ml-auto">Q{i + 1}/{questions.length}</span>
              </div>
              <p className="text-sm font-medium text-foreground">{q.question}</p>
              <Input
                placeholder="Your answer..."
                value={answers[i] || ""}
                onChange={e => setAnswers(prev => ({ ...prev, [i]: e.target.value }))}
                onKeyDown={e => e.key === "Enter" && allAnswered && submitPlacement()}
              />
            </Card>
          ))}
          <Button onClick={submitPlacement} disabled={!allAnswered} className="w-full gap-2">
            Submit Answers <ArrowRight className="w-4 h-4" />
          </Button>
        </motion.div>
      )}

      {(phase === "evaluating" || phase === "generating") && (
        <Card className="p-10 text-center">
          <Loader2 className="w-10 h-10 text-primary animate-spin mx-auto mb-4" />
          <p className="font-display font-semibold text-foreground mb-1">
            {phase === "evaluating" ? "Evaluating your answers..." : "Generating your study guide..."}
          </p>
          <p className="text-sm text-muted-foreground">
            {phase === "evaluating" ? "Checking each answer carefully" : "Building a personalized plan based on your results"}
          </p>
        </Card>
      )}

      {phase === "results" && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <Card className="p-6 text-center">
            <div className="w-16 h-16 rounded-2xl bg-emerald-100 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-emerald-600" />
            </div>
            <h2 className="text-xl font-display font-bold text-foreground mb-1">
              {correctCount}/{questions.length} correct
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              Your study guide for {subject.name} is ready!
            </p>
            <div className="flex gap-2 justify-center">
              <Button onClick={() => navigate(`/subject/${subjectId}`)} className="gap-2">
                Go to Dashboard <ArrowRight className="w-4 h-4" />
              </Button>
              <Button variant="outline" onClick={() => navigate(`/study-guide?subject=${subjectId}`)} className="gap-2">
                <Sparkles className="w-4 h-4" /> View Study Guide
              </Button>
            </div>
          </Card>

          <div className="space-y-2">
            {results.map((r, i) => (
              <Card key={i} className={`p-3 flex items-start gap-3 ${r.is_correct ? "border-emerald-200 bg-emerald-50" : "border-rose-200 bg-rose-50"}`}>
                {r.is_correct
                  ? <CheckCircle className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                  : <XCircle className="w-4 h-4 text-rose-600 mt-0.5 flex-shrink-0" />}
                <div className="text-xs">
                  <p className="font-medium text-foreground">{r.topic_name} · <span className="capitalize">{r.difficulty}</span></p>
                  <p className="text-muted-foreground mt-0.5">{r.question}</p>
                  {!r.is_correct && (
                    <p className="text-muted-foreground mt-0.5">
                      Your answer: <span className="line-through">{r.student_answer || "—"}</span> · Correct: <span className="font-medium text-foreground">{r.correct_answer}</span>
                    </p>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}