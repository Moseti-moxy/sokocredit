import os
import stripe

stripe.api_key = os.getenv("STRIPE_SECRET_KEY")


class StripeService:

    @staticmethod
    def create_payment_intent(amount: float, currency: str = "usd"):
        """Creates a Stripe PaymentIntent for card payments."""
        try:
            intent = stripe.PaymentIntent.create(
                amount=int(amount * 100),  # Convert to cents
                currency=currency,
                payment_method_types=["card"],
            )
            return {"status": "success", "client_secret": intent.client_secret, "id": intent.id}
        except Exception as e:
            return {"status": "error", "message": str(e)}