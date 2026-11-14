import { decodePlayer } from "@/lib/token";

import { HumanOrAi } from "./human-or-ai";

export const metadata = { title: "¿Humano o IA? · OpenAI Event" };

export default async function PlayPage({ searchParams }: { searchParams: Promise<{ t?: string }> }) {
  const { t } = await searchParams;
  return (
    <main className="shell play">
      <span className="eyebrow center-block"><span className="dot" /> OpenAI Event</span>
      <HumanOrAi name={decodePlayer(t)} />
    </main>
  );
}
