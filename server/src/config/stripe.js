import Stripe from "stripe";

// Singleton pattern - one Stripe instance for the entire app
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2023-10-16",  // Pin the API version to avoid breaking changes
});

export default stripe;

/*
WHY SINGLETON:
  Creating a new Stripe instance on every request is wasteful.
  We create one instance here and import it wherever needed.
*/