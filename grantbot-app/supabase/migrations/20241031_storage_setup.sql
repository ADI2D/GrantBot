-- ============================================================================
-- STORAGE SETUP FOR DOCUMENT UPLOADS
-- ============================================================================
-- Creates a Supabase Storage bucket for organization documents
-- Run this after applying all previous migrations
-- ============================================================================

-- Create the storage bucket for organization documents
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'org-documents',
  'org-documents',
  false, -- private bucket, requires auth
  52428800, -- 50MB max file size
  array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/jpeg',
    'image/png',
    'image/gif',
    'text/csv',
    'text/plain'
  ]
)
on conflict (id) do nothing;

-- Storage policies: users can only access files for their organizations
create policy "Users can upload files to their org folder"
  on storage.objects for insert
  with check (
    bucket_id = 'org-documents' and
    auth.uid() in (
      select user_id from public.org_members
      where organization_id::text = (storage.foldername(name))[1]
    )
  );

create policy "Users can view files in their org folder"
  on storage.objects for select
  using (
    bucket_id = 'org-documents' and
    auth.uid() in (
      select user_id from public.org_members
      where organization_id::text = (storage.foldername(name))[1]
    )
  );

create policy "Users can update files in their org folder"
  on storage.objects for update
  using (
    bucket_id = 'org-documents' and
    auth.uid() in (
      select user_id from public.org_members
      where organization_id::text = (storage.foldername(name))[1]
    )
  );

create policy "Users can delete files in their org folder"
  on storage.objects for delete
  using (
    bucket_id = 'org-documents' and
    auth.uid() in (
      select user_id from public.org_members
      where organization_id::text = (storage.foldername(name))[1]
    )
  );

-- Add a helper function to get file URL
create or replace function public.get_document_url(org_id uuid, file_path text)
returns text
language plpgsql
security definer
as $$
declare
  bucket_name text := 'org-documents';
  full_path text;
begin
  full_path := org_id::text || '/' || file_path;
  return bucket_name || '/' || full_path;
end;
$$;

-- ============================================================================
-- STORAGE BUCKET READY
-- ============================================================================
-- File structure: org-documents/{org_id}/{filename}
-- Example: org-documents/8d8d0b4b-8fdc-4d27-92d8-0f4d31e6a001/990-fy23.pdf
-- ============================================================================
