import * as React from "react";
import { Body, Button, Column, Container, Head, Heading, Hr, Html, Img, Link, Preview, Row, Section, Text } from "@react-email/components";
import type { TemplateEntry } from "./registry";
import { WELCOME_ORIGIN, welcomeCopy, welcomeSubject, type WelcomeEmailData, type WelcomeProductCard } from "../welcome-email";

const BLUE = "#1257b8";
const INK = "#0b0f14";

function Card({ p }: { p: WelcomeProductCard }) {
  return (
    <Link href={p.url} style={{ textDecoration: "none", display: "block", border: "1px solid #d9e2ee", borderRadius: "10px", padding: "10px", backgroundColor: "#ffffff" }}>
      <Img src={p.imageUrl} alt={p.alt} width="240" style={{ width: "100%", maxWidth: "240px", height: "auto", display: "block", margin: "0 auto", borderRadius: "6px" }} />
      <Text style={{ margin: "10px 0 2px", color: INK, fontSize: "15px", fontWeight: 700 }}>{p.name}</Text>
      {p.size ? <Text style={{ margin: 0, color: "#4a5868", fontSize: "13px" }}>{p.size}</Text> : null}
      <Text style={{ margin: "8px 0 0", color: BLUE, fontSize: "13px", fontWeight: 700 }}>View product →</Text>
    </Link>
  );
}

