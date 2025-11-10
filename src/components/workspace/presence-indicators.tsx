"use client";

import { useEffect, useState } from "react";
import { Eye, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";

export type PresenceUser = {
  id: string;
  userName: string;
  userEmail: string | null;
  status: "viewing" | "editing";
  sectionId: string | null;
  lastSeenAt: string;
};

type PresenceIndicatorsProps = {
  proposalId: string;
  currentSectionId?: string | null;
  className?: string;
};

export function PresenceIndicators({
  proposalId,
  currentSectionId,
  className,
}: PresenceIndicatorsProps) {
  const [presenceUsers, setPresenceUsers] = useState<PresenceUser[]>([]);

  // Poll for presence updates every 3 seconds
  useEffect(() => {
    const fetchPresence = async () => {
      try {
        const response = await fetch(`/api/proposals/${proposalId}/presence`);
        if (response.ok) {
          const data = await response.json() as { users: PresenceUser[] };
          setPresenceUsers(data.users);
        }
      } catch (error) {
        console.error("[presence] Error fetching presence:", error);
      }
    };

    fetchPresence();
    const interval = setInterval(fetchPresence, 3000);

    return () => clearInterval(interval);
  }, [proposalId]);

  // Update own presence
  useEffect(() => {
    const updatePresence = async () => {
      try {
        await fetch(`/api/proposals/${proposalId}/presence`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: "viewing",
            sectionId: currentSectionId,
          }),
        });
      } catch (error) {
        console.error("[presence] Error updating presence:", error);
      }
    };

    updatePresence();
    const interval = setInterval(updatePresence, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, [proposalId, currentSectionId]);

  if (presenceUsers.length === 0) {
    return null;
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <p className="text-xs font-medium text-slate-500">Active now:</p>
      <div className="flex -space-x-2">
        {presenceUsers.slice(0, 5).map((user) => (
          <div
            key={user.id}
            className="group relative"
          >
            <div
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-full border-2 border-white text-xs font-semibold",
                user.status === "editing"
                  ? "bg-green-100 text-green-700 ring-2 ring-green-500/50"
                  : "bg-blue-100 text-blue-700"
              )}
              title={`${user.userName} (${user.status})`}
            >
              {user.userName.charAt(0).toUpperCase()}
            </div>

            {/* Tooltip */}
            <div className="pointer-events-none absolute bottom-full left-1/2 mb-2 hidden -translate-x-1/2 whitespace-nowrap rounded-lg bg-slate-900 px-3 py-1.5 text-xs text-white shadow-lg group-hover:block">
              <div className="flex items-center gap-1.5">
                {user.status === "editing" ? (
                  <Pencil className="h-3 w-3" />
                ) : (
                  <Eye className="h-3 w-3" />
                )}
                <span className="font-medium">{user.userName}</span>
                <span className="text-slate-300">•</span>
                <span className="text-slate-300">{user.status}</span>
              </div>
              <div className="absolute left-1/2 top-full h-0 w-0 -translate-x-1/2 border-4 border-transparent border-t-slate-900" />
            </div>
          </div>
        ))}

        {presenceUsers.length > 5 && (
          <div
            className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-slate-100 text-xs font-semibold text-slate-600"
            title={`${presenceUsers.length - 5} more`}
          >
            +{presenceUsers.length - 5}
          </div>
        )}
      </div>
    </div>
  );
}

type PresenceBadgeProps = {
  user: PresenceUser;
  size?: "sm" | "md";
};

export function PresenceBadge({ user, size = "md" }: PresenceBadgeProps) {
  const sizeClasses = size === "sm" ? "h-6 w-6 text-xs" : "h-8 w-8 text-sm";

  return (
    <div className="group relative inline-flex">
      <div
        className={cn(
          "flex items-center justify-center rounded-full border-2 border-white font-semibold",
          user.status === "editing"
            ? "bg-green-100 text-green-700 ring-2 ring-green-500/50"
            : "bg-blue-100 text-blue-700",
          sizeClasses
        )}
      >
        {user.userName.charAt(0).toUpperCase()}
      </div>

      <div className="pointer-events-none absolute bottom-full left-1/2 mb-2 hidden -translate-x-1/2 whitespace-nowrap rounded-lg bg-slate-900 px-3 py-1.5 text-xs text-white shadow-lg group-hover:block">
        <div className="flex items-center gap-1.5">
          {user.status === "editing" ? (
            <Pencil className="h-3 w-3" />
          ) : (
            <Eye className="h-3 w-3" />
          )}
          <span className="font-medium">{user.userName}</span>
        </div>
        <div className="absolute left-1/2 top-full h-0 w-0 -translate-x-1/2 border-4 border-transparent border-t-slate-900" />
      </div>
    </div>
  );
}
