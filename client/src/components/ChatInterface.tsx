import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Send, User, Clock, Shield } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  content: string;
  sender: "user" | "admin";
  timestamp: Date;
}

interface ChatInterfaceProps {
  hasAccess: boolean;
  vehicleInfo?: any;
  sessionId: string;
  userId: string;
  className?: string;
}

export default function ChatInterface({ 
  hasAccess, 
  vehicleInfo, 
  sessionId,
  userId,
  className 
}: ChatInterfaceProps) {
  const [inputValue, setInputValue] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Get messages for this chat session
  const { data: messages = [], refetch: refetchMessages } = useQuery<Message[]>({
    queryKey: ["/api/chat/sessions", sessionId, "messages"],
    enabled: !!sessionId && hasAccess,
    refetchInterval: 2000, // Poll every 2 seconds for new messages
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      const response = await apiRequest("POST", `/api/chat/sessions/${sessionId}/messages`, {
        userId,
        content,
        sender: "user"
      });
      return response.json();
    },
    onSuccess: () => {
      setInputValue("");
      refetchMessages();
    },
    onError: () => {
      toast({
        title: "Error sending message",
        description: "Please try again later",
        variant: "destructive",
      });
    },
  });

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!inputValue.trim() || !hasAccess) return;
    sendMessageMutation.mutate(inputValue.trim());
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatTimestamp = (timestamp: Date) => {
    return new Date(timestamp).toLocaleTimeString("en-US", { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  if (!hasAccess) {
    return (
      <Card className={cn("h-full", className)}>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Chat with Mechanic</span>
            <Badge variant="outline">Access Required</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="h-full flex flex-col items-center justify-center">
          <div className="text-center space-y-4">
            <Shield className="w-12 h-12 mx-auto text-muted-foreground" />
            <div>
              <h3 className="font-semibold mb-2">Get Chat Access</h3>
              <p className="text-sm text-muted-foreground">
                For just $9.99 get 30-day access to direct chat with an experienced mechanic.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("h-full flex flex-col", className)}>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span>Chat with Mechanic</span>
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-green-500 rounded-full" />
              <span className="text-sm text-muted-foreground">Admin online</span>
            </div>
          </div>
          <Badge variant="default">Premium</Badge>
        </CardTitle>
        {vehicleInfo && (
          <div className="text-sm text-muted-foreground">
            Vehicle: {vehicleInfo.year} {vehicleInfo.make} {vehicleInfo.model} ({vehicleInfo.type})
            {vehicleInfo.issue && (
              <div className="mt-1">Issue: {vehicleInfo.issue}</div>
            )}
          </div>
        )}
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col p-0">
        <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-4">
          {messages.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <div className="space-y-2">
                <p>Hello! I'm ready to help with your vehicle.</p>
                <p className="text-sm">Describe your problem and I'll try to respond as quickly as possible.</p>
              </div>
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "flex",
                  message.sender === "user" ? "justify-end" : "justify-start"
                )}
              >
                <div
                  className={cn(
                    "max-w-[80%] rounded-lg px-4 py-2 space-y-1",
                    message.sender === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  )}
                >
                  <div className="flex items-center space-x-2">
                    <Avatar className="w-6 h-6">
                      <AvatarFallback className="text-xs">
                        {message.sender === "user" ? "You" : "M"}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-xs opacity-70">
                      {message.sender === "user" ? "You" : "Mechanic"}
                    </span>
                    <span className="text-xs opacity-50 flex items-center">
                      <Clock className="w-3 h-3 mr-1" />
                      {formatTimestamp(message.timestamp)}
                    </span>
                  </div>
                  <p className="text-sm">{message.content}</p>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
        
        <div className="border-t bg-background p-4">
          <div className="flex space-x-2">
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message..."
              disabled={sendMessageMutation.isPending}
              className="flex-1"
              data-testid="input-chat-message"
            />
            <Button 
              onClick={sendMessage}
              disabled={!inputValue.trim() || sendMessageMutation.isPending}
              size="icon"
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