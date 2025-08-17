import { sql } from 'drizzle-orm';
import { sqliteTable, text, integer, real, blob } from 'drizzle-orm/sqlite-core';

// Swimlanes table
export const swimlanes = sqliteTable('swimlanes', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  color: text('color').notNull(),
  createdAt: integer('created_at').default(sql`(unixepoch())`),
  updatedAt: integer('updated_at').default(sql`(unixepoch())`),
});

// Projects table
export const projects = sqliteTable('projects', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description'),
  swimlaneId: text('swimlane_id')
    .notNull()
    .references(() => swimlanes.id, { onDelete: 'cascade' }),
  createdAt: integer('created_at').default(sql`(unixepoch())`),
  updatedAt: integer('updated_at').default(sql`(unixepoch())`),
});

// Tasks table - declare first without self-reference
export const tasks = sqliteTable('tasks', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  completed: integer('completed', { mode: 'boolean' }).default(false),
  dueDate: text('due_date'), // ISO date string
  projectId: text('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  parentTaskId: text('parent_task_id'),
  expanded: integer('expanded', { mode: 'boolean' }).default(false),
  sortOrder: integer('sort_order').default(0),
  createdAt: integer('created_at').default(sql`(unixepoch())`),
  updatedAt: integer('updated_at').default(sql`(unixepoch())`),
});

// Types for TypeScript
export type Swimlane = typeof swimlanes.$inferSelect;
export type InsertSwimlane = typeof swimlanes.$inferInsert;

export type Project = typeof projects.$inferSelect;
export type InsertProject = typeof projects.$inferInsert;

export type Task = typeof tasks.$inferSelect;
export type InsertTask = typeof tasks.$inferInsert;
