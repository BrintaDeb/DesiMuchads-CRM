"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  KanbanSquare,
  List as ListIcon,
  Play,
  CheckCircle2,
  Lock,
  Clock,
  AlertTriangle,
  GitBranch,
  ArrowRight,
  Filter,
  Plus,
  X,
  Check,
  User as UserIcon,
} from "lucide-react";
import { formatDuration, cn } from "@/lib/utils";
import { useTaskTimerStore } from "@/stores/taskTimerStore";
import { toast } from "sonner";
import { TaskStatus, TaskPriority } from "@/types";
import { OdooControlPanel, ViewMode } from "@/components/layout/OdooControlPanel";
import { api } from "@/lib/api";
import { realtime } from "@/lib/websocket";

interface DAGTask {
  id: string;
  project_name: string;
  title: string;
  description: string;
  assignee: string;
  priority: TaskPriority;
  status: TaskStatus;
  estimated_hours: number;
  logged_hours: number;
  due_date: string;
  depends_on_task_id?: string;
  prerequisite_title?: string;
  is_blocked: boolean;
}

const initialTasks: DAGTask[] = [
  {
    id: "t101",
    project_name: "Bombay Chai Co. - Q4 Social Retainer",
    title: "Q4 Campaign Moodboard & Pillar Strategy",
    description: "Finalize 4 cultural themes for winter festive season.",
    assignee: "Aarav Sharma",
    priority: "HIGH",
    status: "COMPLETED",
    estimated_hours: 4.0,
    logged_hours: 4.5,
    due_date: "2026-11-05",
    is_blocked: false,
  },
  {
    id: "t102",
    project_name: "Bombay Chai Co. - Q4 Social Retainer",
    title: "10x Festive Ad Copy & Reel Scripts",
    description: "Write script concepts focusing on warm winter masala chai ritual.",
    assignee: "Priya Patel",
    priority: "HIGH",
    status: "IN_PROGRESS",
    estimated_hours: 6.0,
    logged_hours: 2.5,
    due_date: "2026-11-12",
    depends_on_task_id: "t101",
    prerequisite_title: "Q4 Campaign Moodboard & Pillar Strategy",
    is_blocked: false,
  },
  {
    id: "t103",
    project_name: "Bombay Chai Co. - Q4 Social Retainer",
    title: "Festive Packaging 3D Render & Motion Reel",
    description: "Render 3D chai packaging reveal with upbeat acoustic rhythm.",
    assignee: "Rohan Verma",
    priority: "MEDIUM",
    status: "BLOCKED",
    estimated_hours: 8.0,
    logged_hours: 0.0,
    due_date: "2026-11-16",
    depends_on_task_id: "t102",
    prerequisite_title: "10x Festive Ad Copy & Reel Scripts",
    is_blocked: true,
  },
  {
    id: "t104",
    project_name: "Urban Vibe Apparels - Setup",
    title: "Google Tag Manager & Meta Conversions API Audit",
    description: "Configure server-side event deduplication for e-com checkout.",
    assignee: "Aarav Sharma",
    priority: "CRITICAL",
    status: "TODO",
    estimated_hours: 5.0,
    logged_hours: 0.0,
    due_date: "2026-11-10",
    is_blocked: false,
  },
  {
    id: "t105",
    project_name: "Bombay Chai Co. - Q4 Social Retainer",
    title: "Client Portal Deliverables Sign-off",
    description: "Review comments and gather final client approval on assets.",
    assignee: "Aarav Sharma",
    priority: "MEDIUM",
    status: "INTERNAL_QA",
    estimated_hours: 2.0,
    logged_hours: 1.0,
    due_date: "2026-11-18",
    is_blocked: false,
  },
];

const columns: { key: TaskStatus; label: string; color: string }[] = [
  { key: "TODO", label: "To Do", color: "bg-slate-400" },
  { key: "IN_PROGRESS", label: "In Progress", color: "bg-blue-500" },
  { key: "INTERNAL_QA", label: "Internal QA", color: "bg-amber-500" },
  { key: "COMPLETED", label: "Done", color: "bg-emerald-500" },
  { key: "BLOCKED", label: "Blocked (DAG Dependency)", color: "bg-rose-500" },
];

