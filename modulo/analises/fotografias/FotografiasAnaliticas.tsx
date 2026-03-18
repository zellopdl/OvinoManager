
import React, { useState } from 'react';
import { Sheep, Group, BreedingPlan } from '../../../types';
import GmdAnalysis from './GmdAnalysis';
import EccAnalysis from './EccAnalysis';
import FamachaAnalysis from './FamachaAnalysis';
import VaccinationAnalysis from './VaccinationAnalysis';

interface FotografiasAnaliticasProps {
  sheep: Sheep[];
  groups: Group[];
  plans: BreedingPlan[];
}

type SubModule = 'gmd' | 'ecc' | 'famacha' | 'vacinacao';

const FotografiasAnaliticas: React.FC<FotografiasAnaliticasProps> = ({ sheep, groups, plans }) => {
  const [activeSubModule, setActiveSubModule] = useState<SubModule>('gmd');

  const subModules = [
    { id: 'gmd', label: 'GMD Peso', icon: '⚖️' },
    { id: 'ecc', label: 'ECC (Condição)', icon: '📏' },
    { id: 'famacha', label: 'FAMACHA', icon: '👁️' },
    { id: 'vacinacao', label: 'Vacinação', icon: '💉' },
  ];

  return (
    <div className="space-y-8 pb-20 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-2">
        <div>
          <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Fotografias do Rebanho</h2>
          <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest">Visões Analíticas e Snapshots Estratégicos</p>
        </div>
        
        <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200 self-start md:self-center overflow-x-auto max-w-full">
          {subModules.map(sm => (
            <button
              key={sm.id}
              onClick={() => setActiveSubModule(sm.id as SubModule)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all whitespace-nowrap ${
                activeSubModule === sm.id 
                  ? 'bg-white text-slate-900 shadow-sm' 
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <span>{sm.icon}</span>
              {sm.label}
            </button>
          ))}
        </div>
      </header>

      <div className="mt-4">
        {activeSubModule === 'gmd' && <GmdAnalysis sheep={sheep} groups={groups} />}
        {activeSubModule === 'ecc' && <EccAnalysis sheep={sheep} groups={groups} />}
        {activeSubModule === 'famacha' && <FamachaAnalysis sheep={sheep} groups={groups} />}
        {activeSubModule === 'vacinacao' && <VaccinationAnalysis sheep={sheep} groups={groups} plans={plans} />}
      </div>
    </div>
  );
};

export default FotografiasAnaliticas;
