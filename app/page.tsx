"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input, Textarea } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { Calendar } from "@/components/ui/calendar"
import {
  Plus,
  Settings,
  MoreVertical,
  Edit3,
  Save,
  X,
  ChevronRight,
  ChevronDown,
  CalendarIcon,
  Trash2,
  CalendarDays,
  Loader2,
} from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { format } from "date-fns"
import { useToast } from "@/hooks/use-toast"

interface Swimlane {
  id: string
  title: string
  color: string
  projects: Project[]
}

interface Project {
  id: string
  title: string
  description: string
  tasks: Task[]
}

interface Task {
  id: string
  title: string
  completed: boolean
  dueDate?: string
  subtasks: Task[]
  expanded?: boolean
}

export default function TaskboardApp() {
  const [swimlanes, setSwimlanes] = useState<Swimlane[]>([])
  const [loading, setLoading] = useState(true)
  const [newSwimlaneTitle, setNewSwimlaneTitle] = useState("")
  const [isAddingSwimlane, setIsAddingSwimlane] = useState(false)
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [isNotepadOpen, setIsNotepadOpen] = useState(false)
  const [isEditingProject, setIsEditingProject] = useState(false)
  const [editingProjectTitle, setEditingProjectTitle] = useState("")
  const [editingProjectDescription, setEditingProjectDescription] = useState("")
  const [newTaskTitle, setNewTaskTitle] = useState("")
  const [isAddingTask, setIsAddingTask] = useState(false)
  const [addingSubtaskToId, setAddingSubtaskToId] = useState<string | null>(null)
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("")
  const [settingDateForTaskId, setSettingDateForTaskId] = useState<string | null>(null)
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined)
  const [showCalendarView, setShowCalendarView] = useState(false)
  const { toast } = useToast()

  // Load data from database
  const loadData = async () => {
    try {
      const response = await fetch('/api/swimlanes')
      if (!response.ok) {
        throw new Error('Failed to fetch data')
      }
      const data = await response.json()
      setSwimlanes(data)
    } catch (error) {
      console.error('Error loading data:', error)
      toast({
        title: "Error",
        description: "Failed to load data from database",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // Helper function to preserve expansion state when merging task data
  const preserveExpansionState = (newTasks: Task[], oldTasks: Task[]): Task[] => {
    const oldTaskMap = new Map<string, boolean>()
    
    const collectExpansionState = (tasks: Task[]) => {
      tasks.forEach(task => {
        if (task.expanded !== undefined) {
          oldTaskMap.set(task.id, task.expanded)
        }
        if (task.subtasks.length > 0) {
          collectExpansionState(task.subtasks)
        }
      })
    }
    
    const applyExpansionState = (tasks: Task[]): Task[] => {
      return tasks.map(task => ({
        ...task,
        expanded: oldTaskMap.has(task.id) ? oldTaskMap.get(task.id) : false,
        subtasks: task.subtasks.length > 0 ? applyExpansionState(task.subtasks) : task.subtasks
      }))
    }
    
    collectExpansionState(oldTasks)
    return applyExpansionState(newTasks)
  }

  // Helper function to refresh selectedProject after task operations
  const refreshSelectedProject = async () => {
    if (!selectedProject) return
    
    try {
      const response = await fetch('/api/swimlanes')
      if (!response.ok) return
      
      const updatedSwimlanes = await response.json()
      const updatedProject = updatedSwimlanes
        .flatMap((s: Swimlane) => s.projects)
        .find((p: Project) => p.id === selectedProject.id)
      
      if (updatedProject) {
        // Preserve expansion state from the current selectedProject
        const tasksWithPreservedState = preserveExpansionState(
          updatedProject.tasks, 
          selectedProject.tasks
        )
        setSelectedProject({
          ...updatedProject,
          tasks: tasksWithPreservedState
        })
      }
    } catch (error) {
      console.error('Error refreshing selected project:', error)
    }
  }

  // Initialize with sample data if needed
  const initializeData = async () => {
    try {
      const response = await fetch('/api/swimlanes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'initialize' })
      })
      if (!response.ok) {
        throw new Error('Failed to initialize data')
      }
      const data = await response.json()
      setSwimlanes(data)
      toast({
        title: "Success",
        description: "Sample data loaded successfully",
      })
    } catch (error) {
      console.error('Error initializing data:', error)
      toast({
        title: "Error",
        description: "Failed to initialize sample data",
        variant: "destructive",
      })
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const addSwimlane = async () => {
    if (!newSwimlaneTitle.trim()) return

    try {
      const colors = ["bg-red-500", "bg-yellow-500", "bg-indigo-500", "bg-pink-500", "bg-teal-500"]
      const response = await fetch('/api/swimlanes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newSwimlaneTitle.trim(),
          color: colors[Math.floor(Math.random() * colors.length)]
        })
      })

      if (!response.ok) {
        throw new Error('Failed to create swimlane')
      }

      await loadData() // Refresh data
      setNewSwimlaneTitle("")
      setIsAddingSwimlane(false)
      toast({
        title: "Success",
        description: "Swimlane created successfully",
      })
    } catch (error) {
      console.error('Error creating swimlane:', error)
      toast({
        title: "Error",
        description: "Failed to create swimlane",
        variant: "destructive",
      })
    }
  }

  const deleteSwimlane = async (swimlaneId: string) => {
    try {
      const response = await fetch(`/api/swimlanes?id=${swimlaneId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error('Failed to delete swimlane')
      }

      await loadData() // Refresh data
      toast({
        title: "Success",
        description: "Swimlane deleted successfully",
      })
    } catch (error) {
      console.error('Error deleting swimlane:', error)
      toast({
        title: "Error",
        description: "Failed to delete swimlane",
        variant: "destructive",
      })
    }
  }

  const addProject = async (swimlaneId: string) => {
    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: "New Project",
          description: "Click to edit description",
          swimlaneId
        })
      })

      if (!response.ok) {
        throw new Error('Failed to create project')
      }

      await loadData() // Refresh data
      toast({
        title: "Success",
        description: "Project created successfully",
      })
    } catch (error) {
      console.error('Error creating project:', error)
      toast({
        title: "Error",
        description: "Failed to create project",
        variant: "destructive",
      })
    }
  }

  const saveProjectChanges = async () => {
    if (!selectedProject) return

    try {
      const response = await fetch('/api/projects', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedProject.id,
          title: editingProjectTitle,
          description: editingProjectDescription
        })
      })

      if (!response.ok) {
        throw new Error('Failed to update project')
      }

      await loadData() // Refresh data
      setSelectedProject({
        ...selectedProject,
        title: editingProjectTitle,
        description: editingProjectDescription,
      })
      setIsEditingProject(false)
      toast({
        title: "Success",
        description: "Project updated successfully",
      })
    } catch (error) {
      console.error('Error updating project:', error)
      toast({
        title: "Error",
        description: "Failed to update project",
        variant: "destructive",
      })
    }
  }

  const deleteProject = async (swimlaneId: string, projectId: string) => {
    try {
      const response = await fetch(`/api/projects?id=${projectId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error('Failed to delete project')
      }

      await loadData() // Refresh data
      if (selectedProject?.id === projectId) {
        setIsNotepadOpen(false)
        setSelectedProject(null)
      }
      toast({
        title: "Success",
        description: "Project deleted successfully",
      })
    } catch (error) {
      console.error('Error deleting project:', error)
      toast({
        title: "Error",
        description: "Failed to delete project",
        variant: "destructive",
      })
    }
  }

  const addTask = async () => {
    if (!newTaskTitle.trim() || !selectedProject) return

    try {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTaskTitle.trim(),
          projectId: selectedProject.id
        })
      })

      if (!response.ok) {
        throw new Error('Failed to create task')
      }

      await loadData() // Refresh data
      await refreshSelectedProject() // Update selectedProject to reflect the new task
      
      setNewTaskTitle("")
      setIsAddingTask(false)
      toast({
        title: "Success",
        description: "Task created successfully",
      })
    } catch (error) {
      console.error('Error creating task:', error)
      toast({
        title: "Error",
        description: "Failed to create task",
        variant: "destructive",
      })
    }
  }

  const addSubtask = async (parentTaskId: string) => {
    if (!newSubtaskTitle.trim() || !selectedProject) return

    try {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newSubtaskTitle.trim(),
          projectId: selectedProject.id,
          parentTaskId
        })
      })

      if (!response.ok) {
        throw new Error('Failed to create subtask')
      }

      await loadData() // Refresh data
      
      // Auto-expand the parent task and refresh selectedProject
      if (selectedProject) {
        const response = await fetch('/api/swimlanes')
        if (response.ok) {
          const updatedSwimlanes = await response.json()
          const updatedProject = updatedSwimlanes
            .flatMap((s: Swimlane) => s.projects)
            .find((p: Project) => p.id === selectedProject.id)
          
          if (updatedProject) {
            // First preserve existing expansion state
            let tasksWithPreservedState = preserveExpansionState(
              updatedProject.tasks, 
              selectedProject.tasks
            )
            // Then auto-expand the parent task to show the new subtask
            tasksWithPreservedState = updateTasksRecursively(
              tasksWithPreservedState, 
              parentTaskId, 
              (task) => ({ ...task, expanded: true })
            )
            setSelectedProject({
              ...updatedProject,
              tasks: tasksWithPreservedState
            })
          }
        }
      }
      
      setNewSubtaskTitle("")
      setAddingSubtaskToId(null)
      toast({
        title: "Success",
        description: "Subtask created successfully",
      })
    } catch (error) {
      console.error('Error creating subtask:', error)
      toast({
        title: "Error",
        description: "Failed to create subtask",
        variant: "destructive",
      })
    }
  }

  const toggleTaskCompletion = async (taskId: string) => {
    try {
      const response = await fetch('/api/tasks', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: taskId,
          action: 'toggle'
        })
      })

      if (!response.ok) {
        throw new Error('Failed to toggle task')
      }

      await loadData() // Refresh data
      await refreshSelectedProject() // Update selectedProject if it exists
    } catch (error) {
      console.error('Error toggling task:', error)
      toast({
        title: "Error",
        description: "Failed to update task",
        variant: "destructive",
      })
    }
  }

  const toggleTaskExpansion = async (taskId: string) => {
    // Update global swimlanes state
    const updatedSwimlanes = swimlanes.map(swimlane => ({
      ...swimlane,
      projects: swimlane.projects.map(project => ({
        ...project,
        tasks: updateTasksRecursively(project.tasks, taskId, (task) => ({
          ...task,
          expanded: !task.expanded
        }))
      }))
    }))
    setSwimlanes(updatedSwimlanes)

    // Update selectedProject state if it exists
    if (selectedProject) {
      const updatedProject = updatedSwimlanes
        .flatMap(s => s.projects)
        .find(p => p.id === selectedProject.id)
      
      if (updatedProject) {
        setSelectedProject(updatedProject)
      }
    }
  }

  const updateTasksRecursively = (tasks: Task[], targetId: string, updateFn: (task: Task) => Task): Task[] => {
    return tasks.map(task => {
      if (task.id === targetId) {
        return updateFn(task)
      }
      if (task.subtasks.length > 0) {
        return { ...task, subtasks: updateTasksRecursively(task.subtasks, targetId, updateFn) }
      }
      return task
    })
  }

  const deleteTask = async (taskId: string) => {
    try {
      const response = await fetch(`/api/tasks?id=${taskId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error('Failed to delete task')
      }

      await loadData() // Refresh data
      await refreshSelectedProject() // Update selectedProject if it exists
      
      toast({
        title: "Success",
        description: "Task deleted successfully",
      })
    } catch (error) {
      console.error('Error deleting task:', error)
      toast({
        title: "Error",
        description: "Failed to delete task",
        variant: "destructive",
      })
    }
  }

  const setTaskDueDate = async (taskId: string, date: Date | undefined) => {
    try {
      const response = await fetch('/api/tasks', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: taskId,
          dueDate: date ? format(date, "yyyy-MM-dd") : null
        })
      })

      if (!response.ok) {
        throw new Error('Failed to update task due date')
      }

      await loadData() // Refresh data
      await refreshSelectedProject() // Update selectedProject if it exists
      
      setSettingDateForTaskId(null)
      setSelectedDate(undefined)
      toast({
        title: "Success",
        description: date ? "Due date set successfully" : "Due date removed successfully",
      })
    } catch (error) {
      console.error('Error setting task due date:', error)
      toast({
        title: "Error",
        description: "Failed to update due date",
        variant: "destructive",
      })
    }
  }

  const openProjectNotepad = (project: Project) => {
    setSelectedProject(project)
    setEditingProjectTitle(project.title)
    setEditingProjectDescription(project.description)
    setIsNotepadOpen(true)
    setIsEditingProject(false)
  }

  const getAllTasksWithDates = () => {
    const tasksWithDates: Array<{
      task: Task
      projectTitle: string
      swimlaneTitle: string
      swimlaneColor: string
    }> = []

    const collectTasks = (tasks: Task[], projectTitle: string, swimlaneTitle: string, swimlaneColor: string) => {
      tasks.forEach((task) => {
        if (task.dueDate) {
          tasksWithDates.push({ task, projectTitle, swimlaneTitle, swimlaneColor })
        }
        if (task.subtasks.length > 0) {
          collectTasks(task.subtasks, projectTitle, swimlaneTitle, swimlaneColor)
        }
      })
    }

    swimlanes.forEach((swimlane) => {
      swimlane.projects.forEach((project) => {
        collectTasks(project.tasks, project.title, swimlane.title, swimlane.color)
      })
    })

    return tasksWithDates.sort((a, b) => new Date(a.task.dueDate!).getTime() - new Date(b.task.dueDate!).getTime())
  }

  const isTaskOverdue = (dueDate: string, completed: boolean) => {
    return !completed && new Date(dueDate) < new Date()
  }

  const renderTask = (task: Task, depth = 0) => {
    const hasSubtasks = task.subtasks.length > 0
    const completedSubtasks = task.subtasks.filter((st) => st.completed).length
    const isOverdue = task.dueDate && isTaskOverdue(task.dueDate, task.completed)

    return (
      <div key={task.id} className="space-y-2">
        <div
          className={`flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors ${
            depth > 0 ? "ml-6 border-l-2 border-l-primary/20" : ""
          } ${isOverdue ? "border-red-200 bg-red-50/50" : ""}`}
        >
          <div className="flex items-center gap-2">
            {hasSubtasks && (
              <Button variant="ghost" size="sm" className="p-0 h-6 w-6" onClick={() => toggleTaskExpansion(task.id)}>
                {task.expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </Button>
            )}
            <Checkbox checked={task.completed} onCheckedChange={() => toggleTaskCompletion(task.id)} />
          </div>

          <div className="flex-1">
            <span className={`${task.completed ? "line-through text-muted-foreground" : ""}`}>{task.title}</span>
            {hasSubtasks && (
              <div className="text-xs text-muted-foreground mt-1">
                {completedSubtasks}/{task.subtasks.length} subtasks completed
              </div>
            )}
          </div>

          <div className="flex items-center gap-1">
            {task.dueDate && (
              <Badge variant={isOverdue ? "destructive" : "outline"} className="text-xs">
                <CalendarIcon className="w-3 h-3 mr-1" />
                {format(new Date(task.dueDate), "MMM dd")}
              </Badge>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="p-0 h-6 w-6">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                {depth === 0 && (
                  <DropdownMenuItem onClick={() => setAddingSubtaskToId(task.id)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Subtask
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => setSettingDateForTaskId(task.id)}>
                  <CalendarIcon className="w-4 h-4 mr-2" />
                  {task.dueDate ? "Change Due Date" : "Set Due Date"}
                </DropdownMenuItem>
                {task.dueDate && (
                  <DropdownMenuItem onClick={() => setTaskDueDate(task.id, undefined)}>
                    <X className="w-4 h-4 mr-2" />
                    Remove Due Date
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => deleteTask(task.id)} className="text-destructive">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Date Picker Popover */}
        {settingDateForTaskId === task.id && (
          <div className={`${depth > 0 ? "ml-6" : ""} ml-12`}>
            <Card className="p-4">
              <div className="space-y-3">
                <h4 className="font-medium text-sm">Set Due Date</h4>
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  className="rounded-md border"
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => setTaskDueDate(task.id, selectedDate)} disabled={!selectedDate}>
                    Set Date
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSettingDateForTaskId(null)
                      setSelectedDate(undefined)
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Add Subtask Input */}
        {addingSubtaskToId === task.id && (
          <div className={`flex items-center gap-2 ${depth > 0 ? "ml-6" : ""} ml-6`}>
            <Input
              placeholder="Enter subtask title"
              value={newSubtaskTitle}
              onChange={(e) => setNewSubtaskTitle(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === "Enter") addSubtask(task.id)
                if (e.key === "Escape") setAddingSubtaskToId(null)
              }}
              autoFocus
              className="flex-1"
            />
            <Button size="sm" onClick={() => addSubtask(task.id)}>
              Add
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setAddingSubtaskToId(null)}>
              Cancel
            </Button>
          </div>
        )}

        {/* Render Subtasks */}
        {hasSubtasks && task.expanded && (
          <div className="space-y-2">{task.subtasks.map((subtask) => renderTask(subtask, depth + 1))}</div>
        )}
      </div>
    )
  }

  const getTaskStats = (tasks: Task[]) => {
    let total = 0
    let completed = 0
    let overdue = 0

    const countTasks = (taskList: Task[]) => {
      taskList.forEach((task) => {
        total++
        if (task.completed) completed++
        if (task.dueDate && isTaskOverdue(task.dueDate, task.completed)) overdue++
        if (task.subtasks.length > 0) {
          countTasks(task.subtasks)
        }
      })
    }

    countTasks(tasks)
    return { total, completed, overdue }
  }

  const taskStats = selectedProject ? getTaskStats(selectedProject.tasks) : { total: 0, completed: 0, overdue: 0 }
  const allTasksWithDates = getAllTasksWithDates()

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin mx-auto" />
          <p className="text-muted-foreground">Loading taskboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Life Taskboard</h1>
            <p className="text-muted-foreground">Organize your projects across all life domains</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={showCalendarView ? "default" : "outline"}
              size="sm"
              onClick={() => setShowCalendarView(!showCalendarView)}
            >
              <CalendarDays className="w-4 h-4 mr-2" />
              {showCalendarView ? "Board View" : "Calendar View"}
            </Button>
            {swimlanes.length === 0 && (
              <Button variant="outline" size="sm" onClick={initializeData}>
                Load Sample Data
              </Button>
            )}
            <Button variant="outline" size="sm">
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </Button>
          </div>
        </div>
      </div>

      {swimlanes.length === 0 ? (
        <div className="text-center py-16">
          <h2 className="text-xl font-semibold mb-4">No data found</h2>
          <p className="text-muted-foreground mb-6">
            Get started by loading sample data or creating your first swimlane.
          </p>
          <div className="flex gap-2 justify-center">
            <Button onClick={initializeData}>
              Load Sample Data
            </Button>
            <Button variant="outline" onClick={() => setIsAddingSwimlane(true)}>
              Create Swimlane
            </Button>
          </div>
        </div>
      ) : (
        <>
          {/* Calendar View */}
          {showCalendarView ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Upcoming Tasks */}
                <Card className="lg:col-span-2">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CalendarIcon className="w-5 h-5" />
                      Upcoming Tasks
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {allTasksWithDates.length === 0 ? (
                        <p className="text-muted-foreground text-center py-8">
                          No tasks with due dates yet. Set due dates to see them here.
                        </p>
                      ) : (
                        allTasksWithDates.map(({ task, projectTitle, swimlaneTitle, swimlaneColor }) => {
                          const isOverdue = isTaskOverdue(task.dueDate!, task.completed)
                          const daysUntilDue = Math.ceil(
                            (new Date(task.dueDate!).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24),
                          )

                          return (
                            <div
                              key={task.id}
                              className={`flex items-center gap-3 p-3 border rounded-lg ${
                                isOverdue
                                  ? "border-red-200 bg-red-50/50"
                                  : daysUntilDue <= 1
                                    ? "border-yellow-200 bg-yellow-50/50"
                                    : ""
                              }`}
                            >
                              <Checkbox checked={task.completed} onCheckedChange={() => toggleTaskCompletion(task.id)} />
                              <div className="flex-1">
                                <div
                                  className={`font-medium ${task.completed ? "line-through text-muted-foreground" : ""}`}
                                >
                                  {task.title}
                                </div>
                                <div className="text-sm text-muted-foreground flex items-center gap-2">
                                  <div className={`w-2 h-2 rounded-full ${swimlaneColor}`} />
                                  {swimlaneTitle} • {projectTitle}
                                </div>
                              </div>
                              <div className="text-right">
                                <Badge
                                  variant={isOverdue ? "destructive" : daysUntilDue <= 1 ? "secondary" : "outline"}
                                  className="text-xs"
                                >
                                  {format(new Date(task.dueDate!), "MMM dd")}
                                </Badge>
                                {isOverdue && <div className="text-xs text-red-600 mt-1">Overdue</div>}
                                {!isOverdue && daysUntilDue <= 1 && (
                                  <div className="text-xs text-yellow-600 mt-1">Due soon</div>
                                )}
                              </div>
                            </div>
                          )
                        })
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Calendar Stats */}
                <div className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Overview</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-primary">{allTasksWithDates.length}</div>
                        <div className="text-xs text-muted-foreground">Tasks with dates</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-red-600">
                          {allTasksWithDates.filter(({ task }) => isTaskOverdue(task.dueDate!, task.completed)).length}
                        </div>
                        <div className="text-xs text-muted-foreground">Overdue tasks</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-yellow-600">
                          {
                            allTasksWithDates.filter(({ task }) => {
                              const daysUntilDue = Math.ceil(
                                (new Date(task.dueDate!).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24),
                              )
                              return daysUntilDue <= 1 && daysUntilDue >= 0 && !task.completed
                            }).length
                          }
                        </div>
                        <div className="text-xs text-muted-foreground">Due soon</div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          ) : (
            /* Board View - converted to vertical Kanban layout */
            <div className="flex gap-6 overflow-x-auto pb-4">
              {swimlanes.map((swimlane) => (
                <div key={swimlane.id} className="flex-shrink-0 w-80">
                  {/* Swimlane Header */}
                  <div className="flex items-center justify-between mb-4 p-3 bg-muted/30 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${swimlane.color}`} />
                      <h2 className="text-lg font-semibold text-foreground">{swimlane.title}</h2>
                      <Badge variant="secondary" className="text-xs">
                        {swimlane.projects.length}
                      </Badge>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem onClick={() => addProject(swimlane.id)}>
                          <Plus className="w-4 h-4 mr-2" />
                          Add Project
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => deleteSwimlane(swimlane.id)}>
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete Lane
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {/* Projects Column */}
                  <div className="space-y-3 max-h-[calc(100vh-200px)] overflow-y-auto">
                    {swimlane.projects.map((project) => {
                      const stats = getTaskStats(project.tasks)
                      return (
                        <Card key={project.id} className="hover:shadow-md transition-shadow group cursor-pointer">
                          <CardHeader className="pb-3">
                            <div className="flex items-start justify-between">
                              <CardTitle className="text-sm font-medium line-clamp-2">{project.title}</CardTitle>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                                  >
                                    <MoreVertical className="w-4 h-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent>
                                  <DropdownMenuItem onClick={() => openProjectNotepad(project)}>
                                    <Edit3 className="w-4 h-4 mr-2" />
                                    Open Notepad
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => deleteProject(swimlane.id, project.id)}
                                    className="text-destructive"
                                  >
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Delete Project
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </CardHeader>
                          <CardContent onClick={() => openProjectNotepad(project)}>
                            <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{project.description}</p>
                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                              <span>{stats.total} tasks</span>
                              <div className="flex items-center gap-1">
                                <span>{stats.completed} done</span>
                                {stats.overdue > 0 && (
                                  <Badge variant="destructive" className="text-xs px-1">
                                    {stats.overdue}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )
                    })}

                    {/* Add Project Card */}
                    <Card
                      className="border-dashed border-2 hover:border-primary/50 transition-colors cursor-pointer"
                      onClick={() => addProject(swimlane.id)}
                    >
                      <CardContent className="flex items-center justify-center h-24">
                        <div className="text-center">
                          <Plus className="w-6 h-6 mx-auto mb-1 text-muted-foreground" />
                          <p className="text-xs text-muted-foreground">Add Project</p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              ))}

              {/* Add Swimlane Column */}
              <div className="flex-shrink-0 w-80">
                {isAddingSwimlane ? (
                  <div className="space-y-3 p-3 bg-muted/30 rounded-lg">
                    <Input
                      placeholder="Enter lane name (e.g., Learning, Health)"
                      value={newSwimlaneTitle}
                      onChange={(e) => setNewSwimlaneTitle(e.target.value)}
                      onKeyPress={(e) => e.key === "Enter" && addSwimlane()}
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <Button onClick={addSwimlane} size="sm" className="flex-1">
                        Add Lane
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setIsAddingSwimlane(false)
                          setNewSwimlaneTitle("")
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Card
                    className="border-dashed border-2 hover:border-primary/50 transition-colors cursor-pointer h-32"
                    onClick={() => setIsAddingSwimlane(true)}
                  >
                    <CardContent className="flex items-center justify-center h-full">
                      <div className="text-center">
                        <Plus className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">Add New Lane</p>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* Project Notepad Modal */}
      <Dialog open={isNotepadOpen} onOpenChange={setIsNotepadOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div className="flex-1">
                {isEditingProject ? (
                  <Input
                    value={editingProjectTitle}
                    onChange={(e) => setEditingProjectTitle(e.target.value)}
                    className="text-lg font-semibold border-none p-0 h-auto focus-visible:ring-0"
                    placeholder="Project title"
                  />
                ) : (
                  <DialogTitle className="text-xl">{selectedProject?.title}</DialogTitle>
                )}
              </div>
              <div className="flex items-center gap-2">
                {isEditingProject ? (
                  <>
                    <Button size="sm" onClick={saveProjectChanges}>
                      <Save className="w-4 h-4 mr-1" />
                      Save
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setIsEditingProject(false)}>
                      <X className="w-4 h-4" />
                    </Button>
                  </>
                ) : (
                  <Button variant="ghost" size="sm" onClick={() => setIsEditingProject(true)}>
                    <Edit3 className="w-4 h-4 mr-1" />
                    Edit
                  </Button>
                )}
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 space-y-4 overflow-y-auto">
            {/* Project Description/Notes */}
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-2 block">Project Notes</label>
              {isEditingProject ? (
                <Textarea
                  value={editingProjectDescription}
                  onChange={(e) => setEditingProjectDescription(e.target.value)}
                  placeholder="Add project description, goals, notes..."
                  className="min-h-[120px] resize-none"
                />
              ) : (
                <div className="min-h-[120px] p-3 border rounded-md bg-muted/30">
                  <p className="text-sm whitespace-pre-wrap">
                    {selectedProject?.description || "No description added yet. Click Edit to add notes."}
                  </p>
                </div>
              )}
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-primary">{taskStats.total}</div>
                  <div className="text-xs text-muted-foreground">Total Tasks</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-green-600">{taskStats.completed}</div>
                  <div className="text-xs text-muted-foreground">Completed</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-orange-600">{taskStats.overdue}</div>
                  <div className="text-xs text-muted-foreground">Overdue</div>
                </CardContent>
              </Card>
            </div>

            {/* Tasks Management */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium">Tasks</h3>
                <Button size="sm" variant="outline" onClick={() => setIsAddingTask(true)}>
                  <Plus className="w-4 h-4 mr-1" />
                  Add Task
                </Button>
              </div>

              {/* Add Task Input */}
              {isAddingTask && (
                <div className="flex items-center gap-2 mb-4">
                  <Input
                    placeholder="Enter task title"
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === "Enter") addTask()
                      if (e.key === "Escape") setIsAddingTask(false)
                    }}
                    autoFocus
                    className="flex-1"
                  />
                  <Button size="sm" onClick={addTask}>
                    Add
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setIsAddingTask(false)}>
                    Cancel
                  </Button>
                </div>
              )}

              <div className="space-y-2 max-h-96 overflow-y-auto">
                {selectedProject?.tasks.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No tasks yet. Add your first task to get started.</p>
                  </div>
                ) : (
                  selectedProject?.tasks.map((task) => renderTask(task))
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}