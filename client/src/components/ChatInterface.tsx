import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Send, Bot, User, Clock, CreditCard } from "lucide-react";
import { cn } from "@/lib/utils";

// Pool of diverse random usernames for chat interactions
const CHAT_MECHANIC_NAMES = [
  "alex23", "jamie_star", "chrisp", "morgan77", "riley_moon", "casey_blue",
  "taylor93", "jordan_fire", "samwise", "blake_cool", "drew_sky", "quinn_one",
  "avery_best", "harper22", "cameron_wave", "peyton_luz", "sage_green", "rowan_tree",
  "dakota_wolf", "hayden_code", "phoenix_rise", "skylar_nova", "logan_bear", "parker_hill",
  "reese_swift", "emery_gold", "finley_oak", "kendall_ruby", "marley_zen", "nova_bright",
  "remy_snow", "sage_wind", "tatum_jazz", "wren_silk", "zion_coast", "emerson_ray",
  "river_calm", "indigo_dream", "arbor_leaf", "cypress_sage", "atlas_peak", "echo_void",
  "kai_ocean", "lane_storm", "nyx_shadow", "onyx_stone", "rain_drop", "storm_rider",
  "vale_soft", "west_wild", "zen_master", "ash_smoke", "bay_breeze", "cruz_shine",
  "dean_sharp", "ell_curve", "fox_red", "gray_mist", "hart_pulse", "ink_dark",
  "jade_pure", "kira_light", "luna_glow", "max_power", "nico_flash", "ollie_jump",
  "pete_rock", "quin_quick", "ruby_gem", "sky_high", "teo_warm", "una_pure",
  "vex_cool", "wes_free", "xara_bright", "yuki_snow", "zara_star", "ace_king",
  "bee_buzz", "cal_beach", "dex_smart", "eve_night", "fay_magic", "geo_map"
];

// Get a random mechanic name
const getRandomMechanicName = (): string => {
  return CHAT_MECHANIC_NAMES[Math.floor(Math.random() * CHAT_MECHANIC_NAMES.length)];
};

// Function to generate vehicle-specific diagnostic questions
const getDiagnosticQuestions = (vehicleInfo: any): string => {
  const vehicleType = vehicleInfo.type;
  const issue = vehicleInfo.issue?.toLowerCase() || '';
  
  const commonQuestions = [
    "When did this problem first start occurring?",
    "Does it happen all the time or only under certain conditions?",
    "Have you noticed any unusual sounds, smells, or vibrations?"
  ];
  
  let specificQuestions: string[] = [];
  
  // Vehicle type specific questions
  switch (vehicleType) {
    case 'car':
    case 'truck':
      if (issue.includes('engine') || issue.includes('start')) {
        specificQuestions = [
          "Does the engine turn over when you try to start it?",
          "Are there any dashboard warning lights on?",
          "When was your last oil change or maintenance?"
        ];
      } else if (issue.includes('brake')) {
        specificQuestions = [
          "Do you hear squealing or grinding noises when braking?",
          "Does the brake pedal feel soft or spongy?",
          "Is the vehicle pulling to one side when braking?"
        ];
      } else {
        specificQuestions = [
          "What is your current mileage?",
          "Have you performed any recent maintenance?",
          "Are any warning lights illuminated on the dashboard?"
        ];
      }
      break;
      
    case 'motorcycle':
      specificQuestions = [
        "What type of motorcycle (cruiser, sport, touring, etc.)?",
        "Does the issue occur at idle, while riding, or both?",
        "How many miles are on the odometer?"
      ];
      break;
      
    case 'boat':
      specificQuestions = [
        "What type of engine (outboard, inboard, sterndrive)?",
        "Does the problem occur in or out of water?",
        "How many hours are on the engine?"
      ];
      break;
      
    case 'construction':
      specificQuestions = [
        "What type of equipment (excavator, bulldozer, loader, etc.)?",
        "Does the issue affect hydraulics, engine, or other systems?",
        "How many operating hours are on the machine?"
      ];
      break;
      
    default:
      specificQuestions = [
        "Can you provide more details about the type of vehicle?",
        "What systems or components are affected?",
        "Is this a recurring issue or the first time?"
      ];
  }
  
  const allQuestions = [...specificQuestions, ...commonQuestions];
  const selectedQuestions = allQuestions.slice(0, 3); // Pick top 3 most relevant
  
  return `To help diagnose your ${vehicleType}, I need to gather some additional information:\n\n${selectedQuestions.map((q, i) => `${i + 1}. ${q}`).join('\n')}\n\nPlease answer these questions, and I'll connect you with the most suitable mechanic for your specific issue.`;
};

