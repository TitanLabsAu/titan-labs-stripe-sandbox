import { Link } from "@tanstack/react-router";
import { ArrowRight, ArrowUpRight, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import laboratoryPhoto from "@/assets/testing-transparency-laboratory.png.asset.json";

const certificatePoints = [
  "Review the report for your product and batch",
  "Check certificate details at the source",
  "Titan Labs // Aus - Member of The Peptide Society",
];

export function TestingTransparencySection() {
  return (
    <section
      aria-labelledby="homepage-testing-transparency"
      className="relative mx-auto max-w-6xl px-4 pb-20"
    >
      <div className="grid min-w-0 items-center gap-8 lg:grid-cols-2 lg:gap-10">
        <figure className="relative min-w-0 overflow-hidden rounded-lg border border-primary/50">
          <img
            src={laboratoryPhoto.url}
            alt="Illustration of laboratory analysis equipment beside a clear sample cell, printed report and tablet displaying a document symbol."
            width={768}
            height={768}
            loading="lazy"
            className="aspect-square w-full object-cover"
          />
          <figcaption className="absolute bottom-3 left-3 rounded-sm bg-background/90 px-2 py-1 text-xs text-muted-foreground">
            Illustrative image
          </figcaption>
        </figure>
        <div className="min-w-0">
          <p className="mb-4 flex items-center gap-3 font-display text-sm font-bold tracking-normal text-accent">
            <span aria-hidden="true" className="h-px w-8 shrink-0 bg-accent" />
            TESTING TRANSPARENCY
            <span aria-hidden="true" className="h-px w-8 shrink-0 bg-accent" />
          </p>
          <h2
            id="homepage-testing-transparency"
            className="font-display text-4xl font-black uppercase leading-none tracking-normal text-foreground sm:text-5xl"
          >
            Confidence starts with the certificate.
          </h2>
          <p className="mt-5 text-base leading-7 text-muted-foreground sm:text-lg">
            Explore the available Certificates of Analysis for Titan Labs products. For reports issued by Peptide Test Canada, use the code printed on your certificate to check it directly with the laboratory.
          </p>
          <ul className="my-6 space-y-4">
            {certificatePoints.map((point) => (
              <li key={point} className="flex items-center gap-4 text-base leading-6 text-foreground">
                <FileText aria-hidden="true" className="h-8 w-8 shrink-0 text-primary" strokeWidth={1.5} />
                <span className="min-w-0">{point}</span>
              </li>
            ))}
          </ul>
          <div className="grid min-w-0 gap-3 sm:grid-cols-2">
            <Button
              asChild
              size="lg"
              className="h-14 min-w-0 rounded-lg border-primary bg-primary px-4 text-lg tracking-normal text-primary-foreground hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-offset-4"
            >
              <Link to="/range">
                Browse Catalogue <ArrowRight aria-hidden="true" />
              </Link>
            </Button>
            <div className="min-w-0">
              <Button
                asChild
                variant="outline"
                size="lg"
                className="h-14 w-full min-w-0 rounded-lg border-2 border-primary bg-background px-4 text-lg tracking-normal text-foreground focus-visible:ring-2 focus-visible:ring-offset-4"
              >
                <a
                  href="https://peptidetestcanada.ca/verify"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-describedby="coa-external-destination"
                >
                  Verify COA <ArrowUpRight aria-hidden="true" />
                </a>
              </Button>
              <p id="coa-external-destination" className="mt-2 text-center text-xs text-muted-foreground">
                Opens Peptide Test Canada
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}