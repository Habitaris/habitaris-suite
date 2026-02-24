import React, { useState, useEffect } from "react";
import { User, Mail, Lock, Eye, EyeOff, LogOut, Shield, UserPlus, Trash2, Edit3, Send, Check, X, Copy, ChevronDown, Fingerprint } from "lucide-react";
import { getConfig } from "./Configuracion.jsx";

/* ═══════════════════════════════════════════════════════════════
   LOGIN & USER MANAGEMENT — Habitaris Suite
   Multi-user · Super Admin · EmailJS invitations · Biometric
   ═══════════════════════════════════════════════════════════════ */

const STORAGE_KEY = "hab:users";
const SESSION_KEY = "hab:session";
const INVITE_KEY  = "hab:invites";

/* ── Theme ── */
const T = {
  ink:"#111", inkMid:"#444", inkLight:"#888",
  bg:"#F0EEE9", surface:"#FAFAF8", border:"#E4E1DB",
  green:"#1E6B42", greenBg:"#E8F4EE",
  blue:"#1E4F8C", blueBg:"#E6EFF9",
  amber:"#7A5218", amberBg:"#FFF4E0",
  red:"#AE2C2C", redBg:"#FAE8E8",
  gold:"#C9A84C",
  shadow:"0 1px 4px rgba(0,0,0,.06)",
};

/* ── Crypto helpers ── */
async function hashPassword(pw) {
  const encoder = new TextEncoder();
  const data = encoder.encode(pw + "_hab_salt_2026");
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2,"0")).join("");
}

/* ── Super Admin (hardcoded — cannot be deleted) ── */
const SUPER_ADMIN = {
  id: "superadmin",
  nombre: "David Parra",
  email: "dparra@habitaris.co",
  rol: "superadmin",
  estado: "activo",
  creadoPor: "sistema",
  fechaCreacion: "2026-02-24",
};

/* ── Roles ── */
const ROLES = {
  superadmin: { label:"Super Admin", color:T.gold, permisos:"todos" },
  admin:      { label:"Administrador", color:T.blue, permisos:"todos excepto eliminar admins" },
  gerente:    { label:"Gerente", color:T.green, permisos:"ver todo, editar proyectos propios" },
  disenador:  { label:"Diseñador", color:"#5B3A8C", permisos:"CRM, Proyectos, Biblioteca, Formularios" },
  ingeniero:  { label:"Ingeniero", color:"#0D5E6E", permisos:"Proyectos, SST, Logística, Calidad" },
  comercial:  { label:"Comercial", color:T.amber, permisos:"CRM, Formularios, Portal Cliente" },
  contable:   { label:"Contable", color:T.red, permisos:"Contabilidad, Compras, Administración" },
  auxiliar:   { label:"Auxiliar", color:T.inkLight, permisos:"Solo módulos asignados" },
};

/* ── Storage helpers ── */
function getUsers() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const users = raw ? JSON.parse(raw) : [];
    // Ensure super admin always exists
    const hasSuper = users.some(u => u.id === "superadmin");
    if (!hasSuper) users.unshift({...SUPER_ADMIN});
    return users;
  } catch { return [{...SUPER_ADMIN}]; }
}

function saveUsers(users) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
}

function getInvites() {
  try {
    const raw = localStorage.getItem(INVITE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveInvites(invites) {
  localStorage.setItem(INVITE_KEY, JSON.stringify(invites));
}

/* ── Session ── */
function getSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw);
    // Check expiry (24h)
    if (Date.now() - session.ts > 24 * 60 * 60 * 1000) {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }
    return session;
  } catch { return null; }
}

function setSession(user) {
  localStorage.setItem(SESSION_KEY, JSON.stringify({
    userId: user.id,
    email: user.email,
    nombre: user.nombre,
    rol: user.rol,
    ts: Date.now(),
  }));
}

/* ── Public API ── */
export function isLoggedIn() {
  return !!getSession();
}

export function getCurrentUser() {
  const session = getSession();
  if (!session) return null;
  const users = getUsers();
  return users.find(u => u.id === session.userId) || null;
}

export function login(pw) {
  // Legacy compatibility — login is handled by LoginScreen component
  return true;
}

