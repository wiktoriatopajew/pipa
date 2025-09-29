import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Send, User, Clock, Shield, Paperclip, Image, Video, FileText } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface Attachment {
  id: string;
  fileName: string;
  originalName: string;
  fileSize: number;
  mimeType: string;
}

interface Message {
  id: string;
  content: string;
  sender: "user" | "admin";
  timestamp: Date;
  attachments?: Attachment[];
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
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
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

  // File upload mutation
  const uploadFileMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch(`/api/chat/sessions/${sessionId}/upload`, {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Upload failed');
      }
      
      return response.json();
    },
    onSuccess: () => {
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      refetchMessages();
    },
    onError: (error: Error) => {
      toast({
        title: "File upload failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Play notification sound for new admin messages
  const prevMessagesCount = useRef(messages.length);
  useEffect(() => {
    if (messages.length > prevMessagesCount.current) {
      const newMessages = messages.slice(prevMessagesCount.current);
      const hasAdminMessage = newMessages.some(msg => msg.sender === "admin");
      
      if (hasAdminMessage) {
        // Play notification sound
        const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIGmm98OScTgwOUKfk77RgGgU7k9r0yHMpBSh+zPLaizsKGGS56+mmUBELTKXh8bllHAU2jdXz0n0uBSqAzvLajDkIGGe88eyeUQ0PUqjl8LJeGQQ8lNv0yHUpBSh+zPDciz0KF2S56+mjUhEKS6Xg8bllHAU3jtb00oA');
        audio.volume = 0.3;
        audio.play().catch(err => console.log('Audio play failed:', err));
      }
    }
    prevMessagesCount.current = messages.length;
  }, [messages]);

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

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check file type
    const allowedTypes = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
      'video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo'
    ];
    
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: "Only images and videos are allowed",
        variant: "destructive",
      });
      return;
    }

    // Check file size
    const isImage = file.type.startsWith('image/');
    const maxSize = isImage ? 30 * 1024 * 1024 : 150 * 1024 * 1024; // 30MB for images, 150MB for videos
    
    if (file.size > maxSize) {
      toast({
        title: "File too large",
        description: `Maximum size is ${isImage ? '30MB' : '150MB'} for ${isImage ? 'images' : 'videos'}`,
        variant: "destructive",
      });
      return;
    }

    setSelectedFile(file);
    uploadFileMutation.mutate(file);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return <Image className="w-4 h-4" />;
    if (mimeType.startsWith('video/')) return <Video className="w-4 h-4" />;
    return <FileText className="w-4 h-4" />;
  };

  const renderAttachment = (attachment: Attachment) => {
    const isImage = attachment.mimeType.startsWith('image/');
    const isVideo = attachment.mimeType.startsWith('video/');

    if (isImage) {
      return (
        <div className="mt-2">
          <img 
            src={`/api/uploads/${attachment.fileName}`}
            alt={attachment.originalName}
            className="max-w-xs rounded-lg border"
            style={{ maxHeight: '200px' }}
          />
          <p className="text-xs text-muted-foreground mt-1">
            {attachment.originalName} ({formatFileSize(attachment.fileSize)})
          </p>
        </div>
      );
    }

    if (isVideo) {
      return (
        <div className="mt-2">
          <video 
            src={`/api/uploads/${attachment.fileName}`}
            controls
            className="max-w-xs rounded-lg border"
            style={{ maxHeight: '200px' }}
          />
          <p className="text-xs text-muted-foreground mt-1">
            {attachment.originalName} ({formatFileSize(attachment.fileSize)})
          </p>
        </div>
      );
    }

    return (
      <div className="mt-2 p-2 border rounded-lg flex items-center space-x-2">
        {getFileIcon(attachment.mimeType)}
        <div className="flex-1">
          <p className="text-sm font-medium">{attachment.originalName}</p>
          <p className="text-xs text-muted-foreground">{formatFileSize(attachment.fileSize)}</p>
        </div>
      </div>
    );
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
                  {message.attachments && message.attachments.map((attachment) => (
                    <div key={attachment.id}>
                      {renderAttachment(attachment)}
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
        
        <div className="border-t bg-background p-4">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            onChange={handleFileSelect}
            className="hidden"
            data-testid="input-file-upload"
          />
          <div className="flex space-x-2">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadFileMutation.isPending}
              data-testid="button-file-upload"
            >
              <Paperclip className="w-4 h-4" />
            </Button>
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
          {uploadFileMutation.isPending && (
            <div className="mt-2 text-sm text-muted-foreground">
              Uploading file...
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}