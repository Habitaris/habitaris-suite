const SB_URL = "https://xlzkasdskatnikuavefh.supabase.co";
const SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhsemthc2Rza2F0bmlrdWF2ZWZoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE4OTE3NzQsImV4cCI6MjA4NzQ2Nzc3NH0.SR9tIpvL0YnV9CNrRq4T-xetifuNQOJZE0OnQpwtYLM";

function sbH(){return{"apikey":SB_KEY,"Authorization":"Bearer "+SB_KEY,"Content-Type":"application/json","Prefer":"return=representation"};}
function genToken(){var c="ABCDEFGHJKLMNPQRSTUVWXYZ23456789";var t="";for(var i=0;i<8;i++)t+=c.charAt(Math.floor(Math.random()*c.length));return t;}

export default async function handler(req,res){
  res.setHeader("Access-Control-Allow-Origin","*");
  res.setHeader("Access-Control-Allow-Methods","GET,POST,PATCH,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers","Content-Type");
  if(req.method==="OPTIONS")return res.status(200).end();

  try{
    // GET - by token or list
    if(req.method==="GET"){
      // KV store operations (nomina)
      var kv=req.query.kv||"";
      if(kv){
        var kvKey="hab:"+kv+":"+(req.query.anio||"2026")+":"+(req.query.mes||"0");
        var rk=await fetch(SB_URL+"/rest/v1/kv_store?key=eq."+kvKey+"&select=value",{headers:sbH()});
        var dk=await rk.json();
        if(Array.isArray(dk)&&dk.length>0&&dk[0].value)return res.json({ok:true,data:JSON.parse(dk[0].value)});
        return res.json({ok:true,data:[]});
      }

      var tp=req.query.token_propuesta||"";
      var td=req.query.token_datos||"";
      var estado=req.query.estado||"";
      var id=req.query.id||"";

      if(tp){
        var r=await fetch(SB_URL+"/rest/v1/hiring_processes?token_propuesta=eq."+tp,{headers:sbH()});
        var d=await r.json();
        if(d&&d.length>0)return res.status(200).json({ok:true,data:d[0]});
        return res.status(404).json({ok:false,error:"Not found"});
      }
      if(td){
        var r2=await fetch(SB_URL+"/rest/v1/hiring_processes?token_datos=eq."+td,{headers:sbH()});
        var d2=await r2.json();
        if(d2&&d2.length>0)return res.status(200).json({ok:true,data:d2[0]});
        return res.status(404).json({ok:false,error:"Not found"});
      }
      if(id){
        var r3=await fetch(SB_URL+"/rest/v1/hiring_processes?id=eq."+id,{headers:sbH()});
        var d3=await r3.json();
        if(d3&&d3.length>0)return res.status(200).json({ok:true,data:d3[0]});
        return res.status(404).json({ok:false,error:"Not found"});
      }
      var params="order=created_at.desc";
      if(estado)params+="&estado=eq."+estado;
      var r4=await fetch(SB_URL+"/rest/v1/hiring_processes?"+params,{headers:sbH()});
      var d4=await r4.json();
      return res.status(200).json({ok:true,data:d4||[]});
    }

    // POST - create new hiring process or delete
    if(req.method==="POST"){
      var b=req.body||{};

      // KV store save (nomina)
      if(req.query.kv){
        var kvKey="hab:"+req.query.kv+":"+(req.query.anio||"2026")+":"+(req.query.mes||"0");
        var val=JSON.stringify(b.data);
        // Try PATCH first
        var rp=await fetch(SB_URL+"/rest/v1/kv_store?key=eq."+kvKey,{method:"PATCH",headers:{...sbH(),Prefer:"return=minimal"},body:JSON.stringify({value:val})});
        // If no rows matched, insert
        if(rp.status===204||rp.status===200){
          var chk=await fetch(SB_URL+"/rest/v1/kv_store?key=eq."+kvKey+"&select=key",{headers:sbH()});
          var chkd=await chk.json();
          if(!Array.isArray(chkd)||chkd.length===0){
            await fetch(SB_URL+"/rest/v1/kv_store",{method:"POST",headers:sbH(),body:JSON.stringify({key:kvKey,value:val,tenant_id:"habitaris"})});
          }
        }
        return res.json({ok:true});
      }

      // Delete action — cascade: psicotecnico_results → hiring_processes
      if(b.action==="delete"&&b.id){
        await fetch(SB_URL+"/rest/v1/psicotecnico_results?hiring_id=eq."+b.id,{method:"DELETE",headers:sbH()});
        var rd=await fetch(SB_URL+"/rest/v1/hiring_processes?id=eq."+b.id,{method:"DELETE",headers:sbH()});
        if(rd.ok)return res.status(200).json({ok:true});
        var dd=await rd.text();
        return res.status(rd.status).json({ok:false,error:dd||"Delete failed"});
      }

      // Generate consecutive code
      var r5=await fetch(SB_URL+"/rest/v1/hiring_processes?select=codigo&order=created_at.desc&limit=1",{headers:sbH()});
      var d5=await r5.json();
      var lastNum=0;
      if(d5&&d5.length>0&&d5[0].codigo){var m=d5[0].codigo.match(/(\d+)$/);if(m)lastNum=parseInt(m[1]);}
      var year=new Date().getFullYear();
      var newCode="HAB-PROP-"+year+"-"+String(lastNum+1).padStart(3,"0");

      var rec={
        codigo:newCode,estado:b.inicio_manual?b.estado_inicial||"aceptada":"propuesta",
        cargo:b.cargo||"",descriptor_codigo:b.descriptor_codigo||null,
        area:b.area||"",nivel:b.nivel||"",
        salario_neto:b.salario_neto||0,salario_base:b.salario_base||0,
        auxilio_transporte:b.auxilio_transporte||0,bono_no_salarial:b.bono_no_salarial||0,
        bono_concepto:b.bono_concepto||null,bono_es_salarial:b.bono_es_salarial||false,
        jornada_horas:b.jornada_horas||0,horario:b.horario||"",
        dias_laborales:b.dias_laborales||"",tipo_contrato:b.tipo_contrato||"fijo",
        duracion_meses:b.duracion_meses||0,ciudad:b.ciudad||"Bogota D.C.",
        fecha_inicio:b.fecha_inicio||null,periodo_prueba:b.periodo_prueba||"",
        regimen_salud:b.regimen_salud||"contributivo",arl_nivel:b.arl_nivel||0,
        candidato_nombre:b.candidato_nombre||null,candidato_email:b.candidato_email||null,
        candidato_cc:b.candidato_cc||null,candidato_celular:b.candidato_celular||null,
        candidato_eps:b.candidato_eps||null,candidato_pension:b.candidato_pension||null,
        token_propuesta:genToken(),token_datos:genToken(),
        creado_por:b.creado_por||"admin",
      };
      // Add JSONB fields if provided (require column in Supabase)
      if(b._condiciones)rec._condiciones=b._condiciones;
      if(b._expediente)rec._expediente=b._expediente;
      if(b._docs_requeridos)rec._docs_requeridos=b._docs_requeridos;
      var r6=await fetch(SB_URL+"/rest/v1/hiring_processes",{method:"POST",headers:sbH(),body:JSON.stringify(rec)});
      var d6=await r6.json();
      if(!r6.ok)return res.status(r6.status).json({ok:false,error:d6.message||"Insert failed"});
      var created=d6[0]||d6;
      return res.status(200).json({ok:true,data:created,
        links:{
          propuesta:"https://suite.habitaris.co/propuesta?token="+rec.token_propuesta,
          datos:"https://suite.habitaris.co/contratacion?token="+rec.token_datos
        }
      });
    }

    // PATCH - update
    if(req.method==="PATCH"){
      var b=req.body||{};
      var id=b.id;
      if(!id)return res.status(400).json({ok:false,error:"id required"});
      delete b.id;
      var h=sbH();h["Prefer"]="return=representation";
      var r7=await fetch(SB_URL+"/rest/v1/hiring_processes?id=eq."+id,{method:"PATCH",headers:h,body:JSON.stringify(b)});
      var d7=await r7.json();
      if(r7.ok)return res.status(200).json({ok:true,data:d7[0]||d7});
      return res.status(r7.status).json({ok:false,error:d7.message||"Update failed"});
    }

    // DELETE
    if(req.method==="DELETE"){
      var did=req.query.id||req.body?.id||"";
      if(!did)return res.status(400).json({ok:false,error:"id required"});
      var r8=await fetch(SB_URL+"/rest/v1/hiring_processes?id=eq."+did,{method:"DELETE",headers:sbH()});
      if(r8.ok)return res.status(200).json({ok:true});
      return res.status(r8.status).json({ok:false,error:"Delete failed"});
    }

    return res.status(405).json({error:"Method not allowed"});
  }catch(err){
    return res.status(500).json({ok:false,error:err.message});
  }
}
