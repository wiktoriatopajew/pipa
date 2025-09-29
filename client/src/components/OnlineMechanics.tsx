import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Circle } from "lucide-react";
import { useMechanicsCount } from "@/hooks/useMechanicsCount";

// Pool of realistic usernames that people actually use
const MECHANIC_POOL = [
  "alex2023", "mikesmith", "sarah_j", "johnnyboy", "lisa94", "davidk",
  "jennifer88", "tomcat", "jessicab", "matty", "samantha", "robertj",
  "emily22", "chrisw", "amanda99", "nickm", "stephh", "tylerg",
  "ashley77", "brandonp", "nicole_c", "zachary", "kayla23", "anthonym",
  "brittany", "joshd", "megan89", "kevins", "lindsey", "andrewt",
  "rachael", "kyle94", "courtney", "ryanb", "ericka", "justinp",
  "danielle", "adamw", "heather91", "seanm", "kristen", "coryj",
  "shadowhunter", "nightwolf", "stormking", "dragonfly", "moonlight", "firestorm",
  "thunderbolt", "wildcats", "steelwolf", "ironman77", "spidey", "batman2",
  "superman94", "wonder_woman", "flash23", "greenlight", "aqua88", "cyber1",
  "wolverine", "deadpool23", "captain99", "ironmaiden", "blackwidow", "hawkeye1",
  "daredevil", "punisher", "ghostrider", "blade88", "gambit2", "rogue23"
];


interface Mechanic {
  id: string;
  username: string;
  responseTime: string;
  isOnline: boolean;
}

interface OnlineMechanicsProps {
  className?: string;
}

export default function OnlineMechanics({ className }: OnlineMechanicsProps) {
  const [mechanics, setMechanics] = useState<Mechanic[]>([]);
  const onlineCount = useMechanicsCount();

  // Generate random mechanics list that matches the global online count
  useEffect(() => {
    const generateMechanics = () => {
      const totalMechanics = Math.max(onlineCount + 2, 10); // Always show a few more than online count
      const shuffled = [...MECHANIC_POOL].sort(() => Math.random() - 0.5);
      const selected = shuffled.slice(0, totalMechanics);
      
      const newMechanics = selected.map((username, index) => ({
        id: `mech-${index}`,
        username,
        responseTime: `${Math.floor(Math.random() * 3) + 1}-${Math.floor(Math.random() * 5) + 3} min`,
        isOnline: index < onlineCount // First N mechanics are online to match global count
      }));
      
      setMechanics(newMechanics);
    };

    generateMechanics();
    
    // Update mechanics every 2-4 minutes
    const interval = setInterval(generateMechanics, (Math.random() * 120 + 120) * 1000);
    
    return () => clearInterval(interval);
  }, [onlineCount]); // Regenerate when online count changes

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Available Mechanics</span>
          <Badge className="bg-success/20 text-success border-success/30" data-testid="badge-online-count">
            <Circle className="w-2 h-2 mr-1 fill-current" />
            {onlineCount} Online
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {mechanics.map((mechanic) => (
            <div 
              key={mechanic.id} 
              className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover-elevate"
              data-testid={`mechanic-${mechanic.id}`}
            >
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-xs">
                      {mechanic.username.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  {mechanic.isOnline && (
                    <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-success rounded-full border-2 border-background" />
                  )}
                </div>
                <div>
                  <div className="font-medium text-sm" data-testid={`text-username-${mechanic.id}`}>
                    {mechanic.username}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-muted-foreground">
                  Response: {mechanic.responseTime}
                </div>
                <Badge 
                  variant={mechanic.isOnline ? "default" : "secondary"}
                  className={mechanic.isOnline ? "bg-success/20 text-success border-success/30" : ""}
                >
                  {mechanic.isOnline ? "Online" : "Busy"}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}