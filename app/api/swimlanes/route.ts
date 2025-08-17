import { NextRequest, NextResponse } from 'next/server';
import { 
  getAllSwimlanes, 
  createSwimlane, 
  deleteSwimlane,
  getFullSwimlaneData,
  initializeSampleData 
} from '@/lib/db/operations';

export async function GET() {
  try {
    const swimlanes = await getFullSwimlaneData();
    return NextResponse.json(swimlanes);
  } catch (error) {
    console.error('Error fetching swimlanes:', error);
    return NextResponse.json({ error: 'Failed to fetch swimlanes' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    if (body.action === 'initialize') {
      await initializeSampleData();
      const swimlanes = await getFullSwimlaneData();
      return NextResponse.json(swimlanes);
    }
    
    const { title, color } = body;
    if (!title || !color) {
      return NextResponse.json({ error: 'Title and color are required' }, { status: 400 });
    }
    
    const swimlane = await createSwimlane({
      id: Date.now().toString(),
      title,
      color,
    });
    
    return NextResponse.json(swimlane, { status: 201 });
  } catch (error) {
    console.error('Error creating swimlane:', error);
    return NextResponse.json({ error: 'Failed to create swimlane' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }
    
    await deleteSwimlane(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting swimlane:', error);
    return NextResponse.json({ error: 'Failed to delete swimlane' }, { status: 500 });
  }
}

