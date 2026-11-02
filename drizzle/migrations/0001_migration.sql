create policy "admin manage player photos" on storage.objects for all to authenticated
  using (bucket_id = 'player-photos' and public.has_role(auth.uid(), 'admin'))
  with check (bucket_id = 'player-photos' and public.has_role(auth.uid(), 'admin'));