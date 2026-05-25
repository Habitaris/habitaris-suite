import React, { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import { HAB_LOGO } from './habLogo.js'

const sb = createClient(
  'https://xlzkasdskatnikuavefh.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhsemthc2Rza2F0bmlrdWF2ZWZoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE4OTE3NzQsImV4cCI6MjA4NzQ2Nzc3NH0.SR9tIpvL0YnV9CNrRq4T-xetifuNQOJZE0OnQpwtYLM'
)

// ─── helpers ──────────────────────────────────────────────────────────────────
async function sha256(str) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str))
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join('')
}

const SESSION_KEY = 'hab:session'

export function isAuthConfigured() {
  return true
}

export function isLoggedIn() {
  try {
    const s = JSON.parse(sessionStorage.getItem(SESSION_KEY) || 'null')
    return !!(s && s.user)
  } catch { return false }
}

/**
 * Resuelve un identificador (username, email o documento) → user row o null.
 * Detección automática:
 *  - Contiene '@' → email (busca en users.email O auth_methods.identifier WHERE type='email')
 *  - Solo dígitos (≥5) → documento (busca en user_documents.numero → user_id)
 *  - Resto → username (busca en users.username)
 */
async function resolveIdentifier(input) {
  const v = (input || '').trim().toLowerCase()
  if (!v) return null

  // Caso 1: email
  if (v.includes('@')) {
    // Primero buscar en users.email (login legacy)
    const r1 = await sb.from('users').select('id,email,nombre,rol,password_hash,estado,display_name,username').eq('email', v).maybeSingle()
    if (r1.data) return r1.data
    // Fallback: auth_methods.identifier
    const r2 = await sb.from('auth_methods').select('user_id').eq('type', 'email').eq('identifier', v).maybeSingle()
    if (r2.data && r2.data.user_id) {
      const r3 = await sb.from('users').select('id,email,nombre,rol,password_hash,estado,display_name,username').eq('id', r2.data.user_id).maybeSingle()
      return r3.data || null
    }
    return null
  }

  // Caso 2: documento (solo dígitos)
  if (/^\d{5,}$/.test(v)) {
    const r1 = await sb.from('user_documents').select('user_id').eq('numero', v).maybeSingle()
    if (r1.data && r1.data.user_id) {
      const r2 = await sb.from('users').select('id,email,nombre,rol,password_hash,estado,display_name,username').eq('id', r1.data.user_id).maybeSingle()
      return r2.data || null
    }
    return null
  }

  // Caso 3: username
  const r = await sb.from('users').select('id,email,nombre,rol,password_hash,estado,display_name,username').eq('username', v).maybeSingle()
  return r.data || null
}

export async function login(identifier, password) {
  const user = await resolveIdentifier(identifier)
  if (!user) throw new Error('Credenciales incorrectas')
  if (!user.password_hash) throw new Error('Usuario sin contraseña configurada. Solicita un reset.')
  const hash = await sha256(password)
  if (hash !== user.password_hash) throw new Error('Credenciales incorrectas')
  // estado 'invitado' o 'suspendido' bloquean
  if (user.estado && user.estado !== 'activo') {
    throw new Error(user.estado === 'invitado' ? 'Tu cuenta está pendiente de activación.' : 'Tu cuenta está suspendida.')
  }
  const session = { user: { id: user.id, email: user.email, nombre: user.display_name || user.nombre, rol: user.rol, username: user.username }, ts: Date.now() }
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session))
  window.__habitarisSessionActive = true
  // FIX race condition: notificar a TenantContext que la sesión está lista,
  // por si su useEffect ya leyó sessionStorage cuando aún no estaba escrita.
  try { window.dispatchEvent(new Event('hab:session-changed')); } catch(e){}
  // Actualizar last_login (no bloqueante)
  sb.from('users').update({ ultimo_login: new Date().toISOString() }).eq('id', user.id).then(() => {})
  return user
}

export function logout() {
  sessionStorage.removeItem(SESSION_KEY)
  window.__habitarisSessionActive = false
}

