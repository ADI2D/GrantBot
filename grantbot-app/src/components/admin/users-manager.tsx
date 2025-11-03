"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { AdminRole } from "@/lib/admin";

const ROLE_LABELS: Record<AdminRole, string> = {
  super_admin: "Super Admin",
  support: "Support",
  developer: "Developer",
  read_only: "Read Only",
};

const ROLE_DESCRIPTION: Record<AdminRole, string> = {
  super_admin: "Full access (manage billing, connectors, and users)",
  support: "Support workflows only",
  developer: "Engineering utilities",
  read_only: "View-only access",
};

type AdminUserRecord = {
  id: string;
  email: string | null;
  phone: string | null;
  role: AdminRole;
  createdAt: string | null;
  lastSignInAt: string | null;
  isConfirmed: boolean;
  hasMfa: boolean;
  organizations?: { id: string; name: string | null; membershipRole: string | null }[];
};

type UsersResponse = {
  users: AdminUserRecord[];
  page: number;
  perPage: number;
  total: number | null;
};

type UsersManagerProps = {
  currentUserId: string;
};

export function UsersManager({ currentUserId }: UsersManagerProps) {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const queryClient = useQueryClient();

  const { data, isLoading, isFetching, error } = useQuery<UsersResponse, Error>({
    queryKey: ["admin-users", debouncedSearch],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (debouncedSearch.trim()) {
        params.set("search", debouncedSearch.trim());
      }
      const response = await fetch(`/api/admin/users${params.toString() ? `?${params}` : ""}`, {
        cache: "no-store",
      });
      if (!response.ok) {
        throw new Error((await response.text()) || "Failed to load users");
      }
      return response.json();
    },
  });

  const users = data?.users ?? [];

  const updateRole = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: AdminRole }) => {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      if (!response.ok) {
        throw new Error((await response.text()) || "Failed to update role");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
  });

  const deleteUser = useMutation({
    mutationFn: async (userId: string) => {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        throw new Error((await response.text()) || "Failed to delete user");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
  });

  const handleSearchSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setDebouncedSearch(search);
  };

  const handleClearSearch = () => {
    setSearch("");
    setDebouncedSearch("");
  };

  const roleOptions = useMemo<AdminRole[]>(() => ["super_admin", "support", "developer", "read_only"], []);

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <form onSubmit={handleSearchSubmit} className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-1 items-center gap-3">
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by email or user metadata"
              className="max-w-md"
            />
            <Button type="submit" disabled={isFetching}>
              {isFetching ? "Searching…" : "Search"}
            </Button>
            {debouncedSearch && (
              <Button type="button" variant="ghost" onClick={handleClearSearch}>
                Clear
              </Button>
            )}
          </div>
          <div>
            <Badge tone="info">Super admins can edit roles or remove accounts.</Badge>
          </div>
        </form>
      </Card>

      <Card className="p-0">
        <table className="min-w-full text-sm">
          <thead className="bg-[color:var(--color-surface-muted)] text-xs uppercase text-muted">
            <tr>
              <th className="px-5 py-3 text-left font-semibold text-secondary">User</th>
              <th className="px-5 py-3 text-left font-semibold text-secondary">Role</th>
              <th className="px-5 py-3 text-left font-semibold text-secondary">Organizations</th>
              <th className="px-5 py-3 text-left font-semibold text-secondary">Status</th>
              <th className="px-5 py-3 text-left font-semibold text-secondary">Created</th>
              <th className="px-5 py-3 text-left font-semibold text-secondary">Last active</th>
              <th className="px-5 py-3 text-right font-semibold text-secondary">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[color:var(--color-border)]">
            {isLoading ? (
              <tr>
                <td colSpan={6} className="px-5 py-8 text-center text-muted">
                  Loading users…
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={6} className="px-5 py-8 text-center text-[color:var(--color-warning-red)]">
                  {error.message}
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-8 text-center text-muted">
                  No users found.
                </td>
              </tr>
            ) : (
             users.map((user) => {
               const isSelf = user.id === currentUserId;
                const organizations = user.organizations ?? [];
                return (
                  <tr key={user.id} className="hover:bg-[color:var(--color-surface-muted)]/80">
                    <td className="px-5 py-3 align-middle">
                      <div className="space-y-1">
                        <p className="font-semibold text-primary">{user.email ?? "(no email)"}</p>
                        <p className="text-xs text-muted">{user.phone ?? "No phone"}</p>
                      </div>
                    </td>
                    <td className="px-5 py-3 align-middle">
                      <select
                        className={cn(
                          "w-full rounded-[var(--radius-soft)] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-3 py-1.5 text-sm",
                          updateRole.isPending ? "opacity-70" : "",
                        )}
                        value={user.role}
                        onChange={(event) =>
                          updateRole.mutate({ userId: user.id, role: event.target.value as AdminRole })
                        }
                        disabled={updateRole.isPending || deleteUser.isPending}
                      >
                        {roleOptions.map((role) => (
                          <option key={role} value={role}>
                            {ROLE_LABELS[role]}
                          </option>
                        ))}
                      </select>
                      <p className="mt-1 text-xs text-muted/80">{ROLE_DESCRIPTION[user.role]}</p>
                    </td>
                    <td className="px-5 py-3 align-middle">
                      {organizations.length === 0 ? (
                        <p className="text-xs text-muted">No memberships</p>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {organizations.map((org) => (
                            <Badge key={`${user.id}-${org.id}`} tone="info" className="text-xs">
                              {org.name ?? org.id}
                              {org.membershipRole ? ` • ${org.membershipRole}` : ""}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-3 align-middle">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge tone={user.isConfirmed ? "success" : "warning"}>
                          {user.isConfirmed ? "Email verified" : "Pending verification"}
                        </Badge>
                        {user.hasMfa && <Badge tone="info">MFA</Badge>}
                      </div>
                    </td>
                    <td className="px-5 py-3 align-middle text-muted">{formatDate(user.createdAt)}</td>
                    <td className="px-5 py-3 align-middle text-muted">{formatDate(user.lastSignInAt)}</td>
                    <td className="px-5 py-3 align-middle text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          variant="ghost"
                          className="text-[color:var(--color-warning-red)] hover:text-[color:var(--color-warning-red)]"
                          disabled={isSelf || deleteUser.isPending}
                          onClick={() => {
                            if (isSelf) {
                              alert("You cannot delete your own account while signed in as super admin.");
                              return;
                            }
                            const confirmed = window.confirm(
                              `Delete user ${user.email ?? user.id}? This cannot be undone.`,
                            );
                            if (confirmed) {
                              deleteUser.mutate(user.id);
                            }
                          }}
                        >
                          {deleteUser.isPending ? "Deleting…" : "Delete"}
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
