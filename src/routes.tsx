import { ReactElement } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'

import SendPage from 'pages/Send'
import DashboardPage from 'pages/Dashboard'
import TokenInitPage from 'pages/TokenInit'
import { TOKEN_INIT_ENABLED } from 'packages/union/gno-zkgm-constants'

const AppRoutes = (): ReactElement => {
  return (
    <Routes>
      <Route path="/" element={<SendPage />} />
      <Route path="/dashboard" element={<DashboardPage />} />
      {TOKEN_INIT_ENABLED && (
        <Route path="/token-init" element={<TokenInitPage />} />
      )}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
export default AppRoutes
