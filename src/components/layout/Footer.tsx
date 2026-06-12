import { AlertTriangle } from 'lucide-react';

export function Footer() {
  return (
    <footer className="bg-primary/50 border-t border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-start gap-3 p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20 mb-4">
          <AlertTriangle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-gray-400">
            <p className="font-medium text-yellow-500 mb-1">风险提示</p>
            <p>
              投资有风险，决策需谨慎。本工具仅供参考，不构成任何投资建议。
              投资者应自行承担投资风险，理性投资，量力而行。
            </p>
          </div>
        </div>

        <div className="text-center text-sm text-gray-500">
          <p>© 2024 A股智选. 保留所有权利.</p>
        </div>
      </div>
    </footer>
  );
}
