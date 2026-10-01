import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { adminDeleteLink, adminListLinks, adminSaveLink } from "@/lib/admin.functions";

export function AdminLinks() {
  const queryClient = useQueryClient();
  const [label, setLabel] = useState("");
  const [url, setUrl] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-links"],
    queryFn: () => adminListLinks({}),
  });

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ["admin-links"] });
    void queryClient.invalidateQueries({ queryKey: ["site-links"] });
  };

  const save = useMutation({
    mutationFn: (input: { id?: string; label: string; url: string }) => adminSaveLink({ data: input }),
    onSuccess: () => {
      toast.success("Link saved");
      setLabel("");
      setUrl("");
      refresh();
    },
    onError: () => toast.error("Could not save the link"),
  });

  const remove = useMutation({
    mutationFn: (id: string) => adminDeleteLink({ data: { id } }),
    onSuccess: () => {
      toast.success("Link removed");
      refresh();
    },
    onError: () => toast.error("Could not remove the link"),
  });

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-primary/25 bg-card/90 p-6">
        <h3 className="text-lg font-extrabold uppercase text-foreground">Add a link</h3>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <Label>Link name</Label>
            <Input
              value={label}
              placeholder="Telegram"
              onChange={(e) => setLabel(e.target.value)}
            />
          </div>
          <div>
            <Label>Web address</Label>
            <Input value={url} placeholder="https://…" onChange={(e) => setUrl(e.target.value)} />
          </div>
        </div>
        <Button
          className="mt-4 font-bold uppercase"
          disabled={save.isPending || !label.trim() || !url.trim()}
          onClick={() => save.mutate({ label, url })}
        >
          Save link
        </Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading links…</p>
      ) : (data ?? []).length === 0 ? (
        <p className="text-sm text-muted-foreground">No links saved yet.</p>
      ) : (
        <ul className="space-y-3">
          {(data ?? []).map((l) => (
            <li
              key={l.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-primary/25 bg-card/90 p-4"
            >
              <div className="text-sm">
                <Input
                  defaultValue={l.label}
                  className="mb-2 max-w-xs font-bold"
                  onBlur={(e) => {
                    if (e.target.value.trim() && e.target.value !== l.label) {
                      save.mutate({ id: l.id, label: e.target.value, url: l.url });
                    }
                  }}
                />
                <a
                  href={l.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent underline underline-offset-4"
                >
                  {l.url}
                </a>
              </div>
              <Button
                variant="destructive"
                className="font-bold uppercase"
                onClick={() => remove.mutate(l.id)}
              >
                Remove
              </Button>
            </li>
          ))}
        </ul>
      )}
      <p className="text-xs text-muted-foreground">
        Saved links appear in the footer at the bottom of every page.
      </p>
    </div>
  );
}
