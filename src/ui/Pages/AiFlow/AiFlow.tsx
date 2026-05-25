import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageType } from '~/enums/PageType.enum';
import { useResizePage } from '~/ui/helpers/hooks/useResizePage';
import {
  type AiTodoFlowDraft,
  type AiAnalysisMode,
  type AiAnalysisHistoryEntry,
  type AiOutputLanguage,
  type AiTodoFlowAnalysis,
  buildAiTodoFlowAnalysisContext,
  createAiAnalysisHistoryEntry,
  createAiTodoFlowAnalysisPrompt,
  createAiTodoFlowDraftHistoryEntry,
  createAiTodoFlowPrompt,
  createTodoFlowFromAiDraft,
  formatDateChipLabels,
  getTodoFlowAnalytics,
  getTodoScheduleDateKeys,
  hasAiTodoFlowContextData,
  parseAiTodoFlowAnalysisResult,
  parseAiTodoFlowDraftResult,
} from '~/ui/helpers/utils/scheduleUtils';
import { formatTime, generateId } from '~/ui/helpers/utils/utils';
import AppDropdown from '~/ui/components/AppDropdown/AppDropdown';
import DateChipList from '~/ui/components/DateChipList/DateChipList';
import { useAlert } from '~/ui/helpers/hooks/useAlert';
import { formatAiProviderError } from '~/shared/aiProvider';
import { useAppDispatch } from '~/ui/store/hooks';
import { setTodo } from '~/ui/store/todo/todoSlice';
import './AiFlow.css';

const withoutRuntimeTimer = (todo: TodoFlow): TodoFlow => ({ ...todo, timer: null });
type AiProvider = 'openai' | 'anthropic' | 'gemini' | 'custom';
const pageSize = 5;

interface AiConfig {
  provider: AiProvider;
  model: string;
  apiKey: string;
  customUrl: string;
}

const storageKey = 'aiTodoFlowConfig';
const modelOptions: Record<AiProvider, string[]> = {
  openai: ['gpt-5.2', 'gpt-5-mini', 'gpt-5-nano', 'gpt-4.1'],
  anthropic: ['claude-sonnet-4-20250514', 'claude-opus-4-1-20250805', 'claude-3-7-sonnet-latest', 'claude-3-5-haiku-latest'],
  gemini: ['gemini-3.5-flash', 'gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-2.5-pro'],
  custom: ['dailyflow-todoflow-v1'],
};
const providerOptions: { value: AiProvider; label: string; disabled?: boolean }[] = [
  { value: 'openai', label: 'GPT (disabled)', disabled: true },
  { value: 'anthropic', label: 'Claude (disabled)', disabled: true },
  { value: 'gemini', label: 'Gemini' },
  { value: 'custom', label: 'Custom Config' },
];
const analysisModeOptions: { value: AiAnalysisMode; label: string }[] = [
  { value: 'today_plan', label: 'Today Plan' },
  { value: 'workload_review', label: 'Workload Review' },
  { value: 'estimate_review', label: 'Estimate Review' },
];
const outputLanguageOptions: { value: AiOutputLanguage; label: string }[] = [
  { value: 'vi', label: 'Tiếng Việt' },
  { value: 'en', label: 'English' },
  { value: 'ja', label: '日本語' },
];

const readableOutputLanguageOptions = outputLanguageOptions.map((option) => ({
  ...option,
  label: option.value === 'vi' ? 'Vietnamese' : option.value === 'ja' ? 'Japanese' : option.label,
}));

const defaultConfig: AiConfig = {
  provider: 'gemini',
  model: modelOptions.gemini[0],
  apiKey: '',
  customUrl: '',
};

function loadAiConfig(): AiConfig {
  try {
    const savedConfig = localStorage.getItem(storageKey);
    if (!savedConfig) return defaultConfig;
    const parsed = JSON.parse(savedConfig) as Partial<AiConfig>;
    const provider =
      parsed.provider && parsed.provider in modelOptions && parsed.provider !== 'openai' && parsed.provider !== 'anthropic'
        ? parsed.provider
        : defaultConfig.provider;
    const models = modelOptions[provider];
    return {
      provider,
      model: parsed.model && (provider === 'custom' || models.includes(parsed.model)) ? parsed.model : models[0],
      apiKey: parsed.apiKey || '',
      customUrl: parsed.customUrl || '',
    };
  } catch {
    return defaultConfig;
  }
}

