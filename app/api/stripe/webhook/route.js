import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";

// Stripe webhooks are the ONLY place subscription state should be trusted from —
// never flip someone to "pro" just because the client says checkout succeeded.
// This runs with the service-role client since there's no user session on an
// incoming webhook call; identity here comes from the verified Stripe signature
// instead, not from auth.getUser().
export async function POST(request) {
  const signature = request.headers.get("stripe-signature");
  const rawBody = await request.text();

  let event;
  try {
    const stripe = getStripe();
    event = stripe.webhooks.constructEvent(rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (e) {
    return NextResponse.json({ error: `Webhook signature verification failed: ${e.message}` }, { status: 400 });
  }

  const supabase = createAdminClient();

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const userId = session.metadata?.supabase_user_id;
        if (userId && session.subscription) {
          await supabase.from("subscriptions").update({
            plan: "pro", status: "active",
            stripe_customer_id: session.customer,
            stripe_subscription_id: session.subscription,
          }).eq("user_id", userId);
          await supabase.from("profiles").update({ plan: "pro" }).eq("id", userId);
        }
        break;
      }

      case "customer.subscription.updated": {
        const sub = event.data.object;
        const userId = sub.metadata?.supabase_user_id;
        if (userId) {
          const isActive = sub.status === "active" || sub.status === "trialing";
          const willCancel = sub.cancel_at_period_end;
          await supabase.from("subscriptions").update({
            status: sub.status,
            plan: isActive ? "pro" : "free",
            current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
          }).eq("user_id", userId);
          // Only downgrade the profile immediately if the sub is no longer
          // active at all; a cancel-at-period-end keeps Pro until it lapses.
          if (!isActive && !willCancel) {
            await supabase.from("profiles").update({ plan: "free" }).eq("id", userId);
          }
        }
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object;
        const userId = sub.metadata?.supabase_user_id;
        if (userId) {
          await supabase.from("subscriptions").update({ status: "canceled", plan: "free" }).eq("user_id", userId);
          await supabase.from("profiles").update({ plan: "free" }).eq("id", userId);
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object;
        const customerId = invoice.customer;
        const { data: sub } = await supabase.from("subscriptions").select("user_id").eq("stripe_customer_id", customerId).single();
        if (sub) {
          await supabase.from("notifications").insert({
            user_id: sub.user_id, type: "progress",
            message: "Your last payment failed. Update your card in Settings to keep Pro access.",
          });
        }
        break;
      }

      default:
        // Unhandled event types are fine to ignore — Stripe sends many we don't act on.
        break;
    }
  } catch (e) {
    // Returning 500 tells Stripe to retry the webhook later.
    return NextResponse.json({ error: e.message }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
