import React, { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)

// ─── helpers ──────────────────────────────────────────────────────────────────
async function sha256(str) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str))
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join('')
}

const SESSION_KEY = 'hab:session'

export function isAuthConfigured() {
  return !!(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY)
}

export function isLoggedIn() {
  if (!isAuthConfigured()) return true
  try {
    const s = JSON.parse(sessionStorage.getItem(SESSION_KEY) || 'null')
    return !!(s && s.user)
  } catch { return false }
}

export async function login(email, password) {
  const hash = await sha256(password)
  const { data, error } = await sb.from('users')
    .select('id,email,name,role')
    .eq('email', email.toLowerCase().trim())
    .eq('password_hash', hash)
    .maybeSingle()
  if (error || !data) throw new Error('Credenciales incorrectas')
  sessionStorage.setItem(SESSION_KEY, JSON.stringify({ user: data }))
  return data
}

export function logout() {
  sessionStorage.removeItem(SESSION_KEY)
}

// ─── LoginScreen ──────────────────────────────────────────────────────────────
export default function LoginScreen({ onSuccess }) {
  const [email, setEmail]       = useState('')
  const [pass, setPass]         = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [mounted, setMounted]   = useState(false)

  useEffect(() => { setTimeout(() => setMounted(true), 80) }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!email || !pass) { setError('Completa todos los campos'); return }
    setLoading(true); setError('')
    try {
      await login(email, pass)
      onSuccess()
    } catch(err) {
      setError(err.message || 'Error al iniciar sesión')
    } finally { setLoading(false) }
  }

  const s = {
    page: {
      minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center',
      background:'#F0EEE9', fontFamily:"'DM Sans', 'Outfit', sans-serif",
      padding:24,
    },
    card: {
      background:'#FAFAF8', width:'100%', maxWidth:420,
      borderRadius:16, padding:'48px 40px 40px',
      boxShadow:'0 2px 24px rgba(0,0,0,.07), 0 0 0 1px rgba(0,0,0,.06)',
      opacity: mounted ? 1 : 0,
      transform: mounted ? 'translateY(0)' : 'translateY(12px)',
      transition:'opacity .35s ease, transform .35s ease',
    },
    brand: {
      display:'flex', alignItems:'center', gap:10, marginBottom:32,
    },
    logoBox: {
      width:36, height:36, borderRadius:8,
      background:'#111', display:'flex', alignItems:'center', justifyContent:'center',
      flexShrink:0,
    },
    logoText: { color:'#fff', fontWeight:700, fontSize:18, letterSpacing:'-0.5px', lineHeight:1 },
    companyName: { fontSize:17, fontWeight:600, color:'#111', letterSpacing:'-0.3px' },
    companySub:  { fontSize:11, color:'#888', fontWeight:400, letterSpacing:'0.3px', textTransform:'uppercase', marginTop:1 },
    divider: { height:1, background:'#EBEBEB', margin:'0 0 28px' },
    heading: { fontSize:22, fontWeight:700, color:'#111', letterSpacing:'-0.5px', margin:'0 0 6px' },
    sub: { fontSize:13, color:'#888', margin:'0 0 28px', fontWeight:400 },
    label: { display:'block', fontSize:11, fontWeight:600, color:'#555', letterSpacing:'0.5px', textTransform:'uppercase', marginBottom:6 },
    inputWrap: { position:'relative', marginBottom:18 },
    input: {
      width:'100%', boxSizing:'border-box', padding:'11px 14px', fontSize:14,
      border:'1px solid #E0E0E0', borderRadius:8, background:'#F8F8F8', color:'#111',
      fontFamily:"inherit", outline:'none', transition:'border-color .15s',
    },
    eyeBtn: {
      position:'absolute', right:12, top:'50%', transform:'translateY(-50%)',
      background:'none', border:'none', cursor:'pointer', color:'#999', padding:2, fontSize:16,
    },
    errorBox: {
      background:'#FEF2F2', border:'1px solid #FECACA', borderRadius:8,
      padding:'10px 14px', fontSize:13, color:'#B91C1C', marginBottom:16,
    },
    btn: {
      width:'100%', padding:'12px 0', fontSize:15, fontWeight:600, letterSpacing:'-0.2px',
      background: loading ? '#555' : '#111', color:'#fff', border:'none', borderRadius:8,
      cursor: loading ? 'not-allowed' : 'pointer', fontFamily:'inherit',
      transition:'background .15s, transform .1s',
    },
    footer: { marginTop:24, textAlign:'center', fontSize:12, color:'#AAA' },
    dot: { display:'inline-block', margin:'0 4px', opacity:.4 },
  }

  return (
    <div style={s.page}>
      <div style={s.card}>

        {/* Brand */}
        <div style={s.brand}>
          <div style={s.logoBox}>
            <span style={s.logoText}>H</span>
          </div>
          <div>
            <div style={s.companyName}>Habitaris</div>
            <div style={s.companySub}>Suite de gestión</div>
          </div>
        </div>

        <div style={s.divider} />

        <p style={s.heading}>Bienvenido</p>
        <p style={s.sub}>Ingresa tus credenciales para continuar</p>

        {error && <div style={s.errorBox}>⚠️ {error}</div>}

        <form onSubmit={handleSubmit} noValidate>
          <label style={s.label}>Correo electrónico</label>
          <div style={s.inputWrap}>
            <input
              style={s.input}
              type="email"
              placeholder="tu@habitaris.co"
              value={email}
              onChange={e => { setEmail(e.target.value); setError('') }}
              autoComplete="email"
              autoFocus
            />
          </div>

          <label style={s.label}>Contraseña</label>
          <div style={s.inputWrap}>
            <input
              style={{...s.input, paddingRight:42}}
              type={showPass ? 'text' : 'password'}
              placeholder="••••••••"
              value={pass}
              onChange={e => { setPass(e.target.value); setError('') }}
              autoComplete="current-password"
            />
            <button type="button" style={s.eyeBtn} onClick={() => setShowPass(v => !v)}>
              {showPass ? '🙈' : '👁'}
            </button>
          </div>

          <button type="submit" style={s.btn} disabled={loading}>
            {loading ? 'Verificando...' : 'Iniciar sesión →'}
          </button>
        </form>

        <div style={s.footer}>
          <span>Habitaris Suite</span>
          <span style={s.dot}>·</span>
          <span>Acceso protegido</span>
          <span style={s.dot}>·</span>
          <span>© {new Date().getFullYear()}</span>
        </div>
      </div>
    </div>
  )
}
