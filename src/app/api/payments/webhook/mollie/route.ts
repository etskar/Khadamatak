import { NextResponse } from "next/server";
import { handleMollieWebhook } from "@/server/finance/payment-service";

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get("content-type") ?? "";
    let paymentId = "";

    if (contentType.includes("application/json")) {
      const body = (await request.json()) as { id?: string };
      paymentId = body.id ?? "";
    } else {
      const form = await request.formData();
      paymentId = String(form.get("id") ?? "");
    }

    if (!paymentId) {
      return NextResponse.json({ error: "missing id" }, { status: 400 });
    }

    const result = await handleMollieWebhook(paymentId);
    return NextResponse.json(result);
  } catch (e) {
    console.error("[mollie-webhook]", e);
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}
