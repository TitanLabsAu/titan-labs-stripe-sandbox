import { Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowUpRight, Brain, Dumbbell, Flame, HeartPulse, Layers3, Sparkles, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PROTOCOL_STACK_GOALS, protocolGoal, publishedProtocolEntry } from "@/lib/research-protocol-stacks";
import type { ResearchEntry } from "@/lib/research";

const goalIcons = [Flame, Dumbbell, Target, Brain, Sparkles, HeartPulse];

export function ResearchProtocolStacks({ entries, goalId }: { entries: ResearchEntry[]; goalId: string }) {
  const selected = protocolGoal(goalId);
  return (
    <div className="mx-auto max-w-6xl">
      <header className="max-w-3xl border-l-2 border-primary pl-5">
        <p className="technical-label text-primary">Research Lab / Topic groupings</p>
        <h1 className="mt-2 font-display text-4xl font-bold uppercase leading-tight text-foreground sm:text-5xl">Protocol Stacks</h1>
        <p className="mt-3 text-base leading-7 text-muted-foreground">Topic groupings for exploring compounds, not tested combinations or treatment instructions. These lists are reference categories, not recommendations.</p>
      </header>

      <nav aria-label="Protocol Stacks goals" className="mt-7 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {PROTOCOL_STACK_GOALS.map((goal, index) => {
          const Icon = goalIcons[index] ?? Layers3;
          const active = selected.id === goal.id;
          return <Button key={goal.id} asChild variant={active ? "default" : "outline"} className="h-12 min-w-0 px-2 tracking-normal">
            <Link to="/research/protocol-stacks" search={{ goal: goal.id }} resetScroll={false} aria-current={active ? "page" : undefined}>
              <Icon aria-hidden="true" />{goal.title}
            </Link>
          </Button>;
        })}
      </nav>

      <section aria-labelledby="protocol-goal-title" className="mt-8 border-t border-border pt-6">
        <div className="flex items-center justify-between gap-4">
          <div><p className="technical-label text-muted-foreground">Selected topic</p><h2 id="protocol-goal-title" className="mt-1 font-display text-3xl font-bold uppercase text-foreground">{selected.title}</h2></div>
          <span className="shrink-0 font-mono text-xs text-muted-foreground">{selected.compounds.length} compounds</span>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {selected.compounds.map((name, index) => {
            const entry = publishedProtocolEntry(name, entries);
            const content = <><span className="font-mono text-xs text-muted-foreground">{String(index + 1).padStart(2, "0")}</span><span className="min-w-0 flex-1 font-display text-lg font-bold leading-6 text-foreground">{name}</span>{entry ? <ArrowUpRight className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" /> : <Layers3 className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />}</>;
            const cardClass = "flex min-h-20 items-center gap-4 rounded-md border border-border bg-card px-4 py-4";
            return entry ? <Link key={name} to="/research/$slug" params={{ slug: entry.slug }} aria-label={`${name} research entry`} className={`${cardClass} transition-colors hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`}>{content}</Link> : <div key={name} className={cardClass}>{content}</div>;
          })}
        </div>
      </section>

      <p className="mt-7 max-w-3xl text-sm leading-6 text-muted-foreground">Educational research reference only. Inclusion in a topic does not establish the safety or effectiveness of combining compounds. Not medical advice.</p>
      <Button asChild variant="link" className="mt-4 px-0"><Link to="/research"><ArrowLeft aria-hidden="true" />Compound Library</Link></Button>
    </div>
  );
}