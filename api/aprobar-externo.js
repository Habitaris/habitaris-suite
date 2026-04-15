const SB_URL = "https://xlzkasdskatnikuavefh.supabase.co";
const SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhsemthc2Rza2F0bmlrdWF2ZWZoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE4OTE3NzQsImV4cCI6MjA4NzQ2Nzc3NH0.SR9tIpvL0YnV9CNrRq4T-xetifuNQOJZE0OnQpwtYLM";

function sbH(){return{"apikey":SB_KEY,"Authorization":"Bearer "+SB_KEY,"Content-Type":"application/json","Prefer":"return=representation"};}

export default async function handler(req,res){
  res.setHeader("Access-Control-Allow-Origin","*");
  res.setHeader("Access-Control-Allow-Methods","GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers","Content-Type");
  if(req.method==="OPTIONS")return res.status(200).end();
  try{
    if(req.method==="GET"){
      const {token,tipo}=req.query;
      if(!token)return res.status(400).json({ok:false,error:"token requerido"});
      const col=tipo==="sst"?"eval_token_sst":"eval_token_rrhh";
      const r=await fetch(SB_URL+"/rest/v1/hiring_processes?"+col+"=eq."+token,{headers:sbH()});
      const d=await r.json();
      if(!d||!d.length)return res.status(404).json({ok:false,error:"Token no válido o ya procesado"});
      const hiring=d[0];
      const r2=await fetch(SB_URL+"/rest/v1/psicotecnico_results?hiring_id=eq."+hiring.id+"&order=created_at.desc&limit=1",{headers:sbH()});
      const d2=await r2.json();
      return res.status(200).json({ok:true,hiring,psicotecnico:d2[0]||null,tipo});
    }
    if(req.method==="POST"){
      const b=req.body;
      const {token,tipo,accion,observaciones}=b;
      if(!token||!accion)return res.status(400).json({ok:false,error:"token y accion requeridos"});
      const tokenCol   =tipo==="sst"?"eval_token_sst"    :"eval_token_rrhh";
      const aprobadaCol=tipo==="sst"?"eval_aprobada_sst" :"eval_aprobada_rrhh";
      const notasCol   =tipo==="sst"?"eval_notas_sst"    :"eval_notas_rrhh";
      const otherCol   =tipo==="sst"?"eval_aprobada_rrhh":"eval_aprobada_sst";
      const r=await fetch(SB_URL+"/rest/v1/hiring_processes?"+tokenCol+"=eq."+token,{headers:sbH()});
      const d=await r.json();
      if(!d||!d.length)return res.status(404).json({ok:false,error:"Token no válido"});
      const hiring=d[0];
      const patch={[aprobadaCol]:accion==="aprobar",[tokenCol]:null};
      if(observaciones)patch[notasCol]=observaciones;
      const otherApproved=hiring[otherCol];
      if(accion==="aprobar"&&otherApproved)patch.estado="examen_medico";
      const r2=await fetch(SB_URL+"/rest/v1/hiring_processes?id=eq."+hiring.id,{method:"PATCH",headers:sbH(),body:JSON.stringify(patch)});
      const d2=await r2.json();
      return res.status(200).json({ok:true,decision:accion,candidato:hiring.candidato_nombre,avanzado:!!(accion==="aprobar"&&otherApproved)});
    }
    return res.status(405).json({error:"Method not allowed"});
  }catch(e){return res.status(500).json({ok:false,error:e.message});}
}
