import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const RESEND_SEGMENT_ID = "18f84f4c-b57c-4a89-9f38-0079d12bd87b";
const RESEND_TOPIC_ID = "f519c4d9-a926-4276-8537-ae3cd343aae5";
const RESEND_EVENT_NAME = "bigsignal.lead.captured";
const RATE_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT = 5;
const buckets = new Map<string, { count: number; resetAt: number }>();

function clientKey(req: NextRequest) {
  return (req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "anonymous")
    .split(",")[0]
    .trim();
}

function isRateLimited(req: NextRequest) {
  const now = Date.now();
  const key = clientKey(req);
  const current = buckets.get(key);
  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return false;
  }
  current.count += 1;
  return current.count > RATE_LIMIT;
}

function clean(value: unknown, max = 160) {
  return String(value || "").trim().slice(0, max);
}

function validEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254;
}

async function resend(path: string, init: RequestInit) {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) throw new Error("lead_capture_not_configured");
  return fetch(`https://api.resend.com${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
    cache: "no-store",
  });
}

async function queueFollowUp(email: string, source: string, landingPage: string, platform: string) {
  try {
    const response = await resend("/events/send", {
      method: "POST",
      body: JSON.stringify({
        event: RESEND_EVENT_NAME,
        email,
        payload: { source, landingPage, platform },
      }),
    });
    return response.ok;
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  const headers = { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" };
  if (isRateLimited(req)) {
    return NextResponse.json({ ok: false, error: "Too many attempts. Try again later." }, { status: 429, headers });
  }

  try {
    const body = await req.json().catch(() => ({}));
    if (clean(body?.company, 200)) {
      return NextResponse.json({ ok: true }, { status: 200, headers });
    }

    const email = clean(body?.email, 254).toLowerCase();
    const source = clean(body?.source, 120) || "direct";
    const landingPage = clean(body?.landingPage, 160) || "/video-downloader";
    const platform = clean(body?.platform, 80) || "unknown";

    if (!validEmail(email)) {
      return NextResponse.json({ ok: false, error: "Enter a valid email address." }, { status: 400, headers });
    }

    const create = await resend("/contacts", {
      method: "POST",
      body: JSON.stringify({
        email,
        unsubscribed: false,
        properties: {
          acquisition_source: source,
          landing_page: landingPage,
          platform,
        },
        segments: [{ id: RESEND_SEGMENT_ID }],
        topics: [{ id: RESEND_TOPIC_ID, subscription: "opt_in" }],
      }),
    });

    if (create.ok) {
      const automationQueued = await queueFollowUp(email, source, landingPage, platform);
      return NextResponse.json({ ok: true, automationQueued }, { status: 200, headers });
    }

    if (create.status !== 409) {
      const payload = await create.json().catch(() => null);
      throw new Error(payload?.message || `Resend returned ${create.status}`);
    }

    const identifier = encodeURIComponent(email);
    const [update, segment, topics] = await Promise.all([
      resend(`/contacts/${identifier}`, {
        method: "PATCH",
        body: JSON.stringify({
          unsubscribed: false,
          properties: {
            acquisition_source: source,
            landing_page: landingPage,
            platform,
          },
        }),
      }),
      resend(`/contacts/${identifier}/segments/${RESEND_SEGMENT_ID}`, { method: "POST" }),
      resend(`/contacts/${identifier}/topics`, {
        method: "PATCH",
        body: JSON.stringify([{ id: RESEND_TOPIC_ID, subscription: "opt_in" }]),
      }),
    ]);

    if (![update, segment, topics].every((response) => response.ok || response.status === 409)) {
      throw new Error("Unable to update this contact.");
    }

    const automationQueued = await queueFollowUp(email, source, landingPage, platform);
    return NextResponse.json({ ok: true, automationQueued }, { status: 200, headers });
  } catch (error) {
    if (error instanceof Error && error.message === "lead_capture_not_configured") {
      return NextResponse.json({ ok: false, error: "Customer capture is being connected. Please try again shortly." }, { status: 503, headers });
    }
    return NextResponse.json({ ok: false, error: "Unable to save your email right now." }, { status: 500, headers });
  }
}
