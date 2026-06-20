import React, { useCallback } from "react";
import { CheckSquare, Square } from "lucide-react";
import { DocumentItem } from "@/lib/api/documents";

interface DocumentSelectorProps {
  documents: DocumentItem[];
  selectedIds: string[] | null; // null means "Select All"
  onChange: (newSelections: string[] | null) => void;
  title?: string;
  className?: string;
}

export function DocumentSelector({
  documents,
  selectedIds,
  onChange,
  title = "Context Documents",
  className = "",
}: DocumentSelectorProps) {
  const handleSelectAll = useCallback(() => {
    onChange(null);
  }, [onChange]);

  const handleClearAll = useCallback(() => {
    onChange([]);
  }, [onChange]);

  const handleToggleDocument = useCallback(
    (docId: string) => {
      let newSelections: string[] | null = [];
      if (selectedIds === null) {
        // If "all" were previously selected, explicitly include all EXCEPT the toggled one
        newSelections = documents.map((d) => d.id).filter((id) => id !== docId);
      } else {
        newSelections = selectedIds.includes(docId)
          ? selectedIds.filter((id) => id !== docId)
          : [...selectedIds, docId];
      }

      // If all documents are explicitly selected, revert to "null" (Select All state)
      if (newSelections.length === documents.length && documents.length > 0) {
        newSelections = null;
      }

      onChange(newSelections);
    },
    [selectedIds, documents, onChange]
  );

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="px-1 border-b border-border/50 pb-2">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            {title}
          </h4>
          <div className="flex items-center gap-2">
            <button
              onClick={handleSelectAll}
              className="text-[10px] text-emerald-400 hover:text-emerald-300 transition-colors"
            >
              Select All
            </button>
            <button
              onClick={handleClearAll}
              className="text-[10px] text-muted-foreground hover:text-foreground transition-colors"
            >
              Clear All
            </button>
          </div>
        </div>
        <div className="space-y-1 mt-2 max-h-64 overflow-y-auto pr-1">
          {documents.length === 0 ? (
            <p className="text-xs text-muted-foreground italic py-2">
              No documents available.
            </p>
          ) : (
            documents.map((doc) => {
              const isSelected = selectedIds === null || selectedIds.includes(doc.id);
              return (
                <div
                  key={doc.id}
                  onClick={() => handleToggleDocument(doc.id)}
                  className={`flex items-center gap-2 p-1.5 rounded-md cursor-pointer transition-colors ${
                    isSelected
                      ? "bg-primary/10 text-primary hover:bg-primary/20"
                      : "hover:bg-white/5 text-muted-foreground"
                  }`}
                >
                  {isSelected ? (
                    <CheckSquare className="h-4 w-4 shrink-0" />
                  ) : (
                    <Square className="h-4 w-4 shrink-0" />
                  )}
                  <div className="flex-1 min-w-0 text-sm truncate">
                    {doc.title || doc.filename}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
