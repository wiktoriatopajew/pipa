import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Circle } from "lucide-react";

// Pool of realistic mechanic usernames that look like real people
const MECHANIC_POOL = [
  "alex_motors", "jamie_tech", "chris_garage", "morgan_auto", "riley_wrench", "casey_fix",
  "taylor_diesel", "jordan_brake", "sam_engine", "blake_trans", "drew_spark", "quinn_repair",
  "avery_clutch", "harper_tune", "cameron_volt", "peyton_pump", "sage_filter", "rowan_belt",
  "dakota_wire", "hayden_code", "phoenix_scan", "skylar_oil", "logan_gear", "parker_tool",
  "reese_motor", "emery_auto", "finley_car", "kendall_fix", "marley_shop", "nova_tech",
  "remy_garage", "sage_wrench", "tatum_engine", "wren_diesel", "zion_brake", "emerson_volt",
  "river_pump", "indigo_gear", "arbor_tune", "cypress_oil", "atlas_motor", "echo_repair",
  "kai_auto", "lane_tech", "nyx_garage", "onyx_wrench", "rain_engine", "storm_brake",
  "vale_pump", "west_gear", "zen_motor", "ash_repair", "bay_auto", "cruz_tech",
  "dean_garage", "ell_wrench", "fox_engine", "gray_brake", "hart_pump", "ink_gear"
];

// Vehicle specialties for mechanics
const SPECIALTIES = [
  "Cars", "Motorcycles", "Boats", "Buses", "Trucks", "Construction Equipment",
  "Diesel Engines", "Electrical Systems", "Transmissions", "Brakes", "Engine Repair"
];

interface Mechanic {
  id: string;
  username: string;
  specialty: string;
  responseTime: string;
  isOnline: boolean;
}

interface OnlineMechanicsProps {
  className?: string;
}

export default function OnlineMechanics({ className }: OnlineMechanicsProps) {
  const [mechanics, setMechanics] = useState<Mechanic[]>([]);
  const [onlineCount, setOnlineCount] = useState(0);

  // Generate random mechanics list
  useEffect(() => {
    const generateMechanics = () => {
      const count = Math.floor(Math.random() * 5) + 8; // 8-12 mechanics
      const shuffled = [...MECHANIC_POOL].sort(() => Math.random() - 0.5);
      const selected = shuffled.slice(0, count);
      
      const newMechanics = selected.map((username, index) => ({
        id: `mech-${index}`,
        username,
        specialty: SPECIALTIES[Math.floor(Math.random() * SPECIALTIES.length)],
        responseTime: `${Math.floor(Math.random() * 3) + 1}-${Math.floor(Math.random() * 5) + 3} min`,
        isOnline: Math.random() > 0.2 // 80% chance of being online
      }));
      
      setMechanics(newMechanics);
      setOnlineCount(newMechanics.filter(m => m.isOnline).length);
    };

    generateMechanics();
    
    // Update mechanics every 2-4 minutes
    const interval = setInterval(generateMechanics, (Math.random() * 120 + 120) * 1000);
    
    return () => clearInterval(interval);
  }, []);

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
                  <div className="text-xs text-muted-foreground">
                    {mechanic.specialty}
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