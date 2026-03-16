import { SeasonalCard } from './seasonal-card';
import { TasksCard } from './tasks-card';
import { AiInsightsCard } from './ai-insights-card';
import { EcoHealthCard } from './eco-health-card';
import { SeasonalContext } from '@/lib/dashboard/seasonal';
import { Task } from '@/lib/db/schema';

interface Props {
  seasonal: SeasonalContext;
  tasks: Task[];
  insights: any[];
  ecoScore: number;
  ecoFunctions: Record<string, number>;
  farmId: string;
}

export function IntelligenceRow({ seasonal, tasks, insights, ecoScore, ecoFunctions, farmId }: Props) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Today&apos;s Intelligence</h3>
      </div>
      {/* Desktop: 4-col grid. Mobile: Season+AI+Eco as scroll row, Tasks full-width below */}
      <div className="hidden sm:grid sm:grid-cols-4 gap-3">
        <SeasonalCard seasonal={seasonal} />
        <TasksCard tasks={tasks} farmId={farmId} />
        <AiInsightsCard insights={insights} farmId={farmId} />
        <EcoHealthCard score={ecoScore} functions={ecoFunctions} />
      </div>
      <div className="sm:hidden space-y-3">
        <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1">
          <div className="flex-shrink-0 w-[200px]">
            <SeasonalCard seasonal={seasonal} />
          </div>
          <div className="flex-shrink-0 w-[200px]">
            <AiInsightsCard insights={insights} farmId={farmId} />
          </div>
          <div className="flex-shrink-0 w-[200px]">
            <EcoHealthCard score={ecoScore} functions={ecoFunctions} />
          </div>
        </div>
        <TasksCard tasks={tasks} farmId={farmId} />
      </div>
    </div>
  );
}
