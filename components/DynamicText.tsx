import { useTerminology } from '../contexts/TemplateContext'

export function VolunteerText({ plural = false }: { plural?: boolean }) {
  const terminology = useTerminology()
  return <>{terminology.volunteer}{plural ? 's' : ''}</>
}

export function PositionText({ plural = false }: { plural?: boolean }) {
  const terminology = useTerminology()
  return <>{terminology.position}{plural ? 's' : ''}</>
}

export function ShiftText({ plural = false }: { plural?: boolean }) {
  const terminology = useTerminology()
  return <>{terminology.shift}{plural ? 's' : ''}</>
}

export function AssignmentText({ plural = false }: { plural?: boolean }) {
  const terminology = useTerminology()
  return <>{terminology.assignment}{plural ? 's' : ''}</>
}