// ─── Modal recuperar contraseña ────────────────────────────────────────────────
function RecuperarModal({ open, onClose }) {
  const [identifier, setIdentifier] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [err, setErr] = useState('')

  useEffect(() => {
    if (!open) { setIdentifier(''); setSending(false); setSent(false); setErr('') }
  }, [open])

  async function submit() {
    setErr('')
    if (!identifier.trim()) { setErr('Indica tu usuario, email o documento'); return }
    setSending(true)
    try {
      const r = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'password_reset_request', identifier: identifier.trim() })
      })
      const data = await r.json().catch(() => ({}))
      if (!r.ok || data.ok === false) {
        setErr(data.error || 'No se pudo enviar el correo. Intenta más tarde.')
        setSending(false); return
      }
      setSent(true); setSending(false)
    } catch (e) {
      setErr('Error de conexión. Intenta de nuevo.'); setSending(false)
    }
  }

  if (!open) return null
  return (
    <div onClick={onClose} style={{
      position:'fixed', inset:0, background:'rgba(17,17,17,0.45)', zIndex:1300,
      display:'flex', alignItems:'flex-start', justifyContent:'center', padding:'12vh 16px',
      fontFamily:"'DM Sans',sans-serif"
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background:'#fff', borderRadius:12, width:'100%', maxWidth:420,
        boxShadow:'0 12px 48px rgba(0,0,0,0.18)', overflow:'hidden'
      }}>
        <div style={{ padding:'20px 22px', borderBottom:'1px solid #E4E1DB' }}>
          <h3 style={{ fontSize:16, fontWeight:700, color:'#111', margin:0 }}>Recuperar contraseña</h3>
        </div>
        {sent ? (
          <div style={{ padding:'24px 22px' }}>
            <div style={{ fontSize:14, color:'#1E6B42', fontWeight:600, marginBottom:8 }}>✓ Correo enviado</div>
            <p style={{ fontSize:13, color:'#555', lineHeight:1.6, margin:0 }}>
              Si el usuario existe, recibirás un email con un enlace para restablecer tu contraseña. El enlace caduca en 1 hora.
            </p>
            <p style={{ fontSize:12, color:'#999', marginTop:12, margin:'12px 0 0' }}>
              Si no recibes el correo en 5 minutos, revisa la carpeta de spam o contacta con un administrador del tenant.
            </p>
            <div style={{ marginTop:18, textAlign:'right' }}>
              <button onClick={onClose} style={{ padding:'8px 16px', background:'#111', color:'#fff', border:'none', borderRadius:6, fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>Cerrar</button>
            </div>
          </div>
        ) : (
          <div style={{ padding:'20px 22px' }}>
            <p style={{ fontSize:13, color:'#555', lineHeight:1.6, margin:'0 0 16px' }}>
              Indica tu usuario, email o documento de identidad. Te enviaremos un enlace para restablecer la contraseña al email registrado.
            </p>
            <input type="text" value={identifier} onChange={e => setIdentifier(e.target.value)}
              placeholder="Usuario, email o documento"
              autoFocus
              style={{
                width:'100%', boxSizing:'border-box', padding:'10px 12px', fontSize:14,
                border:'1.5px solid #DDD', borderRadius:6, outline:'none',
                background:'#fff', color:'#111', fontFamily:'inherit'
              }}/>
            {err && <div style={{ fontSize:12, color:'#A23B3B', marginTop:10 }}>{err}</div>}
            <div style={{ display:'flex', justifyContent:'flex-end', gap:8, marginTop:20 }}>
              <button onClick={onClose} disabled={sending}
                style={{ padding:'8px 14px', background:'transparent', color:'#111', border:'1px solid #DDD', borderRadius:6, fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>Cancelar</button>
              <button onClick={submit} disabled={sending}
                style={{ padding:'8px 14px', background:'#111', color:'#fff', border:'1px solid #111', borderRadius:6, fontSize:13, fontWeight:600, cursor: sending ? 'wait' : 'pointer', fontFamily:'inherit', opacity: sending ? 0.7 : 1 }}>
                {sending ? 'Enviando…' : 'Enviar enlace'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── LoginScreen ──────────────────────────────────────────────────────────────
export default function LoginScreen({ onSuccess }) {
  const [identifier, setIdentifier] = useState('')
  const [pass, setPass]             = useState('')
  const [showPass, setShowPass]     = useState(false)
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState('')
  const [recover, setRecover]       = useState(false)

  const handleSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault()
    if (!identifier || !pass) { setError('Completa todos los campos'); return }
    setLoading(true); setError('')
    try {
      await login(identifier, pass)
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
    logo:   { width:160, marginBottom:40, filter:'invert(1)', mixBlendMode:'screen' },
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
    hint:   { fontSize:11, color:'#999', marginTop:-12, marginBottom:18, lineHeight:1.5 },
    forgot: { background:'none', border:'none', color:'#666', fontSize:12, fontWeight:500,
              cursor:'pointer', textDecoration:'underline', textUnderlineOffset:3, padding:0,
              fontFamily:'inherit' },
  }

  const [focusField, setFocusField] = useState('')

  return (
    <>
      <div style={s.page}>
        <div style={s.left}>
          <img src={HAB_LOGO} alt="Habitaris" style={s.logo}
            onError={e=>{ e.target.style.display='none' }}/>
          <div style={{color:'#FFF',fontSize:22,fontWeight:700,letterSpacing:-0.5,textAlign:'center'}}>Habitaris</div>
          <div style={s.tagline}>Suite de Gestión</div>
        </div>
        <div style={s.right}>
          <div style={s.card}>
            <div style={s.title}>Bienvenido</div>
            <div style={s.sub}>Ingresa con tu usuario y contraseña</div>
            {error && <div style={s.err}>{error}</div>}
            <div>
              <label style={s.label}>Usuario</label>
              <input type="text" value={identifier} onChange={e=>setIdentifier(e.target.value)}
                onFocus={()=>setFocusField('id')} onBlur={()=>setFocusField('')}
                style={{...s.input,...(focusField==='id'?s.inputF:{})}}
                placeholder="usuario, email o documento" autoComplete="username"
                onKeyDown={e=>e.key==='Enter' && document.getElementById('login-pass')?.focus()}/>
              <div style={s.hint}>Acepta tu nombre de usuario, email o número de documento.</div>
              <label style={s.label}>Contraseña</label>
              <div style={{position:'relative',marginBottom:14}}>
                <input id="login-pass" type={showPass?'text':'password'} value={pass} onChange={e=>setPass(e.target.value)}
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
              <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:18 }}>
                <button type="button" onClick={()=>setRecover(true)} style={s.forgot}>
                  ¿Olvidaste tu contraseña?
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
      <RecuperarModal open={recover} onClose={()=>setRecover(false)}/>
    </>
  )
}
