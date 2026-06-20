import { Loader2 } from "lucide-react";

export default function AppLoading() {
  return (
    <div className="flex h-full min-h-[50vh] flex-col items-center justify-center space-y-4 animate-in fade-in duration-500">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="text-sm text-muted-foreground">Loading...</p>
    </div>
  );
}
