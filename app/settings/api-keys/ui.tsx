"use client";

/**
 * API key management UI — client component for interactivity.
 */

import { useState, useEffect } from "react";
import { Key, Plus, Trash2, Copy, Check } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LoadingState } from "@/components/ui/loading-state";
import { ErrorState } from "@/components/ui/error-state";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface ApiKey {
  id: string;
  keyPrefix: string;
  label: string;
  lastUsedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
}

interface NewKeyData {
  id: string;
  key: string;
  keyPrefix: string;
  label: string;
  createdAt: string;
}

export function ApiKeysUI() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [newKeyLabel, setNewKeyLabel] = useState("");
  const [newKeyData, setNewKeyData] = useState<NewKeyData | null>(null);
  const [copied, setCopied] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchKeys();
  }, []);

  async function fetchKeys() {
    try {
      setLoading(true);
      const res = await fetch("/api/keys");
      if (!res.ok) throw new Error("Failed to fetch API keys");
      const data = await res.json();
      setKeys(data.keys);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load API keys");
    } finally {
      setLoading(false);
    }
  }

  async function createKey() {
    if (!newKeyLabel.trim()) {
      toast.error("Please enter a label for the API key");
      return;
    }

    try {
      setCreating(true);
      const res = await fetch("/api/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: newKeyLabel }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create API key");
      }

      const data = await res.json();
      setNewKeyData(data);
      setNewKeyLabel("");
      fetchKeys();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create key");
    } finally {
      setCreating(false);
    }
  }

  async function deleteKey(id: string) {
    if (!confirm("Are you sure you want to revoke this API key?")) return;

    try {
      const res = await fetch(`/api/keys/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to revoke API key");
      toast.success("API key revoked");
      fetchKeys();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to revoke key");
    }
  }

  function copyKey(text: string) {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Copied to clipboard");
  }

  function formatDate(date: string | null) {
    if (!date) return "Never";
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl">
        <LoadingState message="Loading API keys..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-4xl">
        <ErrorState message={error} onRetry={fetchKeys} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Key className="size-6 text-muted-foreground" />
          <h1 className="text-2xl font-semibold text-foreground">API Keys</h1>
        </div>

        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 size-4" />
              Create Key
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create API Key</DialogTitle>
              <DialogDescription>
                Create a new API key for programmatic access to SudoMeet.
              </DialogDescription>
            </DialogHeader>

            {newKeyData ? (
              <div className="space-y-4">
                <div className="rounded-lg bg-amber-500/10 p-4 text-sm text-amber-600 dark:text-amber-400">
                  ⚠️ Make sure to copy your API key now. You won&apos;t be able to see it again!
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">API Key</label>
                  <div className="flex gap-2">
                    <Input value={newKeyData.key} readOnly className="font-mono text-xs" />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => copyKey(newKeyData.key)}
                    >
                      {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
                    </Button>
                  </div>
                </div>

                <DialogFooter>
                  <Button
                    onClick={() => {
                      setNewKeyData(null);
                      setCreateOpen(false);
                    }}
                  >
                    Done
                  </Button>
                </DialogFooter>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Label</label>
                  <Input
                    placeholder="Production server"
                    value={newKeyLabel}
                    onChange={(e) => setNewKeyLabel(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !creating) {
                        createKey();
                      }
                    }}
                  />
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setCreateOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={createKey} disabled={creating}>
                    {creating ? "Creating..." : "Create"}
                  </Button>
                </DialogFooter>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>

      {keys.length === 0 ? (
        <EmptyState
          icon={<Key className="size-12" />}
          title="No API keys"
          description="Create an API key to access the SudoMeet API programmatically."
        />
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Use these keys to authenticate API requests. Keep them secure and never share them publicly.
          </p>

          <div className="divide-y divide-border rounded-lg border border-border">
            {keys.map((key) => (
              <div key={key.id} className="flex items-center justify-between p-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{key.label}</span>
                    <code className="rounded bg-muted px-2 py-0.5 text-xs font-mono">
                      {key.keyPrefix}...
                    </code>
                  </div>
                  <div className="flex gap-4 text-xs text-muted-foreground">
                    <span>Created {formatDate(key.createdAt)}</span>
                    <span>Last used {formatDate(key.lastUsedAt)}</span>
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => deleteKey(key.id)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))}
          </div>

          <div className="rounded-lg bg-muted/50 p-4">
            <h3 className="mb-2 text-sm font-medium">Usage example</h3>
            <pre className="overflow-x-auto rounded bg-background p-3 text-xs">
              <code>{`curl -X POST https://sudomeet-v1.vercel.app/api/v1/meetings \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"title": "Team sync"}'`}</code>
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
