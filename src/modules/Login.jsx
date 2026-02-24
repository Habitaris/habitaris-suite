/* ═══════════════════════════════════════════════════════════════
   LOGIN — Pantalla de acceso a Habitaris Suite
   Soporta: contraseña, Touch ID / Face ID / Windows Hello
   ═══════════════════════════════════════════════════════════════ */
import { useState, useEffect, useMemo } from "react";
import * as Bio from "./biometric.js";
import { getConfig } from "./Configuracion.jsx";

const SESSION_KEY = "hab:session";
const PASS_KEY = "hab:auth:password";
const LOCKOUT_KEY = "hab:auth:lockout";
const MAX_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

/* ── Session management ── */
export function isLoggedIn() {
  try {
    const s = JSON.parse(sessionStorage.getItem(SESSION_KEY));
    if (!s || !s.ts) return false;
    // Session expires after 12 hours
    if (Date.now() - s.ts > 12 * 60 * 60 * 1000) {
      sessionStorage.removeItem(SESSION_KEY);
      return false;
    }
    return true;
  } catch { return false; }
}

export function login() {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify({ ts: Date.now() }));
}

export function logout() {
  sessionStorage.removeItem(SESSION_KEY);
  window.location.reload();
}

/* ── Password management ── */
export function hasPassword() {
  return !!localStorage.getItem(PASS_KEY);
}

export function setPassword(pass) {
  if (pass) localStorage.setItem(PASS_KEY, pass);
  else localStorage.removeItem(PASS_KEY);
}

export function checkPassword(pass) {
  return pass === localStorage.getItem(PASS_KEY);
}

/* ── Security: no auth configured ── */
export function isAuthConfigured() {
  return hasPassword() || Bio.isRegistered();
}

/* ── Lockout ── */
function getLockout() {
  try {
    const d = JSON.parse(localStorage.getItem(LOCKOUT_KEY));
    if (!d) return null;
    if (Date.now() - d.ts > LOCKOUT_MINUTES * 60 * 1000) {
      localStorage.removeItem(LOCKOUT_KEY);
      return null;
    }
    return d;
  } catch { return null; }
}

function addFailedAttempt() {
  const d = getLockout() || { attempts: 0, ts: Date.now() };
  d.attempts++;
  d.ts = Date.now();
  localStorage.setItem(LOCKOUT_KEY, JSON.stringify(d));
  return d;
}

function clearLockout() {
  localStorage.removeItem(LOCKOUT_KEY);
}

/* ═══════════════════════════════════════════════════════════════
   LOGIN SCREEN COMPONENT
   ═══════════════════════════════════════════════════════════════ */
