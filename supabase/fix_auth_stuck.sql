-- ─── Fix: limpiar tablas auth huérfanas después de reset incompleto ──────────
-- Ejecutar cuando Supabase no deja crear usuarios ("Database error checking email")

DELETE FROM auth.mfa_challenges;
DELETE FROM auth.mfa_factors;
DELETE FROM auth.sessions;
DELETE FROM auth.refresh_tokens;
DELETE FROM auth.flow_state;
DELETE FROM auth.one_time_tokens;
DELETE FROM auth.saml_relay_states;
DELETE FROM auth.identities;
DELETE FROM auth.audit_log_entries;
DELETE FROM auth.users;
