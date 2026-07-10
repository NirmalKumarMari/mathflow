import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Loader2, BookText } from "lucide-react";
import { AVAILABLE_TEXTBOOKS } from "@/lib/textbooks";
import { base44 } from "@/api/base44Client";
import { languageFromCountry } from "@/lib/languageUtils";
import { useI18n } from "@/hooks/useI18n";

const GRADES = ["6th", "7th"];
const COUNTRIES = ["United States", "United Kingdom", "India", "Bangladesh", "Australia", "Canada", "Singapore", "Other"];
const COLORS = ["violet", "emerald", "blue", "amber", "rose", "teal", "indigo", "orange"];
const COLOR_SWATCHES = {
  violet: "bg-violet-100", emerald: "bg-emerald-100", blue: "bg-blue-100",
  amber: "bg-amber-100", rose: "bg-rose-100", teal: "bg-teal-100",
  indigo: "bg-indigo-100", orange: "bg-orange-100",
};

export default function AddSubjectDialog({ onCreate }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [country, setCountry] = useState("United States");
  const [grade, setGrade] = useState("7th");
  const [color, setColor] = useState("violet");
  const [textbookId, setTextbookId] = useState("none");
  const [loading, setLoading] = useState(false);
  const { t } = useI18n();

  const resetState = () => {
    setName("");
    setDescription("");
    setCountry("United States");
    setGrade("7th");
    setColor("violet");
    setTextbookId("none");
  };

  const handleCreate = async () => {
    setLoading(true);
    let textbook_url = null;
    let syllabus_url = null;
    let youtube_videos_url = null;
    let textbook_title = null;
    let topics = [];

    try {
      const textbook = AVAILABLE_TEXTBOOKS.find(t => t.id === textbookId);
      let language = languageFromCountry(country);
      if (textbook && textbook.id !== "none") {
        textbook_url = textbook.textbook_url;
        syllabus_url = textbook.syllabus_url;
        youtube_videos_url = textbook.youtube_videos_url;
        textbook_title = textbook.title;
        if (textbook.language) language = textbook.language;

        if (syllabus_url) {
          const res = await fetch(syllabus_url);
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
        textbook_title,
        syllabus_url,
        youtube_videos_url,
        language,
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
          <Plus className="w-4 h-4" /> {t("addSubject.button")}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("addSubject.title")}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="mb-1.5 block">{t("addSubject.name")}</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder={t("addSubject.namePlaceholder")} />
          </div>

          <div>
            <Label className="mb-1.5 block">{t("addSubject.description")}</Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder={t("addSubject.descriptionPlaceholder")} className="h-20" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="mb-1.5 block">{t("addSubject.country")}</Label>
              <Select value={country} onValueChange={setCountry}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {COUNTRIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-1.5 block">{t("addSubject.grade")}</Label>
              <Select value={grade} onValueChange={setGrade}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {GRADES.map(g => <SelectItem key={g} value={g}>{g === "adaptive" ? t("addSubject.adaptive") : `${g} ${t("addSubject.gradeSuffix")}`}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label className="mb-1.5 block">{t("addSubject.textbook")}</Label>
            <Select value={textbookId} onValueChange={setTextbookId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {AVAILABLE_TEXTBOOKS.map(t => (
                  <SelectItem key={t.id} value={t.id}>
                    <span className="flex items-center gap-2">
                      <BookText className="w-3.5 h-3.5 text-muted-foreground" />
                      {t.title}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1.5">
              {t("addSubject.textbookHint")}
            </p>
          </div>

          <div>
            <Label className="mb-1.5 block">{t("addSubject.color")}</Label>
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
          <Button variant="outline" onClick={() => setOpen(false)}>{t("addSubject.cancel")}</Button>
          <Button onClick={handleCreate} disabled={loading || !name.trim()}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
            {t("addSubject.create")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}