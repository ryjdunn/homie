INSERT INTO categories (id, slug, name, color, icon, sort_order)
VALUES
  ('cat_sell_donate', 'sell-donate', 'Sell/Donate', '#7c32ff', 'tag', 2),
  ('cat_kai', 'kai', 'Kai', '#17b5ad', 'user', 4)
ON CONFLICT (slug) DO UPDATE SET
  id = excluded.id,
  name = excluded.name,
  color = excluded.color,
  icon = excluded.icon,
  sort_order = excluded.sort_order;

UPDATE categories
SET sort_order = 1, name = 'House', color = '#2f6f4e', icon = 'home'
WHERE id = 'cat_house';

UPDATE categories
SET sort_order = 3, name = 'Errands', color = '#b5651d', icon = 'route'
WHERE id = 'cat_errands';

UPDATE tasks
SET category_id = 'cat_sell_donate'
WHERE category_id = 'cat_dump_run';

UPDATE tasks
SET category_id = 'cat_house'
WHERE category_id IN ('cat_cleaning', 'cat_yard', 'cat_admin');

DELETE FROM categories
WHERE id IN ('cat_cleaning', 'cat_yard', 'cat_dump_run', 'cat_admin');