export default function LoginScreen({ onSuccess }) {
  const brand = useMemo(() => getConfig(), []);
  const ap = brand.apariencia || {};
  const cp = ap.colorPrimario || "#111";
  const bf = ap.tipografia || "Outfit";
  const empresaNombre = brand.empresa?.nombre || "HABITARIS";
  const slogan = ap.slogan || brand.empresa?.eslogan || "";

  const [pass, setPass] = useState("");
  const [error, setError] = useState("");
  const [bioAvailable, setBioAvailable] = useState(false);
  const [bioRegistered, setBioRegistered] = useState(Bio.isRegistered());
  const [showSetup, setShowSetup] = useState(false);
  const [setupPass, setSetupPass] = useState("");
  const [setupConfirm, setSetupConfirm] = useState("");
  const [locked, setLocked] = useState(!!getLockout()?.attempts >= MAX_ATTEMPTS);
  const [lockTimer, setLockTimer] = useState(0);

  useEffect(() => {
    Bio.isAvailable().then(setBioAvailable);
    // Check if no auth configured → show setup
    if (!isAuthConfigured()) setShowSetup(true);
  }, []);

  // Lockout timer
  useEffect(() => {
    const d = getLockout();
    if (d && d.attempts >= MAX_ATTEMPTS) {
      setLocked(true);
      const remaining = LOCKOUT_MINUTES * 60 * 1000 - (Date.now() - d.ts);
      setLockTimer(Math.ceil(remaining / 1000));
      const iv = setInterval(() => {
        setLockTimer(prev => {
          if (prev <= 1) { setLocked(false); clearLockout(); clearInterval(iv); return 0; }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(iv);
    }
  }, [locked]);

  // Auto-trigger biometric on load
  useEffect(() => {
    if (bioRegistered && !showSetup && !locked) {
      setTimeout(() => tryBiometric(), 500);
    }
  }, [bioRegistered]); // eslint-disable-line

  const tryBiometric = async () => {
    if (!bioRegistered || locked) return;
    setError("");
    const ok = await Bio.authenticate();
    if (ok) { clearLockout(); login(); onSuccess(); }
    else { setError("Autenticación biométrica falló. Usa tu contraseña."); }
  };

  const tryPassword = () => {
    if (locked) return;
    setError("");
    if (checkPassword(pass)) {
      clearLockout();
      login();
      onSuccess();
    } else {
      const d = addFailedAttempt();
      const remaining = MAX_ATTEMPTS - d.attempts;
      if (remaining <= 0) {
        setLocked(true);
        setError(`Demasiados intentos. Bloqueado por ${LOCKOUT_MINUTES} minutos.`);
      } else {
        setError(`Contraseña incorrecta. ${remaining} intento${remaining>1?"s":""} restante${remaining>1?"s":""}.`);
      }
      setPass("");
    }
  };

  const doSetup = async () => {
    if (!setupPass || setupPass.length < 4) {
      setError("La contraseña debe tener al menos 4 caracteres.");
      return;
    }
    if (setupPass !== setupConfirm) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    setPassword(setupPass);
    // Offer biometric
    if (bioAvailable) {
      const ok = await Bio.register(empresaNombre + " Admin");
      if (ok) setBioRegistered(true);
    }
    setShowSetup(false);
    setError("");
    login();
    onSuccess();
  };

  const BF = { fontFamily: `'${bf}',sans-serif` };

  /* ── Setup screen (first time) ── */
  if (showSetup) {
    return (
      <div style={{ minHeight:"100vh", background:"#F0EEE9", display:"flex", alignItems:"center", justifyContent:"center" }}>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=${bf.replace(/ /g,"+")}:wght@300;400;500;600;700;800&display=swap');`}</style>
        <div style={{ background:"#fff", borderRadius:16, padding:"40px 36px", width:380, boxShadow:"0 8px 40px rgba(0,0,0,.12)", textAlign:"center" }}>
          <div style={{ fontSize:48, marginBottom:12 }}>🔐</div>
          <h1 style={{ ...BF, fontSize:20, fontWeight:700, margin:"0 0 4px" }}>Configurar acceso</h1>
          <p style={{ ...BF, fontSize:12, color:"#888", margin:"0 0 24px" }}>Primera vez — establece tu contraseña para {empresaNombre}</p>

          <input type="password" value={setupPass} onChange={e => { setSetupPass(e.target.value); setError(""); }}
            placeholder="Contraseña (mín. 4 caracteres)"
            style={{ ...BF, width:"100%", padding:"12px 16px", border:"1px solid #E4E1DB", borderRadius:8, fontSize:14, boxSizing:"border-box", marginBottom:10 }}/>
          <input type="password" value={setupConfirm} onChange={e => { setSetupConfirm(e.target.value); setError(""); }}
            onKeyDown={e => e.key === "Enter" && doSetup()}
            placeholder="Confirmar contraseña"
            style={{ ...BF, width:"100%", padding:"12px 16px", border:"1px solid #E4E1DB", borderRadius:8, fontSize:14, boxSizing:"border-box", marginBottom:6 }}/>

          {error && <p style={{ ...BF, fontSize:11, color:"#AE2C2C", margin:"6px 0" }}>{error}</p>}

          {bioAvailable && (
            <div style={{ margin:"14px 0", padding:"10px 14px", background:"#E8F4EE", borderRadius:8, border:"1px solid #1E6B4222" }}>
              <p style={{ ...BF, fontSize:11, color:"#1E6B42", margin:0, fontWeight:600 }}>
                👆 Touch ID / Biometría disponible
              </p>
              <p style={{ ...BF, fontSize:9, color:"#1E6B42", margin:"4px 0 0", opacity:.8 }}>
                Se activará automáticamente al guardar
              </p>
            </div>
          )}

          <button onClick={doSetup}
            style={{ ...BF, width:"100%", padding:"14px 0", background:cp, color:"#fff", border:"none", borderRadius:8, fontSize:15, fontWeight:700, cursor:"pointer", marginTop:10 }}>
            Guardar y entrar ✓
          </button>
        </div>
      </div>
    );
  }

  /* ── Login screen ── */
  return (
    <div style={{ minHeight:"100vh", background:cp, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=${bf.replace(/ /g,"+")}:wght@300;400;500;600;700;800&display=swap');
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}
      `}</style>

      {/* Logo area */}
      <div style={{ marginBottom:32, textAlign:"center" }}>
        {ap.logo ? (
          <img src={ap.logo} alt="Logo" style={{ height:48, objectFit:"contain", marginBottom:8 }}/>
        ) : (
          <div style={{ ...BF, fontSize:24, fontWeight:700, color:"#fff", letterSpacing:4, textTransform:"uppercase" }}>{empresaNombre}</div>
        )}
        {slogan && <div style={{ ...BF, fontSize:9, letterSpacing:2, color:"rgba(255,255,255,.3)", textTransform:"uppercase", marginTop:6 }}>{slogan}</div>}
      </div>

      {/* Login card */}
      <div style={{ background:"#fff", borderRadius:16, padding:"36px 32px", width:360, boxShadow:"0 12px 48px rgba(0,0,0,.25)", textAlign:"center" }}>

        {locked ? (
          <>
            <div style={{ fontSize:40, marginBottom:8 }}>🔒</div>
            <h2 style={{ ...BF, fontSize:16, fontWeight:700, color:"#AE2C2C", margin:"0 0 6px" }}>Acceso bloqueado</h2>
            <p style={{ ...BF, fontSize:11, color:"#888", margin:"0 0 12px" }}>
              Demasiados intentos fallidos. Espera {Math.floor(lockTimer/60)}:{String(lockTimer%60).padStart(2,"0")}
            </p>
            <div style={{ height:4, background:"#f0f0f0", borderRadius:2, overflow:"hidden" }}>
              <div style={{ height:"100%", background:"#AE2C2C", borderRadius:2, width:`${(lockTimer / (LOCKOUT_MINUTES*60)) * 100}%`, transition:"width 1s" }}/>
            </div>
          </>
        ) : (
          <>
            {/* Biometric button */}
            {bioRegistered && (
              <div style={{ marginBottom:20 }}>
                <button onClick={tryBiometric}
                  style={{ ...BF, width:"100%", padding:"16px 0", background:"#F5F4F1", border:"2px solid #E4E1DB", borderRadius:12, cursor:"pointer", transition:"all .15s" }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = "#1E6B42"}
                  onMouseLeave={e => e.currentTarget.style.borderColor = "#E4E1DB"}>
                  <div style={{ fontSize:32, marginBottom:4 }}>👆</div>
                  <div style={{ ...BF, fontSize:13, fontWeight:700, color:"#111" }}>Usar Touch ID</div>
                  <div style={{ ...BF, fontSize:9, color:"#888", marginTop:2 }}>Toca el sensor para entrar</div>
                </button>
                <div style={{ display:"flex", alignItems:"center", gap:12, margin:"16px 0" }}>
                  <div style={{ flex:1, height:1, background:"#E4E1DB" }}/>
                  <span style={{ ...BF, fontSize:9, color:"#AAA" }}>o</span>
                  <div style={{ flex:1, height:1, background:"#E4E1DB" }}/>
                </div>
              </div>
            )}

            {/* Password input */}
            <div style={{ position:"relative", marginBottom:10 }}>
              <input type="password" value={pass} onChange={e => { setPass(e.target.value); setError(""); }}
                onKeyDown={e => e.key === "Enter" && tryPassword()}
                placeholder="Contraseña"
                autoFocus={!bioRegistered}
                style={{ ...BF, width:"100%", padding:"14px 16px", border:"1px solid #E4E1DB", borderRadius:10, fontSize:15, boxSizing:"border-box", textAlign:"center" }}/>
            </div>

            {error && <p style={{ ...BF, fontSize:11, color:"#AE2C2C", margin:"0 0 10px" }}>{error}</p>}

            <button onClick={tryPassword} disabled={!pass}
              style={{ ...BF, width:"100%", padding:"14px 0", background:pass?cp:"#ddd", color:pass?"#fff":"#999", border:"none", borderRadius:10, fontSize:15, fontWeight:700, cursor:pass?"pointer":"not-allowed", transition:"all .2s" }}>
              Entrar
            </button>
          </>
        )}
      </div>

      {/* Footer */}
      <div style={{ marginTop:24, textAlign:"center" }}>
        <p style={{ ...BF, fontSize:9, color:"rgba(255,255,255,.2)" }}>
          {empresaNombre} Suite · v1.0
        </p>
      </div>
    </div>
  );
}
