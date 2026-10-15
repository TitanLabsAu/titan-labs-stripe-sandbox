import * as React from "react";
import { Body, Button, Container, Head, Heading, Html, Img, Preview, Section, Text } from "@react-email/components";
import type { TemplateEntry } from "./registry";
import { CLUB_WELCOME_ORIGIN, clubWelcomeCopy, clubWelcomeSubject, parseClubSnapshot, type ClubWelcomeData } from "../titan-club-welcome";

const BLUE = "#1257b8";
const BLUE_DEEP = "#0b3f8a";
const INK = "#0b0f14";
const CHARCOAL = "#1a2029";
/** Resized copy of the site logo asset, served from the public site (stable, unsigned). */
export const CLUB_EMAIL_LOGO = `${CLUB_WELCOME_ORIGIN}/images/email/titan-labs-logo-320.png`;
const li = { fontSize: "14px", lineHeight: "22px", margin: "0 0 10px", color: CHARCOAL, paddingLeft: "14px", borderLeft: `3px solid ${BLUE}` };

export function TitanClubWelcome({ firstName = "", club, demo }: Partial<ClubWelcomeData>) {
  const c = parseClubSnapshot(club);
  const copy = c ? clubWelcomeCopy(c) : null;
  return (
    <Html lang="en">
      <Head />
      <Preview>You're now a member of The Titan Club{copy ? ` — ${copy.benefitHeadline}` : ""}</Preview>
      <Body style={{ backgroundColor: "#eef1f5", padding: "16px 0", fontFamily: "Arial, Helvetica, sans-serif", margin: 0, color: INK }}>
        <Container style={{ maxWidth: "600px", width: "100%", margin: "0 auto", backgroundColor: "#ffffff", borderRadius: "14px", overflow: "hidden" }}>
          {demo ? <Text style={{ backgroundColor: "#fff4cc", color: "#5c4700", fontSize: "12px", padding: "8px 12px", margin: 0 }}>DEMO PREVIEW — sample member, not real data.</Text> : null}
          <Section style={{ backgroundColor: INK, padding: "28px 24px 24px", textAlign: "center", borderBottom: `4px solid ${BLUE}` }}>
            <Img src={CLUB_EMAIL_LOGO} width="140" height="140" alt="Titan Labs Australia logo" style={{ display: "block", margin: "0 auto", width: "140px", height: "140px", borderRadius: "12px", border: `2px solid ${BLUE}` }} />
            <Text style={{ color: "#ffffff", fontSize: "13px", fontWeight: 700, letterSpacing: "4px", margin: "14px 0 0" }}>TITAN LABS AUS</Text>
          </Section>
          <Section style={{ padding: "30px 24px 8px", textAlign: "center" }}>
            <Text style={{ display: "inline-block", backgroundColor: INK, color: "#ffffff", fontSize: "12px", fontWeight: 800, letterSpacing: "2.5px", padding: "9px 18px", borderRadius: "999px", border: `2px solid ${BLUE}`, margin: "0 0 16px" }}>♛ THE TITAN CLUB · MEMBER</Text>
            <Heading style={{ fontSize: "28px", lineHeight: "34px", color: INK, margin: "0 0 10px" }}>Congratulations{firstName ? `, ${firstName}` : ""}!</Heading>
            <Text style={{ fontSize: "15px", lineHeight: "23px", color: CHARCOAL, margin: 0 }}>You've been welcomed into The Titan Club. Your member benefit is now active on your account.</Text>
          </Section>
          {copy ? (
            <>
              <Section style={{ padding: "16px 24px" }}>
                <Section style={{ backgroundColor: BLUE, backgroundImage: `linear-gradient(135deg, ${BLUE} 0%, ${BLUE_DEEP} 100%)`, borderRadius: "14px", padding: "24px", borderTop: `4px solid ${INK}` }}>
                  <Text style={{ color: "#cfe0fa", fontSize: "12px", letterSpacing: "2.5px", fontWeight: 700, margin: 0 }}>YOUR CLUB BENEFIT</Text>
                  <Text style={{ color: "#ffffff", fontSize: "28px", lineHeight: "33px", fontWeight: 800, margin: "8px 0 10px" }}>{copy.benefitHeadline}</Text>
                  <Text style={{ color: "#ffffff", fontSize: "14px", lineHeight: "21px", margin: 0 }}>{copy.benefit}</Text>
                  {copy.shipping ? <Text style={{ color: INK, backgroundColor: "#ffffff", fontSize: "14px", fontWeight: 700, borderRadius: "8px", padding: "10px 12px", margin: "14px 0 0" }}>+ {copy.shipping}</Text> : null}
                </Section>
              </Section>
              <Section style={{ padding: "8px 24px 0" }}>
                <Heading as="h2" style={{ fontSize: "18px", color: INK, margin: "0 0 12px" }}>How your benefit works</Heading>
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
          <Section style={{ backgroundColor: INK, padding: "20px 24px 24px", textAlign: "center", borderTop: `4px solid ${BLUE}` }}>
          <Text style={{ color: "#ffffff", fontSize: "12px", fontWeight: 700, letterSpacing: "3px", margin: "0 0 8px" }}>TITAN LABS AUS</Text>
          <Text style={{ color: "#aab6c6", fontSize: "12px", lineHeight: "18px", margin: 0 }}>
            Titan Labs Aus products are for research use only. You received this email because your Titan Labs Aus account was added to The Titan Club.
          </Text>
          </Section>
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
