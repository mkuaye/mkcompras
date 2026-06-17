import { Link, useLocation } from 'react-router-dom'

export default function Header() {
  const location = useLocation()
  const isActive = (path) => location.pathname === path ? 'text-text' : 'text-muted hover:text-text hover:bg-surface'

  return (
    <header className="w-full border-b border-border">
      <div className="max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
        <Link to="/" className="font-syne font-black text-2xl bg-gradient-to-r from-accent to-accent2 bg-clip-text text-transparent">
          MKcompras
        </Link>
        <nav className="flex gap-1">
          <Link to="/" className={`text-sm font-medium px-3 py-1.5 rounded-lg transition ${isActive('/')}`}>
            Converter link
          </Link>
          <Link to="/loja" className={`text-sm font-medium px-3 py-1.5 rounded-lg transition ${isActive('/loja')}`}>
            Loja
          </Link>
        </nav>
      </div>
    </header>
  )
}
