import { useEffect, useMemo } from 'react';
import { useScheduleStore } from './store/scheduleStore';
import { Toolbar } from './components/Toolbar';
import { Sidebar } from './components/Sidebar';
import { MainContent } from './components/MainContent';
import { ValidationCenter } from './components/ValidationCenter';

function App() {
  const tasks = useScheduleStore((state) => state.tasks);
  const filters = useScheduleStore((state) => state.filters);
  const settings = useScheduleStore((state) => state.settings);
  const lastValidation = useScheduleStore((state) => state.lastValidation);
  const runValidation = useScheduleStore((state) => state.runValidation);

  useEffect(() => {
    runValidation();
  }, [tasks, runValidation]);

  const summary = useMemo(() => {
    const totalBudget = tasks.reduce((sum, task) => sum + task.budget, 0);
    const totalApi = tasks.reduce((sum, task) => sum + task.apiActual, 0);
    return { totalBudget, totalApi };
  }, [tasks]);

  return (
    <div className="flex h-full overflow-hidden">
      <Sidebar />
      <section className="flex flex-1 flex-col overflow-hidden">
        <Toolbar summary={summary} filters={filters} settings={settings} />
        <MainContent />
      </section>
      <ValidationCenter issues={lastValidation} />
    </div>
  );
}

export default App;
