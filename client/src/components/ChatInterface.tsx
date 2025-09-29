import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Send, Bot, User, Clock, CreditCard } from "lucide-react";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  content: string;
  sender: "user" | "bot" | "mechanic";
  timestamp: Date;
  typing?: boolean;
}

interface ChatInterfaceProps {
  hasAccess?: boolean;
  onUpgrade?: () => void;
  className?: string;
}

export default function ChatInterface({ hasAccess = false, onUpgrade, className }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initial bot greeting
  useEffect(() => {
    const initialMessage: Message = {
      id: "1",
      content: hasAccess 
        ? "Hello! I'm your automotive assistant. You now have access to chat with professional mechanics. How can I help you today?"
        : "Hi there! I'm an AI assistant that can help with basic automotive questions. For detailed diagnosis and expert advice, you'll need to upgrade to chat with our professional mechanics for just $9.99.",
      sender: "bot",
      timestamp: new Date()
    };
    setMessages([initialMessage]);
  }, [hasAccess]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!inputValue.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputValue,
      sender: "user",
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue("");
    setIsTyping(true);

    // Simulate bot thinking delay
    setTimeout(() => {
      const botResponse: Message = {
        id: (Date.now() + 1).toString(),
        content: hasAccess 
          ? "Let me connect you with one of our expert mechanics who can help with your specific issue. They'll be with you shortly!"
          : "I can provide some general guidance, but for a detailed diagnosis and professional advice, I'd recommend upgrading to chat with our certified mechanics. They can provide specific solutions for your vehicle.",
        sender: hasAccess ? "mechanic" : "bot",
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, botResponse]);
      setIsTyping(false);
    }, 2000 + Math.random() * 2000); // 2-4 second delay
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <Card className={cn("flex flex-col h-96", className)}>
      <CardHeader className="flex-shrink-0">
        <CardTitle className="flex items-center justify-between">
          <span>Chat Support</span>
          {!hasAccess && (
            <Button 
              size="sm" 
              className="bg-gradient-to-r from-primary to-warning"
              onClick={onUpgrade}
              data-testid="button-upgrade-chat"
            >
              <CreditCard className="w-4 h-4 mr-1" />
              Upgrade $9.99
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col p-0">
        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                "flex items-start space-x-2",
                message.sender === "user" ? "justify-end" : "justify-start"
              )}
              data-testid={`message-${message.id}`}
            >
              {message.sender !== "user" && (
                <Avatar className="h-8 w-8 flex-shrink-0">
                  <AvatarFallback>
                    {message.sender === "bot" ? <Bot className="w-4 h-4" /> : "M"}
                  </AvatarFallback>
                </Avatar>
              )}
              
              <div
                className={cn(
                  "max-w-xs lg:max-w-md px-3 py-2 rounded-lg text-sm",
                  message.sender === "user"
                    ? "bg-primary text-primary-foreground ml-auto"
                    : message.sender === "mechanic"
                    ? "bg-success/20 text-success-foreground border border-success/30"
                    : "bg-muted"
                )}
              >
                <p>{message.content}</p>
                <div className="flex items-center justify-between mt-1">
                  <time className="text-xs opacity-70">
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </time>
                  {message.sender === "mechanic" && (
                    <Badge variant="secondary" className="text-xs ml-2">
                      Expert
                    </Badge>
                  )}
                </div>
              </div>
              
              {message.sender === "user" && (
                <Avatar className="h-8 w-8 flex-shrink-0">
                  <AvatarFallback>
                    <User className="w-4 h-4" />
                  </AvatarFallback>
                </Avatar>
              )}
            </div>
          ))}
          
          {/* Typing Indicator */}
          {isTyping && (
            <div className="flex items-start space-x-2">
              <Avatar className="h-8 w-8">
                <AvatarFallback>
                  {hasAccess ? "M" : <Bot className="w-4 h-4" />}
                </AvatarFallback>
              </Avatar>
              <div className="bg-muted px-3 py-2 rounded-lg">
                <div className="flex items-center space-x-1">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                    <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                  </div>
                  <span className="text-xs text-muted-foreground ml-2">typing...</span>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
        
        {/* Input Area */}
        <div className="border-t p-4">
          {!hasAccess && (
            <div className="mb-3 p-3 bg-warning/10 border border-warning/20 rounded-lg">
              <div className="flex items-center space-x-2 text-sm">
                <Clock className="w-4 h-4 text-warning" />
                <span>Limited to basic AI responses. Upgrade for expert mechanic chat!</span>
              </div>
            </div>
          )}
          
          <div className="flex space-x-2">
            <Input
              placeholder={hasAccess ? "Ask your mechanic..." : "Ask a basic question..."}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={isTyping}
              data-testid="input-chat-message"
            />
            <Button
              onClick={sendMessage}
              disabled={!inputValue.trim() || isTyping}
              data-testid="button-send-message"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}