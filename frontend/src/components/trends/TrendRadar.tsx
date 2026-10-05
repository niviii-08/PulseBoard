import { useMemo, useState } from "react";
import { ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis, ZAxis, Tooltip, ReferenceLine, Cell } from "recharts";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Radar, Flame, TrendingUp } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { EmergingTrend } from "@/types/domain";

interface TrendRadarProps {
  trends: EmergingTrend[];
  isLoading: boolean;
}

export function TrendRadar({ trends, isLoading }: TrendRadarProps) {
  const navigate = useNavigate();
  const [timeRange, setTimeRange] = useState("24H");

  // Recharts Scatter data requires { x, y, z, ... }
  // X = Volume (current_volume)
  // Y = Growth Rate (growth_rate)
  // Z = Bubble Size (source_count -> cross_platform_count)
  const data = useMemo(() => {
    if (!trends) return [];
    
    // Simulate time-range adjustment visually by multiplying raw metrics 
    // against time scale factors just for visual scattering spread if real API metrics are static snapshot based.
    // In a fully integrated backend system, this triggers a new `/trending?window=timeRange` fetch.
    const timeFactor = timeRange === "1H" ? 0.2 : timeRange === "6H" ? 0.5 : timeRange === "24H" ? 1.0 : 2.5;

    return trends.map(t => {
      const x = t.volume * timeFactor;
      const y = t.growth_rate * (1 / timeFactor);
      const accel = t.acceleration;
      
      let fill = "#8b5cf6"; // Default purple
      
      const status = t.score_breakdown?.label || "STEADY";
      if (status === "BREAKOUT") fill = "#a855f7"; // Bright Purple
      else if (status === "RISING FAST" || status === "RISING") fill = "#10b981"; // Emerald
      else if (status === "STABLE") fill = "#64748b"; // Slate
      else fill = "#ef4444"; // Red (Declining/Fading)

      // Emphasize bubbling based on acceleration intensity
      const opacity = Math.min(Math.max((accel + 50) / 100, 0.3), 1.0);

      return {
        id: t.id,
        name: t.name,
        x,
        y,
        z: Math.max(t.cross_platform_count * 20, 50),
        accel,
        fill,
        opacity,
        status: status
      };
    });
  }, [trends, timeRange]);

  // Compute quadrant reference lines mathematically
  const avgX = data.length ? data.reduce((sum, d) => sum + d.x, 0) / data.length : 100;
  const avgY = data.length ? data.reduce((sum, d) => sum + d.y, 0) / data.length : 0;

  const handleNodeClick = (node: any) => {
    if (node && node.id) navigate(`/trends/${node.id}`);
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="glass shadow-card border border-border p-4 rounded-xl min-w-[200px]">
          <div className="flex items-center justify-between gap-3 mb-2">
            <h4 className="font-bold text-ink truncate">{data.name}</h4>
            <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full bg-ink/5 text-ink-muted">
              {data.status}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <div className="font-mono font-semibold text-ink">{data.x.toFixed(0)}</div>
              <div className="text-ink-faint uppercase text-[9px] font-bold">Volume</div>
            </div>
            <div>
              <div className="font-mono font-semibold text-ink">{data.y > 0 ? "+" : ""}{data.y.toFixed(1)}%</div>
              <div className="text-ink-faint uppercase text-[9px] font-bold">Growth</div>
            </div>
            <div>
              <div className="font-mono font-semibold text-ink">{data.z / 20}</div>
              <div className="text-ink-faint uppercase text-[9px] font-bold">Sources</div>
            </div>
            <div>
              <div className="font-mono font-semibold text-ink">{data.accel > 0 ? "+" : ""}{data.accel.toFixed(1)}</div>
              <div className="text-ink-faint uppercase text-[9px] font-bold">Accel</div>
            </div>
          </div>
          <div className="mt-3 text-[10px] text-signal-600 font-semibold flex items-center gap-1">
            <TrendingUp className="w-3 h-3" /> Click to view details
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="shadow-sm border-border w-full flex flex-col group overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between pb-2 bg-gradient-to-r from-surface to-surface-raised sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-signal-100 rounded-lg">
            <Radar className="w-5 h-5 text-signal-600" />
          </div>
          <div>
            <CardTitle className="text-lg text-ink font-bold leading-tight">Trend Radar</CardTitle>
            <p className="text-xs text-ink-muted font-medium mt-0.5">Momentum vs. Volume Quadrants</p>
          </div>
        </div>
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-[100px] h-8 text-xs font-semibold bg-surface border-border/50 focus:ring-signal-500">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1H" className="text-xs">Past 1H</SelectItem>
            <SelectItem value="6H" className="text-xs">Past 6H</SelectItem>
            <SelectItem value="24H" className="text-xs flex items-center font-bold text-signal-800">Past 24H</SelectItem>
            <SelectItem value="7D" className="text-xs">Past 7D</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      
      <CardContent className="flex-1 p-0 relative min-h-[400px]">
        {/* Quadrant Labels */}
        <div className="absolute inset-0 z-0 pointer-events-none p-6">
           <div className="absolute top-6 left-6 text-ink-faint text-xs font-bold uppercase tracking-widest flex items-center gap-1.5 opacity-60">
             <TrendingUp className="w-4 h-4" /> Emerging
           </div>
           <div className="absolute top-6 right-6 text-purple-500/50 text-xs font-bold uppercase tracking-widest flex items-center gap-1.5">
             <Flame className="w-4 h-4" /> Breakout
           </div>
           <div className="absolute bottom-6 left-6 text-ink-faint text-xs font-bold uppercase tracking-widest opacity-60">
             Low Activity
           </div>
           <div className="absolute bottom-6 right-6 text-ink-faint text-xs font-bold uppercase tracking-widest opacity-60">
             📌 High Vol / Stable
           </div>
        </div>

        {isLoading ? (
          <div className="w-full h-[400px] flex items-center justify-center">
            <div className="flex flex-col items-center justify-center opacity-50">
               <div className="h-6 w-6 rounded-full border-2 border-signal-500 border-t-transparent animate-spin mb-3"></div>
               <div className="text-xs font-bold text-ink-muted uppercase tracking-widest">Scanning Grid</div>
            </div>
          </div>
        ) : (
          <div className="h-[400px] w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 0 }}>
                <XAxis 
                   type="number" 
                   dataKey="x" 
                   name="Volume" 
                   axisLine={false} 
                   tickLine={false} 
                   tick={{ fontSize: 10, fill: '#94a3b8' }}
                   domain={['auto', 'auto']}
                />
                <YAxis 
                   type="number" 
                   dataKey="y" 
                   name="Growth Rate" 
                   axisLine={false} 
                   tickLine={false} 
                   tick={{ fontSize: 10, fill: '#94a3b8' }}
                   domain={['auto', 'auto']}
                />
                <ZAxis type="number" dataKey="z" range={[50, 800]} name="Source Count" />
                
                {/* Quadrant Dividers */}
                <ReferenceLine x={avgX} stroke="#cbd5e1" strokeDasharray="3 3" opacity={0.5} />
                <ReferenceLine y={avgY} stroke="#cbd5e1" strokeDasharray="3 3" opacity={0.5} />
                
                <Tooltip 
                  content={<CustomTooltip />} 
                  cursor={{ strokeDasharray: '3 3', stroke: '#94a3b8', strokeWidth: 1 }} 
                />
                
                <Scatter data={data} 
                  shape="circle" 
                  onClick={handleNodeClick} 
                  className="cursor-pointer hover:drop-shadow-lg transition-all"
                  animationDuration={1500}
                >
                   {data.map((entry, index) => (
                     <Cell 
                       key={`cell-${index}`} 
                       fill={entry.fill}
                       fillOpacity={entry.opacity}
                       stroke={entry.fill}
                       strokeWidth={1}
                     />
                   ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
