import { Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowUpRight, Brain, Dumbbell, Flame, HeartPulse, Layers3, Sparkles, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RichText } from "@/components/RichText";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { PROTOCOL_REFERENCE_FIELDS, PROTOCOL_STACK_GOALS, PROTOCOL_TOPIC_OVERVIEWS, protocolGoal, protocolResearchOverview, publishedProtocolEntry } from "@/lib/research-protocol-stacks";
import type { ResearchEntry } from "@/lib/research";

const goalIcons = [Flame, Dumbbell, Target, Brain, Sparkles, HeartPulse];

export function ResearchProtocolStacks({ entries, goalId }: { entries: ResearchEntry[]; goalId: string }) {
  const selected = protocolGoal(goalId);
  return (
    <div className="protocol-stacks-layout mx-auto max-w-6xl">
      <header className="max-w-3xl">
        <p className="technical-label text-primary">Research Lab / Topic groupings</p>
        <h1 className="mt-2 font-display text-3xl font-bold uppercase leading-tight text-foreground sm:text-4xl">Protocol Stacks</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">Topic groupings for exploring compounds, not tested combinations or treatment instructions. These lists are reference categories, not recommendations.</p>
      </header>

      <nav aria-label="Protocol Stacks goals" className="mt-7 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {PROTOCOL_STACK_GOALS.map((goal, index) => {
          const Icon = goalIcons[index] ?? Layers3;
          const active = selected.id === goal.id;
          return <Button key={goal.id} asChild variant="outline" className={`h-20 min-w-0 flex-col gap-2 rounded-xl px-2 tracking-normal bg-protocol-surface ${active ? "border-primary text-primary" : "border-border text-muted-foreground"}`}>
            <Link to="/research/protocol-stacks" search={{ goal: goal.id }} resetScroll={false} aria-current={active ? "page" : undefined}>
              <Icon aria-hidden="true" />{goal.title}
            </Link>
          </Button>;
        })}
      </nav>

      <section aria-labelledby="protocol-goal-title" className="mt-6">
        <div className="protocol-overview rounded-2xl border border-border p-5 sm:p-7">
          <div className="grid items-center gap-6 lg:grid-cols-[1fr_auto]">
            <div>
              <p className="technical-label text-primary">Stack overview</p>
              <h2 id="protocol-goal-title" className="mt-1 font-display text-4xl font-bold uppercase leading-tight text-foreground sm:text-5xl">{selected.title}</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{PROTOCOL_TOPIC_OVERVIEWS[selected.id]}</p>
            </div>
            <dl className="grid grid-cols-3 gap-2 lg:w-72">
              {[["Compounds", selected.compounds.length], ["Timeline", PROTOCOL_REFERENCE_FIELDS.timeline ?? "—"], ["Level", PROTOCOL_REFERENCE_FIELDS.level ?? "—"]].map(([label, value]) => <div key={label} className="rounded-lg border border-border px-3 py-4 text-center">
                <dt className="font-mono text-[10px] uppercase text-muted-foreground">{label}</dt>
                <dd className="mt-2 font-display text-2xl font-bold text-primary">{value}</dd>
              </div>)}
            </dl>
          </div>
          <p className="mt-5 border-t border-border pt-3 text-xs leading-5 text-muted-foreground">Protocol fields are not supplied in this draft. Individual-compound summaries do not establish the effects of a combination.</p>
        </div>
        <div className="mt-5 grid items-start gap-3 md:grid-cols-2 xl:grid-cols-4">
          {selected.compounds.map((name, index) => {
            const entry = publishedProtocolEntry(name, entries);
            const overview = protocolResearchOverview(entry);
            return <article key={`${selected.id}-${name}`} aria-labelledby={`protocol-compound-${index}`} className="flex h-full min-w-0 flex-col rounded-xl border border-border bg-protocol-surface p-4">
              <header className="flex items-start justify-between gap-2">
                <h3 id={`protocol-compound-${index}`} className="min-w-0 break-words font-display text-xl font-bold leading-6 text-foreground">{name}</h3>
                <span className="shrink-0 rounded border border-primary px-1.5 py-1 font-mono text-[9px] uppercase leading-none text-primary">Reference</span>
              </header>
              <p className="mt-3 text-xs leading-5 text-muted-foreground">{entry ? entry.category || "Research category not available." : "Published research not available."}</p>
              <dl className="mt-4 grid grid-cols-2 rounded-lg border border-border bg-protocol-inset px-3 py-3">
                {[["Dose", PROTOCOL_REFERENCE_FIELDS.dose], ["Timing", PROTOCOL_REFERENCE_FIELDS.timing]].map(([label, value]) => <div key={label}><dt className="font-mono text-[10px] uppercase text-muted-foreground">{label}</dt><dd className="mt-1 text-sm text-foreground">{value ?? "—"}</dd></div>)}
              </dl>
              <Accordion type="single" collapsible className="mt-2">
                <AccordionItem value="overview" className="border-0">
                  <AccordionTrigger className="gap-2 py-3 text-xs text-primary">Research overview</AccordionTrigger>
                  <AccordionContent className="break-words text-xs leading-6 text-muted-foreground">
                    {overview ? <RichText text={overview} /> : <p>Research overview not yet available.</p>}
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
              {entry ? <Button asChild variant="link" className="mt-auto h-auto justify-start whitespace-normal px-0 pt-2 text-left text-xs tracking-normal">
                <Link to="/research/$slug" params={{ slug: entry.slug }} aria-label={`Read ${name} compound research`}>Read compound research<ArrowUpRight className="h-4 w-4 shrink-0" aria-hidden="true" /></Link>
              </Button> : null}
            </article>;
          })}
        </div>
      </section>

      <p className="mt-7 max-w-3xl text-sm leading-6 text-muted-foreground">Educational research reference only. Inclusion in a topic does not establish the safety or effectiveness of combining compounds. Not medical advice.</p>
      <Button asChild variant="link" className="mt-4 px-0"><Link to="/research"><ArrowLeft aria-hidden="true" />Compound Library</Link></Button>
    </div>
  );
}