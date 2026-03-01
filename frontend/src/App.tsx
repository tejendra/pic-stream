import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './App.css'

function Home() {
  return <h1>Pic Stream</h1>
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
      </Routes>
    </BrowserRouter>
  )
}
