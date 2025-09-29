import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import Footer from "@/components/Footer";
import { Link } from "wouter";
import { Car, Mail, MessageCircle, Clock, MapPin } from "lucide-react";

export default function Contact() {
  return (
    <>
      <Helmet>
        <title>Contact Us - Get Support for ChatWithMechanic.com</title>
        <meta name="description" content="Contact ChatWithMechanic.com for support, questions, or feedback. Reach our automotive experts at support@chatwithmechanic.com or use our contact form for immediate assistance." />
        <meta name="keywords" content="contact us, automotive support, mechanic help, customer service, chatwithmechanic support, technical help, billing questions" />
        
        {/* Open Graph tags */}
        <meta property="og:title" content="Contact Us - Get Support for ChatWithMechanic.com" />
        <meta property="og:description" content="Contact ChatWithMechanic.com for support, questions, or feedback. Professional automotive consultation support available." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://chatwithmechanic.com/contact" />
        
        {/* Twitter Card tags */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Contact Us - ChatWithMechanic Support" />
        <meta name="twitter:description" content="Get support for ChatWithMechanic.com. Professional automotive consultation assistance available." />
      </Helmet>

      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="border-b border-border">
          <div className="container mx-auto px-4 py-4 flex justify-between items-center">
            <Link href="/" className="flex items-center space-x-2" data-testid="link-home">
              <Car className="h-8 w-8 text-primary" />
              <span className="text-xl font-bold">ChatWithMechanic</span>
            </Link>
            <nav className="flex space-x-6">
              <Link href="/" className="hover:text-primary" data-testid="link-home-nav">Home</Link>
              <Link href="/contact" className="hover:text-primary text-primary" data-testid="link-contact">Contact</Link>
            </nav>
          </div>
        </header>

        {/* Hero Section */}
        <section className="py-20 px-4">
          <div className="container mx-auto text-center">
            <div className="flex justify-center mb-6">
              <MessageCircle className="h-16 w-16 text-primary" />
            </div>
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              Contact Our Support Team
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-4xl mx-auto">
              Need help with your automotive consultation or have questions about our service? 
              Our expert support team is here to assist you with any concerns.
            </p>
          </div>
        </section>

        {/* Contact Information */}
        <section className="py-16 px-4">
          <div className="container mx-auto">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
              <Card className="hover-elevate">
                <CardContent className="p-6 text-center">
                  <Mail className="h-12 w-12 text-primary mx-auto mb-4" />
                  <h3 className="text-xl font-semibold mb-3">Email Support</h3>
                  <p className="text-muted-foreground mb-4">
                    For general inquiries, technical support, or billing questions
                  </p>
                  <a 
                    href="mailto:support@chatwithmechanic.com" 
                    className="text-primary hover:text-primary/80 font-medium"
                    data-testid="link-email-support"
                  >
                    support@chatwithmechanic.com
                  </a>
                </CardContent>
              </Card>

              <Card className="hover-elevate">
                <CardContent className="p-6 text-center">
                  <Clock className="h-12 w-12 text-primary mx-auto mb-4" />
                  <h3 className="text-xl font-semibold mb-3">Response Time</h3>
                  <p className="text-muted-foreground mb-4">
                    We aim to respond to all inquiries within 24 hours
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Monday - Friday: Priority support<br />
                    Weekends: Standard response time
                  </p>
                </CardContent>
              </Card>

              <Card className="hover-elevate">
                <CardContent className="p-6 text-center">
                  <MapPin className="h-12 w-12 text-primary mx-auto mb-4" />
                  <h3 className="text-xl font-semibold mb-3">Service Area</h3>
                  <p className="text-muted-foreground mb-4">
                    Online automotive consultation available worldwide
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Professional advice available<br />
                    24/7 in multiple languages
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Contact Form */}
            <div className="max-w-2xl mx-auto">
              <Card>
                <CardHeader>
                  <CardTitle className="text-2xl text-center">Send us a Message</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <form className="space-y-6">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="name" className="block text-sm font-medium mb-2">
                          Full Name *
                        </label>
                        <Input 
                          id="name" 
                          placeholder="Your full name" 
                          required 
                          data-testid="input-name"
                        />
                      </div>
                      <div>
                        <label htmlFor="email" className="block text-sm font-medium mb-2">
                          Email Address *
                        </label>
                        <Input 
                          id="email" 
                          type="email" 
                          placeholder="your.email@example.com" 
                          required 
                          data-testid="input-email"
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="subject" className="block text-sm font-medium mb-2">
                        Subject *
                      </label>
                      <Input 
                        id="subject" 
                        placeholder="Brief description of your inquiry" 
                        required 
                        data-testid="input-subject"
                      />
                    </div>

                    <div>
                      <label htmlFor="message" className="block text-sm font-medium mb-2">
                        Message *
                      </label>
                      <Textarea 
                        id="message" 
                        placeholder="Please describe your question or concern in detail..." 
                        rows={6}
                        required 
                        data-testid="input-message"
                      />
                    </div>

                    <Button 
                      type="submit" 
                      size="lg" 
                      className="w-full" 
                      data-testid="button-send-message"
                    >
                      Send Message
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* FAQ Link */}
        <section className="py-16 px-4 bg-card/50">
          <div className="container mx-auto text-center">
            <h2 className="text-3xl font-bold mb-6">
              Looking for Quick Answers?
            </h2>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Check our frequently asked questions section for immediate answers to common inquiries 
              about our automotive consultation service.
            </p>
            <Link href="/faq" data-testid="link-faq">
              <Button size="lg" variant="outline" className="text-lg px-8 py-3">
                View FAQ
              </Button>
            </Link>
          </div>
        </section>

        <Footer />
      </div>
    </>
  );
}