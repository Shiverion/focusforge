import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Task {
    id: string;
    title: string;
    subject: string;
    priority: 'today' | 'week' | 'backlog';
    completed: boolean;
    createdAt: Date;
}

interface TaskState {
    tasks: Task[];
    addTask: (title: string, subject: string, priority: Task['priority']) => void;
    updateTask: (id: string, updates: Partial<Task>) => void;
    deleteTask: (id: string) => void;
    toggleComplete: (id: string) => void;
    reorderTasks: (activeId: string, overId: string) => void;
}

export const useTaskStore = create<TaskState>()(
    persist(
        (set) => ({
            tasks: [],

            addTask: (title, subject, priority) => set((state) => ({
                tasks: [...state.tasks, {
                    id: crypto.randomUUID(),
                    title,
                    subject,
                    priority,
                    completed: false,
                    createdAt: new Date(),
                }]
            })),

            updateTask: (id, updates) => set((state) => ({
                tasks: state.tasks.map((task) =>
                    task.id === id ? { ...task, ...updates } : task
                )
            })),

            deleteTask: (id) => set((state) => ({
                tasks: state.tasks.filter((task) => task.id !== id)
            })),

            toggleComplete: (id) => set((state) => ({
                tasks: state.tasks.map((task) =>
                    task.id === id ? { ...task, completed: !task.completed } : task
                )
            })),

            reorderTasks: (activeId: string, overId: string) => set((state) => {
                const oldIndex = state.tasks.findIndex((t) => t.id === activeId);
                const newIndex = state.tasks.findIndex((t) => t.id === overId);

                if (oldIndex === -1 || newIndex === -1) return state;

                const newTasks = [...state.tasks];
                const [movedTask] = newTasks.splice(oldIndex, 1);
                newTasks.splice(newIndex, 0, movedTask);

                return { tasks: newTasks };
            }),
        }),
        {
            name: 'focusforge-tasks',
        }
    )
);
