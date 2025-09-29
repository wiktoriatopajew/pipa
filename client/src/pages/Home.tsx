import { useState } from "react";
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
  const [user, setUser] = useState<{ name: string; email: string } | null>(null);
  const [showPayment, setShowPayment] = useState(false);
  const [hasAccess, setHasAccess] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [vehicleInfo, setVehicleInfo] = useState<any>(null);

  // Mock login function
  const handleLogin = () => {
    console.log('Login triggered');
    setUser({ name: 'John Doe', email: 'john@example.com' });
  };

  const handleLogout = () => {
    console.log('Logout triggered');
    setUser(null);
    setHasAccess(false);
  };

  const handleStartChat = () => {
    if (!hasAccess) {
      setShowPayment(true);
    } else {
      setShowChat(true);
    }
  };

  const handlePaymentSuccess = () => {
    console.log('Payment successful!');
    setHasAccess(true);
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
        <Header user={user} onLogin={handleLogin} onLogout={handleLogout} />
        
        <div className="container mx-auto px-4 py-8">
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <ChatInterface 
                hasAccess={hasAccess}
                vehicleInfo={vehicleInfo}
                onUpgrade={() => setShowPayment(true)}
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
      <Header user={user} onLogin={handleLogin} onLogout={handleLogout} />
      
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