const SB_URL = "https://xlzkasdskatnikuavefh.supabase.co";
const SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhsemthc2Rzc2thdG5pa3VhdmVmaCIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNzQwMTUyOTk3LCJleHAiOjIwNTU3Mjg5OTd9.DP5x1hNbnTSzIFRMFOG7tYbykaAJMc6BRXYC_dFNFgE";
function sbH(){return{"apikey":SB_KEY,"Authorization":"Bearer "+SB_KEY,"Content-Type":"application/json","Prefer":"return=representation"};}

export default async function handler(req,res){
  res.setHeader("Access-Control-Allow-Origin","*");
  res.setHeader("Access-Control-Allow-Methods","GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers","Content-Type");
  if(req.method==="OPTIONS")return res.status(200).end();
  try{
    if(req.method==="GET"){
      var hid=req.query.hiring_id||"";
      var id=req.query.id||"";
      if(id){var r=await fetch(SB_URL+"/rest/v1/psicotecnico_results?id=eq."+id,{headers:sbH()});var d=await r.json();return res.status(200).json({ok:true,data:d[0]||null});}
      var tpl=req.query.template||"";
      if(tpl){var rt=await fetch(SB_URL+"/rest/v1/psicotecnico_templates?id=eq."+tpl,{headers:sbH()});var dt=await rt.json();if(dt&&dt.length>0)return res.status(200).json({ok:true,template:dt[0]});return res.status(404).json({ok:false,error:"Template not found"});}
      if(hid){var tplFilter=req.query.template?"&template_id=eq."+req.query.template:"";var r2=await fetch(SB_URL+"/rest/v1/psicotecnico_results?hiring_id=eq."+hid+tplFilter,{headers:sbH()});var d2=await r2.json();return res.status(200).json({ok:true,data:d2[0]||null});}
      return res.status(400).json({ok:false,error:"hiring_id or id required"});
    }
    if(req.method==="POST"){
      var b=req.body||{};
      var r3=await fetch(SB_URL+"/rest/v1/psicotecnico_results",{method:"POST",headers:sbH(),body:JSON.stringify(b)});
      var d3=await r3.json();
      // Update hiring process state
      if(b.hiring_id){
        var h=sbH();h["Prefer"]="return=representation";
        await fetch(SB_URL+"/rest/v1/hiring_processes?id=eq."+b.hiring_id,{method:"PATCH",headers:h,body:JSON.stringify({estado:b.apto?"examen_medico":"datos_recibidos"})});
      }
      return res.status(200).json({ok:true,data:d3[0]||d3});
    }
    return res.status(405).json({error:"Method not allowed"});
  }catch(e){return res.status(500).json({ok:false,error:e.message});}
}
