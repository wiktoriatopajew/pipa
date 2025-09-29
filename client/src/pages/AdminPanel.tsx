import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  Users, MessageCircle, DollarSign, Activity, Send, 
  Eye, Clock, Shield, AlertCircle, CheckCircle2 
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface AdminData {
  stats: {
    totalUsers: number;
    subscribedUsers: number;
    onlineUsers: number;
    activeChats: number;
    unreadMessages: number;
    totalRevenue: number;
  };
  users: any[];
  subscriptions: any[];
  activeSessions: any[];
  unreadMessages: any[];
  recentMessages: any[];
}

interface ChatSession {
  id: string;
  user?: any;
  lastMessage?: any;
  unreadCount: number;
  messageCount: number;
  vehicleInfo?: string;
  status: string;
  createdAt: string;
  lastActivity: string;
}

interface Message {
  id: string;
  content: string;
  senderType: string;
  sender?: any;
  createdAt: string;
  isRead: boolean;
}

export default function AdminPanel() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [credentials, setCredentials] = useState({ email: "", password: "" });
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [activeTab, setActiveTab] = useState("dashboard");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Check authentication status on mount
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        const response = await apiRequest("GET", "/api/admin/dashboard");
        if (response.ok) {
          setIsAuthenticated(true);
        }
      } catch (error) {
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuthStatus();
  }, []);

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: async (creds: { email: string; password: string }) => {
      const response = await apiRequest("POST", "/api/admin/login", creds);
      return response.json();
    },
    onSuccess: () => {
      setIsAuthenticated(true);
      toast({
        title: "Login successful",
        description: "Welcome to admin panel",
      });
    },
    onError: () => {
      toast({
        title: "Login failed", 
        description: "Invalid credentials",
        variant: "destructive",
      });
    },
  });

  // Dashboard data query
  const { data: dashboardData, refetch: refetchDashboard } = useQuery<AdminData>({
    queryKey: ["/api/admin/dashboard"],
    enabled: isAuthenticated,
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  // Chat sessions query
  const { data: chatSessions } = useQuery<ChatSession[]>({
    queryKey: ["/api/admin/chats"],
    enabled: isAuthenticated,
    refetchInterval: 3000, // Refresh every 3 seconds
  });

  // Messages for selected chat
  const { data: messages, refetch: refetchMessages } = useQuery<Message[]>({
    queryKey: ["/api/admin/chats", selectedChatId, "messages"],
    enabled: isAuthenticated && !!selectedChatId,
    refetchInterval: 2000, // Refresh every 2 seconds
  });

  // Live data query
  const { data: liveData } = useQuery<{
    unreadCount: number;
    activeChatsCount: number;
    onlineUsersCount: number;
    lastUpdate: string;
  }>({
    queryKey: ["/api/admin/live-data"],
    enabled: isAuthenticated,
    refetchInterval: 1000, // Refresh every second
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async ({ sessionId, content }: { sessionId: string; content: string }) => {
      const response = await apiRequest("POST", `/api/admin/chats/${sessionId}/messages`, { content });
      return response.json();
    },
    onSuccess: () => {
      setNewMessage("");
      refetchMessages();
      refetchDashboard();
    },
  });

  // Mark message as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: async (messageId: string) => {
      const response = await apiRequest("PATCH", `/api/admin/messages/${messageId}/read`);
      return response.json();
    },
    onSuccess: () => {
      refetchMessages();
      refetchDashboard();
    },
  });

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/admin/logout");
      return response.json();
    },
    onSuccess: () => {
      setIsAuthenticated(false);
      setCredentials({ email: "", password: "" });
      toast({
        title: "Wylogowano pomyślnie",
        description: "Do zobaczenia!",
      });
    },
    onError: () => {
      toast({
        title: "Błąd wylogowania",
        description: "Spróbuj ponownie",
        variant: "destructive",
      });
    },
  });

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (credentials.email && credentials.password) {
      loginMutation.mutate(credentials);
    }
  };

  const handleSendMessage = () => {
    if (newMessage.trim() && selectedChatId) {
      sendMessageMutation.mutate({
        sessionId: selectedChatId,
        content: newMessage.trim(),
      });
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("pl-PL", {
      style: "currency",
      currency: "PLN",
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("pl-PL");
  };

  const getVehicleInfo = (vehicleInfoString?: string) => {
    try {
      return vehicleInfoString ? JSON.parse(vehicleInfoString) : null;
    } catch {
      return null;
    }
  };

  // Auto-mark messages as read when viewing chat
  useEffect(() => {
    if (messages && selectedChatId) {
      const unreadMessages = messages.filter(
        (msg) => !msg.isRead && msg.senderType === "user"
      );
      unreadMessages.forEach((msg) => {
        markAsReadMutation.mutate(msg.id);
      });
    }
  }, [messages, selectedChatId]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Sprawdzanie uprawnień...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-96">
          <CardHeader>
            <CardTitle className="text-center">Panel Administratora</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="text-sm font-medium">Email:</label>
                <Input
                  type="email"
                  value={credentials.email}
                  onChange={(e) =>
                    setCredentials({ ...credentials, email: e.target.value })
                  }
                  placeholder="wiktoriatopajew@gmail.com"
                  data-testid="input-admin-email"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Hasło:</label>
                <Input
                  type="password"
                  value={credentials.password}
                  onChange={(e) =>
                    setCredentials({ ...credentials, password: e.target.value })
                  }
                  placeholder="Xander12."
                  data-testid="input-admin-password"
                />
              </div>
              <Button 
                type="submit" 
                className="w-full" 
                disabled={loginMutation.isPending}
                data-testid="button-admin-login"
              >
                {loginMutation.isPending ? "Logowanie..." : "Zaloguj się"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-card/50 backdrop-blur">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">Panel Administratora</h1>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-sm">
                <div className="w-2 h-2 bg-success rounded-full" />
                <span>Online</span>
              </div>
              <Badge variant="secondary">
                {liveData?.unreadCount || 0} nieprzeczytanych
              </Badge>
              <Button 
                variant="outline" 
                onClick={() => logoutMutation.mutate()}
                disabled={logoutMutation.isPending}
                data-testid="button-admin-logout"
              >
                {logoutMutation.isPending ? "Wylogowywanie..." : "Wyloguj"}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="dashboard" data-testid="tab-dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="chats" className="relative" data-testid="tab-chats">
              Czaty
              {(liveData?.unreadCount || 0) > 0 && (
                <Badge 
                  variant="destructive" 
                  className="absolute -top-2 -right-2 h-5 w-5 p-0 text-xs"
                >
                  {liveData?.unreadCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="users" data-testid="tab-users">Użytkownicy</TabsTrigger>
            <TabsTrigger value="subscriptions" data-testid="tab-subscriptions">Subskrypcje</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Wszyscy użytkownicy</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="text-total-users">
                    {dashboardData?.stats.totalUsers || 0}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Aktywne czaty</CardTitle>
                  <MessageCircle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="text-active-chats">
                    {dashboardData?.stats.activeChats || 0}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Przychody</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="text-revenue">
                    {formatCurrency(dashboardData?.stats.totalRevenue || 0)}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Online</CardTitle>
                  <Activity className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="text-online-users">
                    {dashboardData?.stats.onlineUsers || 0}
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Ostatnie wiadomości</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-80">
                    <div className="space-y-4">
                      {dashboardData?.recentMessages.map((message: any) => (
                        <div key={message.id} className="flex space-x-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback>
                              {message.senderType === "admin" ? "A" : "U"}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center space-x-2">
                              <span className="text-sm font-medium">
                                {message.sender?.username || "Nieznany"}
                              </span>
                              <Badge variant={message.senderType === "admin" ? "default" : "secondary"}>
                                {message.senderType}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {formatDate(message.createdAt)}
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {message.content}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Subskrypcje użytkowników</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-80">
                    <div className="space-y-3">
                      {dashboardData?.users
                        .filter((user: any) => user.hasSubscription)
                        .map((user: any) => (
                          <div key={user.id} className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <Avatar className="h-8 w-8">
                                <AvatarFallback>
                                  {user.username?.charAt(0).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="text-sm font-medium">{user.username}</p>
                                <p className="text-xs text-muted-foreground">{user.email}</p>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Badge 
                                variant={user.isOnline ? "default" : "secondary"}
                                className={user.isOnline ? "bg-success/20 text-success border-success/30" : ""}
                              >
                                {user.isOnline ? "Online" : "Offline"}
                              </Badge>
                            </div>
                          </div>
                        ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="chats" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[600px]">
              {/* Chat Sessions List */}
              <Card>
                <CardHeader>
                  <CardTitle>Aktywne czaty ({chatSessions?.length || 0})</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <ScrollArea className="h-[500px]">
                    <div className="space-y-2 p-4">
                      {chatSessions?.map((session) => {
                        const vehicleInfo = getVehicleInfo(session.vehicleInfo);
                        return (
                          <div
                            key={session.id}
                            className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                              selectedChatId === session.id
                                ? "bg-primary/10 border-primary"
                                : "hover:bg-muted/50"
                            }`}
                            onClick={() => setSelectedChatId(session.id)}
                            data-testid={`chat-session-${session.id}`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                <Avatar className="h-8 w-8">
                                  <AvatarFallback>
                                    {session.user?.username?.charAt(0).toUpperCase() || "U"}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="text-sm font-medium">
                                    {session.user?.username || "Nieznany użytkownik"}
                                  </p>
                                  {vehicleInfo && (
                                    <p className="text-xs text-muted-foreground">
                                      {vehicleInfo.year} {vehicleInfo.make} {vehicleInfo.model}
                                    </p>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center space-x-2">
                                {session.user?.isOnline && (
                                  <div className="w-2 h-2 bg-success rounded-full" />
                                )}
                                {session.unreadCount > 0 && (
                                  <Badge variant="destructive" className="h-5 w-5 p-0 text-xs">
                                    {session.unreadCount}
                                  </Badge>
                                )}
                              </div>
                            </div>
                            {session.lastMessage && (
                              <p className="text-xs text-muted-foreground mt-2 truncate">
                                {session.lastMessage.content}
                              </p>
                            )}
                            <div className="flex items-center justify-between mt-2">
                              <span className="text-xs text-muted-foreground">
                                {session.messageCount} wiadomości
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {formatDate(session.lastActivity)}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>

              {/* Chat Messages */}
              <div className="lg:col-span-2">
                {selectedChatId ? (
                  <Card className="h-full">
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <span>Konwersacja</span>
                        <Badge variant="outline">
                          {messages?.length || 0} wiadomości
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col h-full p-0">
                      {/* Messages */}
                      <ScrollArea className="flex-1 p-4">
                        <div className="space-y-4">
                          {messages?.map((message) => (
                            <div
                              key={message.id}
                              className={`flex ${
                                message.senderType === "admin" ? "justify-end" : "justify-start"
                              }`}
                            >
                              <div
                                className={`max-w-xs lg:max-w-md px-3 py-2 rounded-lg ${
                                  message.senderType === "admin"
                                    ? "bg-primary text-primary-foreground"
                                    : message.senderType === "user"
                                    ? "bg-muted"
                                    : "bg-success/20 text-success-foreground border border-success/30"
                                }`}
                              >
                                <p className="text-sm">{message.content}</p>
                                <div className="flex items-center justify-between mt-1">
                                  <span className="text-xs opacity-70">
                                    {formatDate(message.createdAt)}
                                  </span>
                                  {message.senderType === "admin" && (
                                    <Badge variant="secondary" className="text-xs ml-2">
                                      Admin
                                    </Badge>
                                  )}
                                  {message.senderType === "user" && !message.isRead && (
                                    <AlertCircle className="w-3 h-3 ml-2 text-warning" />
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>

                      {/* Message Input */}
                      <div className="border-t p-4">
                        <div className="flex space-x-2">
                          <Input
                            placeholder="Napisz wiadomość..."
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                            data-testid="input-admin-message"
                          />
                          <Button
                            onClick={handleSendMessage}
                            disabled={!newMessage.trim() || sendMessageMutation.isPending}
                            data-testid="button-send-admin-message"
                          >
                            <Send className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <Card className="h-full flex items-center justify-center">
                    <CardContent>
                      <div className="text-center text-muted-foreground">
                        <MessageCircle className="w-12 h-12 mx-auto mb-4" />
                        <p>Wybierz czat aby rozpocząć konwersację</p>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="users" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Zarządzanie użytkownikami</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-96">
                  <div className="space-y-4">
                    {dashboardData?.users.map((user: any) => (
                      <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center space-x-3">
                          <Avatar className="h-10 w-10">
                            <AvatarFallback>
                              {user.username?.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{user.username}</p>
                            <p className="text-sm text-muted-foreground">{user.email}</p>
                            <p className="text-xs text-muted-foreground">
                              Utworzony: {formatDate(user.createdAt)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge variant={user.isOnline ? "default" : "secondary"}>
                            {user.isOnline ? "Online" : "Offline"}
                          </Badge>
                          <Badge variant={user.hasSubscription ? "default" : "outline"}>
                            {user.hasSubscription ? "Premium" : "Free"}
                          </Badge>
                          {user.isOnline && (
                            <div className="w-2 h-2 bg-success rounded-full" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="subscriptions" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Historia subskrypcji</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-96">
                  <div className="space-y-4">
                    {dashboardData?.subscriptions.map((subscription: any) => {
                      const user = dashboardData.users.find(u => u.id === subscription.userId);
                      return (
                        <div key={subscription.id} className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="flex items-center space-x-3">
                            <Avatar className="h-10 w-10">
                              <AvatarFallback>
                                {user?.username?.charAt(0).toUpperCase() || "U"}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{user?.username || "Nieznany użytkownik"}</p>
                              <p className="text-sm text-muted-foreground">{user?.email}</p>
                              <p className="text-xs text-muted-foreground">
                                Zakupiono: {formatDate(subscription.purchasedAt)}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-bold">{formatCurrency(parseFloat(subscription.amount || "0"))}</p>
                            <Badge variant={subscription.status === "active" ? "default" : "secondary"}>
                              {subscription.status}
                            </Badge>
                            {user?.isOnline && (
                              <div className="flex items-center justify-end mt-1">
                                <div className="w-2 h-2 bg-success rounded-full mr-2" />
                                <span className="text-xs text-success">Online</span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}