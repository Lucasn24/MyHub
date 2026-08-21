import { NextRequest, NextResponse } from "next/server";
import { sendMessage } from "@/lib/google/gmail";

function parseMailto(mailto: string): { to: string; subject: string; body: string } {
  const withoutScheme = mailto.replace(/^mailto:/i, "");
  const [addressPart, queryPart] = withoutScheme.split("?");
  const params = new URLSearchParams(queryPart ?? "");
  return {
    to: decodeURIComponent(addressPart),
    subject: params.get("subject") ?? "Unsubscribe",
    body: params.get("body") ?? "Please unsubscribe me from this mailing list.",
  };
}

export async function POST(request: NextRequest) {
  const { method, url, mailto } = (await request.json()) as {
    method: "one-click" | "mailto";
    url?: string;
    mailto?: string;
  };

  try {
    if (method === "one-click") {
      if (!url) throw new Error("Missing unsubscribe URL");
      // RFC 8058: a compliant mail client POSTs this exact body to unsubscribe
      // with no further user interaction — no need to open the link at all.
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": "MyHub-Unsubscribe/1.0",
        },
        body: "List-Unsubscribe=One-Click",
      });
      if (!res.ok) throw new Error(`Unsubscribe endpoint returned ${res.status}`);
    } else {
      if (!mailto) throw new Error("Missing mailto address");
      const { to, subject, body } = parseMailto(mailto);
      await sendMessage({ to, subject, body });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
