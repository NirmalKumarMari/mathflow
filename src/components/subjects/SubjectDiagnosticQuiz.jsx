import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Loader2, CheckCircle, XCircle, ArrowLeft } from "lucide-react";
import { base44 } from "@/api/base44Client";

export default function SubjectDiagnosticQuiz({ subjectName, description, gradeLevel, onComplete, onBack }) {
  const [phase, setPhase] = useState("intro"); // intro | questions | evaluating | results
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);

  const generateQuiz = async () => {
    setLoading(true);
    const response = await base44.integrations.Core.InvokeLLM({
      prompt: `Generate a short diagnostic quiz for a student starting the subject "${subjectName}".
Description: ${description || "General " + subjectName}
Approximate level: ${gradeLevel}

Create exactly 5 questions that span different areas and difficulty levels of this subject — from basic to advanced. These will help determine the student's current knowledge level so we can build an appropriate curriculum.

Return JSON:
{
  "questions": [
    {
      "area": "the area of the subject (e.g. 'Mechanics', 'Electricity')",
      "question": "the question text",
      "correct_answer": "the correct answer (brief)",
      "difficulty": "basic|intermediate|advanced"
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
                area: { type: "string" },
                question: { type: "string" },
                correct_answer: { type: "string" },
                difficulty: { type: "string" }
              }
            }
          }
        }
      }
    });
    setQuestions(response.questions || []);
    setPhase("questions");
    setLoading(false);
  };

  const submitQuiz = async () => {
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
    setPhase("results");
  };

  const allAnswered = questions.length > 0 && questions.every((_, i) => answers[i]?.trim());
  const correctCount = results?.filter(r => r.is_correct).length || 0;

  if (phase === "intro") {
    return (
      <div className="space-y-4">
        <Card className="p-6 text-center">
          <Sparkles className="w-10 h-10 text-primary mx-auto mb-3" />
          <h3 className="font-display font-semibold text-foreground mb-2">Diagnostic Quiz</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Take a quick 5-question quiz on {subjectName} so we can gauge your level and build the right syllabus for you.
          </p>
          <Button onClick={generateQuiz} disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
            Start Quiz
          </Button>
        </Card>
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-2">
          <ArrowLeft className="w-4 h-4" /> Back to details
        </Button>
      </div>
    );
  }

  if (phase === "questions") {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">Answer all 5 questions. Don't worry if you don't know some — this just helps us place you.</p>
        {questions.map((q, i) => (
          <Card key={i} className="p-4 space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">{q.area}</Badge>
              <Badge variant="secondary" className="text-xs capitalize">{q.difficulty}</Badge>
              <span className="text-xs text-muted-foreground">Q{i + 1}</span>
            </div>
            <p className="text-sm font-medium text-foreground">{q.question}</p>
            <Input
              placeholder="Your answer..."
              value={answers[i] || ""}
              onChange={e => setAnswers(prev => ({ ...prev, [i]: e.target.value }))}
              onKeyDown={e => e.key === "Enter" && allAnswered && submitQuiz()}
            />
          </Card>
        ))}
        <Button onClick={submitQuiz} disabled={!allAnswered} className="w-full">
          Submit Quiz
        </Button>
      </div>
    );
  }

  if (phase === "evaluating") {
    return (
      <Card className="p-8 text-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">Evaluating your answers...</p>
      </Card>
    );
  }

  // results
  return (
    <div className="space-y-4">
      <div className="text-center">
        <p className="text-lg font-display font-bold text-foreground">
          {correctCount}/{questions.length} correct
        </p>
        <p className="text-sm text-muted-foreground">We'll use this to build your {subjectName} syllabus.</p>
      </div>
      <div className="space-y-2">
        {results.map((r, i) => (
          <Card key={i} className={`p-3 flex items-start gap-3 ${r.is_correct ? "border-emerald-200 bg-emerald-50" : "border-rose-200 bg-rose-50"}`}>
            {r.is_correct
              ? <CheckCircle className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
              : <XCircle className="w-4 h-4 text-rose-600 mt-0.5 flex-shrink-0" />
            }
            <div className="text-xs">
              <p className="font-medium text-foreground">{r.area} · <span className="capitalize">{r.difficulty}</span></p>
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
      <Button onClick={() => onComplete(results)} className="w-full gap-2">
        <Sparkles className="w-4 h-4" /> Generate My Syllabus
      </Button>
    </div>
  );
}