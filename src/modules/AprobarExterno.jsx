import React, { useState, useEffect } from 'react';

export default function AprobarExterno() {
  const params  = new URLSearchParams(window.location.search);
  const token   = params.get('token')  || '';
  const tipo    = params.get('tipo')   || 'rrhh';
  const accion  = params.get('accion') || 'aprobar';

  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  const [notas,   setNotas]   = useState('');
  const [sending, setSending] = useState(false);
  const [done,    setDone]    = useState(null);

  useEffect(() => {
    if (!token) { setError('Token no encontrado en el enlace.'); setLoading(false); return; }
    fetch('/api/aprobar-externo?token='+token+'&tipo='+tipo)
      .then(r => r.json())
      .then(d => { if (!d.ok) setError(d.error||'Token no válido'); else setData(d); setLoading(false); })
      .catch(() => { setError('Error de conexión'); setLoading(false); });
  }, []);

  const confirmar = async () => {
    setSending(true);
    try {
      const r = await fetch('/api/aprobar-externo', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ token, tipo, accion, observaciones: notas })
      });
      const d = await r.json();
      if (!d.ok) setError(d.error||'Error al procesar');
      else setDone(d);
    } catch { setError('Error de conexión'); }
    setSending(false);
  };

  const G = '#1E6B42', B = '#F0EEE9';
  const esApr = accion === 'aprobar';
  const rol   = tipo === 'sst' ? 'SST' : 'RRHH';

  if (loading) return (
    <div style={{minHeight:'100vh',background:B,display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'DM Sans,sans-serif'}}>
      <div style={{color:'#888',fontSize:14}}>Cargando...</div>
    </div>
  );

  if (error && !done) return (
    <div style={{minHeight:'100vh',background:B,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:24,fontFamily:'DM Sans,sans-serif'}}>
      <img src="/logo-negro.png" alt="Habitaris" style={{height:28,marginBottom:28}}/>
      <div style={{background:'#fff',borderRadius:12,padding:'32px 28px',maxWidth:400,width:'100%',textAlign:'center',boxShadow:'0 2px 16px rgba(0,0,0,.08)'}}>
        <div style={{fontSize:32,marginBottom:12}}>⚠️</div>
        <div style={{fontWeight:700,fontSize:16,marginBottom:8,color:'#111'}}>Enlace no válido</div>
        <div style={{fontSize:13,color:'#666'}}>{error}</div>
      </div>
    </div>
  );

  if (done) return (
    <div style={{minHeight:'100vh',background:B,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:24,fontFamily:'DM Sans,sans-serif'}}>
      <img src="/logo-negro.png" alt="Habitaris" style={{height:28,marginBottom:28}}/>
      <div style={{background:'#fff',borderRadius:12,padding:'40px 32px',maxWidth:400,width:'100%',textAlign:'center',boxShadow:'0 2px 16px rgba(0,0,0,.08)'}}>
        <div style={{fontSize:44,marginBottom:16}}>{esApr?'✅':'❌'}</div>
        <div style={{fontWeight:700,fontSize:18,color:'#111',marginBottom:8}}>{esApr?'Evaluación aprobada':'Evaluación rechazada'}</div>
        <div style={{fontSize:13,color:'#555'}}>Su respuesta para <strong>{done.candidato}</strong> ha sido registrada.</div>
        {done.avanzado && (
          <div style={{marginTop:14,padding:'10px 14px',background:'#DCFCE7',borderRadius:8,fontSize:12,color:'#065F46',fontWeight:600}}>
            🎉 Ambos revisores aprobaron — el candidato avanza a Examen Médico.
          </div>
        )}
      </div>
      <div style={{marginTop:20,fontSize:10,color:'#aaa'}}>Habitaris S.A.S · Proceso confidencial</div>
    </div>
  );

  const h = data.hiring;
  const p = data.psicotecnico;

  return (
    <div style={{minHeight:'100vh',background:B,padding:'32px 16px',fontFamily:'DM Sans,sans-serif'}}>
      <div style={{maxWidth:480,margin:'0 auto'}}>

        {/* Header */}
        <div style={{textAlign:'center',marginBottom:28}}>
          <img src="/logo-negro.png" alt="Habitaris" style={{height:28,marginBottom:14}}/>
          <div style={{fontSize:10,fontWeight:700,letterSpacing:2,textTransform:'uppercase',color:'#999'}}>
            Revisión de evaluaciones — {rol}
          </div>
        </div>

        {/* Candidate */}
        <div style={{background:'#fff',borderRadius:12,padding:'20px 22px',marginBottom:12,boxShadow:'0 1px 8px rgba(0,0,0,.06)'}}>
          <div style={{fontSize:10,fontWeight:700,textTransform:'uppercase',letterSpacing:1.5,color:'#aaa',marginBottom:8}}>Candidato</div>
          <div style={{fontWeight:700,fontSize:16,color:'#111',marginBottom:2}}>{h.candidato_nombre||'—'}</div>
          <div style={{fontSize:12,color:'#555'}}>{h.cargo||'—'}</div>
        </div>

        {/* Eval results */}
        {p ? (
          <div style={{background:'#fff',borderRadius:12,padding:'20px 22px',marginBottom:12,boxShadow:'0 1px 8px rgba(0,0,0,.06)'}}>
            <div style={{fontSize:10,fontWeight:700,textTransform:'uppercase',letterSpacing:1.5,color:'#aaa',marginBottom:10}}>Resultados de evaluación</div>
            <div style={{display:'flex',gap:24,marginBottom:p.concepto?10:0}}>
              {p.puntaje_general && <div><div style={{fontSize:10,color:'#aaa',textTransform:'uppercase',letterSpacing:1}}>Puntaje</div><div style={{fontWeight:700,fontSize:20,color:G}}>{p.puntaje_general}</div></div>}
              {p.perfil_disc     && <div><div style={{fontSize:10,color:'#aaa',textTransform:'uppercase',letterSpacing:1}}>DISC</div><div style={{fontWeight:700,fontSize:20,color:'#5B3A8C'}}>{p.perfil_disc}</div></div>}
            </div>
            {p.concepto && <div style={{padding:'8px 10px',background:'#F8F7F5',borderRadius:6,fontSize:12,color:'#333'}}><strong>Concepto:</strong> {p.concepto}</div>}
            {p.observaciones && <div style={{marginTop:6,fontSize:11,color:'#666'}}>{p.observaciones}</div>}
          </div>
        ) : (
          <div style={{background:'#fff',borderRadius:12,padding:'16px 22px',marginBottom:12,boxShadow:'0 1px 8px rgba(0,0,0,.06)',color:'#bbb',fontSize:12}}>
            El candidato aún no ha completado las evaluaciones.
          </div>
        )}

        {/* Action */}
        <div style={{background:'#fff',borderRadius:12,padding:'20px 22px',boxShadow:'0 1px 8px rgba(0,0,0,.06)'}}>
          <div style={{padding:'10px 14px',borderRadius:8,marginBottom:16,background:esApr?'#DCFCE7':'#FEE2E2',border:'1px solid '+(esApr?'#A7F3D0':'#FECACA')}}>
            <div style={{fontWeight:700,fontSize:14,color:esApr?'#065F46':'#991B1B'}}>{esApr?'✅ Aprobar evaluación':'❌ Rechazar evaluación'}</div>
            <div style={{fontSize:11,color:esApr?'#059669':'#DC2626',marginTop:2}}>
              {esApr?'Está a punto de aprobar las evaluaciones de este candidato.':'Está a punto de rechazar las evaluaciones de este candidato.'}
            </div>
          </div>

          <div style={{marginBottom:16}}>
            <label style={{display:'block',fontSize:10,fontWeight:700,textTransform:'uppercase',letterSpacing:1,color:'#888',marginBottom:6}}>
              {esApr?'Observaciones (opcional)':'Motivo del rechazo'}
            </label>
            <textarea value={notas} onChange={e=>setNotas(e.target.value)} rows={3}
              placeholder={esApr?'Observaciones adicionales...':'Indique el motivo del rechazo...'}
              style={{width:'100%',padding:'8px 10px',fontSize:12,border:'1px solid #E0E0E0',borderRadius:6,fontFamily:'DM Sans,sans-serif',resize:'vertical',outline:'none',boxSizing:'border-box'}}
            />
          </div>

          <button onClick={confirmar} disabled={sending} style={{
            width:'100%',padding:'14px',fontSize:14,fontWeight:700,borderRadius:8,border:'none',
            cursor:sending?'wait':'pointer',fontFamily:'DM Sans,sans-serif',
            background:sending?'#ccc':esApr?G:'#B91C1C',color:'#fff',letterSpacing:0.5
          }}>
            {sending?'Procesando...':esApr?'✅ Confirmar aprobación':'❌ Confirmar rechazo'}
          </button>
        </div>

        <div style={{textAlign:'center',marginTop:24,fontSize:10,color:'#aaa'}}>Habitaris S.A.S · Proceso de selección confidencial</div>
      </div>
    </div>
  );
}
