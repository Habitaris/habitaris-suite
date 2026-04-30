/**
 * modules/RecuperarPassword.jsx — Página pública /recuperar?token=X
 *
 * Lee el token de la URL, pide nueva contraseña, llama al endpoint
 * password_reset_confirm y hace auto-login tras éxito.
 */
import React, { useState, useEffect } from 'react'
import { HAB_LOGO } from './habLogo.js'

const SESSION_KEY = 'hab:session'

export default function RecuperarPassword() {
  const [token, setToken]       = useState('')
  const [pass, setPass]         = useState('')
  const [pass2, setPass2]       = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [done, setDone]         = useState(false)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const t = params.get('token') || ''
    setToken(t)
    if (!t) setError('Falta el token. Solicita un nuevo enlace.')
  }, [])

  async function submit(e) {
    if (e && e.preventDefault) e.preventDefault()
    setError('')
    if (!token) return setError('Falta el token')
    if (!pass || pass.length < 6) return setError('La contraseña debe tener al menos 6 caracteres')
    if (pass !== pass2) return setError('Las contraseñas no coinciden')

    setLoading(true)
    try {
      const r = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'password_reset_confirm', token, new_password: pass }),
      })
      const data = await r.json().catch(() => ({}))
      if (!r.ok || data.ok === false) {
        setError(data.error || 'No se pudo establecer la contraseña.')
        setLoading(false); return
      }
      // Auto-login: guardamos sesión con los datos devueltos
      if (data.user && data.user.id) {
        const session = { user: data.user, ts: Date.now() }
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(session))
        window.__habitarisSessionActive = true
      }
      setDone(true); setLoading(false)
      // Redirigir al home tras 1.5s
      setTimeout(() => { window.location.href = '/' }, 1500)
    } catch (err) {
      setError('Error de conexión. Intenta de nuevo.'); setLoading(false)
    }
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
    card:   { width:'100%', maxWidth:380 },
    title:  { fontSize:24, fontWeight:700, color:'#111', marginBottom:6, letterSpacing:-0.4 },
    sub:    { fontSize:13, color:'#888', marginBottom:28, lineHeight:1.6 },
    label:  { display:'block', fontSize:10, fontWeight:700, letterSpacing:2,
              textTransform:'uppercase', color:'#666', marginBottom:6 },
    input:  { width:'100%', boxSizing:'border-box', padding:'10px 12px', fontSize:14,
              border:'1.5px solid #DDD', borderRadius:6, outline:'none',
              background:'#FFF', color:'#111', marginBottom:16, transition:'border 0.15s' },
    btn:    { width:'100%', padding:'12px', fontSize:14, fontWeight:700,
              background:'#111', color:'#FFF', border:'none', borderRadius:6,
              cursor:'pointer', letterSpacing:0.5, marginTop:8 },
    err:    { background:'#FEE2E2', border:'1px solid #FCA5A5', color:'#B91C1C',
              padding:'10px 12px', borderRadius:6, fontSize:13, marginBottom:16 },
    ok:     { background:'#DCFCE7', border:'1px solid #86EFAC', color:'#15803D',
              padding:'14px 16px', borderRadius:8, fontSize:14, fontWeight:600 },
  }

  return (
    <div style={s.page}>
      <div style={s.left}>
        <img src={HAB_LOGO} alt="Habitaris" style={s.logo}
          onError={e => { e.target.style.display = 'none' }}/>
        <div style={{ color:'#FFF', fontSize:22, fontWeight:700, letterSpacing:-0.5, textAlign:'center' }}>Habitaris</div>
        <div style={s.tagline}>Recuperar contraseña</div>
      </div>
      <div style={s.right}>
        <div style={s.card}>
          {done ? (
            <>
              <div style={s.title}>¡Listo!</div>
              <div style={s.ok}>Contraseña actualizada. Redirigiendo…</div>
            </>
          ) : (
            <>
              <div style={s.title}>Establecer nueva contraseña</div>
              <div style={s.sub}>Elige una contraseña segura. Mínimo 6 caracteres.</div>
              {error && <div style={s.err}>{error}</div>}
              <label style={s.label}>Nueva contraseña</label>
              <div style={{ position:'relative', marginBottom:16 }}>
                <input type={showPass?'text':'password'} value={pass} onChange={e => setPass(e.target.value)}
                  style={{ ...s.input, marginBottom:0, paddingRight:40 }}
                  placeholder="••••••••" autoFocus
                  onKeyDown={e => e.key === 'Enter' && document.getElementById('rec-pass2')?.focus()}/>
                <button onClick={()=>setShowPass(p=>!p)} type="button"
                  style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)',
                    background:'none', border:'none', cursor:'pointer', color:'#888', fontSize:18, padding:0 }}>
                  {showPass?'🙈':'👁'}
                </button>
              </div>
              <label style={s.label}>Repetir contraseña</label>
              <input id="rec-pass2" type={showPass?'text':'password'} value={pass2} onChange={e => setPass2(e.target.value)}
                style={s.input} placeholder="••••••••"
                onKeyDown={e => e.key === 'Enter' && submit(e)}/>
              <button onClick={submit} disabled={loading || !token}
                style={{ ...s.btn, opacity: (loading || !token) ? 0.7 : 1 }}>
                {loading ? 'Guardando…' : 'Establecer contraseña'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
