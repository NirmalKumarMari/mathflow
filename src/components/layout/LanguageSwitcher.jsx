import React from "react";
import { Globe, Check, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useStudentProfile } from "@/hooks/useStudentProfile";
import { SUPPORTED_LANGUAGES } from "@/lib/translations";

export default function LanguageSwitcher() {
  const { profile, updateProfile } = useStudentProfile();
  const current = profile?.language || "English";

  const handleChange = (lang) => {
    if (profile && lang !== current) {
      updateProfile.mutate({ language: lang });
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1.5 h-9">
          <Globe className="w-4 h-4" />
          <span className="hidden sm:inline text-xs font-medium">{current}</span>
          <ChevronDown className="w-3 h-3 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[140px]">
        {SUPPORTED_LANGUAGES.map((lang) => (
          <DropdownMenuItem
            key={lang}
            onClick={() => handleChange(lang)}
            className="gap-2 text-sm"
          >
            <Check
              className={`w-3.5 h-3.5 ${current === lang ? "opacity-100" : "opacity-0"}`}
            />
            {lang}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}