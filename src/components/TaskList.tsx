import { useState } from 'react';
import { useTaskStore, Task } from '../stores/taskStore';
import { useTimerStore } from '../stores/timerStore';
import { useWebcamStore } from '../stores/webcamStore';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent
} from '@dnd-kit/core';
import {
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Sortable Task Item Component
function SortableTaskItem({
    task,
    editingId,
    editTitle,
    timerState,
    onEdit,
    onSave,
    onDelete,
    onToggle,
    onFocus,
    onSetEditTitle,
    canStartFocus
}: {
    task: Task;
    editingId: string | null;
    editTitle: string;
    timerState: string;
    onEdit: (task: Task) => void;
    onSave: (id: string) => void;
    onDelete: (id: string) => void;
    onToggle: (id: string) => void;
    onFocus: (id: string) => void;
    onSetEditTitle: (title: string) => void;
    canStartFocus: boolean;
}) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: task.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 10 : 1,
        opacity: isDragging ? 0.8 : 1
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            className={`flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded-lg border transition-colors ${isDragging
                ? 'border-blue-500 shadow-lg'
                : 'border-gray-200 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-500'
                }`}
        >
            <div className="cursor-grab text-gray-400 hover:text-gray-600 dark:text-gray-600 dark:hover:text-gray-400 px-1">
                ⋮⋮
            </div>

            <button
                onClick={(e) => {
                    e.stopPropagation(); // Prevent drag start
                    onToggle(task.id);
                }}
                onPointerDown={(e) => e.stopPropagation()} // Stop drag sensor
                className="w-5 h-5 rounded border-2 border-gray-300 dark:border-gray-600 hover:border-blue-500"
            />

            {editingId === task.id ? (
                <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => onSetEditTitle(e.target.value)}
                    onBlur={() => onSave(task.id)}
                    onKeyDown={(e) => e.key === 'Enter' && onSave(task.id)}
                    className="flex-1 px-2 py-1 rounded border border-blue-400 bg-white dark:bg-gray-700"
                    autoFocus
                    onPointerDown={(e) => e.stopPropagation()}
                />
            ) : (
                <div
                    className="flex-1"
                    onDoubleClick={() => onEdit(task)}
                >
                    <p className="text-gray-800 dark:text-gray-100">{task.title}</p>
                    {task.subject && (
                        <span className="text-xs text-blue-500 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded">
                            {task.subject}
                        </span>
                    )}
                </div>
            )}

            <button
                onClick={(e) => {
                    e.stopPropagation();
                    onFocus(task.id);
                }}
                onPointerDown={(e) => e.stopPropagation()}
                disabled={timerState !== 'idle' || !canStartFocus}
                title={!canStartFocus ? "Enable camera and ensure face is visible to start" : "Start Focus Session"}
                className="px-3 py-1 text-sm bg-red-500 hover:bg-red-600 disabled:bg-gray-400 text-white rounded-lg disabled:cursor-not-allowed"
            >
                Focus
            </button>

            <button
                onClick={(e) => {
                    e.stopPropagation();
                    onDelete(task.id);
                }}
                onPointerDown={(e) => e.stopPropagation()}
                className="p-1 text-gray-400 hover:text-red-500"
            >
                ✕
            </button>
        </div>
    );
}

