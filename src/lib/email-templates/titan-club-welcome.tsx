import * as React from "react";
import { Body, Button, Container, Head, Heading, Hr, Html, Preview, Section, Text } from "@react-email/components";
import type { TemplateEntry } from "./registry";
import { CLUB_WELCOME_ORIGIN, clubWelcomeCopy, clubWelcomeSubject, parseClubSnapshot, type ClubWelcomeData } from "../titan-club-welcome";

const BLUE = "#1257b8";
const INK = "#0b0f14";
const li = { fontSize: "14px", lineHeight: "21px", margin: "0 0 8px" };

export function TitanClubWelcome({ firstName = "", club, demo }: Partial<ClubWelcomeData>) {
  const c = parseClubSnapshot(club);
  const copy = c ? clubWelcomeCopy(c) : null;
  return (
    <Html lang="en">
      <Head />
      <Preview>You're now a member of The Titan Club{copy ? ` — ${copy.benefitHeadline}` : ""}</Preview>
      <Body style={{ backgroundColor: "#ffffff", fontFamily: "Arial, Helvetica, sans-serif", margin: 0, color: INK }}>
        <Container style={{ maxWidth: "600px", width: "100%", margin: "0 auto" }}>
          {demo ? <Text style={{ backgroundColor: "#fff4cc", color: "#5c4700", fontSize: "12px", padding: "8px 12px", margin: 0 }}>DEMO PREVIEW — sample member, not real data.</Text> : null}
          <Section style={{ backgroundColor: INK, padding: "24px" }}>
            <Text style={{ color: "#ffffff", fontSize: "18px", fontWeight: 800, letterSpacing: "3px", margin: 0 }}>TITAN LABS // AUS</Text>
          </Section>
          <Section style={{ padding: "28px 24px 8px", textAlign: "center" }}>
            <Text style={{ display: "inline-block", backgroundColor: BLUE, color: "#ffffff", fontSize: "12px", fontWeight: 800, letterSpacing: "2px", padding: "8px 16px", borderRadius: "999px", margin: "0 0 16px" }}>♛ THE TITAN CLUB</Text>
            <Heading style={{ fontSize: "26px", margin: "0 0 10px" }}>Congratulations{firstName ? `, ${firstName}` : ""}!</Heading>
            <Text style={{ fontSize: "15px", lineHeight: "23px", margin: 0 }}>You've been welcomed into The Titan Club. Your member benefit is now active on your account.</Text>
          </Section>
          {copy ? (
            <>
              <Section style={{ padding: "16px 24px" }}>
                <Section style={{ backgroundColor: BLUE, borderRadius: "12px", padding: "22px" }}>
                  <Text style={{ color: "#ffffff", fontSize: "12px", letterSpacing: "2px", fontWeight: 700, margin: 0 }}>YOUR CLUB BENEFIT</Text>
                  <Text style={{ color: "#ffffff", fontSize: "26px", fontWeight: 800, margin: "6px 0" }}>{copy.benefitHeadline}</Text>
                  <Text style={{ color: "#ffffff", fontSize: "14px", lineHeight: "21px", margin: 0 }}>{copy.benefit}</Text>
                  {copy.shipping ? <Text style={{ color: "#ffffff", fontSize: "15px", fontWeight: 700, margin: "12px 0 0" }}>+ {copy.shipping}</Text> : null}
                </Section>
              </Section>
              <Section style={{ padding: "8px 24px 0" }}>
                <Heading as="h2" style={{ fontSize: "18px", margin: "0 0 10px" }}>How your benefit works</Heading>
                {copy.combos.map((t) => <Text key={t} style={li}>• {t}</Text>)}
                <Text style={li}>• {copy.cap}</Text>
                <Text style={li}>• {copy.kits}</Text>
                <Text style={li}>• {copy.terms}</Text>
              </Section>
            </>
          ) : null}
          <Section style={{ padding: "20px 24px", textAlign: "center" }}>
            <Button href={`${CLUB_WELCOME_ORIGIN}/account`} style={{ backgroundColor: BLUE, color: "#ffffff", fontWeight: 700, fontSize: "14px", padding: "12px 20px", borderRadius: "8px", margin: "0 6px 10px" }}>View your account</Button>
            <Button href={`${CLUB_WELCOME_ORIGIN}/range`} style={{ backgroundColor: "#ffffff", color: BLUE, border: `2px solid ${BLUE}`, fontWeight: 700, fontSize: "14px", padding: "10px 20px", borderRadius: "8px", margin: "0 6px 10px" }}>Browse the catalogue</Button>
          </Section>
          <Section style={{ padding: "0 24px" }}><Hr style={{ borderColor: "#d9e2ee", margin: 0 }} /></Section>
          <Text style={{ color: "#4a5868", fontSize: "12px", lineHeight: "18px", padding: "12px 24px 28px", margin: 0 }}>
            Titan Labs Aus products are for research use only. You received this email because your Titan Labs Aus account was added to The Titan Club.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export const demoClub = {
  benefit_type: "percent" as const, percent: 10, fixed_cents: null, max_cap_percent: 30,
  stack_multibuy: true, stack_crypto: true, stack_first_offer: true, stack_code: true, stack_credit: true, stack_foundation: false, free_shipping: true,
};

export const template = {
  component: TitanClubWelcome,
  subject: clubWelcomeSubject,
  displayName: "Titan Club congratulations",
  previewData: { firstName: "Alex", club: demoClub, demo: true },
} satisfies TemplateEntry;
