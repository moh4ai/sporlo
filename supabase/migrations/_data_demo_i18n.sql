-- One-shot demo-data update: Arabic labels for category, size, color across
-- the demo-club tenant. Idempotent — re-running just overwrites with the
-- same values. NOT a numbered migration because it's tenant-scoped.

do $$
declare
  v_org uuid;
begin
  v_org := (select id from public.organizations where slug = 'demo-club');
  if v_org is null then
    raise notice 'demo-club not found, skipping';
    return;
  end if;

  -- Product categories
  update public.products
     set category_ar = case category
                        when 'Apparel' then 'الملابس'
                        when 'Accessories' then 'الإكسسوارات'
                        else category_ar
                       end,
         category_en = coalesce(category_en, category)
   where org_id = v_org;

  -- Variant size: keep canonical (S/M/L/XL) — both languages just localize
  -- the displayed label. Arabic uses the same letters for tees + a localized
  -- "مقاس واحد" (one size) for the null-size accessories.
  update public.product_variants v
     set size_ar = case
                     when v.size in ('S', 'M', 'L', 'XL') then v.size
                     else v.size_ar
                   end,
         size_en = coalesce(v.size_en, v.size)
   where v.org_id = v_org;

  -- Variant colours — Saudi clubs are green-on-green-on-green.
  update public.product_variants v
     set color_ar = case v.color
                      when 'Green' then 'أخضر'
                      when 'Black' then 'أسود'
                      when 'White' then 'أبيض'
                      when 'Red' then 'أحمر'
                      else v.color_ar
                    end,
         color_en = coalesce(v.color_en, v.color)
   where v.org_id = v_org;

  raise notice 'Demo i18n labels populated';
end;
$$;
