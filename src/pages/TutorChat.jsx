import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Send, Loader2, Sparkles, BookOpen, RotateCcw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { useStudentProfile, useTopicMasteries } from "@/hooks/useStudentProfile";
import { SYLLABUS_TOPICS } from "@/lib/syllabus";
import MessageBubble from "@/components/chat/MessageBubble";

const QUICK_PROMPTS = [
  "Give me a practice question",
  "Explain this topic to me",
  "I'm confused, can you help?",
  "Show me a worked example",
  "What should I study next?",
];

export default function TutorChat() {
  const navigate = useNavigate();
  const { profile } = useStudentProfile();
  const { masteries } = useTopicMasteries();
  const [selectedTopicId, setSelectedTopicId] = useState("");
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [starting, setStarting] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const relevantTopics = profile
    ? SYLLABUS_TOPICS.filter(t => t.grades.includes(profile.grade_level) || profile.grade_level === "adaptive")
    : SYLLABUS_TOPICS;

  const selectedTopic = relevantTopics.find(t => t.id === selectedTopicId);

  const startSession = async () => {
    if (!selectedTopicId) return;
    setStarting(true);

    const mastery = masteries.find(m => m.topic === selectedTopic.name);
    const score = mastery?.mastery_score || 0;
    const difficulty = score >= 70 ? "advanced" : score >= 40 ? "intermediate" : "beginner";

    const conv = await base44.agents.createConversation({
      agent_name: "math_tutor",
      metadata: {
        name: `${selectedTopic.name} Session`,
        topic: selectedTopic.name,
        grade: profile?.grade_level,
      }
    });

    setConversation(conv);

    // Subscribe to updates
    const unsubscribe = base44.agents.subscribeToConversation(conv.id, (data) => {
      setMessages([...data.messages]);
    });

    // Send initial context message
    const initMsg = `Student context:
- Grade: ${profile?.grade_level || "adaptive"}
- Age: ${profile?.age || "unknown"}
- Topic: ${selectedTopic.name}
- Current difficulty level: ${difficulty} (${Math.round(score)}% mastery)
- Preferred style: ${profile?.preferred_explanation_style || "step-by-step"}
- Goals: ${profile?.goals || "general math improvement"}
- Subtopics available: ${selectedTopic.subtopics.join(", ")}

Start by greeting the student warmly and asking what they'd like to do: learn a concept, practice problems, or get help with something specific. Keep it short and friendly.`;

    await base44.agents.addMessage(conv, { role: "user", content: initMsg });
    setStarting(false);
    setTimeout(() => inputRef.current?.focus(), 200);

    return () => unsubscribe();
  };

  const sendMessage = async () => {
    if (!input.trim() || !conversation || loading) return;
    const userMsg = input.trim();
    setInput("");
    setLoading(true);

    await base44.agents.addMessage(conversation, { role: "user", content: userMsg });
    setLoading(false);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const resetSession = () => {
    setConversation(null);
    setMessages([]);
    setSelectedTopicId("");
    setInput("");
  };

  const visibleMessages = messages.filter(m => {
    // Hide the initial context message sent by the system
    if (m.role === "user" && m.content?.startsWith("Student context:")) return false;
    return true;
  });

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] md:h-screen p-4 md:p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-display font-bold text-foreground">AI Tutor Chat</h1>
          {selectedTopic && (
            <p className="text-sm text-muted-foreground">Topic: {selectedTopic.name}</p>
          )}
        </div>
        {conversation && (
          <Button variant="outline" size="sm" onClick={resetSession} className="gap-2">
            <RotateCcw className="w-3 h-3" /> New Session
          </Button>
        )}
      </div>

      {!conversation ? (
        <Card className="flex-1 flex flex-col items-center justify-center p-8 text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
            <Sparkles className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-xl font-display font-bold text-foreground mb-2">
            Start a Tutoring Session
          </h2>
          <p className="text-muted-foreground mb-8 max-w-md">
            Chat with your AI tutor about any math topic. Ask questions, get practice problems, or request explanations — tailored to your level.
          </p>

          <div className="w-full max-w-sm space-y-4">
            <Select value={selectedTopicId} onValueChange={setSelectedTopicId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a topic..." />
              </SelectTrigger>
              <SelectContent>
                {relevantTopics.map(t => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                    <span className="ml-2 text-xs text-muted-foreground">
                      {masteries.find(m => m.topic === t.name)?.mastery_score || 0}%
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button onClick={startSession} disabled={!selectedTopicId || starting} className="w-full gap-2">
              {starting ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Starting session...</>
              ) : (
                <><BookOpen className="w-4 h-4" /> Start Learning</>
              )}
            </Button>
          </div>
        </Card>
      ) : (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto space-y-4 pb-4 pr-1">
            <AnimatePresence>
              {visibleMessages.map((msg, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <MessageBubble message={msg} />
                </motion.div>
              ))}
            </AnimatePresence>

            {loading && (
              <div className="flex gap-3">
                <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <div className="w-3 h-3 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                </div>
                <div className="bg-card border border-border rounded-2xl px-4 py-3">
                  <div className="flex gap-1">
                    {[0, 1, 2].map(i => (
                      <div key={i} className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                    ))}
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompts */}
          {visibleMessages.length <= 1 && (
            <div className="flex gap-2 flex-wrap mb-3">
              {QUICK_PROMPTS.map(prompt => (
                <button
                  key={prompt}
                  onClick={() => setInput(prompt)}
                  className="text-xs px-3 py-1.5 rounded-full border border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground transition-all"
                >
                  {prompt}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="flex gap-2">
            <Input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendMessage()}
              placeholder="Ask anything about math..."
              disabled={loading}
              className="flex-1 h-12"
            />
            <Button onClick={sendMessage} disabled={!input.trim() || loading} size="icon" className="h-12 w-12 flex-shrink-0">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}