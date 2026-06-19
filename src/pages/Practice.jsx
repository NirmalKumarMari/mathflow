import React, { useState, useEffect, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Send, CheckCircle, XCircle, Lightbulb, BookOpen, ArrowRight, Loader2, RotateCcw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { useStudentProfile, useTopicMasteries } from "@/hooks/useStudentProfile";
import { SYLLABUS_TOPICS, getTopicById } from "@/lib/syllabus";
import { getProblemCreatorPrompt } from "@/lib/agentPrompts";
import ReactMarkdown from "react-markdown";

export default function Practice() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { profile, updateProfile } = useStudentProfile();
  const { masteries, upsertMastery } = useTopicMasteries();
  
  const [selectedTopicId, setSelectedTopicId] = useState(searchParams.get("topic") || "");
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [showResources, setShowResources] = useState(false);
  const [resources, setResources] = useState("");
  const [sessionQuestions, setSessionQuestions] = useState(0);
  const [sessionCorrect, setSessionCorrect] = useState(0);
  const inputRef = useRef(null);

  const selectedTopic = selectedTopicId ? getTopicById(selectedTopicId) : null;
  const topicMastery = masteries.find(m => m.topic === selectedTopic?.name);

  useEffect(() => {
    if (!profile && !loading) navigate("/onboarding");
  }, [profile]);

  const getDifficulty = () => {
    const score = topicMastery?.mastery_score || 0;
    if (score >= 70) return "advanced";
    if (score >= 40) return "intermediate";
    return "beginner";
  };

  const generateQuestion = async () => {
    if (!selectedTopic) return;
    setLoading(true);
    setFeedback(null);
    setAnswer("");
    setShowHint(false);
    setShowResources(false);

    const difficulty = getDifficulty();
    const subtopicIdx = Math.floor(Math.random() * selectedTopic.subtopics.length);
    const subtopic = selectedTopic.subtopics[subtopicIdx];

    const prompt = getProblemCreatorPrompt(selectedTopic.name, subtopic, difficulty, profile);

    const response = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          question: { type: "string" },
          correct_answer: { type: "string" },
          solution_steps: { type: "string" },
          hints: { type: "string" },
          difficulty: { type: "string" },
          subtopic: { type: "string" },
        }
      }
    });

    setCurrentQuestion(response);
    setLoading(false);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const submitAnswer = async () => {
    if (!answer.trim() || !currentQuestion) return;
    setLoading(true);

    const evalResponse = await base44.integrations.Core.InvokeLLM({
      prompt: `You are evaluating a math answer. Be precise but kind.

Question: ${currentQuestion.question}
Correct Answer: ${currentQuestion.correct_answer}
Student's Answer: ${answer}

Evaluate if the student's answer is correct. Consider equivalent forms (e.g., 0.5 = 1/2).

Return JSON:
{
  "is_correct": true/false,
  "explanation": "detailed explanation of why correct or incorrect",
  "encouragement": "encouraging message for the student"
}`,
      response_json_schema: {
        type: "object",
        properties: {
          is_correct: { type: "boolean" },
          explanation: { type: "string" },
          encouragement: { type: "string" },
        }
      }
    });

    setFeedback(evalResponse);
    setSessionQuestions(prev => prev + 1);

    const isCorrect = evalResponse.is_correct;
    if (isCorrect) setSessionCorrect(prev => prev + 1);

    // Update mastery
    const currentMastery = topicMastery || { questions_attempted: 0, questions_correct: 0, mastery_score: 0, consecutive_failures: 0 };
    const newAttempted = (currentMastery.questions_attempted || 0) + 1;
    const newCorrect = (currentMastery.questions_correct || 0) + (isCorrect ? 1 : 0);
    const newConsecFail = isCorrect ? 0 : (currentMastery.consecutive_failures || 0) + 1;
    const newScore = Math.round((newCorrect / newAttempted) * 100);
    
    let newStatus = "in_progress";
    if (newScore >= 80 && newAttempted >= 5) newStatus = "mastered";
    else if (newConsecFail >= 2) newStatus = "needs_review";

    await upsertMastery.mutateAsync({
      topic: selectedTopic.name,
      updates: {
        mastery_score: newScore,
        questions_attempted: newAttempted,
        questions_correct: newCorrect,
        consecutive_failures: newConsecFail,
        difficulty_level: getDifficulty(),
        status: newStatus,
        last_practiced: new Date().toISOString(),
      }
    });

    // Save question record
    await base44.entities.PracticeQuestion.create({
      topic: selectedTopic.name,
      subtopic: currentQuestion.subtopic,
      difficulty: currentQuestion.difficulty,
      question_text: currentQuestion.question,
      correct_answer: currentQuestion.correct_answer,
      student_answer: answer,
      is_correct: isCorrect,
      explanation: evalResponse.explanation,
      hints: currentQuestion.hints,
    });

    // Check for escalation
    if (newConsecFail >= 2) {
      setFeedback(prev => ({
        ...prev,
        escalation: `It looks like this concept is tricky. Let's review some foundational ideas before continuing. Consider going back to review prerequisites for ${selectedTopic.name}.`
      }));
    }

    setLoading(false);
  };

  const loadResources = async () => {
    setShowResources(true);
    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `Provide a helpful explanation and resources for this math problem:
Topic: ${selectedTopic.name}
Question: ${currentQuestion.question}
The student ${feedback?.is_correct ? 'answered correctly' : 'struggled with this'}.
Student grade: ${profile?.grade_level || 'adaptive'}
Preferred style: ${profile?.preferred_explanation_style || 'step-by-step'}

Provide:
1. A clear explanation using their preferred style
2. A worked example of a similar problem
3. A common mistake to watch out for
4. An encouraging tip

Format with markdown.`,
    });
    setResources(res);
  };

  const relevantTopics = profile ? SYLLABUS_TOPICS.filter(t =>
    t.grades.includes(profile.grade_level) || profile.grade_level === "adaptive"
  ) : SYLLABUS_TOPICS;

  return (
    <div className="p-6 md:p-10 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground mb-1">Practice Session</h1>
        <p className="text-sm text-muted-foreground">
          {sessionQuestions > 0 && `${sessionCorrect}/${sessionQuestions} correct this session`}
        </p>
      </div>

      {/* Topic Selector */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <Select value={selectedTopicId} onValueChange={v => { setSelectedTopicId(v); setCurrentQuestion(null); setFeedback(null); }}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a topic to practice" />
              </SelectTrigger>
              <SelectContent>
                {relevantTopics.map(t => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name} — {masteries.find(m => m.topic === t.name)?.mastery_score || 0}%
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={generateQuestion} disabled={!selectedTopicId || loading}>
            {loading && !currentQuestion ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : currentQuestion ? (
              <RotateCcw className="w-4 h-4 mr-2" />
            ) : null}
            {currentQuestion ? "New Question" : "Start"}
          </Button>
        </div>
      </Card>

      {/* Question Area */}
      <AnimatePresence mode="wait">
        {currentQuestion && (
          <motion.div
            key={currentQuestion.question}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <Card className="p-6 space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="secondary" className="text-xs capitalize">
                  {currentQuestion.difficulty || getDifficulty()}
                </Badge>
                {currentQuestion.subtopic && (
                  <Badge variant="outline" className="text-xs">
                    {currentQuestion.subtopic}
                  </Badge>
                )}
              </div>

              <div className="text-lg font-medium text-foreground leading-relaxed">
                <ReactMarkdown>{currentQuestion.question}</ReactMarkdown>
              </div>

              {/* Hint */}
              {showHint && currentQuestion.hints && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-800"
                >
                  <div className="flex items-start gap-2">
                    <Lightbulb className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>{currentQuestion.hints}</span>
                  </div>
                </motion.div>
              )}

              {/* Answer Input */}
              {!feedback && (
                <div className="flex gap-2">
                  <Input
                    ref={inputRef}
                    value={answer}
                    onChange={e => setAnswer(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && submitAnswer()}
                    placeholder="Type your answer..."
                    className="flex-1"
                    disabled={loading}
                  />
                  {!showHint && currentQuestion.hints && (
                    <Button variant="outline" size="icon" onClick={() => setShowHint(true)} title="Show hint">
                      <Lightbulb className="w-4 h-4" />
                    </Button>
                  )}
                  <Button onClick={submitAnswer} disabled={!answer.trim() || loading}>
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </Button>
                </div>
              )}

              {/* Feedback */}
              {feedback && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-3"
                >
                  <div className={`p-4 rounded-xl border ${
                    feedback.is_correct 
                      ? "bg-emerald-50 border-emerald-200" 
                      : "bg-rose-50 border-rose-200"
                  }`}>
                    <div className="flex items-start gap-3">
                      {feedback.is_correct ? (
                        <CheckCircle className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
                      ) : (
                        <XCircle className="w-5 h-5 text-rose-600 mt-0.5 flex-shrink-0" />
                      )}
                      <div>
                        <p className={`font-medium ${feedback.is_correct ? "text-emerald-800" : "text-rose-800"}`}>
                          {feedback.is_correct ? "Correct!" : "Not quite right"}
                        </p>
                        <p className="text-sm mt-1 text-foreground/80">{feedback.explanation}</p>
                        {feedback.encouragement && (
                          <p className="text-sm mt-2 text-muted-foreground italic">{feedback.encouragement}</p>
                        )}
                        {!feedback.is_correct && (
                          <p className="text-sm mt-2 text-muted-foreground">
                            The correct answer is: <span className="font-medium text-foreground">{currentQuestion.correct_answer}</span>
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {feedback.escalation && (
                    <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-800">
                      {feedback.escalation}
                    </div>
                  )}

                  <div className="flex gap-2">
                    {!showResources && (
                      <Button variant="outline" size="sm" onClick={loadResources} className="gap-2">
                        <BookOpen className="w-4 h-4" /> Show me more
                      </Button>
                    )}
                    <Button size="sm" onClick={generateQuestion} className="gap-2">
                      Next Question <ArrowRight className="w-4 h-4" />
                    </Button>
                  </div>

                  {showResources && resources && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="p-4 rounded-xl bg-muted border border-border"
                    >
                      <div className="prose prose-sm max-w-none text-foreground">
                        <ReactMarkdown>{resources}</ReactMarkdown>
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              )}
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {!currentQuestion && !loading && selectedTopicId && (
        <Card className="p-10 text-center">
          <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="font-display font-semibold text-foreground mb-2">Ready to practice?</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Click "Start" above to generate your first question on {selectedTopic?.name}.
          </p>
        </Card>
      )}
    </div>
  );
}