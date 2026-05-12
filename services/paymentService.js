// Payment microservice logic (Stripe example)
// In a real microservices setup, this would be a separate repo/app with its own server

const Stripe = require("stripe");
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

const createPaymentIntent = async (amount, currency = "usd") => {
  return await stripe.paymentIntents.create({
    amount,
    currency,
    payment_method_types: ["card"],
  });
};

const retrievePaymentIntent = async (paymentIntentId) => {
  return await stripe.paymentIntents.retrieve(paymentIntentId);
};

module.exports = {
  createPaymentIntent,
  retrievePaymentIntent,
};