const AiFlow = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const resultPanelRef = useRef<HTMLElement | null>(null);
  const [todos, setTodos] = useState<TodoFlow[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [archivedTodos, setArchivedTodos] = useState<ArchivedTodoSummary[]>([]);
  const [config, setConfig] = useState<AiConfig>(() => loadAiConfig());
  const [analysisPrompt, setAnalysisPrompt] = useState('');
  const [draftPrompt, setDraftPrompt] = useState('');
  const [result, setResult] = useState('');
  const [analysisResult, setAnalysisResult] = useState<AiTodoFlowAnalysis | null>(null);
  const [draftResult, setDraftResult] = useState<AiTodoFlowDraft | null>(null);
  const [analysisMode, setAnalysisMode] = useState<AiAnalysisMode>('today_plan');
  const [outputLanguage, setOutputLanguage] = useState<AiOutputLanguage>('vi');
  const [analysisHistory, setAnalysisHistory] = useState<AiAnalysisHistoryEntry[]>([]);
  const [contextPage, setContextPage] = useState(1);
  const [historyPage, setHistoryPage] = useState(1);
  const [status, setStatus] = useState('');
  const [statusType, setStatusType] = useState<'info' | 'error'>('info');
  const [isLoading, setIsLoading] = useState(false);
  const { askInApp, error: showError } = useAlert();
  useResizePage(PageType.MAIN);

  const fetchItems = async () => {
    const [allTodos, allTasks, allArchivedTodos, allHistory]: [
      TodoFlow[],
      Task[],
      ArchivedTodoSummary[],
      AiAnalysisHistoryEntry[],
    ] = await Promise.all([
      window.electronAPI.todoGetAll(),
      window.electronAPI.taskGetAll(),
      window.electronAPI.todoArchiveGetAll(),
      window.electronAPI.aiAnalysisHistoryGetAll(),
    ]);
    setTodos(allTodos.map(withoutRuntimeTimer));
    setTasks(allTasks);
    setArchivedTodos(allArchivedTodos);
    setAnalysisHistory(allHistory);
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const stats = useMemo(() => getTodoFlowAnalytics(todos, tasks), [todos, tasks]);
  const contextPageCount = Math.max(1, Math.ceil(todos.length / pageSize));
  const historyPageCount = Math.max(1, Math.ceil(analysisHistory.length / pageSize));
  const pagedTodos = useMemo(
    () => todos.slice((contextPage - 1) * pageSize, contextPage * pageSize),
    [contextPage, todos]
  );
  const pagedHistory = useMemo(
    () => analysisHistory.slice((historyPage - 1) * pageSize, historyPage * pageSize),
    [analysisHistory, historyPage]
  );
  const currentModels = modelOptions[config.provider];
  const hasContextData = useMemo(
    () => hasAiTodoFlowContextData(todos, tasks, archivedTodos),
    [archivedTodos, tasks, todos]
  );

  useEffect(() => {
    if (contextPage > contextPageCount) {
      setContextPage(contextPageCount);
    }
  }, [contextPage, contextPageCount]);

  useEffect(() => {
    if (historyPage > historyPageCount) {
      setHistoryPage(historyPageCount);
    }
  }, [historyPage, historyPageCount]);

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(config));
  }, [config]);

  const updateProvider = (provider: AiProvider) => {
    if (provider === 'openai' || provider === 'anthropic') {
      return;
    }

    setConfig((current) => ({
      ...current,
      provider,
      model: modelOptions[provider][0],
    }));
  };

  const runAiRequest = async (prompt: string, nextStatus: string) => {
    setIsLoading(true);
    setStatus(nextStatus);
    setStatusType('info');
    setResult('');
    setAnalysisResult(null);
    setDraftResult(null);
    try {
      const response = await window.electronAPI.aiRequest({ ...config, prompt });
      setResult(response);
      setStatus('Done');
      setStatusType('info');
    } catch (error) {
      const message = formatAiProviderError(error);
      setStatus(message);
      setStatusType('error');
      await showError(message, 'AI request failed');
    } finally {
      setIsLoading(false);
    }
  };

  const testConfig = async () => {
    await runAiRequest('Reply with exactly: TodoFlow AI config OK', 'Testing config...');
  };

  const confirmNoDataRequest = async (actionLabel: string): Promise<boolean> => {
    if (hasContextData) {
      return true;
    }

    const result = await askInApp(
      `There are no TodoFlows, standalone tasks, or archived TodoFlows yet. ${actionLabel} can still continue, but the AI response will only use your prompt and general guidance.`,
      'No TodoFlow data',
      ['Continue', 'Cancel']
    );
    return result.response === 0;
  };

  const analyzeTodoFlow = async () => {
    const shouldContinue = await confirmNoDataRequest('Analyze');
    if (!shouldContinue) return;

    const context = buildAiTodoFlowAnalysisContext(todos, tasks, archivedTodos, { mode: analysisMode });
    const prompt = createAiTodoFlowAnalysisPrompt(context, analysisPrompt, outputLanguage);
    setIsLoading(true);
    setStatus('Analyzing TodoFlow data...');
    setStatusType('info');
    setResult('');
    setAnalysisResult(null);
    setDraftResult(null);
    try {
      const response = await window.electronAPI.aiRequest({ ...config, prompt });
      const parsedResult = parseAiTodoFlowAnalysisResult(response);
      const historyEntry = createAiAnalysisHistoryEntry({
        id: `analysis-${Date.now()}`,
        createdAt: new Date().toISOString(),
        provider: config.provider,
        model: config.model,
        mode: analysisMode,
        outputLanguage,
        userRequest: analysisPrompt,
        rawResponse: response,
        result: parsedResult,
      });
      setResult(response);
      setAnalysisResult(parsedResult);
      await window.electronAPI.aiAnalysisHistoryUpsert(historyEntry);
      setAnalysisHistory((current) => [historyEntry, ...current.filter((entry) => entry.id !== historyEntry.id)].slice(0, 30));
      setStatus('Done');
      setStatusType('info');
    } catch (error) {
      const message = formatAiProviderError(error);
      setStatus(message);
      setStatusType('error');
      await showError(message, 'AI request failed');
    } finally {
      setIsLoading(false);
    }
  };

  const createTodoFlowDraft = async () => {
    const shouldContinue = await confirmNoDataRequest('Create Draft');
    if (!shouldContinue) return;

    const prompt = createAiTodoFlowPrompt(todos, tasks, draftPrompt, undefined, outputLanguage);
    setIsLoading(true);
    setStatus('Creating TodoFlow draft...');
    setStatusType('info');
    setResult('');
    setAnalysisResult(null);
    setDraftResult(null);
    try {
      const response = await window.electronAPI.aiRequest({ ...config, prompt });
      const parsedDraft = parseAiTodoFlowDraftResult(response);
      const historyEntry = createAiTodoFlowDraftHistoryEntry({
        id: `draft-${Date.now()}`,
        createdAt: new Date().toISOString(),
        provider: config.provider,
        model: config.model,
        outputLanguage,
        userRequest: draftPrompt,
        rawResponse: response,
        result: parsedDraft,
      });
      setResult(response);
      setDraftResult(parsedDraft);
      await window.electronAPI.aiAnalysisHistoryUpsert(historyEntry);
      setAnalysisHistory((current) => [historyEntry, ...current.filter((entry) => entry.id !== historyEntry.id)].slice(0, 30));
      setStatus('Done');
      setStatusType('info');
    } catch (error) {
      const message = formatAiProviderError(error);
      setStatus(message);
      setStatusType('error');
      await showError(message, 'AI request failed');
    } finally {
      setIsLoading(false);
    }
  };

  const importTodoFlowDraft = async () => {
    if (!draftResult) return;
    const nextTodo = createTodoFlowFromAiDraft(draftResult, generateId(), generateId);
    try {
      await window.electronAPI.todoUpsert(withoutRuntimeTimer(nextTodo));
      for (const taskId of nextTodo.taskIds) {
        const task = nextTodo.tasks[taskId];
        if (task) {
          await window.electronAPI.taskUpsert(task);
        }
      }
      dispatch(setTodo(nextTodo));
      navigate('/todoflow');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to import TodoFlow draft';
      setStatus(message);
      setStatusType('error');
      await showError(message, 'Import failed');
    }
  };

  const openHistoryEntry = (entry: AiAnalysisHistoryEntry) => {
    const scrollToResult = () => {
      window.requestAnimationFrame(() => {
        resultPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    };

    if (entry.kind === 'draft') {
      setAnalysisResult(null);
      setDraftResult(entry.result as AiTodoFlowDraft);
      setResult(entry.rawResponse);
      setOutputLanguage(entry.outputLanguage);
      setDraftPrompt(entry.userRequest);
      setStatus(`Loaded ${new Date(entry.createdAt).toLocaleString()}`);
      setStatusType('info');
      scrollToResult();
      return;
    }

    setAnalysisResult(entry.result as AiTodoFlowAnalysis);
    setDraftResult(null);
    setResult(entry.rawResponse);
    if (entry.mode) {
      setAnalysisMode(entry.mode);
    }
    setOutputLanguage(entry.outputLanguage);
    setAnalysisPrompt(entry.userRequest);
    setStatus(`Loaded ${new Date(entry.createdAt).toLocaleString()}`);
    setStatusType('info');
    scrollToResult();
  };

  const deleteHistoryEntry = async (entryId: string) => {
    await window.electronAPI.aiAnalysisHistoryRemove(entryId);
    setAnalysisHistory((current) => current.filter((entry) => entry.id !== entryId));
  };

  const clearAnalysisHistory = async () => {
    await window.electronAPI.aiAnalysisHistoryClear();
    setAnalysisHistory([]);
    setHistoryPage(1);
  };

  return (
    <div className="ai-page">
      <div className="ai-header">
        <h1 className="text-2xl font-bold text-highlight">AI TodoFlow</h1>
      </div>

      <section className="ai-config card">
        <div>
          <AppDropdown
            label="Provider"
            value={config.provider}
            options={providerOptions}
            disabled={isLoading}
            onChange={updateProvider}
          />
        </div>
        <div>
          {config.provider === 'custom' ? (
            <>
              <label>Model</label>
              <input
                className="input input-primary"
                value={config.model}
                disabled={isLoading}
                onChange={(event) => setConfig((current) => ({ ...current, model: event.target.value }))}
                placeholder="dailyflow-todoflow-v1"
              />
            </>
          ) : (
            <AppDropdown
              label="Model"
              value={config.model}
              options={currentModels.map((model) => ({ value: model, label: model }))}
              disabled={isLoading}
              onChange={(model) => setConfig((current) => ({ ...current, model }))}
            />
          )}
        </div>
        <div>
          <AppDropdown
            label="Language"
            value={outputLanguage}
            options={readableOutputLanguageOptions}
            disabled={isLoading}
            onChange={setOutputLanguage}
          />
        </div>
        <div className="ai-api-key">
          <label>API key</label>
          <input
            className="input input-primary"
            type="password"
            value={config.apiKey}
            onChange={(event) => setConfig((current) => ({ ...current, apiKey: event.target.value }))}
            placeholder="Paste API key"
          />
        </div>
        {config.provider === 'custom' && (
          <div className="ai-custom-url">
            <label>Custom URL</label>
            <input
              className="input input-primary"
              value={config.customUrl}
              disabled={isLoading}
              onChange={(event) => setConfig((current) => ({ ...current, customUrl: event.target.value }))}
              placeholder="https://your-server.example/ai/todoflow"
            />
          </div>
        )}
        <button className="btn btn-secondary h-[38px]" disabled={isLoading} onClick={testConfig}>
          Test config
        </button>
      </section>

      <div className="ai-grid">
        <section className="ai-panel card">
          <h2>Analyze</h2>
          <p className="ai-field-help">
            Optional focus question for the analysis. Leave it empty to let the app analyze the selected mode automatically.
          </p>
          <AppDropdown
            label="Mode"
            value={analysisMode}
            options={analysisModeOptions}
            disabled={isLoading}
            onChange={setAnalysisMode}
            className="ai-mode-dropdown"
          />
          <textarea
            className="input input-primary ai-textarea"
            value={analysisPrompt}
            onChange={(event) => setAnalysisPrompt(event.target.value)}
            placeholder="Example: Focus on unfinished tasks and schedule pressure today"
          />
          <button className="btn btn-primary w-full h-[36px]" disabled={isLoading} onClick={analyzeTodoFlow}>
            Analyze
          </button>
        </section>

        <section className="ai-panel card">
          <h2>Create TodoFlow</h2>
          <p className="ai-field-help">
            Optional goal for a new TodoFlow draft. Add duration, priorities, constraints, or preferred task breakdown.
          </p>
          <textarea
            className="input input-primary ai-textarea"
            value={draftPrompt}
            onChange={(event) => setDraftPrompt(event.target.value)}
            placeholder="Example: Create a 90-minute draft for fixing provider errors and reviewing UI"
          />
          <button className="btn btn-primary w-full h-[36px]" disabled={isLoading} onClick={createTodoFlowDraft}>
            Create Draft
          </button>
        </section>

        <section className="ai-panel card ai-result-panel" ref={resultPanelRef}>
          <h2>Result</h2>
          {status && <p className={`ai-status ai-status-${statusType}`}>{status}</p>}
          {analysisResult ? (
            <div className="ai-analysis-result">
              <section className="ai-analysis-section">
                <h3>Summary</h3>
                <p>{analysisResult.summary}</p>
              </section>

              <section className="ai-analysis-metrics">
                <div>
                  <span>Planned</span>
                  <strong>{formatTime(analysisResult.metrics.plannedSeconds)}</strong>
                </div>
                <div>
                  <span>Actual</span>
                  <strong>{formatTime(analysisResult.metrics.actualSeconds)}</strong>
                </div>
                <div>
                  <span>Completion</span>
                  <strong>{analysisResult.metrics.completionRate}%</strong>
                </div>
                <div>
                  <span>Risks</span>
                  <strong>{analysisResult.metrics.riskyItemCount}</strong>
                </div>
              </section>

              <section className="ai-analysis-section">
                <h3>Risks</h3>
                {analysisResult.risks.length === 0 ? (
                  <p className="ai-empty">No risks returned.</p>
                ) : (
                  <div className="ai-analysis-list">
                    {analysisResult.risks.map((risk, index) => (
                      <div key={`${risk.title}-${index}`} className={`ai-analysis-item severity-${risk.severity}`}>
                        <strong>{risk.title}</strong>
                        <span>{risk.reason}</span>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section className="ai-analysis-section">
                <h3>Priorities</h3>
                {analysisResult.priorities.length === 0 ? (
                  <p className="ai-empty">No priorities returned.</p>
                ) : (
                  <div className="ai-analysis-list">
                    {analysisResult.priorities.map((priority, index) => (
                      <div key={`${priority.title}-${index}`} className="ai-analysis-item">
                        <strong>{priority.title}</strong>
                        <span>{priority.reason}</span>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section className="ai-analysis-section">
                <h3>Suggestions</h3>
                {analysisResult.scheduleSuggestions.length === 0 ? (
                  <p className="ai-empty">No suggestions returned.</p>
                ) : (
                  <div className="ai-analysis-list">
                    {analysisResult.scheduleSuggestions.map((suggestion, index) => (
                      <div key={`${suggestion.title}-${index}`} className="ai-analysis-item">
                        <strong>{suggestion.title}</strong>
                        <span>{suggestion.reason}</span>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section className="ai-analysis-section">
                <h3>Action Plan</h3>
                {analysisResult.actionPlan.length === 0 ? (
                  <p className="ai-empty">No action plan returned.</p>
                ) : (
                  <ol className="ai-action-list">
                    {analysisResult.actionPlan.map((action, index) => (
                      <li key={`${action}-${index}`}>{action}</li>
                    ))}
                  </ol>
                )}
              </section>
            </div>
          ) : draftResult ? (
            <div className="ai-draft-result">
              <section className="ai-analysis-section">
                <h3>{draftResult.title}</h3>
                <p>Suggested duration: {draftResult.suggestedDurationMinutes} minutes</p>
              </section>
              <div className="ai-analysis-list">
                {draftResult.tasks.map((task, index) => (
                  <div key={`${task.title}-${index}`} className="ai-analysis-item">
                    <strong>{task.title}</strong>
                    <span>{task.estimatedMinutes} minutes</span>
                    {task.subtasks.length > 0 && (
                      <ol className="ai-action-list">
                        {task.subtasks.map((subtask, subtaskIndex) => (
                          <li key={`${subtask.title}-${subtaskIndex}`}>{subtask.title}</li>
                        ))}
                      </ol>
                    )}
                  </div>
                ))}
              </div>
              <button className="btn btn-primary w-full h-[36px]" disabled={isLoading} onClick={importTodoFlowDraft}>
                Import draft
              </button>
            </div>
          ) : (
            <pre className="ai-result">{result || 'No result yet.'}</pre>
          )}
        </section>
      </div>

      <section className="ai-context card">
        <div className="ai-context-heading">
          <h2>TodoFlow Context</h2>
          {analysisHistory.length > 0 && (
            <button className="btn btn-secondary ai-clear-history" onClick={clearAnalysisHistory}>
              Clear history
            </button>
          )}
        </div>
        <div className="ai-context-grid">
          <div>
            <span>TodoFlows</span>
            <strong>{stats.totalTodoFlows}</strong>
          </div>
          <div>
            <span>Scheduled days</span>
            <strong>{stats.scheduledDays}</strong>
          </div>
          <div>
            <span>Planned</span>
            <strong>{formatTime(stats.plannedSeconds)}</strong>
          </div>
          <div>
            <span>Actual</span>
            <strong>{formatTime(stats.actualSeconds)}</strong>
          </div>
        </div>
        <div className="ai-recent-list">
          {pagedTodos.map((todo) => (
            <div key={todo.id} className="ai-recent-item">
              <strong>{todo.note || 'TodoFlow'}</strong>
              <DateChipList labels={formatDateChipLabels(getTodoScheduleDateKeys(todo))} emptyText="Unscheduled" />
            </div>
          ))}
          {todos.length === 0 && <p className="ai-empty">No TodoFlows yet.</p>}
        </div>
        <div className="ai-pagination">
          <button className="btn btn-secondary" disabled={contextPage <= 1} onClick={() => setContextPage((page) => Math.max(1, page - 1))}>
            Previous
          </button>
          <span>
            Page {contextPage} / {contextPageCount}
          </span>
          <button
            className="btn btn-secondary"
            disabled={contextPage >= contextPageCount}
            onClick={() => setContextPage((page) => Math.min(contextPageCount, page + 1))}
          >
            Next
          </button>
        </div>
        <div className="ai-history-panel">
          <h3>AI History</h3>
          {analysisHistory.length === 0 ? (
            <p className="ai-empty">No saved AI history yet.</p>
          ) : (
            <div className="ai-history-list">
              {pagedHistory.map((entry) => (
                <div key={entry.id} className="ai-history-item">
                  <button className="ai-history-open" onClick={() => openHistoryEntry(entry)}>
                  <strong>{entry.summary || (entry.kind === 'draft' ? 'Create Draft' : 'Analysis')}</strong>
                  <span>
                    {new Date(entry.createdAt).toLocaleString()} · {entry.provider} ·{' '}
                    {entry.kind === 'draft' ? 'Create Draft' : entry.mode || 'Analysis'}
                  </span>
                  </button>
                  <button className="btn btn-secondary ai-history-delete" onClick={() => deleteHistoryEntry(entry.id)}>
                    Delete
                  </button>
                </div>
              ))}
            </div>
          )}
          {analysisHistory.length > 0 && (
            <div className="ai-pagination">
              <button className="btn btn-secondary" disabled={historyPage <= 1} onClick={() => setHistoryPage((page) => Math.max(1, page - 1))}>
                Previous
              </button>
              <span>
                Page {historyPage} / {historyPageCount}
              </span>
              <button
                className="btn btn-secondary"
                disabled={historyPage >= historyPageCount}
                onClick={() => setHistoryPage((page) => Math.min(historyPageCount, page + 1))}
              >
                Next
              </button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default AiFlow;
