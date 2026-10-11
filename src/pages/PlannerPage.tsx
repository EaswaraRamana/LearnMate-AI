import { useState, useEffect } from 'react';
import {
  CalendarCheck,
  Plus,
  Trash2,
  AlertCircle,
  Clock,
  Sparkles,
  Loader2
} from 'lucide-react';
import { StudyTask, DocumentItem } from '../types/index.ts';
import { api } from '../services/api.ts';
import { useToast } from '../context/ToastContext.tsx';

interface PlannerPageProps {
  documents: DocumentItem[];
}

export function PlannerPage({ documents }: PlannerPageProps) {
  const { showToast } = useToast();
  const [tasks, setTasks] = useState<StudyTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // New Task Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskTopic, setTaskTopic] = useState('');
  const [taskDueDate, setTaskDueDate] = useState('');
  const [taskPriority, setTaskPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [taskDocId, setTaskDocId] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Filter
  const [activeFilter, setActiveFilter] = useState<'all' | 'pending' | 'completed' | 'recommendations'>('all');

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    setIsLoading(true);
    try {
      const res = await api.getTasks();
      setTasks(res.tasks);
    } catch {
      showToast('error', 'Error', 'Failed to load study tasks');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleTask = async (task: StudyTask) => {
    try {
      const updated = await api.updateTask(task.id, { completed: !task.completed });
      setTasks((prev) => prev.map((t) => (t.id === task.id ? updated.task : t)));
      if (!task.completed) {
        showToast('success', 'Task Completed', `Great job finishing "${task.title}"!`);
      }
    } catch {
      showToast('error', 'Error', 'Failed to update task state');
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      await api.deleteTask(taskId);
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
      showToast('info', 'Task Removed');
    } catch {
      showToast('error', 'Error', 'Failed to delete task');
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) return;

    setIsCreating(true);
    try {
      const res = await api.createTask({
        title: taskTitle.trim(),
        topic: taskTopic.trim() || 'General Revision',
        dueDate: taskDueDate || new Date(Date.now() + 2 * 24 * 3600 * 1000).toISOString().split('T')[0],
        priority: taskPriority,
        documentId: taskDocId || undefined
      });
      setTasks((prev) => [res.task, ...prev]);
      setIsModalOpen(false);
      setTaskTitle('');
      setTaskTopic('');
      setTaskDueDate('');
      showToast('success', 'Task Scheduled', 'New study milestone added to planner.');
    } catch {
      showToast('error', 'Error', 'Failed to create task');
    } finally {
      setIsCreating(false);
    }
  };

  const filteredTasks = tasks.filter((t) => {
    if (activeFilter === 'pending') return !t.completed;
    if (activeFilter === 'completed') return t.completed;
    if (activeFilter === 'recommendations') return t.isRecommendation;
    return true;
  });

  const recommendedTasks = tasks.filter((t) => t.isRecommendation && !t.completed);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-serif text-2xl font-bold text-[#6D4AFF]">Personalized Study Planner</h2>
          <p className="text-xs text-stone-500">
            Targeted study milestones and automated revision recommendations from your quiz assessments
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#6D4AFF] hover:bg-[#0E2C22] text-white text-xs font-semibold shadow-2xs transition-all cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4 text-emerald-300" />
          <span>Add Custom Task</span>
        </button>
      </div>

      {/* Adaptive Revision Recommendations Banner */}
      {recommendedTasks.length > 0 && (
        <div className="p-5 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-700" />
            <h3 className="font-serif text-sm font-bold text-amber-950">
              Adaptive Revision Recommendations ({recommendedTasks.length})
            </h3>
          </div>
          <p className="text-xs text-amber-900 leading-relaxed">
            The adaptive engine noticed lower quiz accuracy in these topics and scheduled targeted review tasks for you:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {recommendedTasks.map((rt) => (
              <div key={rt.id} className="p-3.5 rounded-xl bg-white border border-amber-200/90 shadow-2xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-xs font-bold text-stone-900">
                    <span>{rt.title}</span>
                    <span className="text-[10px] uppercase px-1.5 py-0.5 rounded bg-rose-100 text-rose-800">
                      {rt.priority}
                    </span>
                  </div>
                  {rt.reason && (
                    <p className="text-[11px] text-stone-500 mt-1 italic leading-relaxed">
                      💡 Reason: {rt.reason}
                    </p>
                  )}
                </div>
                <div className="flex items-center justify-between mt-3 pt-2 border-t border-stone-100 text-[11px]">
                  <span className="text-stone-400 font-mono">Due: {rt.dueDate}</span>
                  <button
                    onClick={() => handleToggleTask(rt)}
                    className="font-bold text-[#6D4AFF] hover:underline cursor-pointer"
                  >
                    Mark as Done ✓
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 border-b border-[#E8E5F0] pb-2 text-xs">
        <button
          onClick={() => setActiveFilter('all')}
          className={`px-3 py-1.5 rounded-lg font-semibold cursor-pointer transition-colors ${
            activeFilter === 'all'
              ? 'bg-[#6D4AFF] text-white'
              : 'text-stone-600 hover:bg-stone-100'
          }`}
        >
          All Tasks ({tasks.length})
        </button>
        <button
          onClick={() => setActiveFilter('pending')}
          className={`px-3 py-1.5 rounded-lg font-semibold cursor-pointer transition-colors ${
            activeFilter === 'pending'
              ? 'bg-[#6D4AFF] text-white'
              : 'text-stone-600 hover:bg-stone-100'
          }`}
        >
          Active ({tasks.filter((t) => !t.completed).length})
        </button>
        <button
          onClick={() => setActiveFilter('completed')}
          className={`px-3 py-1.5 rounded-lg font-semibold cursor-pointer transition-colors ${
            activeFilter === 'completed'
              ? 'bg-[#6D4AFF] text-white'
              : 'text-stone-600 hover:bg-stone-100'
          }`}
        >
          Completed ({tasks.filter((t) => t.completed).length})
        </button>
        <button
          onClick={() => setActiveFilter('recommendations')}
          className={`px-3 py-1.5 rounded-lg font-semibold cursor-pointer transition-colors ${
            activeFilter === 'recommendations'
              ? 'bg-[#6D4AFF] text-white'
              : 'text-stone-600 hover:bg-stone-100'
          }`}
        >
          Recommendations ({tasks.filter((t) => t.isRecommendation).length})
        </button>
      </div>

      {/* Tasks List */}
      {isLoading ? (
        <div className="py-16 text-center text-stone-400">
          <Loader2 className="w-6 h-6 animate-spin mx-auto text-[#6D4AFF]" />
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="py-16 text-center rounded-2xl bg-white border border-[#E8E5F0] p-6">
          <CalendarCheck className="w-8 h-8 text-stone-400 mx-auto mb-2" />
          <p className="text-sm font-semibold text-stone-700">No tasks in this filter</p>
          <p className="text-xs text-stone-500 mt-1">Schedule a study task or complete a quiz to receive recommendations.</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredTasks.map((task) => (
            <div
              key={task.id}
              className={`p-4 rounded-xl border bg-white transition-all flex items-start justify-between gap-3 ${
                task.completed ? 'border-stone-200 opacity-60 bg-stone-50/50' : 'border-[#E8E5F0] shadow-2xs'
              }`}
            >
              <div className="flex items-start gap-3 min-w-0">
                <input
                  type="checkbox"
                  checked={task.completed}
                  onChange={() => handleToggleTask(task)}
                  className="mt-1 w-4 h-4 rounded text-emerald-700 border-stone-300 focus:ring-emerald-500 cursor-pointer"
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className={`font-semibold text-xs sm:text-sm ${task.completed ? 'line-through text-stone-500' : 'text-stone-900'}`}>
                      {task.title}
                    </p>
                    {task.isRecommendation && (
                      <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-100 text-amber-900">
                        Adaptive Recommendation
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3 text-[11px] text-stone-500 mt-1 flex-wrap">
                    <span className="font-medium text-emerald-900 bg-emerald-50 px-2 py-0.2 rounded">
                      {task.topic}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-stone-400" />
                      Due {task.dueDate}
                    </span>
                    <span
                      className={`font-semibold uppercase text-[10px] ${
                        task.priority === 'high'
                          ? 'text-rose-600'
                          : task.priority === 'medium'
                          ? 'text-amber-600'
                          : 'text-stone-500'
                      }`}
                    >
                      {task.priority} Priority
                    </span>
                  </div>

                  {task.reason && (
                    <p className="text-[11px] text-stone-500 mt-1.5 italic bg-stone-50 p-1.5 rounded border border-stone-100">
                      Reason: {task.reason}
                    </p>
                  )}
                </div>
              </div>

              <button
                onClick={() => handleDeleteTask(task.id)}
                className="p-1.5 rounded-lg text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer shrink-0"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add Task Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-[#F7F5FF] border border-[#E8E5F0] rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
            <h3 className="font-serif text-lg font-bold text-[#6D4AFF]">Create Study Task</h3>

            <form onSubmit={handleCreateTask} className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-xs font-bold text-stone-700">Task Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Revise Chapter 4 Linearizability proof..."
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-stone-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#6D4AFF]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-stone-700">Topic Area</label>
                <input
                  type="text"
                  placeholder="e.g. Linearizability"
                  value={taskTopic}
                  onChange={(e) => setTaskTopic(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-stone-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#6D4AFF]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-stone-700">Due Date</label>
                  <input
                    type="date"
                    value={taskDueDate}
                    onChange={(e) => setTaskDueDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white border border-stone-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#6D4AFF]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-stone-700">Priority</label>
                  <select
                    value={taskPriority}
                    onChange={(e) => setTaskPriority(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs bg-white border border-stone-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#6D4AFF]"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-stone-700">Linked Document (Optional)</label>
                <select
                  value={taskDocId}
                  onChange={(e) => setTaskDocId(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-stone-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#6D4AFF]"
                >
                  <option value="">None</option>
                  {documents.map((d) => (
                    <option key={d.id} value={d.id}>{d.title}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3.5 py-2 text-xs font-semibold text-stone-600 hover:text-stone-900 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-[#6D4AFF] hover:bg-[#0E2C22] text-white shadow-xs cursor-pointer"
                >
                  {isCreating ? 'Saving...' : 'Add Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
