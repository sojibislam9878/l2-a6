export type PaymentOutcome = "success" | "processing" | "failed" | "cancelled" | "refunded";

type PageContent = {
  title: string;
  headline: string;
  detail: string;
  accent: string;
  tint: string;
  glyph: string;
};

const CONTENT: Record<PaymentOutcome, PageContent> = {
  success: {
    title: "Payment successful",
    headline: "Payment successful",
    detail: "Your storage lot is confirmed. The warehouse can now take your produce in.",
    accent: "#2f7d32",
    tint: "#eaf5ea",
    glyph: "&#10003;",
  },
  processing: {
    title: "Payment processing",
    headline: "Payment received",
    detail:
      "Stripe has taken the payment and we are waiting for the confirmation webhook. Refresh this page in a moment.",
    accent: "#b26a00",
    tint: "#fdf3e3",
    glyph: "&#8987;",
  },
  failed: {
    title: "Payment failed",
    headline: "Payment failed",
    detail: "The payment did not go through. Your booking is unchanged, you can try paying again.",
    accent: "#b3261e",
    tint: "#fdecea",
    glyph: "&#10005;",
  },
  cancelled: {
    title: "Payment cancelled",
    headline: "Payment cancelled",
    detail:
      "You left the checkout before paying. The booking is still held until its payment window expires.",
    accent: "#5a6b5a",
    tint: "#f0f4f0",
    glyph: "&#8592;",
  },
  refunded: {
    title: "Payment refunded",
    headline: "Payment refunded",
    detail: "This payment has been refunded. The amount will return to the original card.",
    accent: "#1b5e9c",
    tint: "#e8f1fa",
    glyph: "&#8634;",
  },
};

type Detail = {
  label: string;
  value: string;
};

export const renderPaymentPage = (outcome: PaymentOutcome, details: Detail[]): string => {
  const content = CONTENT[outcome];

  const rows = details
    .map(
      (row) =>
        `<div class="row"><span class="label">${row.label}</span><span class="value">${row.value}</span></div>`,
    )
    .join("");

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>AgroStore &mdash; ${content.title}</title>
<style>
  :root { color-scheme: light; }
  body {
    margin: 0;
    min-height: 100vh;
    display: grid;
    place-items: center;
    padding: 24px;
    background: #f4f6f4;
    color: #1b2a1b;
    font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
  }
  .card {
    width: 100%;
    max-width: 440px;
    background: #fff;
    border-radius: 14px;
    padding: 32px;
    box-shadow: 0 1px 3px rgba(0,0,0,.08), 0 8px 24px rgba(0,0,0,.04);
  }
  .glyph {
    width: 56px;
    height: 56px;
    border-radius: 50%;
    display: grid;
    place-items: center;
    font-size: 26px;
    font-weight: 700;
    background: ${content.tint};
    color: ${content.accent};
    margin-bottom: 20px;
  }
  h1 { margin: 0 0 8px; font-size: 21px; color: ${content.accent}; }
  p { margin: 0 0 24px; font-size: 14px; line-height: 1.55; color: #4a5c4a; }
  .row {
    display: flex;
    justify-content: space-between;
    gap: 16px;
    padding: 10px 0;
    border-top: 1px solid #eef2ee;
    font-size: 13px;
  }
  .label { color: #6b7c6b; }
  .value { font-weight: 600; text-align: right; word-break: break-all; }
  footer { margin-top: 24px; font-size: 12px; color: #8a9a8a; }
</style>
</head>
<body>
  <main class="card">
    <div class="glyph">${content.glyph}</div>
    <h1>${content.headline}</h1>
    <p>${content.detail}</p>
    ${rows}
    <footer>AgroStore &mdash; Agri Cold Storage Booking Platform</footer>
  </main>
</body>
</html>`;
};
