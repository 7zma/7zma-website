begin;

insert into public.currencies(code, symbol_ar, symbol_en, decimals, is_active, sort_order)
values ('USD', '$', '$', 2, false, 0)
on conflict (code) do nothing;

insert into public.categories(id, slug, name_ar, name_en, icon_key, accent_color, sort_order, is_active)
values
  ('10000000-0000-4000-8000-000000000001', 'playstation', 'بلايستيشن', 'PlayStation', 'gamepad', '#78B4FF', 1, true),
  ('10000000-0000-4000-8000-000000000002', 'xbox', 'إكس بوكس', 'Xbox', 'controller', '#5D91EF', 2, true),
  ('10000000-0000-4000-8000-000000000003', 'pc-steam', 'بي سي وستيم', 'PC / Steam', 'monitor', '#6EA5FF', 3, true),
  ('10000000-0000-4000-8000-000000000004', 'passes', 'اشتراكات', 'Game passes', 'sparkles', '#8BB9F5', 4, true),
  ('10000000-0000-4000-8000-000000000005', 'gift-cards', 'بطاقات هدايا', 'Gift cards', 'gift', '#A4C8F7', 5, true)
on conflict (slug) do nothing;

insert into public.products(
  id, category_id, slug, name_ar, name_en, tagline_ar, tagline_en, description_ar, description_en,
  platform, delivery_type, delivery_description_ar, delivery_description_en, region, edition,
  is_preorder, release_date, cover_url, label_color, label_preset, badge_ar, badge_en, tags,
  is_featured, is_active, sort_order, stock_mode, manual_stock, tax_mode
)
values
  ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'sample-playstation-title',
   'عنوان تجريبي للبلايستيشن', 'Sample PlayStation Title', 'عينة قابلة للتعديل', 'Editable sample entry',
   'محتوى تجريبي للمراجعة والاستبدال قبل النشر.', 'Sample content to review and replace before launch.',
   'ps5', 'key', 'وصف تجريبي لما سيستلمه العميل. استبدله بتفاصيل المنتج الفعلية قبل التفعيل.',
   'Sample description of what the customer receives. Replace with the real product details before activation.',
   null, null, false, null, null, '#4F8FFF', 'rare', 'عينة', 'Sample', array['sample','playstation'], true, true, 1, 'manual', 0, 'inherit'),
  ('20000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', 'sample-preorder-title',
   'عنوان تجريبي للطلب المسبق', 'Sample Pre-order Title', 'عينة قابلة للتعديل', 'Editable sample entry',
   'محتوى تجريبي للمراجعة والاستبدال قبل النشر.', 'Sample content to review and replace before launch.',
   'ps5', 'key', 'وصف تجريبي لما سيستلمه العميل. استبدله بتفاصيل المنتج الفعلية قبل التفعيل.',
   'Sample description of what the customer receives. Replace with the real product details before activation.',
   null, null, true, '2099-01-01 00:00:00+00', null, '#347CF5', 'epic', 'عينة', 'Sample', array['sample','preorder'], false, false, 2, 'manual', 0, 'inherit'),
  ('20000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000003', 'sample-pc-title',
   'اختيار تجريبي للكمبيوتر', 'Sample PC Title', 'عينة قابلة للتعديل', 'Editable sample entry',
   'محتوى تجريبي للمراجعة والاستبدال قبل النشر.', 'Sample content to review and replace before launch.',
   'pc_steam', 'key', 'وصف تجريبي لما سيستلمه العميل. استبدله بتفاصيل المنتج الفعلية قبل التفعيل.',
   'Sample description of what the customer receives. Replace with the real product details before activation.',
   null, null, false, null, null, '#5C9AFF', 'common', 'عينة', 'Sample', array['sample','steam'], true, true, 3, 'manual', 0, 'inherit'),
  ('20000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000004', 'sample-game-pass',
   'اشتراك تجريبي', 'Sample Game Pass', 'عينة قابلة للتعديل', 'Editable sample entry',
   'محتوى تجريبي للمراجعة والاستبدال قبل النشر.', 'Sample content to review and replace before launch.',
   'xbox_series', 'subscription', 'وصف تجريبي لما سيستلمه العميل. استبدله بتفاصيل المنتج الفعلية قبل التفعيل.',
   'Sample description of what the customer receives. Replace with the real product details before activation.',
   null, null, false, null, null, '#86B9FF', 'custom', 'عينة', 'Sample', array['sample','subscription'], false, true, 4, 'manual', 0, 'inherit')
