import React from 'react';
import { ShieldCheck, Clock, User, Activity, Globe, Monitor } from 'lucide-react';
import type { AuditLog } from '../types';

interface AuditProps {
  logs: AuditLog[];
}

export default function Audit({ logs }: AuditProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 bg-neutral-900 rounded-2xl flex items-center justify-center text-white shadow-lg">
          <ShieldCheck size={24} />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-neutral-900">Registro de Auditoría</h2>
          <p className="text-sm text-neutral-500">Trazabilidad completa de acciones en el sistema</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-neutral-50 text-neutral-500 text-xs font-semibold uppercase tracking-wider">
                <th className="px-6 py-4">Fecha y Hora (UTC)</th>
                <th className="px-6 py-4">Usuario</th>
                <th className="px-6 py-4">Acción</th>
                <th className="px-6 py-4">Entidad</th>
                <th className="px-6 py-4">Origen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-neutral-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2 text-sm text-neutral-600 font-medium">
                      <Clock size={14} className="text-neutral-400" />
                      {new Date(log.created_at).toLocaleString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 bg-neutral-100 rounded-full flex items-center justify-center text-[10px] font-bold text-neutral-600 uppercase">
                        {log.username[0]}
                      </div>
                      <span className="text-sm font-medium text-neutral-900">{log.username}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                      log.action === 'LOGIN' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                      log.action === 'CREATE' ? 'bg-green-50 text-green-700 border-green-100' :
                      log.action === 'UPDATE' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                      'bg-red-50 text-red-700 border-red-100'
                    }`}>
                      {log.action}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2 text-sm text-neutral-600">
                      <Activity size={14} className="text-neutral-400" />
                      {log.entity}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-1.5 text-xs text-neutral-500">
                        <Globe size={12} />
                        {log.ip_address || '0.0.0.0'}
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-20 text-center text-neutral-500 text-sm">
                    No hay registros de auditoría disponibles
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
