import { Route, Routes } from 'react-router-dom'
import SongList from './pages/SongList'
import SongView from './pages/SongView'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<SongList />} />
      <Route path="/song/:id" element={<SongView />} />
    </Routes>
  )
}
