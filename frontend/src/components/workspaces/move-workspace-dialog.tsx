"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { workspacesApi } from "@/lib/api/workspaces";
import { documentsApi } from "@/lib/api/documents";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface MoveWorkspaceDialogProps {
  documentId: string | null;
  currentWorkspaceId?: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MoveWorkspaceDialog({ documentId, currentWorkspaceId, open, onOpenChange }: MoveWorkspaceDialogProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (open) {
      setSelectedId(currentWorkspaceId || null);
    }
  }, [open, currentWorkspaceId]);

  const { data: workspacesData, isLoading } = useQuery({
    queryKey: ["workspaces"],
    queryFn: workspacesApi.list,
    enabled: open,
  });

  const moveMutation = useMutation({
    mutationFn: async () => {
      if (!documentId) return;
      return await documentsApi.update(documentId, { workspace_id: selectedId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      queryClient.invalidateQueries({ queryKey: ["workspaces"] });
      onOpenChange(false);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!documentId) return;
    moveMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Move to Workspace</DialogTitle>
          <DialogDescription>
            Organize this document by adding it to a workspace.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Loading workspaces...</p>
            ) : (
              <div className="flex flex-col gap-2">
                <label className="flex items-center gap-2 p-2 rounded border cursor-pointer hover:bg-slate-50 transition-colors">
                  <input
                    type="radio"
                    name="workspace"
                    checked={selectedId === null}
                    onChange={() => setSelectedId(null)}
                    className="accent-indigo-600"
                  />
                  <span className="text-sm font-medium">No Workspace (Master Library)</span>
                </label>
                {workspacesData?.items.map((ws) => (
                  <label key={ws.id} className="flex items-center gap-2 p-2 rounded border cursor-pointer hover:bg-slate-50 transition-colors">
                    <input
                      type="radio"
                      name="workspace"
                      checked={selectedId === ws.id}
                      onChange={() => setSelectedId(ws.id)}
                      className="accent-indigo-600"
                    />
                    <span className="text-sm font-medium">{ws.name}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={moveMutation.isPending || selectedId === (currentWorkspaceId || null)}
            >
              {moveMutation.isPending ? "Moving..." : "Move Document"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
