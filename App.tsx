import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Trophy, 
  History as HistoryIcon, 
  User as UserIcon, 
  Plus, 
  CheckCircle2, 
  Circle, 
  Trash2, 
  AlertOctagon, 
  Save,
  Loader2,
  Calendar
} from 'lucide-react';
import { AppState, Goal, ViewState, DailyRecord } from './types';
import { loadState, saveState } from './services/storage';
import { generateDailyReport, DailyFeedback } from './services/gemini';
import HistoryChart from './components/HistoryChart';

export default function App() {
  // --- State ---
  const [state, setState] = useState<AppState>(loadState());
  const [currentView, setCurrentView] = useState<ViewState>('dashboard');
  const [newGoalText, setNewGoalText] = useState('');
  const [isProcessingEndDay, setIsProcessingEndDay] = useState(false);
  const [endDayResult, setEndDayResult] = useState<DailyFeedback | null>(null);

  // --- Effects ---
  useEffect(() => {
    saveState(state);
  }, [state]);

  // --- Handlers ---

  const handleAddGoal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGoalText.trim()) return;

    const newGoal: Goal = {
      id: Date.now().toString(),
      text: newGoalText.trim(),
      completed: false,
      createdAt: Date.now(),
    };

    setState((prev) => ({
      ...prev,
      currentGoals: [...prev.currentGoals, newGoal],
    }));
    setNewGoalText('');
  };

  const toggleGoal = (id: string) => {
    setState((prev) => ({
      ...prev,
      currentGoals: prev.currentGoals.map((g) =>
        g.id === id ? { ...g, completed: !g.completed } : g
      ),
    }));
  };

  const deleteGoal = (id: string) => {
    setState((prev) => ({
      ...prev,
      currentGoals: prev.currentGoals.filter((g) => g.id !== id),
    }));
  };

  const handleProfileUpdate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;
    const bio = formData.get('bio') as string;

    setState((prev) => ({
      ...prev,
      user: { ...prev.user, name, bio },
    }));
    alert('Profile updated!');
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setState((prev) => ({
          ...prev,
          user: { ...prev.user, avatarUrl: reader.result as string },
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleEndDay = async () => {
    if (state.currentGoals.length === 0) {
      alert("Add some goals before ending the day!");
      return;
    }

    setIsProcessingEndDay(true);
    setEndDayResult(null);

    try {
      // 1. Get AI Analysis
      const feedback = await generateDailyReport(state.currentGoals, state.user.name);
      
      setEndDayResult(feedback);

      // 2. Create Record
      const newRecord: DailyRecord = {
        id: Date.now().toString(),
        date: new Date().toISOString(),
        goals: [...state.currentGoals],
        score: feedback.score,
        summary: feedback.message,
        completionRate: state.currentGoals.filter(g => g.completed).length / state.currentGoals.length
      };

      // 3. Update State (Add credits, Save History, Clear Goals)
      // Note: We don't clear goals immediately in UI to let user see the result modal
      // We will clear them when they acknowledge the modal.
      
      // Temporary ref to hold the record to be saved on modal close
      (window as any).__tempRecord = newRecord;

    } catch (error) {
      console.error("End day failed", error);
      alert("Failed to generate report. Please try again.");
    } finally {
      setIsProcessingEndDay(false);
    }
  };

  const confirmEndDay = () => {
    const record = (window as any).__tempRecord as DailyRecord;
    
    setState((prev) => ({
      ...prev,
      user: {
        ...prev.user,
        credits: prev.user.credits + record.score // Add score to credits
      },
      history: [...prev.history, record],
      currentGoals: [] // Reset goals for tomorrow
    }));
    setEndDayResult(null);
    setCurrentView('history');
  };

  // --- Views ---

  const renderHeader = () => (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="bg-indigo-600 p-2 rounded-lg">
             <Trophy className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-xl text-gray-900 tracking-tight">GoalKeeper</span>
        </div>
        
        <div className="flex items-center space-x-2 bg-indigo-50 px-3 py-1.5 rounded-full border border-indigo-100">
          <span className="text-xs font-semibold text-indigo-600 uppercase tracking-wide">Credits</span>
          <span className="font-bold text-indigo-700">{state.user.credits}</span>
        </div>
      </div>
    </header>
  );

  const renderNav = () => (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 pb-safe z-20">
      <div className="max-w-3xl mx-auto flex justify-around p-2">
        <button
          onClick={() => setCurrentView('dashboard')}
          className={`p-3 rounded-xl flex flex-col items-center space-y-1 transition-colors ${
            currentView === 'dashboard' ? 'text-indigo-600 bg-indigo-50' : 'text-gray-500 hover:bg-gray-50'
          }`}
        >
          <Trophy className="w-6 h-6" />
          <span className="text-xs font-medium">Goals</span>
        </button>
        <button
          onClick={() => setCurrentView('history')}
          className={`p-3 rounded-xl flex flex-col items-center space-y-1 transition-colors ${
            currentView === 'history' ? 'text-indigo-600 bg-indigo-50' : 'text-gray-500 hover:bg-gray-50'
          }`}
        >
          <HistoryIcon className="w-6 h-6" />
          <span className="text-xs font-medium">History</span>
        </button>
        <button
          onClick={() => setCurrentView('profile')}
          className={`p-3 rounded-xl flex flex-col items-center space-y-1 transition-colors ${
            currentView === 'profile' ? 'text-indigo-600 bg-indigo-50' : 'text-gray-500 hover:bg-gray-50'
          }`}
        >
          <UserIcon className="w-6 h-6" />
          <span className="text-xs font-medium">Profile</span>
        </button>
      </div>
    </nav>
  );

  const renderDashboard = () => (
    <div className="space-y-6 animate-fade-in">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-indigo-600 to-violet-600 rounded-2xl p-6 text-white shadow-lg">
        <h2 className="text-2xl font-bold mb-1">Hello, {state.user.name.split(' ')[0]}!</h2>
        <p className="text-indigo-100 opacity-90">Ready to crush your goals today?</p>
      </div>

      {/* Add Goal Input */}
      <form onSubmit={handleAddGoal} className="relative">
        <input
          type="text"
          value={newGoalText}
          onChange={(e) => setNewGoalText(e.target.value)}
          placeholder="What is your main focus today?"
          className="w-full px-5 py-4 pr-12 rounded-xl border border-gray-200 shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
        />
        <button 
          type="submit"
          className="absolute right-3 top-1/2 -translate-y-1/2 bg-indigo-600 hover:bg-indigo-700 text-white p-2 rounded-lg transition-colors"
          disabled={!newGoalText.trim()}
        >
          <Plus className="w-5 h-5" />
        </button>
      </form>

      {/* Goals List */}
      <div className="space-y-3 pb-24">
        {state.currentGoals.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <div className="mb-3 inline-block p-4 bg-gray-50 rounded-full">
              <Calendar className="w-8 h-8 text-gray-300" />
            </div>
            <p>No goals set for today yet.</p>
          </div>
        ) : (
          state.currentGoals.map((goal) => (
            <div 
              key={goal.id} 
              className={`group flex items-center p-4 bg-white rounded-xl border transition-all duration-200 ${
                goal.completed 
                  ? 'border-green-200 bg-green-50/30' 
                  : 'border-gray-100 hover:border-indigo-200 hover:shadow-sm'
              }`}
            >
              <button
                onClick={() => toggleGoal(goal.id)}
                className={`flex-shrink-0 mr-4 transition-colors ${
                  goal.completed ? 'text-green-500' : 'text-gray-300 hover:text-indigo-500'
                }`}
              >
                {goal.completed ? (
                  <CheckCircle2 className="w-6 h-6 fill-green-100" />
                ) : (
                  <Circle className="w-6 h-6" />
                )}
              </button>
              <span className={`flex-grow font-medium ${
                goal.completed ? 'text-gray-400 line-through' : 'text-gray-700'
              }`}>
                {goal.text}
              </span>
              <button
                onClick={() => deleteGoal(goal.id)}
                className="opacity-0 group-hover:opacity-100 p-2 text-gray-400 hover:text-red-500 transition-opacity"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))
        )}

        {state.currentGoals.length > 0 && (
          <div className="pt-6">
            <button
              onClick={handleEndDay}
              disabled={isProcessingEndDay}
              className="w-full bg-gray-900 text-white font-semibold py-4 rounded-xl shadow-lg hover:bg-gray-800 active:scale-[0.98] transition-all flex items-center justify-center space-x-2"
            >
              {isProcessingEndDay ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Evaluating Performance...</span>
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  <span>End Day & Get Results</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );

  const renderHistory = () => (
    <div className="space-y-6 pb-24">
      <h2 className="text-2xl font-bold text-gray-900">History</h2>
      
      <HistoryChart history={state.history} />

      <div className="space-y-4">
        {state.history.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No records yet. Complete a day to see history!</p>
        ) : (
          [...state.history].reverse().map((record) => (
            <div key={record.id} className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <div className="text-sm text-gray-500">{new Date(record.date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
                  <div className={`text-lg font-bold ${
                    record.score >= 80 ? 'text-green-600' : record.score < 50 ? 'text-red-600' : 'text-amber-600'
                  }`}>
                    Score: {record.score}/100
                  </div>
                </div>
                <div className="flex -space-x-1">
                  {record.goals.slice(0, 3).map((g, i) => (
                    <div 
                      key={i} 
                      className={`w-3 h-3 rounded-full border-2 border-white ${g.completed ? 'bg-green-500' : 'bg-red-400'}`} 
                    />
                  ))}
                  {record.goals.length > 3 && (
                    <div className="w-3 h-3 rounded-full border-2 border-white bg-gray-300" />
                  )}
                </div>
              </div>
              <p className="text-gray-600 text-sm bg-gray-50 p-3 rounded-lg italic">"{record.summary}"</p>
              <div className="mt-4 flex items-center justify-between text-xs text-gray-400">
                <span>{record.goals.filter(g => g.completed).length} / {record.goals.length} Goals</span>
                <span>{Math.round(record.completionRate * 100)}% Completion</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );

  const renderProfile = () => (
    <div className="space-y-6 pb-24">
      <h2 className="text-2xl font-bold text-gray-900">Profile</h2>
      
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col items-center">
        <div className="relative group cursor-pointer mb-4">
          <div className="w-24 h-24 rounded-full overflow-hidden bg-indigo-100 border-4 border-white shadow-md">
            <img 
              src={state.user.avatarUrl || `https://picsum.photos/seed/${state.user.name}/200`} 
              alt="Profile" 
              className="w-full h-full object-cover"
            />
          </div>
          <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <span className="text-white text-xs font-medium">Change</span>
          </div>
          <input 
            type="file" 
            accept="image/*" 
            onChange={handleAvatarChange}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
        </div>
        
        <form onSubmit={handleProfileUpdate} className="w-full space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Full Name</label>
            <input 
              name="name" 
              defaultValue={state.user.name} 
              className="w-full p-3 rounded-lg bg-gray-50 border border-gray-200 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Bio / Motto</label>
            <textarea 
              name="bio" 
              defaultValue={state.user.bio} 
              rows={3}
              className="w-full p-3 rounded-lg bg-gray-50 border border-gray-200 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all resize-none"
            />
          </div>
          <button 
            type="submit" 
            className="w-full bg-indigo-600 text-white font-medium py-3 rounded-xl hover:bg-indigo-700 transition-colors"
          >
            Save Changes
          </button>
        </form>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm text-center">
          <div className="text-3xl font-bold text-indigo-600">{state.history.length}</div>
          <div className="text-xs text-gray-500 uppercase mt-1">Days Tracked</div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm text-center">
          <div className="text-3xl font-bold text-indigo-600">
            {state.history.length > 0 
              ? Math.round(state.history.reduce((acc, curr) => acc + curr.score, 0) / state.history.length) 
              : 0}
          </div>
          <div className="text-xs text-gray-500 uppercase mt-1">Avg Score</div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900">
      {renderHeader()}
      
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {currentView === 'dashboard' && renderDashboard()}
        {currentView === 'history' && renderHistory()}
        {currentView === 'profile' && renderProfile()}
      </main>

      {renderNav()}

      {/* End Day Result Modal */}
      {endDayResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className={`bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl transform transition-all scale-100 ${
            endDayResult.tone === 'danger' ? 'border-t-8 border-red-500' :
            endDayResult.tone === 'success' ? 'border-t-8 border-green-500' :
            'border-t-8 border-amber-500'
          }`}>
            <div className="p-8 text-center">
              <div className={`mx-auto w-20 h-20 rounded-full flex items-center justify-center mb-6 ${
                endDayResult.tone === 'danger' ? 'bg-red-100 text-red-600' :
                endDayResult.tone === 'success' ? 'bg-green-100 text-green-600' :
                'bg-amber-100 text-amber-600'
              }`}>
                {endDayResult.tone === 'danger' ? <AlertOctagon className="w-10 h-10" /> :
                 endDayResult.tone === 'success' ? <Trophy className="w-10 h-10" /> :
                 <CheckCircle2 className="w-10 h-10" />}
              </div>
              
              <h3 className="text-3xl font-bold text-gray-900 mb-2">
                Score: {endDayResult.score}
              </h3>
              
              <div className="bg-gray-50 rounded-xl p-4 mb-6 border border-gray-100">
                <p className="text-gray-700 italic">"{endDayResult.message}"</p>
              </div>

              {endDayResult.tone === 'danger' && (
                <p className="text-red-600 text-sm font-semibold mb-6 uppercase tracking-wide">
                  ⚠️ Danger: Performance Alert
                </p>
              )}

              <button
                onClick={confirmEndDay}
                className={`w-full py-3.5 rounded-xl text-white font-bold text-lg shadow-md transition-transform active:scale-[0.98] ${
                  endDayResult.tone === 'danger' ? 'bg-red-600 hover:bg-red-700' :
                  endDayResult.tone === 'success' ? 'bg-green-600 hover:bg-green-700' :
                  'bg-amber-600 hover:bg-amber-700'
                }`}
              >
                Accept & Continue
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}