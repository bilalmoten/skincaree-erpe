'use client';

import { useState } from 'react';
import { useToast } from '@/lib/hooks/useToast';

export default function SettingsPage() {
  const { showToast } = useToast();
  const [loading, setLoading] = useState<string | null>(null);
  const [confirmText, setConfirmText] = useState('');
  const [resetModule, setResetModule] = useState<string | null>(null);
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [restoreFile, setRestoreFile] = useState<File | null>(null);

  const handleBackup = async () => {
    setLoading('backup');
    try {
      const res = await fetch('/api/system/backup');
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `skincare-erp-backup-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        showToast('Backup downloaded successfully', 'success');
      } else {
        showToast('Failed to generate backup', 'error');
      }
    } catch (error) {
      showToast('An error occurred during backup', 'error');
    } finally {
      setLoading(null);
    }
  };

  const handleRestore = async () => {
    if (!restoreFile) return;
    if (confirmText !== 'RESTORE') {
      showToast('Please type RESTORE to confirm', 'error');
      return;
    }

    setLoading('restore');
    try {
      const fileContent = await restoreFile.text();
      const backupData = JSON.parse(fileContent);

      const res = await fetch('/api/system/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(backupData),
      });

      const data = await res.json();
      if (res.ok) {
        showToast('System restored successfully', 'success');
        setShowRestoreModal(false);
        setRestoreFile(null);
        setConfirmText('');
      } else {
        showToast(data.error || 'Failed to restore', 'error');
      }
    } catch (error) {
      showToast('Error reading backup file', 'error');
    } finally {
      setLoading(null);
    }
  };

  const handleReset = async (module: string) => {
    if (confirmText !== 'RESET') {
      showToast('Please type RESET to confirm', 'error');
      return;
    }

    setLoading(module);
    try {
      const res = await fetch('/api/system/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ module }),
      });

      const data = await res.json();
      if (res.ok) {
        showToast(data.message, 'success');
        setResetModule(null);
        setConfirmText('');
      } else {
        showToast(data.error || 'Failed to reset', 'error');
      }
    } catch (error) {
      showToast('An unexpected error occurred', 'error');
    } finally {
      setLoading(null);
    }
  };

  const ResetCard = ({ 
    title, 
    description, 
    module, 
    danger = false 
  }: { 
    title: string; 
    description: string; 
    module: string;
    danger?: boolean;
  }) => (
    <div className="bg-white dark:bg-slate-800 border-2 border-purple-100 dark:border-purple-900/30 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all">
      <h3 className={`text-lg font-bold mb-2 ${danger ? 'text-red-600' : 'text-purple-900 dark:text-purple-100'}`}>
        {title}
      </h3>
      <p className="text-gray-600 dark:text-gray-400 text-sm mb-6">
        {description}
      </p>
      <button
        onClick={() => setResetModule(module)}
        className={`px-4 py-2 rounded-xl font-medium transition-all ${
          danger 
            ? 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200' 
            : 'bg-purple-50 text-purple-600 hover:bg-purple-100 border border-purple-200'
        }`}
      >
        Reset {title}
      </button>
    </div>
  );

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">System Settings</h1>
          <p className="text-gray-600 dark:text-gray-400">Manage your system data and administrative tasks</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-800 border-2 border-purple-100 dark:border-purple-900/30 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all">
          <h3 className="text-lg font-bold mb-2 text-purple-900 dark:text-purple-100">Full System Backup</h3>
          <p className="text-gray-600 dark:text-gray-400 text-sm mb-6">
            Export all system data (customers, products, sales, production, etc.) into a single JSON file.
          </p>
          <button
            onClick={handleBackup}
            disabled={loading === 'backup'}
            className="w-full px-4 py-2 bg-purple-600 text-white rounded-xl font-medium hover:bg-purple-700 transition-all disabled:opacity-50"
          >
            {loading === 'backup' ? 'Generating...' : 'Download Backup'}
          </button>
        </div>

        <div className="bg-white dark:bg-slate-800 border-2 border-purple-100 dark:border-purple-900/30 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all">
          <h3 className="text-lg font-bold mb-2 text-purple-900 dark:text-purple-100">Restore from Backup</h3>
          <p className="text-gray-600 dark:text-gray-400 text-sm mb-6">
            Import data from a previously exported backup file. This will overwrite all current system data.
          </p>
          <button
            onClick={() => setShowRestoreModal(true)}
            className="w-full px-4 py-2 bg-white text-purple-600 border border-purple-200 rounded-xl font-medium hover:bg-purple-50 transition-all"
          >
            Import Backup
          </button>
        </div>

        <div className="lg:col-span-3">
          <hr className="my-4 border-gray-100 dark:border-slate-800" />
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Reset Options (Danger Zone)</h2>
        </div>

        <ResetCard 
          title="Sales & Ledger" 
          description="Deletes all sales records, sales items, and customer ledger transactions. Customers and products remain intact."
          module="sales"
        />
        <ResetCard 
          title="Production & Packaging" 
          description="Deletes all production runs, packaging runs, batch tracking, and material usage records."
          module="production"
        />
        <ResetCard 
          title="Inventory Levels" 
          description="Sets all inventory quantities (raw materials, bulk, finished products) to zero without deleting the items."
          module="inventory"
        />
        <ResetCard 
          title="Full System Reset" 
          description="CRITICAL: Deletes ALL data from ALL tables including customers, formulations, and products. This cannot be undone."
          module="full"
          danger={true}
        />
      </div>

      {/* Reset Confirmation Modal */}
      {resetModule && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 max-w-md w-full shadow-2xl border border-purple-100 dark:border-purple-900/30">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Are you absolutely sure?</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              This action is destructive and cannot be undone. To proceed, please type <span className="font-bold text-red-600">RESET</span> in the box below.
            </p>
            
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="Type RESET here"
              className="w-full px-4 py-3 rounded-xl border-2 border-purple-100 dark:border-purple-900/30 dark:bg-slate-900 focus:border-purple-500 outline-none mb-6"
            />

            <div className="flex gap-3">
              <button
                onClick={() => handleReset(resetModule)}
                disabled={loading !== null || confirmText !== 'RESET'}
                className="flex-1 px-4 py-3 rounded-xl font-bold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {loading === resetModule ? 'Resetting...' : 'Confirm Reset'}
              </button>
              <button
                onClick={() => {
                  setResetModule(null);
                  setConfirmText('');
                }}
                className="flex-1 px-4 py-3 rounded-xl font-bold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Restore Confirmation Modal */}
      {showRestoreModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 max-w-md w-full shadow-2xl border border-purple-100 dark:border-purple-900/30">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Restore System Data</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              This will <span className="font-bold text-red-600">OVERWRITE</span> all existing data with the contents of the backup file. This cannot be undone.
            </p>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Select Backup File (.json)
              </label>
              <input
                type="file"
                accept=".json"
                onChange={(e) => setRestoreFile(e.target.files?.[0] || null)}
                className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100"
              />
            </div>
            
            <p className="text-sm text-gray-500 dark:text-gray-500 mb-2">
              Type <span className="font-bold text-red-600">RESTORE</span> to confirm
            </p>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="Type RESTORE here"
              className="w-full px-4 py-3 rounded-xl border-2 border-purple-100 dark:border-purple-900/30 dark:bg-slate-900 focus:border-purple-500 outline-none mb-6"
            />

            <div className="flex gap-3">
              <button
                onClick={handleRestore}
                disabled={loading === 'restore' || !restoreFile || confirmText !== 'RESTORE'}
                className="flex-1 px-4 py-3 rounded-xl font-bold text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {loading === 'restore' ? 'Restoring...' : 'Start Restore'}
              </button>
              <button
                onClick={() => {
                  setShowRestoreModal(false);
                  setRestoreFile(null);
                  setConfirmText('');
                }}
                className="flex-1 px-4 py-3 rounded-xl font-bold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
