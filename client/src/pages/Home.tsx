import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import OnlineMechanics from "@/components/OnlineMechanics";
import VehicleSelector from "@/components/VehicleSelector";
import ChatInterface from "@/components/ChatInterface";
import ChatHistory from "@/components/ChatHistory";
import PaymentModal from "@/components/PaymentModal";
import LoginModal from "@/components/LoginModal";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Home() {
  const [showPayment, setShowPayment] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [vehicleInfo, setVehicleInfo] = useState<any>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [, navigate] = useLocation();
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
        title: "Logged out successfully",
        description: "See you soon!",
      });
    },
    onError: () => {
      toast({
        title: "Logout error",
        variant: "destructive",
      });
    },
  });

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const handleScrollToVehicleSelector = () => {
    const vehicleSection = document.getElementById('vehicle-selector-section');
    if (vehicleSection) {
      vehicleSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleLearnMore = () => {
    navigate('/faq');
  };

  const handleLogin = () => {
    setShowLogin(true);
  };

  const handleLoginSuccess = () => {
    // User is now logged in, they can continue using the app
    // The user query will automatically refresh due to React Query
    toast({
      title: "Welcome!",
      description: "You're now logged in. You can purchase chat access to start consulting with mechanics.",
    });
  };

  // Check if user has active subscription
  const hasAccess = (user as any)?.hasSubscription || false;

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

  const handleSelectSession = async (selectedSessionId: string, selectedVehicleInfo: any) => {
    console.log('Selected chat session:', selectedSessionId);
    setSessionId(selectedSessionId);
    setVehicleInfo(selectedVehicleInfo);
    setShowChat(true);
  };

  const handleStartNewChat = () => {
    setSessionId(null);
    setVehicleInfo(null);
    const vehicleSection = document.getElementById('vehicle-selector-section');
    if (vehicleSection) {
      vehicleSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  if (showChat) {
    return (
      <div className="min-h-screen bg-background">
        <Header user={user as any} onLogin={handleLogin} onLogout={handleLogout} />
        
        <div className="container mx-auto px-4 py-8">
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <ChatInterface 
                hasAccess={hasAccess}
                vehicleInfo={vehicleInfo}
                sessionId={sessionId || ''}
                userId={(user as any)?.id || ''}
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
      <Header user={user as any} onLogin={handleLogin} onLogout={handleLogout} />
      
      <HeroSection 
        onStartChat={handleScrollToVehicleSelector}
        onGetStarted={handleLearnMore}
      />
      
      {/* Chat History section for logged-in users */}
      {user && (user as any)?.id && (
        <section className="py-16 bg-background">
          <div className="container mx-auto px-4">
            <div className="grid lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2">
                <ChatHistory
                  onSelectSession={handleSelectSession}
                  onStartNewChat={handleStartNewChat}
                />
              </div>
              <div>
                <OnlineMechanics />
              </div>
            </div>
          </div>
        </section>
      )}
      
      <section id="vehicle-selector-section" className="py-16 bg-muted/30">
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
      
      <LoginModal 
        open={showLogin}
        onOpenChange={setShowLogin}
        onLoginSuccess={handleLoginSuccess}
      />
    </div>
  );
}