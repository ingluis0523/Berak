import os
import json
import urllib.request
import urllib.parse

def load_env():
    env = {}
    with open(".env.local", "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            parts = line.split("=", 1)
            if len(parts) == 2:
                key = parts[0].strip()
                val = parts[1].strip()
                if val.startswith('"') and val.endswith('"'):
                    val = val[1:-1]
                env[key] = val
    return env

def make_request(url, key, table, select="*"):
    req_url = f"{url}/rest/v1/{table}?select={urllib.parse.quote(select)}"
    req = urllib.request.Request(req_url)
    req.add_header("apikey", key)
    req.add_header("Authorization", f"Bearer {key}")
    with urllib.request.urlopen(req) as response:
        return json.loads(response.read().decode("utf-8"))

def main():
    env = load_env()
    url = env.get("NEXT_PUBLIC_SUPABASE_URL")
    key = env.get("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        print("Missing Supabase credentials in .env.local")
        return

    print("Fetching usuarios...")
    usuarios = make_request(url, key, "usuarios", "id,persona_id")
    user_to_persona = {u["id"]: u["persona_id"] for u in usuarios if u.get("id") and u.get("persona_id")}

    print("Fetching personas...")
    personas = make_request(url, key, "personas", "id,nombres,apellidos")
    persona_map = {p["id"]: f"{p['nombres']} {p['apellidos']}" for p in personas}

    from datetime import datetime, timedelta
    hace1m = datetime.utcnow() - timedelta(days=30)
    hace1m_str = hace1m.isoformat() + "Z"
    
    print(f"Fetching asistencias since {hace1m_str}...")
    # Filter by created_at >= hace1m
    asistencias = make_request(
        url, 
        key, 
        "asistencias", 
        select="registrado_por,evento_id,estado,created_at",
    )
    # Filter locally to be safe
    asistencias = [a for a in asistencias if a.get("created_at", "") >= hace1m_str]

    print(f"Total asistencias found: {len(asistencias)}")

    raw_counts = {}
    present_counts = {}
    unique_events = {}

    for a in asistencias:
        rep = a.get("registrado_por")
        if not rep:
            continue
        persona_id = user_to_persona.get(rep) or rep
        
        raw_counts[persona_id] = raw_counts.get(persona_id, 0) + 1
        
        if a.get("estado") == "asistio":
            present_counts[persona_id] = present_counts.get(persona_id, 0) + 1
            
        if persona_id not in unique_events:
            unique_events[persona_id] = set()
        unique_events[persona_id].add(a["evento_id"])

    print("\n--- RESULTS ---")
    for pid, ev_set in unique_events.items():
        name = persona_map.get(pid, f"ID: {pid}")
        print(f"Líder: {name}")
        print(f"  - Cantidad de personas registradas (total rows): {raw_counts[pid]}")
        print(f"  - Cantidad de personas PRESENTES (estado = asistio): {present_counts.get(pid, 0)}")
        print(f"  - Cantidad de veces que registra información (eventos únicos): {len(ev_set)}")

    print("\n--- TARGET PERSONAS SEARCH ---")
    for pid, name in persona_map.items():
        if "andres" in name.lower() or "ortiz" in name.lower() or "hooz" in name.lower() or "hoz" in name.lower() or "ivan" in name.lower():
            print(f"  Found target: id={pid}, name={name}")
            # find if linked in usuarios
            linked = [u for u in usuarios if u.get("persona_id") == pid]
            print(f"    Linked in usuarios: {linked}")

    print("\n--- RESULTS ---")
    for pid, ev_set in unique_events.items():
        name = persona_map.get(pid, f"ID: {pid}")
        print(f"Líder: {name}")
        print(f"  - Cantidad de personas registradas (registros totales de asistencia): {raw_counts[pid]}")
        print(f"  - Cantidad de veces que registra información (eventos únicos): {len(ev_set)}")

if __name__ == "__main__":
    main()
