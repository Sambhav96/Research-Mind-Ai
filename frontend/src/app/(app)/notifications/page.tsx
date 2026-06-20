"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { ActivityTimeline } from "@/components/notifications/activity-timeline";
import { fetchActivityFeed } from "@/lib/activity/feed";
import type { ActivityFilter } from "@/types/activity";

export default function NotificationsPage() {
  const [filter, setFilter] = useState<ActivityFilter>("all");

  const { data: activities = [], isLoading } = useQuery({
    queryKey: ["activity-feed"],
    queryFn: fetchActivityFeed,
    staleTime: 60_000,
  });

  const filteredCount =
    filter === "all" ? activities.length : activities.filter((a) => a.category === filter).length;

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="page-heading">Activity Feed</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Your research activity across documents, study tools, and workspaces
        </p>
      </div>

      <ActivityTimeline
        activities={activities}
        filter={filter}
        onFilterChange={setFilter}
        isLoading={isLoading}
      />

      {!isLoading && activities.length > 0 && filteredCount === 0 && (
        <EmptyState
          icon={Bell}
          title="No matching activity"
          description="Try a different filter to see more activity."
        />
      )}

      {!isLoading && activities.length === 0 && (
        <EmptyState
          icon={Bell}
          title="No activity yet"
          description="Upload documents, generate flashcards, or create workspaces to see your activity here."
        />
      )}
    </div>
  );
}
