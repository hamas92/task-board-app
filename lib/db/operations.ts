import { eq, and, desc, asc } from 'drizzle-orm';
import { db, swimlanes, projects, tasks } from './index';
import type { Swimlane, InsertSwimlane, Project, InsertProject, Task, InsertTask } from './schema';

// Swimlane operations
export async function getAllSwimlanes(): Promise<Swimlane[]> {
  return await db.select().from(swimlanes).orderBy(asc(swimlanes.createdAt));
}

export async function createSwimlane(data: InsertSwimlane): Promise<Swimlane> {
  const result = await db.insert(swimlanes).values({
    ...data,
    updatedAt: Math.floor(Date.now() / 1000),
  }).returning();
  return result[0];
}

export async function deleteSwimlane(id: string): Promise<void> {
  await db.delete(swimlanes).where(eq(swimlanes.id, id));
}

// Project operations
export async function getProjectsBySwimlaneId(swimlaneId: string): Promise<Project[]> {
  return await db.select().from(projects)
    .where(eq(projects.swimlaneId, swimlaneId))
    .orderBy(asc(projects.createdAt));
}

export async function createProject(data: InsertProject): Promise<Project> {
  const result = await db.insert(projects).values({
    ...data,
    updatedAt: Math.floor(Date.now() / 1000),
  }).returning();
  return result[0];
}

export async function updateProject(id: string, data: Partial<InsertProject>): Promise<Project> {
  const result = await db.update(projects)
    .set({
      ...data,
      updatedAt: Math.floor(Date.now() / 1000),
    })
    .where(eq(projects.id, id))
    .returning();
  return result[0];
}

export async function deleteProject(id: string): Promise<void> {
  await db.delete(projects).where(eq(projects.id, id));
}

// Task operations
export async function getTasksByProjectId(projectId: string): Promise<Task[]> {
  return await db.select().from(tasks)
    .where(eq(tasks.projectId, projectId))
    .orderBy(asc(tasks.sortOrder), asc(tasks.createdAt));
}

export async function getSubtasks(parentTaskId: string): Promise<Task[]> {
  return await db.select().from(tasks)
    .where(eq(tasks.parentTaskId, parentTaskId))
    .orderBy(asc(tasks.sortOrder), asc(tasks.createdAt));
}

export async function createTask(data: InsertTask): Promise<Task> {
  const result = await db.insert(tasks).values({
    ...data,
    updatedAt: Math.floor(Date.now() / 1000),
  }).returning();
  return result[0];
}

export async function updateTask(id: string, data: Partial<InsertTask>): Promise<Task> {
  const result = await db.update(tasks)
    .set({
      ...data,
      updatedAt: Math.floor(Date.now() / 1000),
    })
    .where(eq(tasks.id, id))
    .returning();
  return result[0];
}

export async function deleteTask(id: string): Promise<void> {
  await db.delete(tasks).where(eq(tasks.id, id));
}

export async function toggleTaskCompletion(id: string): Promise<Task> {
  // First get the current state
  const currentTaskResult = await db.select().from(tasks).where(eq(tasks.id, id));
  if (!currentTaskResult[0]) {
    throw new Error('Task not found');
  }
  const currentTask = currentTaskResult[0];
  
  // Update with the opposite value
  const result = await db.update(tasks)
    .set({
      completed: !currentTask.completed,
      updatedAt: Math.floor(Date.now() / 1000),
    })
    .where(eq(tasks.id, id))
    .returning();
  return result[0];
}

// Complex operations for hierarchical data
export interface TaskWithSubtasks extends Task {
  subtasks: TaskWithSubtasks[];
}

export interface ProjectWithTasks extends Project {
  tasks: TaskWithSubtasks[];
}

export interface SwimlaneWithProjects extends Swimlane {
  projects: ProjectWithTasks[];
}

export async function buildTaskHierarchy(projectId: string): Promise<TaskWithSubtasks[]> {
  // Get all tasks for the project
  const allTasks = await db.select().from(tasks)
    .where(eq(tasks.projectId, projectId))
    .orderBy(asc(tasks.sortOrder), asc(tasks.createdAt));

  // Create a map for quick lookup
  const taskMap = new Map<string, TaskWithSubtasks>();
  const rootTasks: TaskWithSubtasks[] = [];

  // Initialize all tasks with empty subtasks array
  allTasks.forEach(task => {
    taskMap.set(task.id, { ...task, subtasks: [] });
  });

  // Build the hierarchy
  allTasks.forEach(task => {
    const taskWithSubtasks = taskMap.get(task.id)!;
    
    if (task.parentTaskId && taskMap.has(task.parentTaskId)) {
      // This is a subtask
      const parent = taskMap.get(task.parentTaskId)!;
      parent.subtasks.push(taskWithSubtasks);
    } else {
      // This is a root task
      rootTasks.push(taskWithSubtasks);
    }
  });

  return rootTasks;
}

export async function getFullSwimlaneData(): Promise<SwimlaneWithProjects[]> {
  const allSwimlanes = await getAllSwimlanes();
  
  const swimlanesWithData: SwimlaneWithProjects[] = [];
  
  for (const swimlane of allSwimlanes) {
    const swimlaneProjects = await getProjectsBySwimlaneId(swimlane.id);
    
    const projectsWithTasks: ProjectWithTasks[] = [];
    
    for (const project of swimlaneProjects) {
      const tasks = await buildTaskHierarchy(project.id);
      projectsWithTasks.push({
        ...project,
        tasks,
      });
    }
    
    swimlanesWithData.push({
      ...swimlane,
      projects: projectsWithTasks,
    });
  }
  
  return swimlanesWithData;
}

// Utility function to initialize with sample data
export async function initializeSampleData(): Promise<void> {
  const existingSwimlanes = await getAllSwimlanes();
  if (existingSwimlanes.length > 0) {
    return; // Already has data
  }

  // Create default swimlanes
  const personalSwimlane = await createSwimlane({
    id: "1",
    title: "Personal",
    color: "bg-blue-500",
  });

  const workSwimlane = await createSwimlane({
    id: "2",
    title: "Work",
    color: "bg-green-500",
  });

  const investingSwimlane = await createSwimlane({
    id: "3",
    title: "Investing",
    color: "bg-purple-500",
  });

  // Create default projects
  const healthProject = await createProject({
    id: "1",
    title: "Health & Fitness",
    description: "Personal wellness goals and activities",
    swimlaneId: personalSwimlane.id,
  });

  const workProject = await createProject({
    id: "2",
    title: "Q1 Project Launch",
    description: "Major product release preparation",
    swimlaneId: workSwimlane.id,
  });

  const investingProject = await createProject({
    id: "3",
    title: "Portfolio Review",
    description: "Monthly investment analysis and rebalancing",
    swimlaneId: investingSwimlane.id,
  });

  // Create sample tasks
  const workoutTask = await createTask({
    id: "t1",
    title: "Morning workout routine",
    completed: false,
    dueDate: "2024-12-20",
    projectId: healthProject.id,
    parentTaskId: null,
    expanded: false,
    sortOrder: 0,
  });

  // Create subtasks
  await createTask({
    id: "st1",
    title: "30 min cardio",
    completed: true,
    projectId: healthProject.id,
    parentTaskId: workoutTask.id,
    sortOrder: 0,
  });

  await createTask({
    id: "st2",
    title: "Strength training",
    completed: false,
    dueDate: "2024-12-18",
    projectId: healthProject.id,
    parentTaskId: workoutTask.id,
    sortOrder: 1,
  });
}
