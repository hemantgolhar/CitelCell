import { useEffect, useState } from 'react'
import './App.css'
import BottomNavigation from './components/BottomNavigation'
import FollowUps from './pages/FollowUps'
import Home from './pages/Home'
import Leads from './pages/Leads'
import Pipeline from './pages/Pipeline'
import PwaStatus from './components/PwaStatus'
import Reports from './pages/Reports'
import Settings from './pages/Settings'
import { addLead, completeFollowUp, deleteLead, getAllActivities, getAllLeads, initializeLeadData, markLeadLost, markLeadWon, moveLeadStage, rescheduleFollowUp, saveDealClosing, updateLead } from './services/db'

function App() {
  const [activePage, setActivePage] = useState('dashboard')
  const [leads, setLeads] = useState([])
  const [activities, setActivities] = useState([])
  const [isLoadingLeads, setIsLoadingLeads] = useState(true)
  const [databaseError, setDatabaseError] = useState('')
  const [leadView, setLeadView] = useState('list')
  const [selectedLeadId, setSelectedLeadId] = useState(null)

  const reloadCrmData = async () => {
    const [savedLeads, savedActivities] = await Promise.all([getAllLeads(), getAllActivities()])
    setLeads(savedLeads)
    setActivities(savedActivities)
    return { leads: savedLeads, activities: savedActivities }
  }

  useEffect(() => {
    let isActive = true

    async function loadLeads() {
      try {
        await initializeLeadData()
        const [savedLeads, savedActivities] = await Promise.all([getAllLeads(), getAllActivities()])
        if (isActive) {
          setLeads(savedLeads)
          setActivities(savedActivities)
        }
      } catch (error) {
        console.error('Unable to load lead data.', error)
        if (isActive) setDatabaseError('Local storage is unavailable. Your lead changes may not be saved.')
      } finally {
        if (isActive) setIsLoadingLeads(false)
      }
    }

    loadLeads()
    return () => { isActive = false }
  }, [])

  const navigate = (page) => {
    setActivePage(page)
    setLeadView('list')
  }

  const openAddLead = () => {
    setActivePage('leads')
    setSelectedLeadId(null)
    setLeadView('add')
  }

  const saveLead = async (lead) => {
    try {
      const savedLead = lead.id ? await updateLead(lead) : await addLead(lead)
      setLeads((current) => lead.id
        ? current.map((item) => item.id === savedLead.id ? savedLead : item)
        : [savedLead, ...current])
      setDatabaseError('')
      setLeadView('list')
      return true
    } catch (error) {
      console.error('Unable to save lead.', error)
      setDatabaseError('This lead could not be saved. Please try again.')
      return false
    }
  }

  const removeLead = async (id) => {
    try {
      await deleteLead(id)
      setLeads((current) => current.filter((lead) => lead.id !== id))
      setActivities((current) => current.filter((activity) => activity.leadId !== id))
      setDatabaseError('')
      setLeadView('list')
      setSelectedLeadId(null)
    } catch (error) {
      console.error('Unable to delete lead.', error)
      setDatabaseError('This lead could not be deleted. Please try again.')
    }
  }

  const finishFollowUp = async (lead, outcome, note, nextFollowUp) => {
    try {
      const result = await completeFollowUp(lead, outcome, note, nextFollowUp)
      setLeads((current) => current.map((item) => item.id === lead.id ? result.lead : item))
      setActivities((current) => [result.activity, ...current])
      setDatabaseError('')
      return true
    } catch (error) {
      console.error('Unable to complete follow-up.', error)
      setDatabaseError('This follow-up could not be saved. Please try again.')
      return false
    }
  }

  const moveFollowUp = async (lead, followUp) => {
    try {
      const savedLead = await rescheduleFollowUp(lead, followUp)
      setLeads((current) => current.map((item) => item.id === lead.id ? savedLead : item))
      setDatabaseError('')
      return true
    } catch (error) {
      console.error('Unable to reschedule follow-up.', error)
      setDatabaseError('This follow-up could not be rescheduled. Please try again.')
      return false
    }
  }

  const openLeadDetail = (id) => {
    setSelectedLeadId(id)
    setLeadView('detail')
    setActivePage('leads')
  }

  const savePipelineChange = async (operation, message) => {
    try {
      const result = await operation()
      setLeads((current) => current.map((item) => item.id === result.lead.id ? result.lead : item))
      setActivities((current) => [result.activity, ...current])
      setDatabaseError('')
      return true
    } catch (error) {
      console.error(message, error)
      setDatabaseError('The pipeline change could not be saved. Please try again.')
      return false
    }
  }

  const completeDealClosing = async (lead, closingDetails) => {
    try {
      const result = await saveDealClosing(lead, closingDetails)
      setLeads((current) => current.map((item) => item.id === result.lead.id ? result.lead : item))
      if (result.activity) setActivities((current) => [result.activity, ...current])
      setDatabaseError('')
      setLeadView('detail')
      return true
    } catch (error) {
      console.error('Unable to save customer and sale details.', error)
      setDatabaseError('The customer and sale details could not be saved. Please try again.')
      return false
    }
  }

  let pageContent
  if (activePage === 'leads') {
    pageContent = <Leads leads={leads} activities={activities} isLoading={isLoadingLeads} view={leadView} selectedLeadId={selectedLeadId} onViewChange={setLeadView} onSelectLead={setSelectedLeadId} onSaveLead={saveLead} onSaveClosing={completeDealClosing} onDeleteLead={removeLead} />
  } else if (activePage === 'settings') {
    pageContent = <Settings currentLeadCount={leads.length} onBack={() => navigate('dashboard')} onRestoreComplete={reloadCrmData} />
  } else if (activePage === 'followups') {
    pageContent = <FollowUps leads={leads} activities={activities} isLoading={isLoadingLeads} onComplete={finishFollowUp} onReschedule={moveFollowUp} onOpenLead={openLeadDetail} />
  } else if (activePage === 'pipeline') {
    pageContent = <Pipeline leads={leads} isLoading={isLoadingLeads} onOpenLead={openLeadDetail} onMoveStage={(lead, stage) => savePipelineChange(() => moveLeadStage(lead, stage), 'Unable to move lead.')} onMarkWon={(lead, products, note) => savePipelineChange(() => markLeadWon(lead, products, note), 'Unable to mark lead won.')} onMarkLost={(lead, reason, note) => savePipelineChange(() => markLeadLost(lead, reason, note), 'Unable to mark lead lost.')} />
  } else {
    pageContent = activePage === 'dashboard'
      ? <Home leads={leads} activities={activities} onOpenLead={openLeadDetail} onOpenSettings={() => navigate('settings')} onAddLead={openAddLead} onOpenFollowUps={() => navigate('followups')} />
      : <Reports />
  }

  return (
    <div className="app-shell">
      {pageContent}
      <PwaStatus />
      {databaseError && <div className="database-error" role="alert">{databaseError}</div>}
      {activePage !== 'settings' && !['add', 'edit', 'detail', 'closing', 'coach'].includes(leadView) && (
        <button className="add-lead-button" type="button" onClick={openAddLead}>
          <span aria-hidden="true">＋</span> Add Lead
        </button>
      )}
      <BottomNavigation activePage={activePage} onNavigate={navigate} />
    </div>
  )
}

export default App
