import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CreditCard, Shield, Clock, CheckCircle, Star, User, Key } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface PaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPaymentSuccess?: (user: { id: string; name: string; email: string; sessionId: string }) => void;
}

export default function PaymentModal({ open, onOpenChange, onPaymentSuccess }: PaymentModalProps) {
  const [step, setStep] = useState("payment");
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Payment form fields
  const [cardNumber, setCardNumber] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [cvv, setCvv] = useState("");
  const [email, setEmail] = useState("");
  
  // Account setup fields
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  const { toast } = useToast();

  // Create user and subscription mutation
  const createAccountMutation = useMutation({
    mutationFn: async (accountData: { username: string; email: string; password: string }) => {
      try {
        // Create user account
        const userResponse = await apiRequest("POST", "/api/users/register", accountData);
        const user = await userResponse.json();
        
        // Create subscription (30 days) - backend uses session.userId
        const subscriptionResponse = await apiRequest("POST", "/api/subscriptions", {
          amount: "9.99"
        });
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
        title: "Konto utworzone pomyślnie!",
        description: "Masz teraz 30-dniowy dostęp do czatu z mechanikiem.",
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
        title: "Błąd tworzenia konta",
        description: error.message || "Spróbuj ponownie za chwilę",
        variant: "destructive",
      });
    },
  });

  const handlePayment = async () => {
    if (!email || !cardNumber || !expiryDate || !cvv) {
      toast({
        title: "Wypełnij wszystkie pola",
        description: "Wszystkie pola są wymagane",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    
    // Simulate payment processing
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    setIsProcessing(false);
    setStep("account");
    
    toast({
      title: "Płatność udana!",
      description: "Teraz utwórz swoje konto",
    });
  };

  const handleAccountSetup = () => {
    if (!username || !password || !confirmPassword) {
      toast({
        title: "Wypełnij wszystkie pola",
        description: "Wszystkie pola są wymagane",
        variant: "destructive",
      });
      return;
    }

    if (password !== confirmPassword) {
      toast({
        title: "Hasła nie pasują",
        description: "Sprawdź poprawność hasła",
        variant: "destructive",
      });
      return;
    }

    if (password.length < 6) {
      toast({
        title: "Hasło za krótkie",
        description: "Hasło musi mieć co najmniej 6 znaków",
        variant: "destructive",
      });
      return;
    }

    createAccountMutation.mutate({
      username,
      email,
      password
    });
  };

  const resetModal = () => {
    setStep("payment");
    setCardNumber("");
    setExpiryDate("");
    setCvv("");
    setEmail("");
    setUsername("");
    setPassword("");
    setConfirmPassword("");
  };

  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = matches && matches[0] || '';
    const parts = [];
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    if (parts.length) {
      return parts.join(' ');
    } else {
      return v;
    }
  };

  const formatExpiryDate = (value: string) => {
    const v = value.replace(/\D/g, '');
    if (v.length >= 2) {
      return v.substring(0, 2) + '/' + v.substring(2, 4);
    }
    return v;
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
              {step === "payment" ? "Upgrade to Expert Chat" : "Utwórz swoje konto"}
            </span>
          </DialogTitle>
          <DialogDescription>
            {step === "payment" 
              ? "Get unlimited access to professional mechanics for just $9.99"
              : "Ostatni krok - utwórz login i hasło do swojego konta"
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
                      30 dni dostępu
                    </Badge>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="w-4 h-4 text-success" />
                      <span>Bezpośredni czat z mechanikiem</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="w-4 h-4 text-success" />
                      <span>Nielimitowane pytania</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="w-4 h-4 text-success" />
                      <span>Dostępność 24/7</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="w-4 h-4 text-success" />
                      <span>Wszystkie typy pojazdów</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Payment Form */}
          {step === "payment" && (
            <div className="space-y-4">
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
              
              <div>
                <Label htmlFor="cardNumber">Card Number</Label>
                <Input
                  id="cardNumber"
                  placeholder="1234 5678 9012 3456"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                  maxLength={19}
                  data-testid="input-card-number"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="expiryDate">Expiry Date</Label>
                  <Input
                    id="expiryDate"
                    placeholder="MM/YY"
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(formatExpiryDate(e.target.value))}
                    maxLength={5}
                    data-testid="input-expiry"
                  />
                </div>
                <div>
                  <Label htmlFor="cvv">CVV</Label>
                  <Input
                    id="cvv"
                    placeholder="123"
                    value={cvv}
                    onChange={(e) => setCvv(e.target.value.replace(/\D/g, '').substring(0, 3))}
                    maxLength={3}
                    data-testid="input-cvv"
                  />
                </div>
              </div>

              <Button 
                onClick={handlePayment}
                disabled={isProcessing}
                className="w-full"
                data-testid="button-pay"
              >
                {isProcessing ? "Processing..." : "Pay $9.99"}
              </Button>
            </div>
          )}

          {/* Account Setup Form */}
          {step === "account" && (
            <div className="space-y-4">
              <div className="bg-success/10 border border-success/20 rounded-lg p-4">
                <div className="flex items-center space-x-2 text-success">
                  <CheckCircle className="w-4 h-4" />
                  <span className="text-sm font-medium">Płatność zakończona pomyślnie!</span>
                </div>
              </div>

              <div>
                <Label htmlFor="username">Nazwa użytkownika</Label>
                <Input
                  id="username"
                  placeholder="twoja_nazwa"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  data-testid="input-username"
                />
              </div>
              
              <div>
                <Label htmlFor="password">Hasło</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Minimum 6 znaków"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  data-testid="input-password"
                />
              </div>
              
              <div>
                <Label htmlFor="confirmPassword">Potwierdź hasło</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Powtórz hasło"
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
                {createAccountMutation.isPending ? "Tworzenie konta..." : "Utwórz konto i rozpocznij"}
              </Button>
            </div>
          )}

          {/* Security Badge */}
          <div className="flex items-center justify-center space-x-2 text-xs text-muted-foreground">
            <Shield className="w-4 h-4" />
            <span>Bezpieczne szyfrowanie SSL 256-bit</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}