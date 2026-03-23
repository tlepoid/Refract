'use client';

import { use } from 'react';
import CanvasView from '../../../components/CanvasView';

export default function CanvasPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <CanvasView canvasId={id} />;
}