on conflict (slug) do nothing;

insert into public.product_prices(product_id, currency_code, price_minor, compare_at_price_minor)
values
  ('20000000-0000-4000-8000-000000000001', 'USD', 5999, null),
  ('20000000-0000-4000-8000-000000000002', 'USD', 6999, null),
  ('20000000-0000-4000-8000-000000000003', 'USD', 2499, null),
  ('20000000-0000-4000-8000-000000000004', 'USD', 1499, null)
on conflict (product_id, currency_code) do nothing;

insert into public.bundle_tiers(min_items, discount_type, discount_value, label_ar, label_en, is_active, sort_order)
values
  (2, 'percent', 5, 'عينة: أضف منتجين', 'Sample: add 2 items', false, 1),
  (3, 'percent', 8, 'عينة: أضف 3 منتجات', 'Sample: add 3 items', false, 2),
  (5, 'percent', 12, 'عينة: أضف 5 منتجات', 'Sample: add 5 items', false, 3)
on conflict (min_items) do nothing;

insert into public.coupons(code, percent_off, scope, description_ar, description_en, starts_at, ends_at,
  usage_limit_total, usage_limit_per_customer, min_order_amount_minor, is_active)
values
  ('SAMPLE-STEAM', 10, 'specific_categories', 'بيانات عينة غير مفعّلة — راجع الإعدادات قبل الاستخدام.',
   'Inactive sample data — review settings before use.', null, '2099-01-01 00:00:00+00', 100, 1, null, false),
  ('SAMPLE-WELCOME', 5, 'all_products', 'بيانات عينة غير مفعّلة — راجع الإعدادات قبل الاستخدام.',
   'Inactive sample data — review settings before use.', null, '2099-01-01 00:00:00+00', 100, 1, null, false)
on conflict (code) do nothing;

insert into public.coupon_categories(coupon_id, category_id)
select c.id, cat.id from public.coupons c join public.categories cat on cat.slug = 'pc-steam'
where c.code = 'SAMPLE-STEAM'
on conflict do nothing;

insert into public.payment_methods(id, name_ar, name_en, instructions_ar, instructions_en, sort_order, is_active)
values
  ('30000000-0000-4000-8000-000000000001', 'طريقة دفع تجريبية', 'Sample payment method', 'أضف التعليمات المعتمدة قبل التفعيل.', 'Add approved instructions before activation.', 1, false),
  ('30000000-0000-4000-8000-000000000002', 'طريقة دفع أخرى', 'Another payment method', 'أضف التعليمات المعتمدة قبل التفعيل.', 'Add approved instructions before activation.', 2, false)
on conflict (id) do nothing;

insert into public.message_templates(template_key, title_ar, title_en, body_ar, body_en, variables, is_active)
values
  ('received', 'استلام الطلب', 'Order received', 'وصل طلبك {order_number}. بنتواصل معك قريباً لتأكيد التفاصيل.', 'We received order {order_number}. We will be in touch to confirm the details.', array['customer_name','order_number','total','items'], true),
  ('payment', 'تعليمات الدفع', 'Payment instructions', 'طلبك {order_number} جاهز للخطوة التالية. {payment_instructions}', 'Order {order_number} is ready for the next step. {payment_instructions}', array['customer_name','order_number','total','items'], true),
  ('delivered', 'تأكيد التسليم', 'Delivery confirmation', 'تم تجهيز طلبك {order_number}.', 'Your order {order_number} is ready.', array['customer_name','order_number','total','items'], true),
  ('cancelled', 'إلغاء الطلب', 'Order cancelled', 'تم تحديث حالة طلبك {order_number}. تواصل معنا إذا احتجت مساعدة.', 'Order {order_number} has been updated. Contact us if you need help.', array['customer_name','order_number','total','items'], true),
  ('follow-up', 'متابعة الطلب', 'Order follow-up', 'حبيت نتابع معك بخصوص طلبك {order_number}.', 'We are following up about order {order_number}.', array['customer_name','order_number','total','items'], true)
