import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { adminSaveContent } from "@/lib/admin.functions";
import { getSiteContent } from "@/lib/catalog.functions";
import { HOME_FIELDS } from "@/lib/homeContent";

export function AdminEdits() {
  const queryClient = useQueryClient();
  const { data } = useQuery({ queryKey: ["site-content"], queryFn: () => getSiteContent() });

  const [values, setValues] = useState<Record<string, string>>({});
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (data && !loaded) {
      const next: Record<string, string> = {};
      for (const f of HOME_FIELDS) next[f.key] = data[f.key] ?? f.fallback;
      setValues(next);
      setLoaded(true);
    }
  }, [data, loaded]);

  const save = useMutation({
    mutationFn: async () => {
      for (const f of HOME_FIELDS) {
        await adminSaveContent({ data: { key: f.key, body: values[f.key] ?? "" } });
      }
    },
    onSuccess: () => {
      toast.success("Home page updated");
      void queryClient.invalidateQueries({ queryKey: ["site-content"] });
    },
    onError: () => toast.error("Could not save your changes"),
  });

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-card/80 p-6">
        <h3 className="text-lg font-extrabold uppercase text-foreground">Home page wording</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Change any wording on your home page here. Leave a box empty to use the standard wording.
        </p>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          {HOME_FIELDS.map((f) => (
            <div key={f.key} className={f.multiline ? "sm:col-span-2" : ""}>
              <Label>{f.label}</Label>
              {f.multiline ? (
                <Textarea
                  rows={3}
                  className="mt-2"
                  value={values[f.key] ?? ""}
                  placeholder={f.fallback}
                  onChange={(e) => setValues({ ...values, [f.key]: e.target.value })}
                />
              ) : (
                <Input
                  className="mt-2"
                  value={values[f.key] ?? ""}
                  placeholder={f.fallback}
                  onChange={(e) => setValues({ ...values, [f.key]: e.target.value })}
                />
              )}
            </div>
          ))}
        </div>

        <Button
          className="mt-5 font-bold uppercase"
          disabled={save.isPending}
          onClick={() => save.mutate()}
        >
          Save home page
        </Button>
      </div>
    </div>
  );
}
