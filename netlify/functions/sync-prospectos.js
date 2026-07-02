/* sync-prospectos.js - Netlify Function
   SYNC offline-first: recebe TODOS os prospectos locais do lojista e
   devolve o estado completo do servidor. Resolve conflitos por atualizado_em.
   Auth: ADMIN_TOKEN (workspace_id). */
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const ADMIN_TOKEN = process.env.ADMIN_TOKEN;
const CORS = {
  "Access-Control-Allow-Origin":"*",
  "Access-Control-Allow-Methods":"POST, OPTIONS",
  "Access-Control-Allow-Headers":"Content-Type, Authorization",
  "Content-Type":"application/json"
};
exports.handler = async (event) => {
  if(event.httpMethod === "OPTIONS") return { statusCode:204, headers:CORS, body:"" };
  if(event.httpMethod !== "POST") return { statusCode:405, headers:CORS, body:JSON.stringify({erro:"Use POST"}) };

  const auth = event.headers["authorization"]||"";
  const token = auth.replace(/^Bearer\s+/i,"");
  if(!ADMIN_TOKEN || token !== ADMIN_TOKEN)
    return { statusCode:401, headers:CORS, body:JSON.stringify({erro:"nao autorizado"}) };
  if(!SUPABASE_URL || !SUPABASE_SERVICE_KEY)
    return { statusCode:500, headers:CORS, body:JSON.stringify({erro:"servidor mal configurado"}) };

  let b;
  try { b = JSON.parse(event.body||"{}"); } catch(e){ return { statusCode:400, headers:CORS, body:JSON.stringify({erro:"JSON invalido"}) }; }
  const locais = Array.isArray(b.prospectos) ? b.prospectos : [];
  const receita = Number(b.receita) || 0;
  const diasCompletos = Array.isArray(b.dias_completos) ? b.dias_completos : [];
  const headers = { "apikey":SUPABASE_SERVICE_KEY, "Authorization":"Bearer "+SUPABASE_SERVICE_KEY, "Content-Type":"application/json" };

  try {
    // 1) UPSERT dos prospectos locais no servidor
    for(const p of locais){
      const row = {
        id: Number(p.id), workspace_id: token,
        nome: String(p.name||p.nome||"").slice(0,200),
        telefone: String(p.phone||p.telefone||"").slice(0,40),
        nicho: String(p.niche||p.nicho||"").slice(0,40),
        notas: String(p.notes||p.notas||"").slice(0,1000),
        status: String(p.status||"new").slice(0,20),
        valor: Number(p.value||p.valor||0),
        data: String(p.date||p.data||"").slice(0,20),
        atualizado_em: p.atualizado_em || new Date().toISOString()
      };
      await fetch(SUPABASE_URL+"/rest/v1/prospectos?id=eq."+row.id, {
        method:"PATCH", headers:{...headers, "Prefer":"return=minimal"},
        body: JSON.stringify(row)
      });
      // se nao existia (0 linhas afetadas), faz INSERT
      const check = await fetch(SUPABASE_URL+"/rest/v1/prospectos?select=id&id=eq."+row.id, {headers});
      const existing = await check.json();
      if(!existing.length){
        await fetch(SUPABASE_URL+"/rest/v1/prospectos", {
          method:"POST", headers:{...headers, "Prefer":"return=minimal"},
          body: JSON.stringify({...row, criado_em: new Date().toISOString()})
        });
      }
    }

    // 2) UPSERT meta (receita + dias completos)
    await fetch(SUPABASE_URL+"/rest/v1/workspace_meta?workspace_id=eq."+token, {
      method:"PATCH", headers:{...headers, "Prefer":"return=minimal"},
      body: JSON.stringify({ receita, dias_completos: JSON.stringify(diasCompletos), atualizado_em: new Date().toISOString() })
    });
    const metaCheck = await fetch(SUPABASE_URL+"/rest/v1/workspace_meta?workspace_id=eq."+token, {headers});
    if(!(await metaCheck.json()).length){
      await fetch(SUPABASE_URL+"/rest/v1/workspace_meta", {
        method:"POST", headers:{...headers, "Prefer":"return=minimal"},
        body: JSON.stringify({ workspace_id: token, receita, dias_completos: JSON.stringify(diasCompletos) })
      });
    }

    // 3) DEVOLVE o estado completo (pull)
    const resp = await fetch(SUPABASE_URL+"/rest/v1/prospectos?workspace_id=eq."+token+"&excluida_em=is.null&order=criado_em.desc&limit=5000", {headers});
    const todos = await resp.json();
    const metaResp = await fetch(SUPABASE_URL+"/rest/v1/workspace_meta?workspace_id=eq."+token, {headers});
    const meta = (await metaResp.json())[0] || {};

    return { statusCode:200, headers:CORS, body: JSON.stringify({
      ok:true,
      prospectos: todos,
      receita: Number(meta.receita)||0,
      dias_completos: Array.isArray(meta.dias_completos) ? meta.dias_completos : [],
      sincronizado_em: new Date().toISOString()
    })};
  } catch(e){
    console.error(e);
    return { statusCode:500, headers:CORS, body:JSON.stringify({erro:"erro interno"}) };
  }
};
