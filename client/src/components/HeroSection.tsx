import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, Wrench, Clock, Shield, Star } from "lucide-react";
import heroImage from "@assets/stock_images/mechanic_garage_work_4757d5e8.jpg";

interface HeroSectionProps {
  onStartChat?: () => void;
  onGetStarted?: () => void;
}

export default function HeroSection({ onStartChat, onGetStarted }: HeroSectionProps) {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background with gradient overlay */}
      <div className="absolute inset-0 z-0">
        <img 
          src={heroImage} 
          alt="Traditional automotive garage workshop" 
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-background/90 via-background/80 to-background/70" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
      </div>

      <div className="relative z-10 container mx-auto px-4 text-center">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Main Headline */}
          <div className="space-y-4">
            <Badge className="bg-primary/20 text-primary border-primary/30 mb-4" data-testid="badge-featured">
              <Star className="w-3 h-3 mr-1" />
              Expert Automotive Help
            </Badge>
            <h1 className="text-4xl md:text-6xl font-bold leading-tight">
              Chat With Professional
              <span className="block bg-gradient-to-r from-primary via-warning to-primary bg-clip-text text-transparent">
                Mechanics Online
              </span>
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto">
              Get instant expert advice for cars, motorcycles, boats, buses, and construction equipment. 
              Available 24/7 from certified professionals.
            </p>
          </div>

          {/* Value Proposition Cards */}
          <div className="grid md:grid-cols-3 gap-6 my-12">
            <Card className="bg-card/50 backdrop-blur border-border/50 hover-elevate">
              <CardContent className="p-6 text-center">
                <MessageCircle className="w-8 h-8 text-primary mx-auto mb-3" />
                <h3 className="font-semibold mb-2">Instant Responses</h3>
                <p className="text-sm text-muted-foreground">Real-time chat with expert mechanics</p>
              </CardContent>
            </Card>
            <Card className="bg-card/50 backdrop-blur border-border/50 hover-elevate">
              <CardContent className="p-6 text-center">
                <Wrench className="w-8 h-8 text-success mx-auto mb-3" />
                <h3 className="font-semibold mb-2">All Vehicles</h3>
                <p className="text-sm text-muted-foreground">Cars, bikes, boats, construction equipment</p>
              </CardContent>
            </Card>
            <Card className="bg-card/50 backdrop-blur border-border/50 hover-elevate">
              <CardContent className="p-6 text-center">
                <Shield className="w-8 h-8 text-warning mx-auto mb-3" />
                <h3 className="font-semibold mb-2">Certified Experts</h3>
                <p className="text-sm text-muted-foreground">Licensed professional mechanics</p>
              </CardContent>
            </Card>
          </div>

          {/* Main CTA */}
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-primary/20 to-warning/20 backdrop-blur rounded-2xl p-8 border border-primary/30">
              <div className="flex items-center justify-center space-x-2 mb-4">
                <Clock className="w-5 h-5 text-success" />
                <span className="text-success font-medium">8 mechanics online now</span>
              </div>
              <div className="space-y-4">
                <div className="text-3xl font-bold">
                  Only <span className="text-primary">$9.99</span>
                  <span className="text-lg font-normal text-muted-foreground ml-2">for unlimited chat access</span>
                </div>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button 
                    size="lg" 
                    className="bg-gradient-to-r from-primary to-warning hover:from-primary/90 hover:to-warning/90 text-primary-foreground font-semibold px-8 py-3"
                    onClick={onStartChat}
                    data-testid="button-start-chat"
                  >
                    Start Chatting Now
                  </Button>
                  <Button 
                    size="lg" 
                    variant="outline" 
                    className="backdrop-blur border-primary/30 hover:bg-primary/10"
                    onClick={onGetStarted}
                    data-testid="button-learn-more"
                  >
                    Learn More
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Trust Indicators */}
          <div className="flex items-center justify-center space-x-8 text-sm text-muted-foreground">
            <div className="flex items-center space-x-1">
              <Shield className="w-4 h-4" />
              <span>Secure Payment</span>
            </div>
            <div className="flex items-center space-x-1">
              <Clock className="w-4 h-4" />
              <span>24/7 Available</span>
            </div>
            <div className="flex items-center space-x-1">
              <Star className="w-4 h-4" />
              <span>Expert Verified</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}