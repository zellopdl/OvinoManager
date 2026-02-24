
// ManejoManager Component: Handles the display and management of sheep handling tasks
import React, { useState, useEffect } from 'react';
import { Manejo, Sheep, Paddock, Group } from '../types';
import { manejoService } from '../services/manejoService';
import ManejoCalendar from './ManejoCalendar.tsx';

interface ManejoManagerProps {
  sheep: Sheep[];
  paddocks: Paddock[];
  groups: Group[];
  onRefreshSheep: () => void;
  managerPassword?: string;
}

const ManejoManager: React.FC<ManejoManagerProps> = ({ sheep, paddocks, groups, onRefreshSheep }) => {
  const [manejos, setManejos] = useState<Manejo[]>([]);
  const [loading, setLoading] = useState(true);

  // Load all manejos from the service
  const loadManejos = async () => {
    setLoading(true);
    try {
      const data = await manejoService.getAll();
      setManejos(data);
    } catch (e) {
      console.error("Erro ao carregar manejos:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadManejos();
  }, []);

  return (
    <div className="space-y-6 h-full flex flex-col">
      <div className="bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm shrink-0">
        <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Agenda de Manejos</h2>
        <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-1">
          Planejamento e execução de tarefas do rebanho
        </p>
      </div>
      
      <div className="flex-1 min-h-0 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <ManejoCalendar manejos={manejos} />
        )}
      </div>
    </div>
  );
};

export default ManejoManager;