on conflict (template_key) do nothing;

insert into public.blocked_usernames(pattern, match_type, reason)
values
  ('admin','exact','reserved_role_name'), ('administrator','exact','reserved_role_name'),
  ('support','exact','reserved_role_name'), ('owner','exact','reserved_role_name'),
  ('staff','exact','reserved_role_name'), ('7zma','exact','brand_name'),
  ('حزمة','exact','brand_name'), ('دعم','exact','reserved_role_name'),
  ('إدارة','exact','reserved_role_name'), ('مدير','exact','reserved_role_name')
on conflict (pattern, match_type) do nothing;

insert into public.greetings(id, slot, message_ar, message_en, icon_key, weight, priority, is_active)
values
  ('40000000-0000-4000-8000-000000000001','morning','صباح الخير يا {username} ☀️ جاهز للعب؟','Good morning, {username} ☀️','sun',5,0,true),
  ('40000000-0000-4000-8000-000000000002','morning','صباحك أجمل مع لعبة جديدة يا {username} ☀️','Start your day with a new game, {username} ☀️','sun',3,0,true),
  ('40000000-0000-4000-8000-000000000003','morning','صباح الحماس يا {username} 🎮','A fresh start, {username} 🎮','sun',2,0,true),
  ('40000000-0000-4000-8000-000000000004','afternoon','نهارك سعيد يا {username} 🎮 تكمّل حزمتك؟','Good afternoon, {username} 🎮','sun',5,0,true),
  ('40000000-0000-4000-8000-000000000005','afternoon','استراحة اللعب تناديك يا {username} ☀️','Your next play break is calling, {username} ☀️','sun',3,0,true),
  ('40000000-0000-4000-8000-000000000006','afternoon','وش تختار لجولتك الجاية يا {username}؟','What will you pick for your next session, {username}?','sun',2,0,true),
  ('40000000-0000-4000-8000-000000000007','evening','مساء الخير يا {username} 🌆 خذ لك لعبة تختم فيها يومك','Good evening, {username} 🌆','sunset',5,0,true),
  ('40000000-0000-4000-8000-000000000008','evening','هدوء المساء وجولة لعب يا {username} 🎮','An easy evening and a new session, {username} 🎮','sunset',3,0,true),
  ('40000000-0000-4000-8000-000000000009','evening','مساء اللعب الحلو يا {username} 🌆','Make the evening yours, {username} 🌆','sunset',2,0,true),
  ('40000000-0000-4000-8000-000000000010','night','مساء الخير يا {username} 🌙 سهرتك تكمل مع لعبة جديدة','Good night, {username} 🌙','moon',5,0,true),
  ('40000000-0000-4000-8000-000000000011','night','ليلتك أهدى مع اختيار جديد يا {username} 🌙','A new pick for a quiet night, {username} 🌙','moon',3,0,true),
  ('40000000-0000-4000-8000-000000000012','night','جولة أخيرة؟ يا {username} 🎮','One more round, {username}? 🎮','moon',2,0,true)
on conflict (id) do nothing;

insert into public.banners(id, title_ar, title_en, subtitle_ar, subtitle_en, is_active, sort_order)
values
  ('50000000-0000-4000-8000-000000000001','مساحة لإعلانك','Announcement space','محتوى تجريبي — عدّله قبل التفعيل.','Sample content — edit before activation.',false,1),
  ('50000000-0000-4000-8000-000000000002','إصدارات قادمة','Upcoming picks','محتوى تجريبي — عدّله قبل التفعيل.','Sample content — edit before activation.',false,2)
on conflict (id) do nothing;

insert into public.store_settings(id) values (1) on conflict (id) do nothing;
insert into public.live_activity_settings(id, enabled) values (1, false) on conflict (id) do nothing;

commit;
