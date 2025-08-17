import { NextRequest, NextResponse } from 'next/server';
import { 
  createTask, 
  updateTask, 
  deleteTask,
  toggleTaskCompletion,
} from '@/lib/db/operations';

export async function POST(request: NextRequest) {
  try {
    const { title, projectId, parentTaskId, dueDate } = await request.json();
    
    if (!title || !projectId) {
      return NextResponse.json({ error: 'Title and projectId are required' }, { status: 400 });
    }
    
    const task = await createTask({
      id: Date.now().toString(),
      title,
      completed: false,
      dueDate: dueDate || null,
      projectId,
      parentTaskId: parentTaskId || null,
      expanded: false,
      sortOrder: 0,
    });
    
    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    console.error('Error creating task:', error);
    return NextResponse.json({ error: 'Failed to create task' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { id, action, ...data } = await request.json();
    
    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }
    
    let task;
    
    if (action === 'toggle') {
      task = await toggleTaskCompletion(id);
    } else {
      task = await updateTask(id, data);
    }
    
    return NextResponse.json(task);
  } catch (error) {
    console.error('Error updating task:', error);
    return NextResponse.json({ error: 'Failed to update task' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }
    
    await deleteTask(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting task:', error);
    return NextResponse.json({ error: 'Failed to delete task' }, { status: 500 });
  }
}

