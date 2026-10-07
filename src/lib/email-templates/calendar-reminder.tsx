import * as React from "react";
import { Body, Container, Head, Heading, Html, Preview, Section, Text } from "@react-email/components";
import type { TemplateEntry } from "./registry";

type Props = { name?: string; productName?: string; doseLabel?: string; date?: string; time?: string; notes?: string };

export function CalendarReminder({ name = "there", productName = "Your entry", doseLabel = "", date = "", time = "", notes = "" }: Props) {
  return (
    <Html>
      <Head />
      <Preview>{`Calendar reminder: ${productName}`}</Preview>
      <Body style={{ backgroundColor: "#ffffff", fontFamily: "Arial, sans-serif", margin: 0 }}>
        <Container style={{ maxWidth: "560px", margin: "0 auto", padding: "32px 24px" }}>
          <Heading style={{ color: "#12447d", fontSize: "22px" }}>TITAN LABS // AUS</Heading>
          <Section style={{ backgroundColor: "#f4f7fb", borderRadius: "10px", padding: "24px" }}>
            <Heading style={{ color: "#0d1b2a", fontSize: "18px" }}>Schedule reminder</Heading>
            <Text>Hi {name},</Text>
            <Text>This is the reminder you set in your Titan Labs Aus member calendar.</Text>
            <Text><strong>{productName}</strong>{time ? ` · ${time}` : ""}</Text>
            {date ? <Text>Date: {date}</Text> : null}
            {doseLabel ? <Text>Your note: {doseLabel}</Text> : null}
            {notes ? <Text style={{ whiteSpace: "pre-wrap" }}>{notes}</Text> : null}
          </Section>
          <Text style={{ color: "#5b6b7c", fontSize: "12px" }}>
            This reminder only repeats details you entered. Titan Labs Aus products are for research use only. You can turn reminders off by editing the schedule in your calendar.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export const template = {
  component: CalendarReminder,
  subject: (d: Record<string, any>) => `Reminder: ${d["productName"] ?? "your calendar entry"}`,
  displayName: "Calendar reminder",
  previewData: { name: "Stuart", productName: "BPC-157", doseLabel: "Example note", date: "2026-10-08", time: "08:00" },
} satisfies TemplateEntry;
