import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ReconstitutionCalculator } from "@/components/ReconstitutionCalculator";
import { adminSaveContent } from "@/lib/admin.functions";
import { getSiteContent } from "@/lib/catalog.functions";

export function AdminProtocols() {
  const queryClient = useQueryClient();
  const { data } = useQuery({ queryKey: ["site-content"], queryFn: () => getSiteContent() });

  const [recon, setRecon] = useState("");
  const [dosage, setDosage] = useState("");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (data && !loaded) {
      setRecon(data["reconstitution_advice"] ?? "");
      setDosage(data["dosage_protocols"] ?? "");
      setLoaded(true);
    }
  }, [data, loaded]);

  const save = useMutation({
    mutationFn: async () => {
      await adminSaveContent({ data: { key: "reconstitution_advice", body: recon } });
      await adminSaveContent({ data: { key: "dosage_protocols", body: dosage } });
    },
    onSuccess: () => {
      toast.success("Advice saved");
      void queryClient.invalidateQueries({ queryKey: ["site-content"] });
    },
    onError: () => toast.error("Could not save the advice"),
  });

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-card/80 p-6">
        <Label>Reconstitution advice</Label>
        <Textarea
          rows={8}
          className="mt-2"
          value={recon}
          placeholder="How to mix and store your vials…"
          onChange={(e) => setRecon(e.target.value)}
        />

        <Label className="mt-6 block">Dosage protocols</Label>
        <Textarea
          rows={8}
          className="mt-2"
          value={dosage}
          placeholder="Suggested research protocols…"
          onChange={(e) => setDosage(e.target.value)}
        />

        <Button
          className="mt-4 font-bold uppercase"
          disabled={save.isPending}
          onClick={() => save.mutate()}
        >
          Save advice
        </Button>
        <p className="mt-3 text-xs text-muted-foreground">
          This text appears on the public Protocols page along with the calculator below.
        </p>
      </div>

      <ReconstitutionCalculator />
    </div>
  );
}
