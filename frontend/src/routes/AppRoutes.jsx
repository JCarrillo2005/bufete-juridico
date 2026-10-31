import { Navigate, Route, Routes, useParams } from 'react-router-dom'
import AppLayout from '../layouts/AppLayout'
import DetalleExpediente from '../pages/DetalleExpediente'
import ListadoExpedientes from '../pages/ListadoExpedientes'
import NoEncontrado from '../pages/NoEncontrado'
import NuevoExpediente from '../pages/NuevoExpediente'

function DetalleRuta() {
  const { id } = useParams()
  return <DetalleExpediente key={id} />
}

export default function AppRoutes() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<Navigate to="/expedientes" replace />} />
        <Route path="expedientes" element={<ListadoExpedientes />} />
        <Route path="expedientes/nuevo" element={<NuevoExpediente />} />
        <Route path="expedientes/:id" element={<DetalleRuta />} />
        <Route path="*" element={<NoEncontrado />} />
      </Route>
    </Routes>
  )
}
