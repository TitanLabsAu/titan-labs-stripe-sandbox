import { Link } from "@tanstack/react-router";
import { ArrowRight, Layers3 } from "lucide-react";
import type { ResearchEntry } from "@/lib/research";
import { BLEND_NOTICE } from "@/lib/research";
import { TITAN_BLENDS } from "@/lib/research-discovery";

function findIngredient(entries: ResearchEntry[], ingredient: string) {
  const needle = ingredient.toLowerCase();
  return entries.find((entry) =>
    [entry.title, entry.slug, ...entry.synonyms].join(" ").toLowerCase().includes(needle),
  );
}

export function TitanBlendsView({ entries, preview = false }: { entries: ResearchEntry[]; preview?: boolean }) {
  return (
    <div>
      <div className="max-w-3xl">
        <p className="technical-label text-accent">Titan Research Lab</p>
        <h1 className="mt-2 text-3xl font-medium uppercase text-foreground sm:text-4xl">Titan Blends</h1>
        <p className="mt-3 text-base leading-7 text-muted-foreground">
          Explore the individual research ingredients found in Titan blend formulations. Ingredient research does not establish the effects of a combined formulation.
        </p>
      </div>
      <div className="mt-8 grid gap-5 lg:grid-cols-3">
        {TITAN_BLENDS.map((blend) => (
          <section key={blend.slug} className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-primary/30 bg-primary/10">
              <Layers3 className="h-5 w-5 text-primary" aria-hidden="true" />
            </div>
            <h2 className="mt-4 font-display text-2xl font-bold uppercase text-foreground">{blend.title}</h2>
            <p className="mt-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">{blend.ingredients.length} research ingredients</p>
            <div className="mt-5 space-y-2">
              {blend.ingredients.map((ingredient) => {
                const entry = findIngredient(entries, ingredient);
                return entry ? (
                  <Link
                    key={ingredient}
                    to={preview ? "/research-preview/$slug" : "/research/$slug"}
                    params={{ slug: entry.slug }}
                    className="group flex min-h-12 items-center justify-between rounded-xl border border-border bg-background px-4 py-3 text-sm font-bold text-foreground hover:border-primary"
                  >
                    {ingredient}<ArrowRight className="h-4 w-4 text-primary transition-transform group-hover:translate-x-1" />
                  </Link>
                ) : <div key={ingredient} className="rounded-xl border border-border bg-background px-4 py-3 text-sm font-bold text-foreground">{ingredient}</div>;
              })}
            </div>
          </section>
        ))}
      </div>
      <div className="mt-7 rounded-2xl border border-accent/50 bg-accent/10 p-5 text-sm leading-6 text-foreground">
        <strong>Combined formulation evidence:</strong> {BLEND_NOTICE}
      </div>
    </div>
  );
}