// Function to generate intelligent responses based on user answers
const generateIntelligentResponse = (userInput: string, vehicleInfo: any, messageCount: number): string => {
  const input = userInput.toLowerCase();
  const vehicleType = vehicleInfo.type;
  
  // After several exchanges, transition to human mechanic
  if (messageCount > 4) {
    const mechanicName = getRandomMechanicName();
    return `Thank you for providing those details. Based on your ${vehicleType} and the symptoms you've described, I'm now connecting you with ${mechanicName}, one of our senior mechanics who specializes in ${vehicleType} issues. They'll be able to provide you with specific repair steps and cost estimates. ${mechanicName} will be with you in just a moment!`;
  }
  
  // Analyze user responses and provide relevant follow-up
  if (input.includes('yes') || input.includes('no')) {
    return `Thanks for that information. Can you tell me more about any specific symptoms? For example, any unusual noises, warning lights, or performance changes you've noticed?`;
  }
  
  if (input.includes('noise') || input.includes('sound')) {
    return `Noise issues can tell us a lot! Can you describe the noise more specifically? Is it a grinding, squealing, clicking, or rattling sound? And does it happen when the vehicle is idling, moving, or during specific actions like braking or turning?`;
  }
  
  if (input.includes('light') || input.includes('warning')) {
    return `Warning lights are important indicators. Which specific lights are on? If it's the check engine light, this usually indicates an emissions or engine management issue. Other lights like oil pressure, brake, or battery lights indicate more urgent problems.`;
  }
  
  if (input.includes('start') || input.includes('turn over')) {
    return `Starting issues can have several causes. When you turn the key, do you hear clicking sounds, does the engine crank slowly, or is there complete silence? Also, are your headlights and dashboard lights working normally?`;
  }
  
  if (input.includes('vibrat') || input.includes('shake')) {
    return `Vibrations can indicate various issues depending on when they occur. Do you feel the vibration through the steering wheel, seat, or pedals? Does it happen while idling, accelerating, braking, or at highway speeds?`;
  }
  
  // Default intelligent response
  const responses = [
    `I see. Based on what you're telling me about your ${vehicleType}, let me ask you this: Have you noticed if the problem is getting worse over time, or does it seem to stay the same?`,
    `That's helpful information. For your ${vehicleType}, when exactly do you notice this issue most? Is it during cold starts, after the engine warms up, or throughout your drive?`,
    `Good details. One more thing - have you had any recent maintenance done on your ${vehicleType}? Sometimes issues can be related to recent work or indicate it's time for scheduled maintenance.`
  ];
  
  return responses[Math.floor(Math.random() * responses.length)];
};

interface Message {
  id: string;
  content: string;
  sender: "user" | "bot" | "mechanic";
  timestamp: Date;
  typing?: boolean;
}

interface ChatInterfaceProps {
  hasAccess?: boolean;
  vehicleInfo?: any;
  onUpgrade?: () => void;
  className?: string;
}

export default function ChatInterface({ hasAccess = false, vehicleInfo, onUpgrade, className }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initial bot greeting with vehicle-specific information
  useEffect(() => {
    let content = "";
    
    if (vehicleInfo) {
      const vehicleDescription = `${vehicleInfo.year || ''} ${vehicleInfo.make || ''} ${vehicleInfo.model || ''}`.trim();
      const vehicleType = vehicleInfo.type || 'vehicle';
      
      if (hasAccess) {
        content = `Hello! I see you're having issues with your ${vehicleDescription ? vehicleDescription : vehicleType}. `;
        content += `You mentioned: "${vehicleInfo.issue}". I'm your AI automotive assistant and I'll help gather some diagnostic information before connecting you with a professional mechanic. `;
        content += `Let me ask you a few specific questions to better understand the problem.`;
      } else {
        content = `Hi! I can see you're having trouble with your ${vehicleDescription ? vehicleDescription : vehicleType}. `;
        content += `I can provide some basic guidance about your issue: "${vehicleInfo.issue}". `;
        content += `For detailed diagnosis and direct access to professional mechanics, upgrade for just $9.99.`;
      }
    } else {
      content = hasAccess 
        ? "Hello! I'm your automotive assistant. You now have access to chat with professional mechanics. How can I help you today?"
        : "Hi there! I'm an AI assistant that can help with basic automotive questions. For detailed diagnosis and expert advice, you'll need to upgrade to chat with our professional mechanics for just $9.99.";
    }

    const initialMessage: Message = {
      id: "1",
      content,
      sender: "bot",
      timestamp: new Date()
    };
    setMessages([initialMessage]);
    
    // If user has access and vehicle info, ask follow-up diagnostic questions
    if (hasAccess && vehicleInfo) {
      setTimeout(() => {
        const diagnosticQuestions = getDiagnosticQuestions(vehicleInfo);
        if (diagnosticQuestions) {
          const followUpMessage: Message = {
            id: "2",
            content: diagnosticQuestions,
            sender: "bot",
            timestamp: new Date()
          };
          setMessages(prev => [...prev, followUpMessage]);
        }
      }, 2000);
    }
  }, [hasAccess, vehicleInfo]);

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
      let responseContent = "";
      let sender: "bot" | "mechanic" = "bot";
      
      if (hasAccess) {
        // For premium users, provide intelligent responses and eventually connect to mechanic
        if (vehicleInfo) {
          responseContent = generateIntelligentResponse(inputValue, vehicleInfo, messages.length);
          sender = messages.length > 4 ? "mechanic" : "bot"; // Switch to mechanic after several exchanges
        } else {
          responseContent = "Let me connect you with one of our expert mechanics who can help with your specific issue. They'll be with you shortly!";
          sender = "mechanic";
        }
      } else {
        // For free users, provide basic guidance and encourage upgrade
        if (vehicleInfo) {
          responseContent = `Based on your ${vehicleInfo.type} issue, I can suggest checking basic things like fluids, belts, or connections. However, for a detailed diagnosis and step-by-step repair guidance from certified mechanics, I'd recommend upgrading for just $9.99.`;
        } else {
          responseContent = "I can provide some general guidance, but for a detailed diagnosis and professional advice, I'd recommend upgrading to chat with our certified mechanics. They can provide specific solutions for your vehicle.";
        }
      }
      
      const botResponse: Message = {
        id: (Date.now() + 1).toString(),
        content: responseContent,
        sender,
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