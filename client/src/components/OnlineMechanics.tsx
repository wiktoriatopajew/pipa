import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Circle } from "lucide-react";

// Pool of realistic mechanic usernames
const MECHANIC_POOL = [
  "Alan43", "AutoGuru88", "Mike_Wrench", "TurboTech", "GearHead_Pro", "EngineExpert",
  "CarDoc_23", "WheelWizard", "PistonPete", "RpmRider", "ChassisChamp", "BrakesBoss",
  "OilChange_Joe", "TransMaster", "CoolantKing", "SparkPlug_Sam", "FuelPump_Fred", "Radiator_Rick",
  "Exhaust_Eddie", "Suspension_Sue", "Battery_Bob", "Alternator_Al", "Starter_Steve", "Clutch_Chris",
  "Timing_Tom", "Valve_Vic", "Camshaft_Carl", "Crankshaft_Craig", "Bearing_Ben", "Gasket_Gary",
  "Filter_Frank", "Belt_Bill", "Hose_Henry", "Wire_Will", "Fuse_Felix", "Relay_Ray",
  "Sensor_Sean", "Module_Mark", "Circuit_Cindy", "Voltage_Vince", "Amperage_Amy", "Resistance_Ron",
  "Diagnostic_Dan", "Scanner_Scott", "Code_Casey", "Error_Eric", "Fix_Fiona", "Repair_Randy",
  "Tune_Tony", "Service_Sally", "Maintenance_Mike", "Polish_Paul", "Detail_Diana", "Wash_Walter",
  "Grease_Greg", "Tools_Terry", "Wrench_Wayne", "Socket_Sophia", "Ratchet_Rachel", "Torque_Todd",
  "Impact_Ian", "Drill_Drew", "Hammer_Hannah", "Screwdriver_Simon"
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