import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CreditCard, Shield, Clock, CheckCircle, Star, User, Key } from "lucide-react";
import { SiPaypal } from "react-icons/si";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import PayPalButton from "@/components/PayPalButton";
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';

interface PaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPaymentSuccess?: (user: { id: string; name: string; email: string; sessionId: string }) => void;
}

// Stripe Checkout Form Component - reference: blueprint:javascript_stripe
function StripeCheckoutForm({ onSuccess, email }: { onSuccess: (paymentIntentId: string) => void, email: string }) {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: window.location.origin,
        receipt_email: email,
      },
      redirect: "if_required",
    });

    setIsProcessing(false);

    if (error) {
      toast({
        title: "Payment Failed",
        description: error.message,
        variant: "destructive",
      });
    } else if (paymentIntent && paymentIntent.id) {
      toast({
        title: "Payment successful!",
        description: "Now create your account",
      });
      onSuccess(paymentIntent.id);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />
      <Button
        type="submit"
        disabled={!stripe || isProcessing}
        className="w-full"
        data-testid="button-pay"
      >
        {isProcessing ? "Processing..." : "Pay $9.99"}
      </Button>
    </form>
  );
}

export default function PaymentModal({ open, onOpenChange, onPaymentSuccess }: PaymentModalProps) {
  const [step, setStep] = useState("payment");
  const [paymentMethod, setPaymentMethod] = useState<"card" | "paypal">("card");
  const [clientSecret, setClientSecret] = useState("");
  const [email, setEmail] = useState("");
  const [stripeInstance, setStripeInstance] = useState<any>(null);
  const [paymentId, setPaymentId] = useState<string>("");

  // Initialize Stripe from global window.Stripe
  useEffect(() => {
    // Hardcode the public key temporarily to fix the issue
    const stripePublicKey = "pk_test_51NSmbFEqdkqBXQdX4uoBQAu2Y0Uk8RyulN1hXl8iJnMv3w6MVHUvy3T8usJoJNkZ6QB9AtwJtm0IgTZo5muaDFuC00Zc2YiOWp";
    
    if (stripePublicKey && (window as any).Stripe) {
      const stripe = (window as any).Stripe(stripePublicKey);
      setStripeInstance(stripe);
    }
  }, []);
  
  // Account setup fields
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  const { toast } = useToast();

  // Create user and subscription mutation with payment verification
  const createAccountMutation = useMutation({
    mutationFn: async (accountData: { username: string; email: string; password: string; paymentId: string; paymentMethod: string }) => {
      try {
        // Create user account
        const userResponse = await apiRequest("POST", "/api/users/register", {
          username: accountData.username,
          email: accountData.email,
          password: accountData.password
        });
        const user = await userResponse.json();
        
        // Verify payment and create subscription - SECURE
        const verifyPayload = accountData.paymentMethod === "stripe" 
          ? { paymentIntentId: accountData.paymentId, paymentMethod: "stripe" }
          : { paypalOrderId: accountData.paymentId, paymentMethod: "paypal" };
          
        const subscriptionResponse = await apiRequest("POST", "/api/verify-payment-and-subscribe", verifyPayload);
        await subscriptionResponse.json();
        
        // Create chat session - backend uses session.userId  
        const sessionResponse = await apiRequest("POST", "/api/chat/sessions", {
          vehicleInfo: {}
        });
        const session = await sessionResponse.json();
        
        return { user: user, sessionId: session.id };
      } catch (error) {
        console.error('Mutation error:', error);
        throw error;
      }
    },
    onSuccess: (data) => {
      toast({
        title: "Account created successfully!",
        description: "You now have 30-day access to chat with a mechanic.",
      });
      
      if (onPaymentSuccess && data) {
        onPaymentSuccess({
          id: data.user.id,
          name: data.user.username,
          email: data.user.email,
          sessionId: data.sessionId
        });
      }
      
      // Reset modal
      resetModal();
      onOpenChange(false);
    },
    onError: (error: any) => {
      console.error('Account creation error:', error);
      toast({
        title: "Account creation error",
        description: error.message || "Please try again later",
        variant: "destructive",
      });
    },
  });

  // Fetch Stripe client secret when card payment is selected and email is provided
  useEffect(() => {
    if (paymentMethod === "card" && email && step === "payment" && open) {
      apiRequest("POST", "/api/create-payment-intent", { amount: 9.99 })
        .then((res) => res.json())
        .then((data) => {
          setClientSecret(data.clientSecret);
        })
        .catch((error) => {
          console.error("Failed to create payment intent:", error);
          toast({
            title: "Error",
            description: "Failed to initialize payment. Please try again.",
            variant: "destructive",
          });
        });
    }
  }, [paymentMethod, email, step, open]);

  const handleStripeSuccess = (paymentIntentId: string) => {
    setPaymentId(paymentIntentId);
    setStep("account");
  };

  const handlePayPalSuccess = (data: any) => {
    console.log("PayPal payment successful:", data);
    
    // Extract order ID from PayPal response
    const orderId = data?.id || data?.orderID || "";
    setPaymentId(orderId);
    
    toast({
      title: "Payment successful!",
      description: "Now create your account",
    });
    
    setStep("account");
  };

  const handlePayPalError = (error: any) => {
    console.error("PayPal payment error:", error);
    
    toast({
      title: "Payment failed",
      description: "Please try again or use a different payment method",
      variant: "destructive",
    });
  };

  const handleAccountSetup = () => {
    if (!username || !password || !confirmPassword) {
      toast({
        title: "Fill all fields",
        description: "All fields are required",
        variant: "destructive",
      });
      return;
    }

    if (password !== confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: "Check password accuracy",
        variant: "destructive",
      });
      return;
    }

    if (password.length < 6) {
      toast({
        title: "Password too short",
        description: "Password must be at least 6 characters",
        variant: "destructive",
      });
      return;
    }

    if (!paymentId) {
      toast({
        title: "Payment error",
        description: "Payment ID not found. Please try again.",
        variant: "destructive",
      });
      return;
    }

    createAccountMutation.mutate({
      username,
      email,
      password,
      paymentId,
      paymentMethod
    });
  };

  const resetModal = () => {
    setStep("payment");
    setPaymentMethod("card");
    setClientSecret("");
    setEmail("");
    setUsername("");
    setPassword("");
    setConfirmPassword("");
    setPaymentId("");
  };

  return (
    <Dialog open={open} onOpenChange={(open) => {
      if (!open) resetModal();
      onOpenChange(open);
    }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-warning flex items-center justify-center">
              {step === "payment" ? (
                <CreditCard className="w-4 h-4 text-primary-foreground" />
              ) : (
                <User className="w-4 h-4 text-primary-foreground" />
              )}
            </div>
            <span>
              {step === "payment" ? "Upgrade to Expert Chat" : "Create your account"}
            </span>
          </DialogTitle>
          <DialogDescription>
            {step === "payment" 
              ? "Get unlimited access to professional mechanics for just $9.99"
              : "Last step - create login and password for your account"
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Benefits - pokazuj tylko w kroku płatności */}
          {step === "payment" && (
            <Card className="bg-gradient-to-r from-primary/10 to-warning/10 border-primary/20">
              <CardContent className="p-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold">$9.99</span>
                    <Badge className="bg-success/20 text-success border-success/30">
                      <Star className="w-3 h-3 mr-1" />
                      30 days access
                    </Badge>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="w-4 h-4 text-success" />
                      <span>Direct chat with mechanic</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="w-4 h-4 text-success" />
                      <span>Unlimited questions</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="w-4 h-4 text-success" />
                      <span>24/7 availability</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="w-4 h-4 text-success" />
                      <span>All vehicle types</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Payment Form */}
          {step === "payment" && (
            <div className="space-y-4">
              {/* Payment Method Selector */}
              <div className="space-y-3">
                <Label>Select Payment Method</Label>
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    type="button"
                    variant={paymentMethod === "card" ? "default" : "outline"}
                    className="flex items-center justify-center space-x-2"
                    onClick={() => setPaymentMethod("card")}
                    data-testid="button-select-card"
                  >
                    <CreditCard className="w-4 h-4" />
                    <span>Credit Card</span>
                  </Button>
                  <Button
                    type="button"
                    variant={paymentMethod === "paypal" ? "default" : "outline"}
                    className="flex items-center justify-center space-x-2"
                    onClick={() => setPaymentMethod("paypal")}
                    data-testid="button-select-paypal"
                  >
                    <SiPaypal className="w-4 h-4" />
                    <span>PayPal</span>
                  </Button>
                </div>
              </div>

              <div>
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  data-testid="input-email"
                />
              </div>
              
              {/* Stripe Credit Card Form */}
              {paymentMethod === "card" && email && !stripeInstance && (
                <div className="p-4 border rounded-lg bg-destructive/10 border-destructive/20">
                  <p className="text-sm text-destructive">
                    Stripe is not configured. Please add VITE_STRIPE_PUBLIC_KEY to your environment.
                  </p>
                </div>
              )}

              {paymentMethod === "card" && email && stripeInstance && clientSecret && (
                <Elements stripe={stripeInstance} options={{ clientSecret }}>
                  <StripeCheckoutForm onSuccess={handleStripeSuccess} email={email} />
                </Elements>
              )}

              {paymentMethod === "card" && email && stripeInstance && !clientSecret && (
                <div className="flex items-center justify-center p-4">
                  <div className="animate-spin w-6 h-6 border-4 border-primary border-t-transparent rounded-full" aria-label="Loading"/>
                </div>
              )}

              {paymentMethod === "card" && !email && (
                <p className="text-sm text-muted-foreground">Please enter your email address first</p>
              )}

              {/* PayPal Form */}
              {paymentMethod === "paypal" && email && (
                <div className="space-y-3">
                  <div className="p-4 border rounded-lg bg-muted/30">
                    <p className="text-sm text-muted-foreground mb-3">
                      Click the PayPal button below to complete your payment securely through PayPal.
                    </p>
                    <PayPalButton
                      amount="9.99"
                      currency="USD"
                      intent="CAPTURE"
                      onSuccess={handlePayPalSuccess}
                      onError={handlePayPalError}
                    />
                  </div>
                </div>
              )}

              {paymentMethod === "paypal" && !email && (
                <p className="text-sm text-muted-foreground">Please enter your email address first</p>
              )}
            </div>
          )}

          {/* Account Setup Form */}
          {step === "account" && (
            <div className="space-y-4">
              <div className="bg-success/10 border border-success/20 rounded-lg p-4">
                <div className="flex items-center space-x-2 text-success">
                  <CheckCircle className="w-4 h-4" />
                  <span className="text-sm font-medium">Payment completed successfully!</span>
                </div>
              </div>

              <div>
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  placeholder="your_username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  data-testid="input-username"
                />
              </div>
              
              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Minimum 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  data-testid="input-password"
                />
              </div>
              
              <div>
                <Label htmlFor="confirmPassword">Confirm password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Repeat password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  data-testid="input-confirm-password"
                />
              </div>

              <Button 
                onClick={handleAccountSetup}
                disabled={createAccountMutation.isPending}
                className="w-full"
                data-testid="button-create-account"
              >
                {createAccountMutation.isPending ? "Creating account..." : "Create account and start"}
              </Button>
            </div>
          )}

          {/* Security Badge */}
          <div className="flex items-center justify-center space-x-2 text-xs text-muted-foreground">
            <Shield className="w-4 h-4" />
            <span>Secure 256-bit SSL encryption</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}