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
      <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">
        Farm Intelligence
      </h3>

      {/* Desktop: 4-col grid */}
      <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <SeasonalCard seasonal={seasonal} />
        <TasksCard tasks={tasks} farmId={farmId} />
        <AiInsightsCard insights={insights} farmId={farmId} />
        <EcoHealthCard score={ecoScore} functions={ecoFunctions} />
      </div>

      {/* Mobile: Season + AI + Eco as scroll row, Tasks full-width below */}
      <div className="sm:hidden space-y-3">
        <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1 -mx-4 px-4">
          <div className="flex-shrink-0 w-[220px]">
            <SeasonalCard seasonal={seasonal} />
          </div>
          <div className="flex-shrink-0 w-[220px]">
            <AiInsightsCard insights={insights} farmId={farmId} />
          </div>
          <div className="flex-shrink-0 w-[220px]">
            <EcoHealthCard score={ecoScore} functions={ecoFunctions} />
          </div>
        </div>
        <TasksCard tasks={tasks} farmId={farmId} />
      </div>
    </div>
  );
}
