import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Loader2, Calculator, FlaskConical } from "lucide-react";
import { base44 } from "@/api/base44Client";

const GRADES = ["6th", "7th", "8th", "9th", "10th", "11th", "12th", "adaptive"];
const COLORS = ["violet", "emerald", "blue", "amber", "rose", "teal", "indigo", "orange"];
const COLOR_SWATCHES = {
  violet: "bg-violet-100", emerald: "bg-emerald-100", blue: "bg-blue-100",
  amber: "bg-amber-100", rose: "bg-rose-100", teal: "bg-teal-100",
  indigo: "bg-indigo-100", orange: "bg-orange-100",
};

export default function AddSubjectDialog({ onCreate }) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState("math");
  const [grade, setGrade] = useState("7th");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("violet");
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    setLoading(true);
    let subjectData;

    if (type === "math") {
      subjectData = {
        name: `${grade} Grade Math`,
        subject_type: "math",
        grade_level: grade,
        description: `${grade} grade mathematics curriculum`,
        color,
      };
    } else {
      // Generate topics with AI
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `You are creating a study curriculum for the subject "${name}".
Description: ${description || "General " + name}
Grade level context: ${grade}

Generate 6-8 topics for this subject, each with 4-6 subtopics. These should cover the core areas of the subject at an appropriate difficulty level.

Return JSON:
{
  "topics": [
    { "id": "slug_id", "name": "Topic Name", "subtopics": ["subtopic1", "subtopic2", ...] }
  ]
}`,
        response_json_schema: {
          type: "object",
          properties: {
            topics: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  id: { type: "string" },
                  name: { type: "string" },
                  subtopics: { type: "array", items: { type: "string" } }
                }
              }
            }
          }
        }
      });

      subjectData = {
        name,
        subject_type: "custom",
        grade_level: grade,
        description: description || `Custom subject: ${name}`,
        color,
        topics: response.topics || [],
      };
    }

    await onCreate(subjectData);
    setOpen(false);
    setName("");
    setDescription("");
    setType("math");
    setGrade("7th");
    setColor("violet");
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="w-4 h-4" /> Add Subject
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add a New Subject</DialogTitle>
        </DialogHeader>

        {/* Type selector */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <button
            onClick={() => setType("math")}
            className={`p-4 rounded-xl border-2 text-left transition-all ${
              type === "math" ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"
            }`}
          >
            <Calculator className="w-5 h-5 mb-2 text-primary" />
            <p className="font-medium text-sm text-foreground">Math by Grade</p>
            <p className="text-xs text-muted-foreground">Uses built-in syllabus</p>
          </button>
          <button
            onClick={() => setType("custom")}
            className={`p-4 rounded-xl border-2 text-left transition-all ${
              type === "custom" ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"
            }`}
          >
            <FlaskConical className="w-5 h-5 mb-2 text-primary" />
            <p className="font-medium text-sm text-foreground">Custom Subject</p>
            <p className="text-xs text-muted-foreground">Physics, Chemistry, etc.</p>
          </button>
        </div>

        <div className="space-y-4">
          {type === "math" ? (
            <div>
              <Label className="mb-1.5 block">Grade Level</Label>
              <Select value={grade} onValueChange={setGrade}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {GRADES.map(g => <SelectItem key={g} value={g}>{g === "adaptive" ? "Adaptive (all grades)" : `${g} Grade`}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <>
              <div>
                <Label className="mb-1.5 block">Subject Name</Label>
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Physics, Chemistry, Biology" />
              </div>
              <div>
                <Label className="mb-1.5 block">Description (optional)</Label>
                <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="What should this subject cover?" className="h-20" />
              </div>
              <div>
                <Label className="mb-1.5 block">Approximate Level</Label>
                <Select value={grade} onValueChange={setGrade}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {GRADES.map(g => <SelectItem key={g} value={g}>{g === "adaptive" ? "Adaptive" : `${g} Grade`}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          <div>
            <Label className="mb-1.5 block">Color</Label>
            <div className="flex gap-2 flex-wrap">
              {COLORS.map(c => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={`w-8 h-8 rounded-lg ${COLOR_SWATCHES[c]} border-2 transition-all ${color === c ? "border-primary scale-110" : "border-transparent"}`}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleCreate} disabled={loading || (type === "custom" && !name.trim())}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
            {type === "custom" ? "Create & Generate Topics" : "Add Subject"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}