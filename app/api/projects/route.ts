import { NextRequest, NextResponse } from 'next/server';
import { 
  createProject, 
  updateProject, 
  deleteProject,
} from '@/lib/db/operations';

export async function POST(request: NextRequest) {
  try {
    const { title, description, swimlaneId } = await request.json();
    
    if (!title || !swimlaneId) {
      return NextResponse.json({ error: 'Title and swimlaneId are required' }, { status: 400 });
    }
    
    const project = await createProject({
      id: Date.now().toString(),
      title,
      description: description || "Click to edit description",
      swimlaneId,
    });
    
    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    console.error('Error creating project:', error);
    return NextResponse.json({ error: 'Failed to create project' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { id, title, description } = await request.json();
    
    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }
    
    const project = await updateProject(id, { title, description });
    return NextResponse.json(project);
  } catch (error) {
    console.error('Error updating project:', error);
    return NextResponse.json({ error: 'Failed to update project' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }
    
    await deleteProject(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting project:', error);
    return NextResponse.json({ error: 'Failed to delete project' }, { status: 500 });
  }
}

