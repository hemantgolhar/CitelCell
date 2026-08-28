import { useRef, useState } from 'react'
import { exportBackup, exportLeadsCsv, restoreBackup, validateBackup } from '../services/backup'

function Settings({ currentLeadCount, onBack, onRestoreComplete }) {
  const fileInput = useRef(null)
  const [pendingBackup, setPendingBackup] = useState(null)
  const [showReplaceConfirmation, setShowReplaceConfirmation] = useState(false)
  const [isWorking, setIsWorking] = useState(false)
  const [message, setMessage] = useState(null)

  const runExport = async (type) => {
    setIsWorking(true)
    setMessage(null)
    try {
      const count = type === 'backup' ? await exportBackup() : await exportLeadsCsv()
      setMessage({ type: 'success', text: `${count} leads exported successfully.` })
    } catch (error) {
      console.error('Export failed.', error)
      setMessage({ type: 'error', text: 'The export could not be created. Please try again.' })
    } finally {
      setIsWorking(false)
    }
  }

  const handleFile = async (event) => {
    const [file] = event.target.files
    event.target.value = ''
    if (!file) return
    setMessage(null)
    setShowReplaceConfirmation(false)
    try {
      const backup = validateBackup(await file.text())
      setPendingBackup({ ...backup, filename: file.name })
    } catch (error) {
      setPendingBackup(null)
      setMessage({ type: 'error', text: error.message || 'This backup file is invalid.' })
    }
  }

  const completeRestore = async (mode) => {
    if (!pendingBackup) return
    setIsWorking(true)
    setMessage(null)
    try {
      const result = await restoreBackup(pendingBackup, mode)
      await onRestoreComplete()
      setPendingBackup(null)
      setShowReplaceConfirmation(false)
      setMessage({ type: 'success', text: mode === 'merge' ? `${result.leadsImported} leads and ${result.activitiesImported} activities imported.` : `${result.leadsImported} leads and ${result.activitiesImported} activities restored.` })
    } catch (error) {
      console.error('Restore failed.', error)
      setMessage({ type: 'error', text: 'The backup could not be restored. Your existing data was not changed.' })
    } finally {
      setIsWorking(false)
    }
  }

  return (
    <main className="page settings-page">
      <header className="form-header">
        <button className="back-button" type="button" onClick={onBack} aria-label="Back to dashboard">‹</button>
        <div><p className="eyebrow">CitelCell</p><h1>Settings</h1></div>
      </header>

      <section className="settings-card">
        <div className="settings-section-heading"><span aria-hidden="true">⇅</span><div><h2>Data &amp; Backup</h2><p>Keep a copy of your CRM data on your device.</p></div></div>
        {message && <div className={`settings-message ${message.type}`} role="status">{message.text}</div>}
        {!pendingBackup ? (
          <div className="backup-actions">
            <button className="backup-action primary" type="button" onClick={() => runExport('backup')} disabled={isWorking}><span aria-hidden="true">↓</span><span><strong>Export Backup</strong><small>Download all CRM data as JSON</small></span></button>
            <button className="backup-action" type="button" onClick={() => fileInput.current?.click()} disabled={isWorking}><span aria-hidden="true">↑</span><span><strong>Restore Backup</strong><small>Select a CitelCell backup</small></span></button>
            <input ref={fileInput} className="hidden-file-input" type="file" accept="application/json,.json" onChange={handleFile} />
            <button className="backup-action" type="button" onClick={() => runExport('csv')} disabled={isWorking}><span aria-hidden="true">▤</span><span><strong>Export Leads as CSV</strong><small>Open your lead list in Excel or Sheets</small></span></button>
          </div>
        ) : (
          <div className="restore-review">
            <div className="restore-file"><span aria-hidden="true">✓</span><div><strong>Backup ready</strong><small>{pendingBackup.filename}</small></div></div>
            <div className="restore-counts"><p>Backup contains <strong>{pendingBackup.leads.length} leads</strong> and <strong>{pendingBackup.activities.length} activities</strong>.</p><p>Your current CRM contains <strong>{currentLeadCount} leads</strong>.</p></div>
            {!showReplaceConfirmation ? (
              <div className="restore-options">
                <button type="button" onClick={() => completeRestore('merge')} disabled={isWorking}><strong>Merge</strong><span>Keep existing leads and add new records.</span></button>
                <button className="replace-option" type="button" onClick={() => setShowReplaceConfirmation(true)} disabled={isWorking}><strong>Replace All</strong><span>Remove current leads and use this backup.</span></button>
                <button className="cancel-restore" type="button" onClick={() => setPendingBackup(null)} disabled={isWorking}>Cancel</button>
              </div>
            ) : (
              <div className="danger-confirmation" role="alert"><strong>Replace all current leads?</strong><p>This will permanently delete {currentLeadCount} current leads before restoring the backup.</p><div><button type="button" onClick={() => setShowReplaceConfirmation(false)} disabled={isWorking}>Go Back</button><button className="confirm-replace" type="button" onClick={() => completeRestore('replace')} disabled={isWorking}>{isWorking ? 'Restoring…' : 'Yes, Replace All'}</button></div></div>
            )}
          </div>
        )}
      </section>
      <p className="local-data-note"><span aria-hidden="true">⌂</span> Your data and backup files stay on your device.</p>
    </main>
  )
}

export default Settings
