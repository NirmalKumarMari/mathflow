import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Loader2, FileText, Youtube, Globe } from "lucide-react";
import { base44 } from "@/api/base44Client";

const GRADES = ["6th", "7th", "8th", "9th", "10th", "11th", "12th", "adaptive"];
const COUNTRIES = ["United States", "United Kingdom", "India", "Bangladesh", "Australia", "Canada", "Singapore", "Other"];
const COLORS = ["violet", "emerald", "blue", "amber", "rose", "teal", "indigo", "orange"];
const COLOR_SWATCHES = {
  violet: "bg-violet-100", emerald: "bg-emerald-100", blue: "bg-blue-100",
  amber: "bg-amber-100", rose: "bg-rose-100", teal: "bg-teal-100",
  indigo: "bg-indigo-100", orange: "bg-orange-100",
};

function FileUploadButton({ label, icon: Icon, file, onFileChange, accept, id }) {
  return (
    <div>
      <Label className="mb-1.5 block">{label}</Label>
      <div className="flex items-center gap-2">
        <input
          type="file"
          accept={accept}
          onChange={e => onFileChange(e.target.files[0] || null)}
          className="hidden"
          id={id}
        />
        <label htmlFor={id} className="flex-1 cursor-pointer">
          <div className={`flex items-center gap-2 p-3 rounded-lg border-2 border-dashed transition-all ${file ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"}`}>
            <Icon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <span className="text-sm text-muted-foreground truncate">
              {file ? file.name : `Upload ${label.toLowerCase()}`}
            </span>
          </div>
        </label>
        {file && (
          <Button variant="ghost" size="icon" onClick={() => onFileChange(null)} className="flex-shrink-0">
            <Plus className="w-4 h-4 rotate-45" />
          </Button>
        )}
      </div>
    </div>
  );
}

export default function AddSubjectDialog({ onCreate }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [country, setCountry] = useState("United States");
  const [grade, setGrade] = useState("7th");
  const [color, setColor] = useState("violet");
  const [loading, setLoading] = useState(false);
  const [textbookFile, setTextbookFile] = useState(null);
  const [syllabusFile, setSyllabusFile] = useState(null);
  const [youtubeFile, setYoutubeFile] = useState(null);

  const resetState = () => {
    setName("");
    setDescription("");
    setCountry("United States");
    setGrade("7th");
    setColor("violet");
    setTextbookFile(null);
    setSyllabusFile(null);
    setYoutubeFile(null);
  };

  const handleCreate = async () => {
    setLoading(true);
    let textbook_url = null;
    let syllabus_url = null;
    let youtube_videos_url = null;
    let topics = [];

    try {
      if (textbookFile) {
        const { file_url } = await base44.integrations.Core.UploadFile({ file: textbookFile });
        textbook_url = file_url;
      }

      if (syllabusFile) {
        const { file_url } = await base44.integrations.Core.UploadFile({ file: syllabusFile });
        syllabus_url = file_url;
        const res = await fetch(file_url);
        const data = await res.json();
        const syllabusTopics = data.syllabus?.topics || data.topics || [];
        topics = syllabusTopics.map(t => ({
          id: t.id || (t.name || "").toLowerCase().replace(/\s+/g, "_"),
          name: t.name,
          subtopics: t.subtopics || [],
          description: t.description || "",
          difficulty: t.difficulty || "beginner",
          youtube_videos: t.youtube_videos || [],
        }));
      }

      if (youtubeFile) {
        const { file_url } = await base44.integrations.Core.UploadFile({ file: youtubeFile });
        youtube_videos_url = file_url;
      }

      if (topics.length === 0) {
        const response = await base44.integrations.Core.InvokeLLM({
          prompt: `Generate 6-8 topics for the subject "${name}".
Description: ${description || "General " + name}
Approximate level: ${grade}
Country: ${country}

Generate topics that cover the core areas of this subject. Each topic should have 4-6 subtopics.

Return JSON:
{
  "topics": [
    { "id": "slug_id", "name": "Topic Name", "subtopics": ["subtopic1", "subtopic2"] }
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
        topics = response.topics || [];
      }

      await onCreate({
        name,
        subject_type: "custom",
        grade_level: grade,
        description: description || `Custom subject: ${name}`,
        color,
        country,
        topics,
        textbook_url,
        textbook_title: textbookFile?.name || null,
        syllabus_url,
        youtube_videos_url,
        placement_completed: false,
      });

      setOpen(false);
      resetState();
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetState(); }}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="w-4 h-4" /> Add Subject
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add a New Subject</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="mb-1.5 block">Subject Name</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Physics, Chemistry, Biology" />
          </div>

          <div>
            <Label className="mb-1.5 block">Description (optional)</Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="What should this subject cover?" className="h-20" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="mb-1.5 block">Country / Syllabus</Label>
              <Select value={country} onValueChange={setCountry}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {COUNTRIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-1.5 block">Grade Level</Label>
              <Select value={grade} onValueChange={setGrade}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {GRADES.map(g => <SelectItem key={g} value={g}>{g === "adaptive" ? "Adaptive" : `${g} Grade`}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <FileUploadButton
            label="Textbook PDF"
            icon={FileText}
            file={textbookFile}
            onFileChange={setTextbookFile}
            accept=".pdf"
            id="textbook-upload"
          />

          <FileUploadButton
            label="Syllabus JSON"
            icon={Globe}
            file={syllabusFile}
            onFileChange={setSyllabusFile}
            accept=".json"
            id="syllabus-upload"
          />

          <FileUploadButton
            label="YouTube Videos JSON"
            icon={Youtube}
            file={youtubeFile}
            onFileChange={setYoutubeFile}
            accept=".json"
            id="youtube-upload"
          />

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
          <Button onClick={handleCreate} disabled={loading || !name.trim()}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
            Create Subject
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}