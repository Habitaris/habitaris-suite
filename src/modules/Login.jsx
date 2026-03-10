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
    page:   { minHeight:'100vh', display:'flex', fontFamily:"'DM Sans','Outfit',sans-serif" },
    left:   { width:340, background:'#111', display:'flex', flexDirection:'column',
              alignItems:'center', justifyContent:'center', padding:48, flexShrink:0 },
    right:  { flex:1, background:'#FAFAF8', display:'flex', alignItems:'center',
              justifyContent:'center', padding:40 },
    logo:   { width:140, marginBottom:40, filter:'brightness(0) invert(1)' },
    tagline:{ color:'rgba(255,255,255,0.45)', fontSize:12, letterSpacing:3,
              textTransform:'uppercase', marginTop:8 },
    card:   { width:'100%', maxWidth:360 },
    title:  { fontSize:26, fontWeight:700, color:'#111', marginBottom:6, letterSpacing:-0.5 },
    sub:    { fontSize:13, color:'#888', marginBottom:32 },
    label:  { display:'block', fontSize:10, fontWeight:700, letterSpacing:2,
              textTransform:'uppercase', color:'#666', marginBottom:6 },
    input:  { width:'100%', boxSizing:'border-box', padding:'10px 12px', fontSize:14,
              border:'1.5px solid #DDD', borderRadius:6, outline:'none',
              background:'#FFF', color:'#111', marginBottom:20, transition:'border 0.15s' },
    inputF: { border:'1.5px solid #1E6B42' },
    btn:    { width:'100%', padding:'12px', fontSize:14, fontWeight:700,
              background:'#111', color:'#FFF', border:'none', borderRadius:6,
              cursor:'pointer', letterSpacing:0.5 },
    err:    { background:'#FEE2E2', border:'1px solid #FCA5A5', color:'#B91C1C',
              padding:'10px 12px', borderRadius:6, fontSize:13, marginBottom:16 },
  }

  const [focusField, setFocusField] = React.useState('')

  return (
    <div style={s.page}>
      <div style={s.left}>
        <img src="/logo-habitaris-blanco.png" alt="Habitaris" style={s.logo}
          onError={e=>{ e.target.style.display='none' }}/>
        <div style={{color:'#FFF',fontSize:22,fontWeight:700,letterSpacing:-0.5,textAlign:'center'}}>Habitaris</div>
        <div style={s.tagline}>Suite de Gestión</div>
      </div>
      <div style={s.right}>
        <div style={s.card}>
          <div style={s.title}>Bienvenido</div>
          <div style={s.sub}>Ingresa tus credenciales para continuar</div>
          {error && <div style={s.err}>{error}</div>}
          <div>
            <label style={s.label}>Correo electrónico</label>
            <input type="email" value={email} onChange={e=>setEmail(e.target.value)}
              onFocus={()=>setFocusField('email')} onBlur={()=>setFocusField('')}
              style={{...s.input,...(focusField==='email'?s.inputF:{})}}
              placeholder="tu@habitaris.co" autoComplete="email"/>
            <label style={s.label}>Contraseña</label>
            <div style={{position:'relative',marginBottom:20}}>
              <input type={showPass?'text':'password'} value={pass} onChange={e=>setPass(e.target.value)}
                onFocus={()=>setFocusField('pass')} onBlur={()=>setFocusField('')}
                onKeyDown={e=>e.key==='Enter'&&handleSubmit(e)}
                style={{...s.input,marginBottom:0,paddingRight:40,...(focusField==='pass'?s.inputF:{})}}
                placeholder="••••••••" autoComplete="current-password"/>
              <button onClick={()=>setShowPass(p=>!p)}
                style={{position:'absolute',right:10,top:'50%',transform:'translateY(-50%)',
                  background:'none',border:'none',cursor:'pointer',color:'#888',fontSize:18,padding:0}}>
                {showPass?'🙈':'👁'}
              </button>
            </div>
            <button onClick={handleSubmit} disabled={loading}
              style={{...s.btn,opacity:loading?0.7:1}}>
              {loading?'Ingresando…':'Acceder →'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}