export function TaskList() {
    const { tasks, addTask, updateTask, deleteTask, toggleComplete, reorderTasks } = useTaskStore();
    const { startFocus, state: timerState } = useTimerStore();
    const { isReady: cameraReady, isFaceDetected, isEnabled: cameraEnabled } = useWebcamStore();

    // Camera enforcement logic matches Timer.tsx
    const canStartFocus = cameraEnabled && cameraReady && isFaceDetected;

    const [newTask, setNewTask] = useState('');
    const [newSubject, setNewSubject] = useState('');
    const [priority, setPriority] = useState<Task['priority']>('today');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editTitle, setEditTitle] = useState('');
    const [continueTaskId, setContinueTaskId] = useState<string | null>(null);

    const continueTask = tasks.find(t => t.id === continueTaskId);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (active.id !== over?.id) {
            reorderTasks(active.id as string, over?.id as string);
        }
    };

    const handleAdd = () => {
        if (!newTask.trim()) return;
        addTask(newTask.trim(), newSubject.trim(), priority);
        setNewTask('');
        setNewSubject('');
    };

    const handleEdit = (task: Task) => {
        setEditingId(task.id);
        setEditTitle(task.title);
    };

    const handleSaveEdit = (id: string) => {
        updateTask(id, { title: editTitle });
        setEditingId(null);
        setEditTitle('');
    };

    const handleStartFocus = (taskId: string) => {
        if (timerState === 'idle') {
            startFocus(taskId);
        }
    };

    const handleContinueLearning = (taskId: string) => {
        // Reopen the task (mark as incomplete) and start focus
        toggleComplete(taskId);
        setContinueTaskId(null);
        if (canStartFocus && timerState === 'idle') {
            startFocus(taskId);
        }
    };

    const incompleteTasks = tasks.filter((t) => !t.completed);
    const completedTasks = tasks.filter((t) => t.completed);

    return (
        <div className="w-full max-w-md">
            <h2 className="text-xl font-bold mb-4 text-gray-800 dark:text-gray-100">
                📚 Learning Tasks
            </h2>

            {/* Add Task Form */}
            <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
                <input
                    type="text"
                    value={newTask}
                    onChange={(e) => setNewTask(e.target.value)}
                    placeholder="What will you learn?"
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 outline-none mb-2"
                    onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                />
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={newSubject}
                        onChange={(e) => setNewSubject(e.target.value)}
                        placeholder="Subject (optional)"
                        className="flex-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 text-sm"
                    />
                    <select
                        value={priority}
                        onChange={(e) => setPriority(e.target.value as Task['priority'])}
                        className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 text-sm"
                    >
                        <option value="today">Today</option>
                        <option value="week">This Week</option>
                        <option value="backlog">Backlog</option>
                    </select>
                    <button
                        onClick={handleAdd}
                        className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium"
                    >
                        Add
                    </button>
                </div>
            </div>

            {/* Task List */}
            <div className="space-y-2">
                {incompleteTasks.length === 0 && (
                    <p className="text-gray-400 text-center py-4">No tasks yet. Add one above!</p>
                )}

                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                >
                    <SortableContext
                        items={incompleteTasks.map(t => t.id)}
                        strategy={verticalListSortingStrategy}
                    >
                        {incompleteTasks.map((task) => (
                            <SortableTaskItem
                                key={task.id}
                                task={task}
                                editingId={editingId}
                                editTitle={editTitle}
                                timerState={timerState}
                                onEdit={handleEdit}
                                onSave={handleSaveEdit}
                                onDelete={deleteTask}
                                onToggle={toggleComplete}
                                onFocus={handleStartFocus}
                                onSetEditTitle={setEditTitle}
                                canStartFocus={canStartFocus}
                            />
                        ))}
                    </SortableContext>
                </DndContext>
            </div>

            {/* Completed Tasks */}
            {completedTasks.length > 0 && (
                <div className="mt-6">
                    <h3 className="text-sm font-medium text-gray-500 mb-2">
                        ✓ Completed ({completedTasks.length})
                    </h3>
                    <div className="space-y-1">
                        {completedTasks.slice(0, 5).map((task) => (
                            <div
                                key={task.id}
                                className="flex items-center gap-3 p-2 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-100 dark:border-green-800/30"
                            >
                                <div className="w-5 h-5 rounded bg-green-500 text-white text-xs flex items-center justify-center shrink-0">
                                    ✓
                                </div>
                                <span className="flex-1 text-sm text-gray-600 dark:text-gray-400 line-through">{task.title}</span>
                                <button
                                    onClick={() => setContinueTaskId(task.id)}
                                    className="px-3 py-1 text-xs bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors"
                                >
                                    Continue
                                </button>
                                <button
                                    onClick={() => deleteTask(task.id)}
                                    className="px-2 py-1 text-xs text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                    title="Delete task"
                                >
                                    🗑️
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Continue Learning Confirmation Modal */}
            {continueTaskId && continueTask && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl border border-gray-100 dark:border-slate-700 animate-in fade-in zoom-in duration-200">
                        <div className="p-5 border-b border-gray-100 dark:border-slate-700 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20">
                            <h3 className="font-bold text-lg text-gray-800 dark:text-gray-100 flex items-center gap-2">
                                🔄 Continue Learning?
                            </h3>
                        </div>

                        <div className="p-5">
                            <p className="text-gray-600 dark:text-gray-300 mb-4">
                                You're about to continue learning:
                            </p>
                            <div className="bg-gray-50 dark:bg-slate-700/50 p-3 rounded-lg mb-4">
                                <p className="font-semibold text-gray-800 dark:text-gray-100">{continueTask.title}</p>
                                {continueTask.subject && (
                                    <span className="text-xs text-blue-500">{continueTask.subject}</span>
                                )}
                            </div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                📚 Your previous learning sessions and notes for this task will be available as context.
                            </p>
                        </div>

                        <div className="p-4 bg-gray-50 dark:bg-slate-800/50 border-t border-gray-100 dark:border-slate-700 flex gap-3">
                            <button
                                onClick={() => setContinueTaskId(null)}
                                className="flex-1 py-2.5 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => handleContinueLearning(continueTaskId)}
                                disabled={!canStartFocus || timerState !== 'idle'}
                                className="flex-1 py-2.5 text-sm font-medium bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white rounded-lg transition-colors disabled:cursor-not-allowed"
                            >
                                {timerState !== 'idle' ? 'Timer Active' : !canStartFocus ? 'Camera Required' : 'Continue Learning'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