export default function TasksPage() {
  const [tasks, setTasks] = useState<DAGTask[]>(initialTasks);
  const [viewMode, setViewMode] = useState<ViewMode>("kanban");
  const [searchQuery, setSearchQuery] = useState("");
  const [isNewTaskModalOpen, setIsNewTaskModalOpen] = useState(false);
  const [mobileActiveColumn, setMobileActiveColumn] = useState<TaskStatus | "ALL">("ALL");

  // Drag and drop state
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<TaskStatus | null>(null);

  // New task form
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskProject, setNewTaskProject] = useState("Bombay Chai Co. - Q4 Social Retainer");
  const [newTaskAssignee, setNewTaskAssignee] = useState("Priya Patel");
  const [newTaskPriority, setNewTaskPriority] = useState<TaskPriority>("HIGH");
  const [newTaskHours, setNewTaskHours] = useState(4.0);
  const [newTaskDue, setNewTaskDue] = useState("2026-11-20");

  const { startTimer, activeTaskId } = useTaskTimerStore();
  const newTaskDialogRef = useRef<HTMLDialogElement>(null);

  const fetchBackendTasks = async () => {
    try {
      const res = await api.get("/tasks/");
      if (res.data?.data && Array.isArray(res.data.data) && res.data.data.length > 0) {
        const mapped: DAGTask[] = res.data.data.map((t: any) => ({
          id: t.id,
          project_name: t.project?.name || "Agency Operations",
          title: t.title,
          description: t.description || "",
          assignee: t.assignee?.full_name || "Unassigned",
          priority: t.priority,
          status: t.status,
          estimated_hours: t.estimated_hours || 4.0,
          logged_hours: t.logged_hours || 0.0,
          due_date: t.due_at ? t.due_at.split("T")[0] : "2026-11-20",
          is_blocked: t.status === "BLOCKED",
          depends_on_task_id: t.depends_on_task_id,
          prerequisite_title: t.depends_on_task?.title,
        }));
        setTasks(mapped);
      }
    } catch (e) {
      // Offline fallback retained
    }
  };

  useEffect(() => {
    fetchBackendTasks();

    // Listen to realtime WebSocket updates from other phones/desktops
    const unsubscribe = realtime.subscribe((msg: any) => {
      if (
        msg?.type === "TASK_STATUS_CHANGED" ||
        msg?.type === "TASK_UPDATED" ||
        msg?.type === "DAG_UNLOCKED" ||
        msg?.type === "TASK_MUTATION"
      ) {
        fetchBackendTasks();
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const dialog = newTaskDialogRef.current;
    if (!dialog) return;
    if (isNewTaskModalOpen && !dialog.open) dialog.showModal();
    else if (!isNewTaskModalOpen && dialog.open) dialog.close();
  }, [isNewTaskModalOpen]);

  const getNextStatus = (curr: TaskStatus): TaskStatus | null => {
    switch (curr) {
      case "TODO":
        return "IN_PROGRESS";
      case "IN_PROGRESS":
        return "INTERNAL_QA";
      case "INTERNAL_QA":
        return "COMPLETED";
      default:
        return null;
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle) return;

    const created: DAGTask = {
      id: `t${Date.now()}`,
      project_name: newTaskProject,
      title: newTaskTitle,
      description: "Task defined in Odoo Project workflow.",
      assignee: newTaskAssignee,
      priority: newTaskPriority,
      status: "TODO",
      estimated_hours: Number(newTaskHours),
      logged_hours: 0,
      due_date: newTaskDue,
      is_blocked: false,
    };

    setTasks((prev) => [created, ...prev]);
    setIsNewTaskModalOpen(false);
    setNewTaskTitle("");
    toast.success(`Task "${created.title}" added to project!`);
  };

  const handleStatusChange = async (taskId: string, newStatus: TaskStatus) => {
    const target = tasks.find((t) => t.id === taskId);
    if (!target) return;

    if (newStatus !== "BLOCKED" && target.is_blocked) {
      toast.error(
        `Task is locked by upstream dependency: "${target.prerequisite_title}". Complete it first to unlock!`
      );
      return;
    }

    setTasks((prev) => {
      let updated = prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t));

      // Rule 1: Dynamic DAG Unlocking if a task completes
      if (newStatus === "COMPLETED") {
        updated = updated.map((t) => {
          if (t.depends_on_task_id === taskId && t.status === "BLOCKED") {
            toast.success(
              `⚡ DAG Rule 1 Executed: Upstream prerequisite met! "${t.title}" is now UNLOCKED & READY.`
            );
            return { ...t, status: "TODO", is_blocked: false };
          }
          return t;
        });
      }

      return updated;
    });

    toast.success(`Workflow: "${target.title}" → ${newStatus.replace("_", " ")}`);

    // Sync to backend if valid UUID
    try {
      if (taskId.length > 20) {
        await api.post(`/tasks/${taskId}/transition-state`, { new_status: newStatus });
      }
    } catch (err: any) {
      console.warn("Backend task sync notice:", err.message);
    }
  };

  const handleStartStopwatch = (task: DAGTask) => {
    if (task.is_blocked) {
      toast.error("Cannot track time on a blocked task!");
      return;
    }
    startTimer(task.id, task.title);
    toast.info(`Task Stopwatch started: "${task.title}"`);
  };

  const getPriorityBadge = (p: TaskPriority) => {
    switch (p) {
      case "CRITICAL":
        return "bg-rose-50 text-rose-700 border-rose-200";
      case "HIGH":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "MEDIUM":
        return "bg-indigo-50 text-indigo-700 border-indigo-200";
      default:
        return "bg-slate-100 text-slate-600 border-slate-200";
    }
  };

  const filteredTasks = tasks.filter(
    (t) =>
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.project_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.assignee.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div>
      {/* Odoo Control Panel Sub-Header */}
      <OdooControlPanel
        appName="Projects"
        viewName="DAG Tasks & Dependencies"
        onNewClick={() => setIsNewTaskModalOpen(true)}
        newButtonLabel="New Task"
        activeView={viewMode}
        onViewChange={setViewMode}
        availableViews={["kanban", "list", "calendar"]}
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        totalCount={filteredTasks.length}
        secondaryActions={
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-mono px-2 py-1 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 hidden sm:inline-block">
              DAG Cycle Detection & Cascading
            </span>
          </div>
        }
      />

      {/* Mobile Column Filter Pill Strip */}
      <div className="flex md:hidden items-center gap-1.5 overflow-x-auto no-scrollbar pb-2 mb-3">
        <button
          type="button"
          onClick={() => setMobileActiveColumn("ALL")}
          className={cn(
            "px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors shrink-0 min-h-[36px]",
            mobileActiveColumn === "ALL"
              ? "bg-[#714B67] text-white shadow-xs"
              : "bg-white text-zinc-600 border border-zinc-200"
          )}
        >
          All ({filteredTasks.length})
        </button>
        {columns.map((c) => {
          const count = filteredTasks.filter((t) => t.status === c.key).length;
          return (
            <button
              type="button"
              key={c.key}
              onClick={() => setMobileActiveColumn(c.key)}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors shrink-0 flex items-center gap-1.5 min-h-[36px]",
                mobileActiveColumn === c.key
                  ? "bg-[#714B67] text-white shadow-xs"
                  : "bg-white text-zinc-600 border border-zinc-200"
              )}
            >
              <span>{c.label}</span>
              <span
                className={cn(
                  "text-[10px] px-1.5 py-0.2 rounded-full font-mono",
                  mobileActiveColumn === c.key ? "bg-white/20 text-white" : "bg-zinc-100 text-zinc-600"
                )}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Main View: Kanban Mode (Odoo Signature) */}
      {viewMode === "kanban" ? (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-start overflow-x-auto pb-4">
          {columns.map((col) => {
            if (mobileActiveColumn !== "ALL" && mobileActiveColumn !== col.key) {
              return null;
            }
            const colTasks = filteredTasks.filter((t) => t.status === col.key);
            const totalHours = colTasks.reduce((sum, t) => sum + t.estimated_hours, 0);

            return (
              <div
                key={col.key}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = "move";
                  if (dragOverColumn !== col.key) setDragOverColumn(col.key);
                }}
                onDragLeave={(e) => {
                  if (e.currentTarget.contains(e.relatedTarget as Node)) return;
                  if (dragOverColumn === col.key) setDragOverColumn(null);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  const taskId = e.dataTransfer.getData("text/plain") || draggingTaskId;
                  if (taskId) {
                    handleStatusChange(taskId, col.key);
                  }
                  setDraggingTaskId(null);
                  setDragOverColumn(null);
                }}
                className={cn(
                  "bg-[#F1F3F5] rounded-xl border flex flex-col min-w-[250px] transition-all",
                  dragOverColumn === col.key
                    ? "ring-2 ring-[#714B67] bg-[#FAF5FF] border-[#714B67] shadow-sm"
                    : "border-slate-200/80"
                )}
              >
                {/* Odoo Column Header */}
                <div className="p-3 border-b border-slate-200/80 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-slate-800 tracking-tight">
                      {col.label}
                    </span>
                    <span className="text-[10px] font-semibold font-mono px-1.5 py-0.2 rounded-full bg-slate-200 text-slate-700">
                      {colTasks.length}
                    </span>
                  </div>

                  <span className="text-[11px] font-mono text-slate-500 font-medium">
                    {totalHours}h est.
                  </span>
                </div>

                {/* Cards Container */}
                <div className="p-2 space-y-2.5 min-h-[420px]">
                  {colTasks.map((task) => (
                    <div
                      key={task.id}
                      draggable={!task.is_blocked}
                      onDragStart={(e) => {
                        if (task.is_blocked) {
                          e.preventDefault();
                          toast.error(`"${task.title}" is locked by upstream prerequisite!`);
                          return;
                        }
                        setDraggingTaskId(task.id);
                        e.dataTransfer.setData("text/plain", task.id);
                        e.dataTransfer.effectAllowed = "move";
                      }}
                      onDragEnd={() => {
                        setDraggingTaskId(null);
                        setDragOverColumn(null);
                      }}
                      className={cn(
                        "p-3.5 rounded-lg bg-white border transition-all space-y-2 relative shadow-xs hover:shadow-md",
                        task.is_blocked
                          ? "border-rose-200 bg-rose-50/20 cursor-not-allowed opacity-80"
                          : "cursor-grab active:cursor-grabbing hover:border-[#714B67]/40",
                        draggingTaskId === task.id && "opacity-40 scale-95 border-dashed border-[#714B67]",
                        activeTaskId === task.id && "border-[#714B67] ring-1 ring-[#714B67]/30"
                      )}
                    >
                      {/* Blocked Alert Banner */}
                      {task.is_blocked && (
                        <div className="flex items-center gap-1.5 text-[10px] font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200 w-fit">
                          <Lock size={11} />
                          <span>Blocked by upstream</span>
                        </div>
                      )}

                      {/* Project Tag & Priority */}
                      <div className="flex items-center justify-between gap-1 text-[10px]">
                        <span className="text-slate-400 font-mono truncate max-w-[140px]" title={task.project_name}>
                          {task.project_name.split("-")[0]}
                        </span>
                        <span className={cn("px-1.5 py-0.2 rounded font-semibold border", getPriorityBadge(task.priority))}>
                          {task.priority}
                        </span>
                      </div>

                      {/* Task Title */}
                      <h2 className="text-xs font-bold text-slate-900 line-clamp-2 leading-snug">
                        {task.title}
                      </h2>

                      {/* Dependency Information */}
                      {task.depends_on_task_id && (
                        <div className="p-1.5 rounded bg-slate-50 border border-slate-100 flex items-center gap-1.5 text-[10px] text-slate-500 font-mono">
                          <GitBranch size={11} className="text-[#714B67] shrink-0" />
                          <span className="truncate">Depends on: {task.prerequisite_title}</span>
                        </div>
                      )}

                      {/* Bottom Metadata: Assignee, Hours, Timer */}
                      <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                        <div className="flex items-center gap-1.5">
                          <div className="w-5 h-5 rounded-full bg-slate-100 text-[#714B67] font-bold text-[10px] flex items-center justify-center border border-slate-200">
                            {task.assignee.charAt(0)}
                          </div>
                          <span className="text-[11px] text-slate-600 font-medium truncate max-w-[80px]">
                            {task.assignee.split(" ")[0]}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-mono text-slate-500">
                            {task.logged_hours}h / {task.estimated_hours}h
                          </span>

                          <button
                            onClick={() => handleStartStopwatch(task)}
                            className={cn(
                              "p-1 rounded text-slate-400 hover:text-[#714B67] hover:bg-slate-100 transition-colors",
                              activeTaskId === task.id && "text-[#714B67] bg-purple-50 font-bold"
                            )}
                            title="Start Task Stopwatch"
                          >
                            <Play size={12} fill={activeTaskId === task.id ? "currentColor" : "none"} />
                          </button>
                        </div>
                      </div>

                      {/* Stage Selector & Mobile Advance */}
                      <div className="pt-1.5 border-t border-slate-100 flex items-center justify-between">
                        <span className="text-[10px] text-slate-400">Due: {task.due_date}</span>
                        <select
                          value={task.status}
                          onChange={(e) => handleStatusChange(task.id, e.target.value as TaskStatus)}
                          className="bg-slate-50 hover:bg-slate-100 text-[10px] font-medium text-slate-700 border border-slate-200 rounded px-1.5 py-0.5 outline-none cursor-pointer"
                        >
                          {columns.map((c) => (
                            <option key={c.key} value={c.key}>
                              → {c.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Mobile 1-Tap Quick Advance Action Button */}
                      {getNextStatus(task.status) && !task.is_blocked && (
                        <button
                          type="button"
                          onClick={() => handleStatusChange(task.id, getNextStatus(task.status)!)}
                          className="w-full mt-2 py-2 px-3 bg-purple-50 hover:bg-purple-100 active:bg-purple-200 text-[#714B67] rounded-md text-xs font-bold flex items-center justify-center gap-1.5 border border-purple-200 transition-colors shadow-2xs active:scale-98 min-h-[44px]"
                        >
                          <span>Advance to {getNextStatus(task.status)?.replace("_", " ")}</span>
                          <ArrowRight size={13} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : viewMode === "list" ? (
        /* List Mode (Odoo Task Table) */
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-[11px] font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Task Title</th>
                  <th className="py-3 px-4">Project</th>
                  <th className="py-3 px-4">Assignee</th>
                  <th className="py-3 px-4">Priority</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Logged / Estimated</th>
                  <th className="py-3 px-4">Due Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTasks.map((task) => (
                  <tr key={task.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4">
                      <span className="font-bold text-slate-900 block">{task.title}</span>
                      {task.is_blocked && (
                        <span className="inline-flex items-center gap-1 text-[10px] text-rose-600 font-medium">
                          <Lock size={10} /> Blocked: {task.prerequisite_title}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-500">{task.project_name}</td>
                    <td className="py-3 px-4 font-medium text-slate-800">{task.assignee}</td>
                    <td className="py-3 px-4">
                      <span className={cn("px-1.5 py-0.2 rounded font-semibold border text-[10px]", getPriorityBadge(task.priority))}>
                        {task.priority}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                        {task.status.replace("_", " ")}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-medium text-slate-800">
                      {task.logged_hours}h / {task.estimated_hours}h
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-500">{task.due_date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Gantt & Critical-Path Timeline Mode (Odoo Calendar View) */
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          {/* Gantt Header & Legend */}
          <div className="p-4 border-b border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-slate-900">Project Gantt & Critical Path Timeline</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200 font-semibold">
                  November 2026 Sprint
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Horizontal milestone bars with dynamic DAG prerequisite connector lines and critical-path alerts.
              </p>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap items-center gap-2 text-[11px]">
              <span className="flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                <span className="w-2 h-2 rounded-full bg-emerald-500" /> Completed
              </span>
              <span className="flex items-center gap-1 text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                <span className="w-2 h-2 rounded-full bg-blue-500" /> In Progress
              </span>
              <span className="flex items-center gap-1 text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                <span className="w-2 h-2 rounded-full bg-amber-500" /> Internal QA
              </span>
              <span className="flex items-center gap-1 text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                <span className="w-2 h-2 rounded-full bg-rose-500" /> Blocked
              </span>
            </div>
          </div>

          {/* Gantt Matrix Grid */}
          <div className="overflow-x-auto">
            <div className="min-w-[900px]">
              {/* Timeline Header Row (Days of Month) */}
              <div className="grid grid-cols-12 border-b border-slate-200 bg-slate-100/70 text-[11px] font-mono font-semibold text-slate-600">
                <div className="col-span-4 p-3 border-r border-slate-200">Task Deliverable & Assignee</div>
                <div className="col-span-8 grid grid-cols-14 text-center divide-x divide-slate-200">
                  {[2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28].map((day) => (
                    <div key={day} className="py-2.5 px-1">
                      <span className="block text-[10px] text-slate-400">Nov</span>
                      <span>{day}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Task Rows with Milestone Bars */}
              <div className="divide-y divide-slate-100">
                {filteredTasks.map((task) => {
                  const dayNum = parseInt(task.due_date.split("-")[2], 10) || 15;
                  const startOffset = Math.max(0, Math.min(75, ((dayNum - 4) / 28) * 100));
                  const barWidth = Math.max(20, Math.min(35, (task.estimated_hours / 10) * 20));

                  return (
                    <div key={task.id} className="grid grid-cols-12 hover:bg-slate-50/60 transition-colors items-center">
                      {/* Left: Task Info */}
                      <div className="col-span-4 p-3 border-r border-slate-200">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-slate-900 truncate max-w-[200px]" title={task.title}>
                            {task.title}
                          </span>
                          <span className={cn("text-[9px] px-1.5 py-0.2 rounded font-semibold border", getPriorityBadge(task.priority))}>
                            {task.priority}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500">
                          <span>{task.assignee}</span>
                          <span>•</span>
                          <span className="font-mono">{task.estimated_hours}h est.</span>
                          {task.is_blocked && (
                            <span className="text-[10px] text-rose-600 font-semibold flex items-center gap-0.5">
                              <Lock size={9} /> Blocked
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Right: Gantt Milestone Bar */}
                      <div className="col-span-8 p-3 relative h-14 flex items-center">
                        <div className="absolute inset-0 grid grid-cols-14 divide-x divide-slate-100 pointer-events-none">
                          {[...Array(14)].map((_, i) => (
                            <div key={i} className="h-full" />
                          ))}
                        </div>

                        {/* Timeline Bar */}
                        <div
                          style={{
                            marginLeft: `${startOffset}%`,
                            width: `${barWidth}%`,
                          }}
                          className={cn(
                            "relative z-10 h-8 rounded-lg px-2.5 flex items-center justify-between text-xs text-white shadow-xs font-semibold cursor-pointer transition-all hover:scale-102 hover:shadow-md",
                            task.status === "COMPLETED"
                              ? "bg-emerald-600 hover:bg-emerald-700"
                              : task.status === "IN_PROGRESS"
                              ? "bg-blue-600 hover:bg-blue-700"
                              : task.status === "INTERNAL_QA"
                              ? "bg-amber-600 hover:bg-amber-700"
                              : task.is_blocked
                              ? "bg-rose-600/90 border border-rose-300"
                              : "bg-slate-600 hover:bg-slate-700"
                          )}
                          onClick={() => {
                            const next = getNextStatus(task.status);
                            if (next) handleStatusChange(task.id, next);
                          }}
                          title={`Click to advance: ${task.title} (Due: ${task.due_date})`}
                        >
                          <span className="truncate text-[11px] flex items-center gap-1">
                            {task.status === "COMPLETED" && <CheckCircle2 size={12} />}
                            {task.is_blocked && <Lock size={12} />}
                            {task.title}
                          </span>
                          <span className="text-[10px] font-mono opacity-80 shrink-0">
                            Nov {dayNum}
                          </span>
                        </div>

                        {/* Critical Path Arrow Indicator */}
                        {task.depends_on_task_id && (
                          <div className="absolute left-2 top-1 text-[9px] font-mono text-[#714B67] bg-purple-50 px-1 rounded border border-purple-200">
                            ⚡ Depends on #{task.depends_on_task_id}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* New Task Modal */}
      <dialog
        ref={newTaskDialogRef}
        onCancel={() => setIsNewTaskModalOpen(false)}
        className="fixed inset-0 m-auto bg-white rounded-2xl max-w-lg w-full p-0 shadow-2xl border border-slate-200 backdrop:bg-slate-900/40 backdrop:backdrop-blur-sm overflow-hidden"
      >
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Create Project Task</h2>
            <p className="text-[11px] text-slate-500">Assign deliverables with DAG dependency tracking.</p>
          </div>
          <button onClick={() => setIsNewTaskModalOpen(false)} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleCreateTask} className="p-5 space-y-4 text-xs">
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">TASK TITLE *</label>
            <input
              type="text"
              required
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              placeholder="e.g. Meta Ads CAPI Retargeting Funnel"
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 outline-none focus:border-[#714B67] focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">PROJECT</label>
            <select
              value={newTaskProject}
              onChange={(e) => setNewTaskProject(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 outline-none focus:border-[#714B67] focus:bg-white"
            >
              <option value="Bombay Chai Co. - Q4 Social Retainer">Bombay Chai Co. - Q4 Social Retainer</option>
              <option value="Urban Vibe Apparels - Setup">Urban Vibe Apparels - Setup</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">ASSIGNEE</label>
              <select
                value={newTaskAssignee}
                onChange={(e) => setNewTaskAssignee(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 outline-none focus:border-[#714B67] focus:bg-white"
              >
                <option value="Aarav Sharma">Aarav Sharma (Account Lead)</option>
                <option value="Priya Patel">Priya Patel (Lead Specialist)</option>
                <option value="Rohan Verma">Rohan Verma (Motion Specialist)</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">PRIORITY</label>
              <select
                value={newTaskPriority}
                onChange={(e) => setNewTaskPriority(e.target.value as TaskPriority)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 outline-none focus:border-[#714B67] focus:bg-white"
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="CRITICAL">Critical</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">ESTIMATED HOURS</label>
              <input
                type="number"
                step="0.5"
                value={newTaskHours}
                onChange={(e) => setNewTaskHours(Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 outline-none focus:border-[#714B67] focus:bg-white font-mono"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">DUE DATE</label>
              <input
                type="date"
                value={newTaskDue}
                onChange={(e) => setNewTaskDue(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 outline-none focus:border-[#714B67] focus:bg-white font-mono"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsNewTaskModalOpen(false)}
              className="px-3 py-1.5 rounded-lg text-slate-600 hover:text-slate-800 text-xs font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-lg bg-[#714B67] hover:bg-[#58364F] text-white font-semibold text-xs transition-colors shadow-xs"
            >
              Create Task
            </button>
          </div>
        </form>
      </dialog>
    </div>
  );
}
