"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function DeleteClientButton({ clientId, clientName }: { clientId: string; clientName: string }) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    const confirmed = window.confirm(
      `Are you sure you want to delete ${clientName}? This will permanently delete all associated proposals, documents, and notes. This action cannot be undone.`
    );

    if (!confirmed) return;

    setIsDeleting(true);

    try {
      const response = await fetch(`/api/freelancer/clients/${clientId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete client");
      }

      // Navigate back to clients list
      router.push("/freelancer/clients");
      router.refresh();
    } catch (error) {
      console.error("Delete failed:", error);
      alert("Failed to delete client. Please try again.");
      setIsDeleting(false);
    }
  };

  return (
    <Button
      variant="secondary"
      size="sm"
      onClick={handleDelete}
      disabled={isDeleting}
      className="text-red-600 hover:bg-red-50 hover:text-red-700"
    >
      {isDeleting ? (
        <>
          <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-red-600 border-t-transparent" />
          Deleting...
        </>
      ) : (
        <>
          <Trash2 className="mr-2 h-4 w-4" />
          Delete client
        </>
      )}
    </Button>
  );
}
