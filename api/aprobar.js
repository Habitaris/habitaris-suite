const SB_URL = "https://xlzkasdskatnikuavefh.supabase.co";
const SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhsemthc2Rza2F0bmlrdWF2ZWZoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE4OTE3NzQsImV4cCI6MjA4NzQ2Nzc3NH0.SR9tIpvL0YnV9CNrRq4T-xetifuNQOJZE0OnQpwtYLM";
function sbH(){return{"apikey":SB_KEY,"Authorization":"Bearer "+SB_KEY,"Content-Type":"application/json","Prefer":"return=representation"};}
function genToken(){var c="ABCDEFGHJKLMNPQRSTUVWXYZ23456789";var t="HAB-APR-";for(var i=0;i<6;i++)t+=c.charAt(Math.floor(Math.random()*c.length));return t;}

export default async function handler(req,res){
  res.setHeader("Access-Control-Allow-Origin","*");
  res.setHeader("Access-Control-Allow-Methods","GET,POST,PATCH,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers","Content-Type");
  if(req.method==="OPTIONS")return res.status(200).end();
  try{
    if(req.method==="GET"){
      var token=req.query.token||"";
      var hid=req.query.hiring_id||"";
      if(token){
        var r=await fetch(SB_URL+"/rest/v1/approvals?token=eq."+token,{headers:sbH()});
        var d=await r.json();
        if(d&&d.length>0){
          // Also fetch hiring data
          var r2=await fetch(SB_URL+"/rest/v1/hiring_processes?id=eq."+d[0].hiring_id,{headers:sbH()});
          var d2=await r2.json();
          // Fetch psicotecnico if exists
          var r3=await fetch(SB_URL+"/rest/v1/psicotecnico_results?hiring_id=eq."+d[0].hiring_id,{headers:sbH()});
          var d3=await r3.json();
          return res.status(200).json({ok:true,data:d[0],hiring:d2[0]||null,psicotecnico:d3[0]||null});
        }
        return res.status(404).json({ok:false,error:"Not found"});
      }
      if(hid){
        var r4=await fetch(SB_URL+"/rest/v1/approvals?hiring_id=eq."+hid+"&order=created_at.desc",{headers:sbH()});
        var d4=await r4.json();
        return res.status(200).json({ok:true,data:d4||[]});
      }
      return res.status(400).json({ok:false,error:"token or hiring_id required"});
    }
    if(req.method==="POST"){
      var b=req.body||{};
      var tk=genToken();
      var rec={hiring_id:b.hiring_id,tipo:b.tipo,aprobador_nombre:b.aprobador_nombre||"",aprobador_email:b.aprobador_email||"",token:tk};
      var r5=await fetch(SB_URL+"/rest/v1/approvals",{method:"POST",headers:sbH(),body:JSON.stringify(rec)});
      var d5=await r5.json();
      return res.status(200).json({ok:true,data:d5[0]||d5,link:"https://suite.habitaris.co/aprobar?token="+tk});
    }
    if(req.method==="PATCH"){
      var b=req.body||{};
      var token=b.token;
      if(!token)return res.status(400).json({ok:false,error:"token required"});
      var update={estado:b.estado,concepto:b.concepto||null,observaciones:b.observaciones||null,recomendaciones:b.recomendaciones||null,aprobado_at:new Date().toISOString()};
      var h=sbH();h["Prefer"]="return=representation";
      var r6=await fetch(SB_URL+"/rest/v1/approvals?token=eq."+token,{method:"PATCH",headers:h,body:JSON.stringify(update)});
      var d6=await r6.json();
      // Update hiring state if approved
      if(b.estado==="aprobado"||b.estado==="aprobado_con_observaciones"){
        var apr=d6[0]||d6;
        var nextState={psicotecnico:"examen_medico",examen_medico:"validacion_sst",sst:"revision_legal",legal:"firma_pendiente"};
        if(apr.hiring_id&&nextState[apr.tipo]){
          await fetch(SB_URL+"/rest/v1/hiring_processes?id=eq."+apr.hiring_id,{method:"PATCH",headers:h,body:JSON.stringify({estado:nextState[apr.tipo]})});
        }
      }
      return res.status(200).json({ok:true,data:d6[0]||d6});
    }
    return res.status(405).json({error:"Method not allowed"});
  }catch(e){return res.status(500).json({ok:false,error:e.message});}
}
