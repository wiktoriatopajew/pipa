import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Circle } from "lucide-react";

// Pool of diverse random usernames that look like real people
const MECHANIC_POOL = [
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