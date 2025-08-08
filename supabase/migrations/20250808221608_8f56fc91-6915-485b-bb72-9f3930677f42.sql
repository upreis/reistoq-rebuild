-- Add segmentation and org scoping to announcements
-- 1) New columns
ALTER TABLE public.announcements
  ADD COLUMN IF NOT EXISTS organization_id uuid,
  ADD COLUMN IF NOT EXISTS target_routes text[],
  ADD COLUMN IF NOT EXISTS target_roles uuid[],
  ADD COLUMN IF NOT EXISTS target_users uuid[];

-- 2) Index for performance
CREATE INDEX IF NOT EXISTS idx_announcements_org ON public.announcements(organization_id);

-- 3) Org auto-assignment trigger
CREATE OR REPLACE FUNCTION public.set_announcement_org()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.organization_id IS NULL THEN
    NEW.organization_id = public.get_current_org_id();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_announcement_org ON public.announcements;
CREATE TRIGGER trg_set_announcement_org
BEFORE INSERT ON public.announcements
FOR EACH ROW
EXECUTE FUNCTION public.set_announcement_org();

-- 4) Audience helper function for RLS
CREATE OR REPLACE FUNCTION public.user_matches_announcement(_target_users uuid[], _target_roles uuid[])
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  WITH role_match AS (
    SELECT EXISTS (
      SELECT 1
      FROM public.user_role_assignments ura
      WHERE ura.user_id = auth.uid()
        AND (_target_roles IS NOT NULL AND array_length(_target_roles,1) IS NOT NULL)
        AND ura.role_id = ANY(_target_roles)
    ) AS ok
  )
  SELECT (
    -- No targets defined: visible to all users in org
    (_target_users IS NULL OR array_length(_target_users,1) IS NULL)
    AND (_target_roles IS NULL OR array_length(_target_roles,1) IS NULL)
  )
  OR (
    -- Explicit user match
    _target_users IS NOT NULL AND array_length(_target_users,1) IS NOT NULL AND auth.uid() = ANY(_target_users)
  )
  OR (
    -- Role match
    (SELECT ok FROM role_match)
  );
$$;

-- 5) RLS policies: tighten and org-scope
DROP POLICY IF EXISTS "Admins can manage announcements" ON public.announcements;
DROP POLICY IF EXISTS "Users can view active announcements" ON public.announcements;

-- Management by admins with permission in their org
CREATE POLICY "Admins can insert announcements in org"
ON public.announcements
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_permission('system:announce')
  AND organization_id = public.get_current_org_id()
);

CREATE POLICY "Admins can update announcements in org"
ON public.announcements
FOR UPDATE
TO authenticated
USING (
  public.has_permission('system:announce')
  AND organization_id = public.get_current_org_id()
)
WITH CHECK (
  public.has_permission('system:announce')
  AND organization_id = public.get_current_org_id()
);

CREATE POLICY "Admins can delete announcements in org"
ON public.announcements
FOR DELETE
TO authenticated
USING (
  public.has_permission('system:announce')
  AND organization_id = public.get_current_org_id()
);

-- Read policy with org + active + expiry + audience
CREATE POLICY "Users can view active announcements in org with audience"
ON public.announcements
FOR SELECT
TO authenticated
USING (
  organization_id = public.get_current_org_id()
  AND active = true
  AND (expires_at IS NULL OR expires_at > now())
  AND public.user_matches_announcement(target_users, target_roles)
);