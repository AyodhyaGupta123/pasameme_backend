const Stripe = require("stripe");
// const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

async function createPaymentIntent(amount, currency = "usd") {
  return stripe.paymentIntents.create({
    amount,
    currency,
  });
}

async function confirmPaymentIntent(paymentIntentId) {
  return stripe.paymentIntents.confirm(paymentIntentId);
}

/**
 * Initiate a payout to a user's bank/card via Stripe
 * @param {Object} params - { user, amount, currency, destination }
 * @returns {Promise<Object>} Stripe payout object
 */
async function sendStripePayout({
  user,
  amount,
  currency = "usd",
  destination,
}) {
  // destination: Stripe connected account ID or external account token
  // amount: in smallest currency unit (e.g., cents)
  if (!destination) throw new Error("No Stripe destination provided");
  if (!amount || amount <= 0) throw new Error("Invalid payout amount");

  // Create a payout (for connected accounts, use transfers)
  const payout = await stripe.payouts.create({
    amount,
    currency,
    destination,
    description: `Withdrawal for user ${user._id}`,
    metadata: { userId: user._id.toString(), email: user.email },
  });
  return payout;
}

module.exports = {
  createPaymentIntent,
  confirmPaymentIntent,
  sendStripePayout,
};
