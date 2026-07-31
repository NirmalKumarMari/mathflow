import React from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, BookText } from "lucide-react";

export default function BookModeSelector({
  books, bookId, onBookChange, selectedBook, bookTopics, bookTopicId, onBookTopicChange,
  loading, content, onLoad, t,
}) {
  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <Select value={bookId} onValueChange={onBookChange}>
            <SelectTrigger>
              <SelectValue placeholder={t("foundation.chooseBook")} />
            </SelectTrigger>
            <SelectContent>
              {books.map(b => (
                <SelectItem key={b.id} value={b.id}>
                  <span className="flex items-center gap-2">
                    <BookText className="w-3.5 h-3.5 text-muted-foreground" /> {b.title}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {bookTopicId && (
          <Button onClick={onLoad} disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            {content ? t("foundation.reload") : t("foundation.loadLesson")}
          </Button>
        )}
      </div>

      {selectedBook && (
        <Select value={bookTopicId} onValueChange={onBookTopicChange}>
          <SelectTrigger>
            <SelectValue placeholder={t("foundation.chooseTopic")} />
          </SelectTrigger>
          <SelectContent>
            {bookTopics.map(tp => (
              <SelectItem key={tp.id} value={tp.id}>{tp.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {selectedBook && (
        <div className="p-3 rounded-xl bg-primary/5 border border-primary/20 text-xs text-muted-foreground">
          {t("foundation.bookLanguageNote")} <span className="font-medium text-foreground">{selectedBook.language}</span>
        </div>
      )}
    </div>
  );
}