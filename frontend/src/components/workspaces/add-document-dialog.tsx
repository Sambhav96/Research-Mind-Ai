"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { documentsApi } from "@/lib/api/documents";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FileText, Plus, Loader2, Check } from "lucide-react";
import { toast } from "sonner";

interface AddDocumentDialogProps {
  workspaceId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddDocumentDialog({ workspaceId, open, onOpenChange }: AddDocumentDialogProps) {
  const queryClient = useQueryClient();
  const [addingId, setAddingId] = useState<string | null>(null);

  const { data: documentsData, isLoading } = useQuery({
    queryKey: ["documents", "list"],
    queryFn: documentsApi.list,
    enabled: open,
  });

  const moveMutation = useMutation({
    mutationFn: async (documentId: string) => {
      return await documentsApi.update(documentId, { workspace_id: workspaceId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      queryClient.invalidateQueries({ queryKey: ["workspaces"] });
      toast.success("Document added to workspace");
      setAddingId(null);
    },
    onError: () => {
      toast.error("Failed to add document");
      setAddingId(null);
    }
  });

  const handleAdd = (id: string) => {
    setAddingId(id);
    moveMutation.mutate(id);
  };

  // Filter documents that are NOT already in this workspace
  const availableDocs = documentsData?.items.filter(doc => doc.workspace_id !== workspaceId) || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Add Document from Library</DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto py-4 space-y-2 pr-2">
          {isLoading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : availableDocs.length === 0 ? (
            <div className="text-center p-8 text-muted-foreground">
              <p>No other documents available in the library.</p>
            </div>
          ) : (
            availableDocs.map(doc => (
              <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-3 min-w-0 pr-4">
                  <div className="h-8 w-8 rounded bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate" title={doc.title || doc.filename}>
                      {doc.title || doc.filename}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(doc.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => handleAdd(doc.id)}
                  disabled={addingId === doc.id || moveMutation.isPending}
                >
                  {addingId === doc.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-1" /> Add
                    </>
                  )}
                </Button>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
