import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { StructureDataViz } from './StructureDataViz';
import { Users } from 'lucide-react';
import * as api from '../utils/api';

interface StructureWithVersionToggleProps {
  currentUser: any;
  refreshTrigger: number;
}

export function StructureWithVersionToggle({ currentUser, refreshTrigger }: StructureWithVersionToggleProps) {
  return (
    <div className="space-y-6 p-6">
      {/* Структура команды */}
      <StructureDataViz currentUser={currentUser} refreshTrigger={refreshTrigger} />
    </div>
  );
}