export function MemberWelcome({ firstName = "", referralCode = "", products = [], settings, demo }: Partial<WelcomeEmailData>) {
  const copy = settings ? welcomeCopy(settings) : { offer: null, discounts: [], referral: null };
  const rows: WelcomeProductCard[][] = [];
  for (let i = 0; i < products.length; i += 2) rows.push(products.slice(i, i + 2));
  return (
    <Html lang="en">
      <Head />
      <Preview>Your Titan Labs Aus membership is ready{copy.offer ? " — plus your first-order offer" : ""}</Preview>
      <Body style={{ backgroundColor: "#ffffff", fontFamily: "Arial, Helvetica, sans-serif", margin: 0, color: INK }}>
        <Container style={{ maxWidth: "600px", width: "100%", margin: "0 auto" }}>
          {demo ? <Text style={{ backgroundColor: "#fff4cc", color: "#5c4700", fontSize: "12px", padding: "8px 12px", margin: 0 }}>DEMO PREVIEW — sample name and code, not member data.</Text> : null}
          <Section style={{ backgroundColor: INK, padding: "24px" }}>
            <Text style={{ color: "#ffffff", fontSize: "18px", fontWeight: 800, letterSpacing: "3px", margin: 0 }}>TITAN LABS // AUS</Text>
          </Section>
          <Section style={{ padding: "28px 24px 8px" }}>
            <Heading style={{ fontSize: "24px", margin: "0 0 12px" }}>Welcome{firstName ? `, ${firstName}` : ""}.</Heading>
            <Text style={{ fontSize: "15px", lineHeight: "23px", margin: 0 }}>Your email is confirmed and your member account is ready. Here is everything you need to get started.</Text>
          </Section>
          {copy.offer ? (
            <Section style={{ padding: "16px 24px" }}>
              <Section style={{ backgroundColor: BLUE, borderRadius: "12px", padding: "22px" }}>
                <Text style={{ color: "#ffffff", fontSize: "12px", letterSpacing: "2px", fontWeight: 700, margin: 0 }}>NEW MEMBER OFFER</Text>
                <Text style={{ color: "#ffffff", fontSize: "26px", fontWeight: 800, margin: "6px 0" }}>{settings!.first_offer_percent}% off your first order</Text>
                <Text style={{ color: "#ffffff", fontSize: "14px", lineHeight: "21px", margin: "0 0 14px" }}>{copy.offer}</Text>
                <Button href={`${WELCOME_ORIGIN}/range`} style={{ backgroundColor: "#ffffff", color: BLUE, fontWeight: 700, fontSize: "14px", padding: "12px 20px", borderRadius: "8px" }}>Browse the catalogue</Button>
              </Section>
            </Section>
          ) : null}
          {products.length ? (
            <Section style={{ padding: "8px 24px" }}>
              <Heading as="h2" style={{ fontSize: "18px", margin: "8px 0 12px" }}>Hot products</Heading>
              {rows.map((r, i) => (
                <Row key={i} style={{ marginBottom: "12px" }}>
                  {r.map((p) => <Column key={p.url} style={{ width: "50%", padding: "0 6px", verticalAlign: "top" }}><Card p={p} /></Column>)}
                  {r.length === 1 ? <Column style={{ width: "50%" }} /> : null}
                </Row>
              ))}
            </Section>
          ) : null}
          {copy.referral && referralCode ? (
            <Section style={{ padding: "8px 24px" }}>
              <Section style={{ border: `2px solid ${BLUE}`, borderRadius: "12px", padding: "20px" }}>
                <Heading as="h2" style={{ fontSize: "18px", margin: "0 0 8px" }}>Your referral code</Heading>
                <Text style={{ fontFamily: "'Courier New', monospace", fontSize: "24px", fontWeight: 800, letterSpacing: "2px", color: INK, backgroundColor: "#eef3fa", padding: "10px 14px", borderRadius: "8px", margin: "0 0 12px" }}>{referralCode}</Text>
                <Text style={{ fontSize: "14px", lineHeight: "21px", margin: "0 0 10px" }}>{copy.referral}</Text>
                <Link href={`${WELCOME_ORIGIN}/referrals`} style={{ color: BLUE, fontWeight: 700, fontSize: "14px" }}>How the Referral Program works →</Link>
              </Section>
            </Section>
          ) : null}
          {copy.discounts.length ? (
            <Section style={{ padding: "16px 24px 0" }}>
              <Heading as="h2" style={{ fontSize: "18px", margin: "0 0 8px" }}>Website discounts</Heading>
              {copy.discounts.map((d) => <Text key={d} style={{ fontSize: "14px", lineHeight: "21px", margin: "0 0 6px" }}>• {d}</Text>)}
            </Section>
          ) : null}
          <Section style={{ padding: "16px 24px" }}>
            <Text style={{ fontSize: "14px", margin: 0 }}>
              <Link href={`${WELCOME_ORIGIN}/account`} style={{ color: BLUE }}>Your account</Link>{"  ·  "}
              <Link href={`${WELCOME_ORIGIN}/range`} style={{ color: BLUE }}>Catalogue</Link>{"  ·  "}
              <Link href={`${WELCOME_ORIGIN}/referrals`} style={{ color: BLUE }}>Referral Program</Link>
            </Text>
          </Section>
          <Section style={{ padding: "0 24px" }}><Hr style={{ borderColor: "#d9e2ee", margin: 0 }} /></Section>
          <Text style={{ color: "#4a5868", fontSize: "12px", lineHeight: "18px", padding: "12px 24px 28px", margin: 0 }}>
            Titan Labs Aus products are for research use only. You received this email because you created and confirmed a Titan Labs Aus account.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

const demoSettings = { program_enabled: true, reward_every_referrals: 5, reward_percent: 10, reward_expiry_days: 90, combined_cap_percent: 20, crypto_percent: 10, multibuy_tiers: [{ units: 2, percent: 10 }, { units: 3, percent: 15 }, { units: 4, percent: 20 }], first_offer_enabled: true, first_offer_percent: 10, first_offer_combine_multibuy: true, first_offer_combine_crypto: true, first_offer_combine_code: true, first_offer_combine_credit: true };

export const template = {
  component: MemberWelcome,
  subject: welcomeSubject,
  displayName: "Member welcome",
  previewData: { firstName: "DEMO", referralCode: "DEMO-CODE", products: [], settings: demoSettings, demo: true },
} satisfies TemplateEntry;
