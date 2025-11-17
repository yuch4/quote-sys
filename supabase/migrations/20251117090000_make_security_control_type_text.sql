-- Allow arbitrary control type names for security controls
ALTER TABLE public.company_security_controls
  ALTER COLUMN control_type TYPE text
  USING control_type::text;

DROP TYPE IF EXISTS public.security_control_type;
