CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY,
  display_name text NOT NULL DEFAULT '',
  identity_verified boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile read" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "own profile insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email,'@',1)))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.gen_agent_public_id() RETURNS text LANGUAGE plpgsql AS $$
DECLARE chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; s text := ''; i int;
BEGIN
  FOR i IN 1..12 LOOP
    s := s || substr(chars, 1 + floor(random()*length(chars))::int, 1);
    IF i IN (4,8) THEN s := s || '-'; END IF;
  END LOOP;
  RETURN 'inf_' || s;
END $$;

CREATE TABLE public.agents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  public_id text NOT NULL UNIQUE DEFAULT public.gen_agent_public_id(),
  owner_id uuid NOT NULL DEFAULT auth.uid(),
  name text NOT NULL,
  source text NOT NULL,
  status text NOT NULL DEFAULT 'valid' CHECK (status IN ('valid','frozen')),
  public_key text NOT NULL,
  permissions text[] NOT NULL DEFAULT '{}',
  monthly_spend_limit integer NOT NULL DEFAULT 0,
  approval_above integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT now() + interval '6 months'
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.agents TO authenticated;
GRANT ALL ON public.agents TO service_role;
ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner read agents" ON public.agents FOR SELECT TO authenticated USING (auth.uid() = owner_id);
CREATE POLICY "owner insert agents" ON public.agents FOR INSERT TO authenticated WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "owner update agents" ON public.agents FOR UPDATE TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "owner delete agents" ON public.agents FOR DELETE TO authenticated USING (auth.uid() = owner_id);

CREATE TABLE public.agent_events (
  id bigserial PRIMARY KEY,
  agent_id uuid NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  kind text NOT NULL,
  detail text NOT NULL DEFAULT '',
  prev_hash text NOT NULL DEFAULT '',
  hash text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.agent_events TO authenticated;
GRANT ALL ON public.agent_events TO service_role;
ALTER TABLE public.agent_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner read events" ON public.agent_events FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.agents a WHERE a.id = agent_id AND a.owner_id = auth.uid()));

CREATE OR REPLACE FUNCTION public.chain_event() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE last text;
BEGIN
  SELECT hash INTO last FROM public.agent_events WHERE agent_id = NEW.agent_id ORDER BY id DESC LIMIT 1;
  NEW.prev_hash := COALESCE(last, 'genesis');
  NEW.hash := encode(extensions.digest(NEW.prev_hash || '|' || NEW.agent_id::text || '|' || NEW.kind || '|' || NEW.detail || '|' || NEW.created_at::text, 'sha256'), 'hex');
  RETURN NEW;
END $$;
CREATE TRIGGER agent_events_chain BEFORE INSERT ON public.agent_events FOR EACH ROW EXECUTE FUNCTION public.chain_event();

CREATE OR REPLACE FUNCTION public.log_agent_change() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.agent_events(agent_id, kind, detail) VALUES (NEW.id, 'issued', 'Agent ID ' || NEW.public_id || ' issued, public key registered');
  ELSIF NEW.status <> OLD.status THEN
    INSERT INTO public.agent_events(agent_id, kind, detail) VALUES (NEW.id, CASE WHEN NEW.status='frozen' THEN 'frozen' ELSE 'unfrozen' END, 'Owner set status to ' || NEW.status);
  ELSIF NEW.permissions IS DISTINCT FROM OLD.permissions OR NEW.monthly_spend_limit <> OLD.monthly_spend_limit OR NEW.approval_above <> OLD.approval_above THEN
    INSERT INTO public.agent_events(agent_id, kind, detail) VALUES (NEW.id, 'limits', 'Owner updated limits');
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER agents_log AFTER INSERT OR UPDATE ON public.agents FOR EACH ROW EXECUTE FUNCTION public.log_agent_change();

CREATE OR REPLACE FUNCTION public.verify_agent(_public_id text)
RETURNS TABLE(public_id text, name text, source text, status text, owner_name text, owner_verified boolean,
  permissions text[], monthly_spend_limit int, approval_above int, public_key text, created_at timestamptz, expires_at timestamptz, last_hash text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT a.public_id, a.name, a.source, a.status, p.display_name, p.identity_verified,
    a.permissions, a.monthly_spend_limit, a.approval_above, a.public_key, a.created_at, a.expires_at,
    (SELECT e.hash FROM public.agent_events e WHERE e.agent_id = a.id ORDER BY e.id DESC LIMIT 1)
  FROM public.agents a LEFT JOIN public.profiles p ON p.id = a.owner_id
  WHERE a.public_id = _public_id
$$;
REVOKE ALL ON FUNCTION public.verify_agent(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.verify_agent(text) TO anon, authenticated;