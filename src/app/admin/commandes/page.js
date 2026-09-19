import AdminPageHeader from '../AdminPageHeader'
import AdminOrders from '../AdminOrders'

export const metadata = { title: 'Commandes · Best Pizza' }

export default function AdminOrdersPage() {
  return (
    <AdminPageHeader title="Commandes" subtitle="Toutes les commandes du jour, mises à jour en temps réel.">
      <AdminOrders />
    </AdminPageHeader>
  )
}
