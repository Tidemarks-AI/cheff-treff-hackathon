-- Allow authenticated users full access to all tables
-- For hackathon simplicity, all authenticated users can read/write everything

create policy "Authenticated users can read companies"
  on public.companies for select to authenticated using (true);

create policy "Authenticated users can read people"
  on public.people for select to authenticated using (true);

create policy "Authenticated users can read company_members"
  on public.company_members for select to authenticated using (true);

create policy "Authenticated users can read cost_centers"
  on public.cost_centers for select to authenticated using (true);

create policy "Authenticated users can read fixed_costs"
  on public.fixed_costs for select to authenticated using (true);

create policy "Authenticated users can read budget_lines"
  on public.budget_lines for select to authenticated using (true);

create policy "Authenticated users can read actuals"
  on public.actuals for select to authenticated using (true);

create policy "Authenticated users can insert actuals"
  on public.actuals for insert to authenticated with check (true);

create policy "Authenticated users can read variances"
  on public.variances for select to authenticated using (true);

create policy "Authenticated users can update variances"
  on public.variances for update to authenticated using (true);

create policy "Authenticated users can insert variances"
  on public.variances for insert to authenticated with check (true);
