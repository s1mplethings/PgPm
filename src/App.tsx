import { useEffect, useMemo } from 'react';
import { useScheduleStore } from './store/scheduleStore';
import { Toolbar } from './components/Toolbar';
import { Sidebar } from './components/Sidebar';
import { MainContent } from './components/MainContent';
import { ValidationCenter } from './components/ValidationCenter';
import { UsageDrawer } from './components/UsageDrawer';

function App() {
  const { tasks, filters, settings, lastValidation, runValidation, usageLogs, isUsageDrawerOpen } =
    useScheduleStore((state) => ({
      tasks: state.tasks,
      filters: state.filters,
      settings: state.settings,
      lastValidation: state.lastValidation,
      runValidation: state.runValidation,
      usageLogs: state.usageLogs,
      isUsageDrawerOpen: state.isUsageDrawerOpen
    }));

  useEffect(() => {
    runValidation();
  }, [tasks, usageLogs, runValidation]);

  const summary = useMemo(() => {
    const totalBudget = tasks.reduce((sum, task) => sum + task.budget, 0);
    const totalApi = tasks.reduce((sum, task) => sum + task.apiActual, 0);
    return { totalBudget, totalApi };
  }, [tasks]);

  return (
    <div className="relative flex h-full overflow-hidden">
      <Sidebar />
      <section className="flex flex-1 flex-col overflow-hidden">
        <Toolbar summary={summary} filters={filters} settings={settings} />
        <MainContent />
      </section>
      <ValidationCenter issues={lastValidation} />
      <UsageDrawer open={isUsageDrawerOpen} />
    </div>
  );
}

export default App;
