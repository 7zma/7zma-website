begin;
select plan(7);

select ok(
  (select relrowsecurity from pg_class where oid = 'public.products'::regclass),
  'products table has row level security'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.orders'::regclass),
  'orders table has row level security'
);
select ok(
  not has_table_privilege('anon', 'public.orders', 'select'),
  'anonymous users cannot read base orders'
);
select ok(
  not has_table_privilege('anon', 'public.stock_items', 'select'),
  'anonymous users cannot read inventory secrets'
);
select ok(
  has_table_privilege('anon', 'public.public_products', 'select'),
  'anonymous users can read the public catalog view'
);
select ok(
  not has_function_privilege('anon', 'public.create_order(text,text,text,text,jsonb,text,uuid,uuid)', 'execute'),
  'anonymous users cannot call the privileged order writer'
);
select ok(
  not has_function_privilege('anon', 'public.track_order(text,text)', 'execute'),
  'anonymous users cannot query order tracking without server validation'
);

select * from finish();
rollback;
