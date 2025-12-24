'use client';

import { useState } from 'react';
import { useToast } from '@/lib/hooks/useToast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

type ResetOption = {
  title: string;
  description: string;
  module: string;
  danger?: boolean;
  wide?: boolean;
};

const RESET_OPTIONS: ResetOption[] = [
  {
    title: 'Full System Reset',
    description:
      'Deletes everything: customers, products, formulations, inventory, production, sales, purchases, and history. Use to start completely fresh.',
    module: 'full',
    danger: true,
    wide: true,
  },
  {
    title: 'Zero All Inventory (Keep Records)',
    description: 'Sets all inventory quantities (raw, bulk, finished) to zero while keeping catalog data intact.',
    module: 'inventory',
    danger: false,
  },
];

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

  const ResetCard = ({ option }: { option: ResetOption }) => (
    <Card
      className={`hover:shadow-md transition-all ${option.wide ? 'lg:col-span-3' : ''}`}
    >
      <CardHeader>
        <CardTitle className={option.danger ? 'text-destructive' : ''}>
          {option.title}
        </CardTitle>
        <CardDescription>
          {option.description}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button
          onClick={() => {
            setResetModule(option.module);
            setConfirmText('');
          }}
          variant={option.danger ? 'destructive' : 'secondary'}
        >
          Reset {option.title}
        </Button>
      </CardContent>
    </Card>
  );

  const activeResetOption = RESET_OPTIONS.find(
    (option) => option.module === resetModule
  );

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">System Settings</h1>
          <p className="text-muted-foreground">Manage your system data and administrative tasks</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="hover:shadow-md transition-all">
          <CardHeader>
            <CardTitle>Full System Backup</CardTitle>
            <CardDescription>
              Export all system data (customers, products, sales, production, etc.) into a single JSON file.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={handleBackup}
              disabled={loading === 'backup'}
              className="w-full"
            >
              {loading === 'backup' ? 'Generating...' : 'Download Backup'}
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-all">
          <CardHeader>
            <CardTitle>Restore from Backup</CardTitle>
            <CardDescription>
              Import data from a previously exported backup file. This will overwrite all current system data.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => setShowRestoreModal(true)}
              variant="outline"
              className="w-full"
            >
              Import Backup
            </Button>
          </CardContent>
        </Card>

        <div className="lg:col-span-3">
          <hr className="my-4 border-border" />
          <h2 className="text-xl font-bold text-foreground mb-4">Reset Options (Danger Zone)</h2>
        </div>

        {RESET_OPTIONS.map((option) => (
          <ResetCard key={option.module} option={option} />
        ))}
      </div>

      {/* Reset Confirmation Modal */}
      <Dialog open={!!resetModule} onOpenChange={(open) => !open && (setResetModule(null), setConfirmText(''))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Are you absolutely sure?</DialogTitle>
          <DialogDescription>
            {activeResetOption ? (
              <>
                {activeResetOption.description}{' '}
                This action is destructive and cannot be undone. To proceed, please type <span className="font-bold text-destructive">RESET</span> in the box below.
              </>
            ) : (
              <>
                This action is destructive and cannot be undone. To proceed, please type <span className="font-bold text-destructive">RESET</span> in the box below.
              </>
            )}
          </DialogDescription>
          </DialogHeader>
          
          <Input
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="Type RESET here"
            className="mb-6"
          />

          <div className="flex gap-3">
            <Button
              onClick={() => handleReset(resetModule!)}
              disabled={loading !== null || confirmText !== 'RESET'}
              variant="destructive"
              className="flex-1"
            >
              {loading === resetModule ? 'Resetting...' : 'Confirm Reset'}
            </Button>
            <Button
              onClick={() => {
                setResetModule(null);
                setConfirmText('');
              }}
              variant="outline"
              className="flex-1"
            >
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Restore Confirmation Modal */}
      <Dialog open={showRestoreModal} onOpenChange={(open) => !open && (setShowRestoreModal(false), setRestoreFile(null), setConfirmText(''))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Restore System Data</DialogTitle>
            <DialogDescription>
              This will <span className="font-bold text-destructive">OVERWRITE</span> all existing data with the contents of the backup file. This cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <div className="mb-6">
            <Label htmlFor="restore-file">Select Backup File (.json)</Label>
            <Input
              id="restore-file"
              type="file"
              accept=".json"
              onChange={(e) => setRestoreFile(e.target.files?.[0] || null)}
              className="mt-2"
            />
          </div>
          
          <div className="mb-6">
            <Label htmlFor="restore-confirm">
              Type <span className="font-bold text-destructive">RESTORE</span> to confirm
            </Label>
            <Input
              id="restore-confirm"
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="Type RESTORE here"
              className="mt-2"
            />
          </div>

          <div className="flex gap-3">
            <Button
              onClick={handleRestore}
              disabled={loading === 'restore' || !restoreFile || confirmText !== 'RESTORE'}
              className="flex-1"
            >
              {loading === 'restore' ? 'Restoring...' : 'Start Restore'}
            </Button>
            <Button
              onClick={() => {
                setShowRestoreModal(false);
                setRestoreFile(null);
                setConfirmText('');
              }}
              variant="outline"
              className="flex-1"
            >
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
