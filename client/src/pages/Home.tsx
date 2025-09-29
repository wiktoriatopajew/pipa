import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import OnlineMechanics from "@/components/OnlineMechanics";
import VehicleSelector from "@/components/VehicleSelector";
import ChatInterface from "@/components/ChatInterface";
import PaymentModal from "@/components/PaymentModal";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Home() {
  const [showPayment, setShowPayment] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [vehicleInfo, setVehicleInfo] = useState<any>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Check if user is authenticated
  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ['/api/users/me'],
    retry: false, // Don't retry if not authenticated
    refetchOnWindowFocus: false,
  });

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/users/logout"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users/me'] });
      setShowChat(false);
      toast({
        title: "Wylogowano pomyślnie",
        description: "Do zobaczenia wkrótce!",
      });
    },
    onError: () => {
      toast({
        title: "Błąd wylogowania",
        variant: "destructive",
      });
    },
  });

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  // Check if user has active subscription
  const hasAccess = user?.hasSubscription || false;

  const handleStartChat = () => {
    if (!hasAccess) {
      setShowPayment(true);
    } else {
      setShowChat(true);
    }
  };

  const handlePaymentSuccess = (userData: { id: string; name: string; email: string; sessionId: string }) => {
    console.log('Payment successful!', userData);
    // Refresh user data to get updated subscription status
    queryClient.invalidateQueries({ queryKey: ['/api/users/me'] });
    setSessionId(userData.sessionId);
    setShowChat(true);
  };

  const handleVehicleSubmit = (info: any) => {
    console.log('Vehicle info submitted:', info);
    setVehicleInfo(info);
    handleStartChat();
  };

  if (showChat) {
    return (
      <div className="min-h-screen bg-background">
        <Header user={user} onLogin={() => {}} onLogout={handleLogout} />
        
        <div className="container mx-auto px-4 py-8">
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <ChatInterface 
                hasAccess={hasAccess}
                vehicleInfo={vehicleInfo}
                sessionId={sessionId || ''}
                className="h-[600px]"
              />
            </div>
            <div className="space-y-6">
              <OnlineMechanics />
              <Card>
                <CardHeader>
                  <CardTitle>Session Info</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div>Status: {hasAccess ? 'Premium Access' : 'Free Tier'}</div>
                    <div>Response Time: ~2-3 minutes</div>
                  </div>
                  <Button 
                    className="w-full mt-4" 
                    variant="outline"
                    onClick={() => setShowChat(false)}
                    data-testid="button-back-home"
                  >
                    Back to Home
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        <PaymentModal 
          open={showPayment}
          onOpenChange={setShowPayment}
          onPaymentSuccess={handlePaymentSuccess}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header user={user} onLogin={() => {}} onLogout={handleLogout} />
      
      <HeroSection 
        onStartChat={handleStartChat}
        onGetStarted={() => console.log('Get started clicked')}
      />
      
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Start Your Consultation</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Tell us about your vehicle and the issues you're experiencing. Our AI will help you get started, 
              then connect you with the right expert for detailed assistance.
            </p>
          </div>
          
          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <VehicleSelector onSubmit={handleVehicleSubmit} />
            </div>
            <div>
              <OnlineMechanics />
            </div>
          </div>
        </div>
      </section>
      
      <Footer />
      
      <PaymentModal 
        open={showPayment}
        onOpenChange={setShowPayment}
        onPaymentSuccess={handlePaymentSuccess}
      />
    </div>
  );
}