-- Storage bucket for generated quote documents
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'documents'
  ) THEN
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('documents', 'documents', true);
  END IF;
END;
$$;

-- Remove existing policies to allow re-run
DROP POLICY IF EXISTS "documents_read" ON storage.objects;
DROP POLICY IF EXISTS "documents_upload" ON storage.objects;
DROP POLICY IF EXISTS "documents_update" ON storage.objects;
DROP POLICY IF EXISTS "documents_delete" ON storage.objects;

CREATE POLICY "documents_read" ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'documents'
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "documents_upload" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'documents'
    AND auth.role() = 'authenticated'
    AND auth.uid() = owner
  );

CREATE POLICY "documents_update" ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'documents'
    AND auth.uid() = owner
  )
  WITH CHECK (
    bucket_id = 'documents'
    AND auth.uid() = owner
  );

CREATE POLICY "documents_delete" ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'documents'
    AND auth.uid() = owner
  );