export function logout() {
  localStorage.removeItem(SESSION_KEY);
}

export function isAuthConfigured() {
  return true; // Always require auth
}

/* ── Generate invite token ── */
function generateToken() {
  return Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map(b => b.toString(36)).join("").substring(0,24);
}

/* ── Send invitation email via EmailJS ── */
async function sendInviteEmail(user, token, baseUrl) {
  try {
    const cfg = getConfig();
    const inviteUrl = `${baseUrl}?invite=${token}`;
    const res = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        service_id: cfg.correo.emailjs_serviceId,
        template_id: cfg.correo.emailjs_templateId,
        user_id: cfg.correo.emailjs_publicKey,
        template_params: {
          client_name: user.nombre,
          client_email: user.email,
          form_name: `Invitación a ${cfg.empresa.nombre} Suite`,
          from_name: cfg.empresa.nombre,
          form_link: inviteUrl,
        }
      })
    });
    return res.ok;
  } catch { return false; }
}

/* ═══════════════════════════════════════════════════════════════
   LOGIN SCREEN
   ═══════════════════════════════════════════════════════════════ */

export default function LoginScreen({ onSuccess }) {
  const [mode, setMode] = useState("login"); // login | setup | invite
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [inviteToken, setInviteToken] = useState(null);
  const [inviteUser, setInviteUser] = useState(null);

  // Check for invite token in URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("invite");
    if (token) {
      const invites = getInvites();
      const invite = invites.find(i => i.token === token && i.estado === "pendiente");
      if (invite) {
        const users = getUsers();
        const user = users.find(u => u.id === invite.userId);
        if (user && !user.passwordHash) {
          setInviteToken(token);
          setInviteUser(user);
          setEmail(user.email);
          setMode("invite");
        }
      }
    }
    // Check if super admin needs setup
    const users = getUsers();
    const superAdmin = users.find(u => u.id === "superadmin");
    if (superAdmin && !superAdmin.passwordHash) {
      setMode("setup");
      setEmail(SUPER_ADMIN.email);
    }
  }, []);

  const handleLogin = async () => {
    setError("");
    if (!email || !password) { setError("Ingresa email y contraseña"); return; }
    setLoading(true);
    const users = getUsers();
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase().trim());
    if (!user) { setError("Usuario no encontrado. Solo usuarios invitados pueden acceder."); setLoading(false); return; }
    if (user.estado === "inactivo") { setError("Tu cuenta ha sido desactivada. Contacta al administrador."); setLoading(false); return; }
    if (!user.passwordHash) { setError("Aún no has configurado tu contraseña. Revisa tu email de invitación."); setLoading(false); return; }
    const hash = await hashPassword(password);
    if (hash !== user.passwordHash) { setError("Contraseña incorrecta"); setLoading(false); return; }
    setSession(user);
    setLoading(false);
    onSuccess();
  };

  const handleSetup = async () => {
    setError("");
    if (!password || password.length < 6) { setError("La contraseña debe tener al menos 6 caracteres"); return; }
    if (password !== password2) { setError("Las contraseñas no coinciden"); return; }
    setLoading(true);
    const hash = await hashPassword(password);
    const users = getUsers();
    const idx = users.findIndex(u => u.id === "superadmin");
    if (idx >= 0) {
      users[idx].passwordHash = hash;
      saveUsers(users);
      setSession(users[idx]);
      setLoading(false);
      // Clean URL
      window.history.replaceState({}, "", window.location.pathname);
      onSuccess();
    }
  };

  const handleInviteSetup = async () => {
    setError("");
    if (!password || password.length < 6) { setError("La contraseña debe tener al menos 6 caracteres"); return; }
    if (password !== password2) { setError("Las contraseñas no coinciden"); return; }
    setLoading(true);
    const hash = await hashPassword(password);
    const users = getUsers();
    const idx = users.findIndex(u => u.id === inviteUser.id);
    if (idx >= 0) {
      users[idx].passwordHash = hash;
      users[idx].estado = "activo";
      saveUsers(users);
      // Mark invite as used
      const invites = getInvites();
      const invIdx = invites.findIndex(i => i.token === inviteToken);
      if (invIdx >= 0) { invites[invIdx].estado = "usado"; saveInvites(invites); }
      setSession(users[idx]);
      setLoading(false);
      window.history.replaceState({}, "", window.location.pathname);
      onSuccess();
    }
  };

  const cfg = (() => { try { return getConfig(); } catch { return { empresa: { nombre: "Habitaris" }, apariencia: { colorPrimario: "#111" } }; } })();

  return (
    <div style={{
      minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center",
      background:`linear-gradient(135deg, #F8F7F4 0%, #EDEBE7 100%)`,
      fontFamily:"'Outfit',sans-serif", padding:20,
    }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap');`}</style>
      <div style={{
        width:"100%", maxWidth:420, background:"#fff", borderRadius:16,
        boxShadow:"0 4px 24px rgba(0,0,0,.08), 0 1px 4px rgba(0,0,0,.04)",
        padding:"40px 36px", position:"relative",
      }}>
        {/* Logo / Brand */}
        <div style={{textAlign:"center", marginBottom:32}}>
          <div style={{
            width:56, height:56, borderRadius:14, background:T.ink,
            display:"inline-flex", alignItems:"center", justifyContent:"center",
            marginBottom:16, boxShadow:"0 4px 12px rgba(0,0,0,.15)",
          }}>
            <Shield size={28} color="#fff"/>
          </div>
          <h1 style={{margin:0, fontSize:22, fontWeight:700, color:T.ink}}>
            {cfg.empresa.nombre} <span style={{fontWeight:300, color:T.inkLight}}>Suite</span>
          </h1>
          <p style={{margin:"6px 0 0", fontSize:11, color:T.inkLight}}>
            {mode === "setup" ? "Configura tu cuenta de Super Administrador"
              : mode === "invite" ? `Bienvenid@, ${inviteUser?.nombre || ""}. Configura tu contraseña`
              : "Acceso exclusivo para usuarios autorizados"}
          </p>
        </div>

        {/* Error */}
        {error && (
          <div style={{
            background:T.redBg, border:`1px solid ${T.red}33`, borderRadius:8,
            padding:"8px 12px", marginBottom:16, fontSize:11, color:T.red,
            display:"flex", alignItems:"center", gap:6,
          }}>
            <X size={14}/> {error}
          </div>
        )}

        {/* ── LOGIN MODE ── */}
        {mode === "login" && (
          <>
            <div style={{marginBottom:14}}>
              <label style={{fontSize:9, fontWeight:700, color:T.inkMid, textTransform:"uppercase", letterSpacing:.5, display:"block", marginBottom:4}}>
                Email
              </label>
              <div style={{position:"relative"}}>
                <Mail size={14} color={T.inkLight} style={{position:"absolute", left:10, top:10}}/>
                <input value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="tu@email.com" type="email"
                  onKeyDown={e => e.key === "Enter" && handleLogin()}
                  style={{
                    width:"100%", padding:"9px 12px 9px 32px", border:`1px solid ${T.border}`,
                    borderRadius:8, fontSize:13, fontFamily:"'Outfit',sans-serif",
                    background:"#FAFAF8",
                  }}/>
              </div>
            </div>

            <div style={{marginBottom:20}}>
              <label style={{fontSize:9, fontWeight:700, color:T.inkMid, textTransform:"uppercase", letterSpacing:.5, display:"block", marginBottom:4}}>
                Contraseña
              </label>
              <div style={{position:"relative"}}>
                <Lock size={14} color={T.inkLight} style={{position:"absolute", left:10, top:10}}/>
                <input value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••" type={showPw ? "text" : "password"}
                  onKeyDown={e => e.key === "Enter" && handleLogin()}
                  style={{
                    width:"100%", padding:"9px 36px 9px 32px", border:`1px solid ${T.border}`,
                    borderRadius:8, fontSize:13, fontFamily:"'Outfit',sans-serif",
                    background:"#FAFAF8",
                  }}/>
                <button onClick={() => setShowPw(!showPw)} style={{
                  position:"absolute", right:8, top:7, border:"none", background:"none", cursor:"pointer",
                }}>
                  {showPw ? <EyeOff size={16} color={T.inkLight}/> : <Eye size={16} color={T.inkLight}/>}
                </button>
              </div>
            </div>

            <button onClick={handleLogin} disabled={loading} style={{
              width:"100%", padding:"12px", borderRadius:8, border:"none",
              background:T.ink, color:"#fff", fontSize:13, fontWeight:600,
              fontFamily:"'Outfit',sans-serif", cursor:"pointer",
              opacity:loading ? 0.6 : 1,
            }}>
              {loading ? "Verificando..." : "Iniciar sesión"}
            </button>

            <p style={{textAlign:"center", marginTop:20, fontSize:10, color:T.inkLight}}>
              ¿No tienes cuenta? Solicita acceso al administrador
            </p>
          </>
        )}

        {/* ── SETUP MODE (Super Admin first time) ── */}
        {mode === "setup" && (
          <>
            <div style={{
              background:T.amberBg, border:`1px solid ${T.amber}33`, borderRadius:8,
              padding:"10px 14px", marginBottom:16, fontSize:10, color:T.amber,
              display:"flex", alignItems:"flex-start", gap:8,
            }}>
              <Shield size={16} style={{flexShrink:0, marginTop:1}}/>
              <div>
                <strong>Primera vez:</strong> Configura la contraseña para la cuenta de Super Administrador
                ({SUPER_ADMIN.email}). Solo se hace una vez.
              </div>
            </div>

            <div style={{marginBottom:14}}>
              <label style={{fontSize:9, fontWeight:700, color:T.inkMid, textTransform:"uppercase", letterSpacing:.5, display:"block", marginBottom:4}}>
                Email (Super Admin)
              </label>
              <input value={SUPER_ADMIN.email} disabled style={{
                width:"100%", padding:"9px 12px", border:`1px solid ${T.border}`,
                borderRadius:8, fontSize:13, fontFamily:"'Outfit',sans-serif",
                background:"#f0f0f0", color:T.inkMid,
              }}/>
            </div>

            <div style={{marginBottom:14}}>
              <label style={{fontSize:9, fontWeight:700, color:T.inkMid, textTransform:"uppercase", letterSpacing:.5, display:"block", marginBottom:4}}>
                Nueva contraseña
              </label>
              <input value={password} onChange={e => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres" type={showPw ? "text" : "password"}
                style={{
                  width:"100%", padding:"9px 12px", border:`1px solid ${T.border}`,
                  borderRadius:8, fontSize:13, fontFamily:"'Outfit',sans-serif", background:"#FAFAF8",
                }}/>
            </div>

            <div style={{marginBottom:20}}>
              <label style={{fontSize:9, fontWeight:700, color:T.inkMid, textTransform:"uppercase", letterSpacing:.5, display:"block", marginBottom:4}}>
                Confirmar contraseña
              </label>
              <input value={password2} onChange={e => setPassword2(e.target.value)}
                placeholder="Repite la contraseña" type={showPw ? "text" : "password"}
                onKeyDown={e => e.key === "Enter" && handleSetup()}
                style={{
                  width:"100%", padding:"9px 12px", border:`1px solid ${T.border}`,
                  borderRadius:8, fontSize:13, fontFamily:"'Outfit',sans-serif", background:"#FAFAF8",
                }}/>
            </div>

            <label style={{display:"flex", alignItems:"center", gap:6, marginBottom:16, fontSize:11, color:T.inkMid, cursor:"pointer"}}>
              <input type="checkbox" checked={showPw} onChange={() => setShowPw(!showPw)}/> Mostrar contraseñas
            </label>

            <button onClick={handleSetup} disabled={loading} style={{
              width:"100%", padding:"12px", borderRadius:8, border:"none",
              background:T.green, color:"#fff", fontSize:13, fontWeight:600,
              fontFamily:"'Outfit',sans-serif", cursor:"pointer",
              opacity:loading ? 0.6 : 1,
            }}>
              {loading ? "Configurando..." : "🔐 Configurar cuenta de Super Admin"}
            </button>
          </>
        )}

        {/* ── INVITE MODE (New user setting password) ── */}
        {mode === "invite" && inviteUser && (
          <>
            <div style={{
              background:T.blueBg, border:`1px solid ${T.blue}33`, borderRadius:8,
              padding:"10px 14px", marginBottom:16, fontSize:10, color:T.blue,
              display:"flex", alignItems:"flex-start", gap:8,
            }}>
              <UserPlus size={16} style={{flexShrink:0, marginTop:1}}/>
              <div>
                Has sido invitad@ como <strong>{ROLES[inviteUser.rol]?.label || inviteUser.rol}</strong>.
                Configura tu contraseña para acceder.
              </div>
            </div>

            <div style={{marginBottom:14}}>
              <label style={{fontSize:9, fontWeight:700, color:T.inkMid, textTransform:"uppercase", letterSpacing:.5, display:"block", marginBottom:4}}>
                Email
              </label>
              <input value={inviteUser.email} disabled style={{
                width:"100%", padding:"9px 12px", border:`1px solid ${T.border}`,
                borderRadius:8, fontSize:13, fontFamily:"'Outfit',sans-serif",
                background:"#f0f0f0", color:T.inkMid,
              }}/>
            </div>

            <div style={{marginBottom:14}}>
              <label style={{fontSize:9, fontWeight:700, color:T.inkMid, textTransform:"uppercase", letterSpacing:.5, display:"block", marginBottom:4}}>
                Nueva contraseña
              </label>
              <input value={password} onChange={e => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres" type={showPw ? "text" : "password"}
                style={{
                  width:"100%", padding:"9px 12px", border:`1px solid ${T.border}`,
                  borderRadius:8, fontSize:13, fontFamily:"'Outfit',sans-serif", background:"#FAFAF8",
                }}/>
            </div>

            <div style={{marginBottom:20}}>
              <label style={{fontSize:9, fontWeight:700, color:T.inkMid, textTransform:"uppercase", letterSpacing:.5, display:"block", marginBottom:4}}>
                Confirmar contraseña
              </label>
              <input value={password2} onChange={e => setPassword2(e.target.value)}
                placeholder="Repite la contraseña" type={showPw ? "text" : "password"}
                onKeyDown={e => e.key === "Enter" && handleInviteSetup()}
                style={{
                  width:"100%", padding:"9px 12px", border:`1px solid ${T.border}`,
                  borderRadius:8, fontSize:13, fontFamily:"'Outfit',sans-serif", background:"#FAFAF8",
                }}/>
            </div>

            <button onClick={handleInviteSetup} disabled={loading} style={{
              width:"100%", padding:"12px", borderRadius:8, border:"none",
              background:T.blue, color:"#fff", fontSize:13, fontWeight:600,
              fontFamily:"'Outfit',sans-serif", cursor:"pointer",
              opacity:loading ? 0.6 : 1,
            }}>
              {loading ? "Configurando..." : "✓ Activar mi cuenta"}
            </button>
          </>
        )}

        {/* Footer */}
        <div style={{textAlign:"center", marginTop:24, fontSize:9, color:T.inkLight}}>
          {cfg.empresa.nombre} Suite · Acceso protegido
        </div>
      </div>
    </div>
  );
}


/* ═══════════════════════════════════════════════════════════════
   USER MANAGEMENT COMPONENT (for use inside Configuración or standalone)
   ═══════════════════════════════════════════════════════════════ */

export function UserManagement() {
  const [users, setUsers] = useState(() => getUsers());
  const [showAdd, setShowAdd] = useState(false);
  const [newUser, setNewUser] = useState({ nombre:"", email:"", rol:"auxiliar" });
  const [sending, setSending] = useState(false);
  const [sendStatus, setSendStatus] = useState("");
  const [editId, setEditId] = useState(null);

  const currentUser = getCurrentUser();
  const isAdmin = currentUser?.rol === "superadmin" || currentUser?.rol === "admin";

  const refresh = () => setUsers(getUsers());

  const addUser = async () => {
    if (!newUser.nombre || !newUser.email) { alert("Nombre y email son obligatorios"); return; }
    if (users.some(u => u.email.toLowerCase() === newUser.email.toLowerCase())) {
      alert("Ya existe un usuario con ese email"); return;
    }

    const user = {
      id: "user_" + Date.now().toString(36),
      nombre: newUser.nombre.trim(),
      email: newUser.email.trim().toLowerCase(),
      rol: newUser.rol,
      estado: "pendiente",
      creadoPor: currentUser?.email || "admin",
      fechaCreacion: new Date().toISOString().split("T")[0],
    };

    // Generate invite token
    const token = generateToken();
    const invite = {
      token,
      userId: user.id,
      email: user.email,
      estado: "pendiente",
      fechaCreacion: new Date().toISOString(),
    };

    // Save user and invite
    const updatedUsers = [...users, user];
    saveUsers(updatedUsers);
    const invites = getInvites();
    invites.push(invite);
    saveInvites(invites);
    setUsers(updatedUsers);

    // Send email
    setSending(true);
    setSendStatus("Enviando invitación...");
    const baseUrl = window.location.origin;
    const ok = await sendInviteEmail(user, token, baseUrl);
    setSending(false);

    if (ok) {
      setSendStatus("✅ Invitación enviada a " + user.email);
      setShowAdd(false);
      setNewUser({ nombre:"", email:"", rol:"auxiliar" });
    } else {
      setSendStatus("⚠️ Usuario creado pero el email falló. Copia el enlace manualmente.");
    }

    setTimeout(() => setSendStatus(""), 5000);
  };

  const toggleStatus = (id) => {
    if (id === "superadmin") return;
    const updated = users.map(u =>
      u.id === id ? {...u, estado: u.estado === "activo" ? "inactivo" : "activo"} : u
    );
    saveUsers(updated);
    setUsers(updated);
  };

  const deleteUser = (id) => {
    if (id === "superadmin") return;
    if (!confirm("¿Eliminar este usuario? No podrá acceder a la suite.")) return;
    const updated = users.filter(u => u.id !== id);
    saveUsers(updated);
    setUsers(updated);
  };

  const updateRole = (id, newRol) => {
    if (id === "superadmin") return;
    const updated = users.map(u => u.id === id ? {...u, rol: newRol} : u);
    saveUsers(updated);
    setUsers(updated);
    setEditId(null);
  };

  const resendInvite = async (user) => {
    const token = generateToken();
    const invite = {
      token,
      userId: user.id,
      email: user.email,
      estado: "pendiente",
      fechaCreacion: new Date().toISOString(),
    };
    const invites = getInvites();
    invites.push(invite);
    saveInvites(invites);

    setSending(true);
    setSendStatus("Reenviando a " + user.email + "...");
    const ok = await sendInviteEmail(user, token, window.location.origin);
    setSending(false);
    setSendStatus(ok ? "✅ Invitación reenviada" : "❌ Error al enviar");
    setTimeout(() => setSendStatus(""), 4000);
  };

  const getInviteLink = (user) => {
    const invites = getInvites();
    const invite = invites.filter(i => i.userId === user.id && i.estado === "pendiente").pop();
    if (invite) {
      return `${window.location.origin}?invite=${invite.token}`;
    }
    return null;
  };

  const copyLink = (user) => {
    const link = getInviteLink(user);
    if (link) {
      navigator.clipboard.writeText(link);
      setSendStatus("📋 Enlace copiado");
      setTimeout(() => setSendStatus(""), 3000);
    }
  };

  const inp = { border:`1px solid ${T.border}`, borderRadius:6, padding:"8px 10px", fontSize:12, fontFamily:"'Outfit',sans-serif", background:"#fff", width:"100%" };
  const Card = ({children,style}) => <div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:8,padding:16,boxShadow:T.shadow,...style}}>{children}</div>;
  const Btn = ({children,on,v,style,...p}) => <button onClick={on} style={{padding:"7px 14px",borderRadius:6,border:v==="sec"?`1px solid ${T.border}`:"none",background:v==="sec"?"#fff":v==="danger"?T.red:T.ink,color:v==="sec"?T.inkMid:"#fff",fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"'Outfit',sans-serif",display:"inline-flex",alignItems:"center",gap:5,...style}} {...p}>{children}</button>;

  return (
    <div style={{fontFamily:"'Outfit',sans-serif"}}>
      {/* Header */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
        <div>
          <h2 style={{margin:0,fontSize:18,fontWeight:700}}>👥 Usuarios</h2>
          <p style={{margin:"2px 0 0",fontSize:10,color:T.inkMid}}>
            {users.length} usuario{users.length !== 1 ? "s" : ""} · {users.filter(u=>u.estado==="activo").length} activos
          </p>
        </div>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          {sendStatus && <span style={{fontSize:10,fontWeight:600,color:sendStatus.startsWith("✅")?T.green:sendStatus.startsWith("❌")?T.red:T.amber}}>{sendStatus}</span>}
          {isAdmin && <Btn on={() => setShowAdd(!showAdd)}><UserPlus size={12}/> Invitar usuario</Btn>}
        </div>
      </div>

      {/* Add user form */}
      {showAdd && (
        <Card style={{marginBottom:16,background:T.blueBg,border:`1px solid ${T.blue}22`}}>
          <div style={{fontSize:12,fontWeight:700,color:T.blue,marginBottom:12}}>
            <UserPlus size={14} style={{verticalAlign:"middle",marginRight:6}}/> Nuevo usuario
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:12}}>
            <div>
              <label style={{fontSize:8,fontWeight:700,color:T.inkMid,textTransform:"uppercase",display:"block",marginBottom:3}}>Nombre completo</label>
              <input value={newUser.nombre} onChange={e=>setNewUser({...newUser,nombre:e.target.value})} placeholder="Juan Pérez" style={inp}/>
            </div>
            <div>
              <label style={{fontSize:8,fontWeight:700,color:T.inkMid,textTransform:"uppercase",display:"block",marginBottom:3}}>Email</label>
              <input value={newUser.email} onChange={e=>setNewUser({...newUser,email:e.target.value})} placeholder="juan@habitaris.co" type="email" style={inp}/>
            </div>
            <div>
              <label style={{fontSize:8,fontWeight:700,color:T.inkMid,textTransform:"uppercase",display:"block",marginBottom:3}}>Rol</label>
              <select value={newUser.rol} onChange={e=>setNewUser({...newUser,rol:e.target.value})} style={inp}>
                {Object.entries(ROLES).filter(([k]) => k !== "superadmin").map(([k,v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
            </div>
          </div>
          <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
            <Btn v="sec" on={() => setShowAdd(false)}>Cancelar</Btn>
            <Btn on={addUser} disabled={sending}>
              <Send size={11}/> {sending ? "Enviando..." : "Enviar invitación"}
            </Btn>
          </div>
        </Card>
      )}

      {/* Users table */}
      <Card style={{padding:0,overflow:"hidden"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
          <thead>
            <tr style={{background:"#FAFAF8"}}>
              <th style={{padding:"10px 14px",textAlign:"left",fontSize:9,fontWeight:700,color:T.inkLight,textTransform:"uppercase",borderBottom:`1px solid ${T.border}`}}>Usuario</th>
              <th style={{padding:"10px 14px",textAlign:"left",fontSize:9,fontWeight:700,color:T.inkLight,textTransform:"uppercase",borderBottom:`1px solid ${T.border}`}}>Rol</th>
              <th style={{padding:"10px 14px",textAlign:"left",fontSize:9,fontWeight:700,color:T.inkLight,textTransform:"uppercase",borderBottom:`1px solid ${T.border}`}}>Estado</th>
              <th style={{padding:"10px 14px",textAlign:"left",fontSize:9,fontWeight:700,color:T.inkLight,textTransform:"uppercase",borderBottom:`1px solid ${T.border}`}}>Desde</th>
              <th style={{padding:"10px 14px",textAlign:"right",fontSize:9,fontWeight:700,color:T.inkLight,textTransform:"uppercase",borderBottom:`1px solid ${T.border}`}}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => {
              const role = ROLES[u.rol] || { label:u.rol, color:T.inkLight };
              const isSuper = u.id === "superadmin";
              return (
                <tr key={u.id} style={{borderBottom:`1px solid ${T.border}22`}}>
                  <td style={{padding:"10px 14px"}}>
                    <div style={{display:"flex",alignItems:"center",gap:10}}>
                      <div style={{
                        width:32,height:32,borderRadius:"50%",
                        background:isSuper ? T.gold+"22" : T.blueBg,
                        display:"flex",alignItems:"center",justifyContent:"center",
                        fontSize:12,fontWeight:700,color:isSuper ? T.gold : T.blue,
                      }}>
                        {u.nombre.split(" ").map(n=>n[0]).join("").substring(0,2).toUpperCase()}
                      </div>
                      <div>
                        <div style={{fontWeight:600,color:T.ink}}>{u.nombre}</div>
                        <div style={{fontSize:9,color:T.inkLight}}>{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{padding:"10px 14px"}}>
                    {editId === u.id ? (
                      <select value={u.rol} onChange={e => updateRole(u.id, e.target.value)}
                        onBlur={() => setEditId(null)} autoFocus
                        style={{...inp,width:140,fontSize:10,padding:"4px 6px"}}>
                        {Object.entries(ROLES).filter(([k]) => k !== "superadmin").map(([k,v]) => (
                          <option key={k} value={k}>{v.label}</option>
                        ))}
                      </select>
                    ) : (
                      <span style={{
                        fontSize:9,fontWeight:700,padding:"3px 10px",borderRadius:12,
                        background:role.color+"18",color:role.color,cursor:isSuper?"default":"pointer",
                      }} onClick={() => !isSuper && isAdmin && setEditId(u.id)}>
                        {isSuper && "👑 "}{role.label}
                      </span>
                    )}
                  </td>
                  <td style={{padding:"10px 14px"}}>
                    <span style={{
                      fontSize:9,fontWeight:600,
                      color: u.estado === "activo" ? T.green : u.estado === "pendiente" ? T.amber : T.red,
                    }}>
                      {u.estado === "activo" ? "● Activo" : u.estado === "pendiente" ? "◐ Pendiente" : "○ Inactivo"}
                    </span>
                  </td>
                  <td style={{padding:"10px 14px",fontSize:10,color:T.inkLight}}>
                    {u.fechaCreacion}
                  </td>
                  <td style={{padding:"10px 14px",textAlign:"right"}}>
                    {!isSuper && isAdmin && (
                      <div style={{display:"flex",gap:4,justifyContent:"flex-end"}}>
                        {u.estado === "pendiente" && (
                          <>
                            <button onClick={() => resendInvite(u)} title="Reenviar invitación"
                              style={{border:"none",background:T.blueBg,borderRadius:4,padding:"4px 6px",cursor:"pointer"}}>
                              <Send size={11} color={T.blue}/>
                            </button>
                            <button onClick={() => copyLink(u)} title="Copiar enlace de invitación"
                              style={{border:"none",background:T.amberBg,borderRadius:4,padding:"4px 6px",cursor:"pointer"}}>
                              <Copy size={11} color={T.amber}/>
                            </button>
                          </>
                        )}
                        <button onClick={() => toggleStatus(u.id)}
                          title={u.estado === "activo" ? "Desactivar" : "Activar"}
                          style={{border:"none",background:u.estado==="activo"?T.amberBg:T.greenBg,borderRadius:4,padding:"4px 6px",cursor:"pointer"}}>
                          {u.estado === "activo"
                            ? <X size={11} color={T.amber}/>
                            : <Check size={11} color={T.green}/>}
                        </button>
                        <button onClick={() => deleteUser(u.id)} title="Eliminar"
                          style={{border:"none",background:T.redBg,borderRadius:4,padding:"4px 6px",cursor:"pointer"}}>
                          <Trash2 size={11} color={T.red}/>
                        </button>
                      </div>
                    )}
                    {isSuper && (
                      <span style={{fontSize:8,color:T.gold,fontWeight:700}}>PROTEGIDO</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>

      {/* Info */}
      <div style={{marginTop:12,padding:"10px 14px",background:T.amberBg,border:`1px solid ${T.amber}22`,borderRadius:8,fontSize:9,color:T.amber,lineHeight:1.6}}>
        <strong>💡 Flujo de invitación:</strong> Al crear un usuario → se envía un email con enlace → el usuario abre el enlace → configura su contraseña → puede acceder a la suite.
        {!isAdmin && <><br/><strong>Solo Super Admin y Administradores pueden gestionar usuarios.</strong></>}
      </div>
    </div>
  );
}
