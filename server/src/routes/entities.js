import { Router } from 'express';
import { query } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { ENTITY_CONFIG } from '../entityConfig.js';

const router = Router();
router.use(requireAuth);

const SELECT_COLUMNS = (config) => ['id', ...config.columns, 'created_date', 'updated_date'].join(', ');

// pg already parses jsonb columns into JS values, so rows pass through as-is.
const rowToJson = (row) => ({ ...row });

const resolveEntity = (req, res, next) => {
  const config = ENTITY_CONFIG[req.params.entity];
  if (!config) return res.status(404).json({ error: `Unknown entity "${req.params.entity}"` });
  req.entityConfig = config;
  next();
};
router.use('/:entity', resolveEntity);

const parseSort = (sortParam, config) => {
  if (!sortParam) return 'created_date DESC';
  const desc = sortParam.startsWith('-');
  const col = desc ? sortParam.slice(1) : sortParam;
  const allowed = new Set(['created_date', 'updated_date', ...config.columns]);
  if (!allowed.has(col)) return 'created_date DESC';
  return `${col} ${desc ? 'DESC' : 'ASC'}`;
};

// `offset` is how many $-placeholders already exist in the query this WHERE
// clause is being appended to, so its own placeholders continue numbering
// from there instead of colliding with earlier ones (e.g. an UPDATE's SET params).
const buildWhere = (config, filter, userId, offset = 0) => {
  const clauses = [];
  const params = [];
  if (config.owned) {
    params.push(userId);
    clauses.push(`created_by_id = $${offset + params.length}`);
  }
  for (const [key, value] of Object.entries(filter || {})) {
    if (key === 'created_by_id') continue; // ownership is always server-enforced above
    if (!config.columns.includes(key)) continue;
    params.push(value);
    clauses.push(`${key} = $${offset + params.length}`);
  }
  return { where: clauses.length ? `where ${clauses.join(' and ')}` : '', params };
};

// GET /api/entities/:entity  (filter/list)
router.get('/:entity', async (req, res) => {
  const config = req.entityConfig;
  let filter = {};
  if (typeof req.query.filter === 'string') {
    try {
      filter = JSON.parse(req.query.filter);
    } catch {
      return res.status(400).json({ error: 'filter must be valid JSON' });
    }
  }
  const { where, params } = buildWhere(config, filter, req.user.id);
  const sort = parseSort(req.query.sort, config);
  let sql = `select ${SELECT_COLUMNS(config)} from ${config.table} ${where} order by ${sort}`;
  if (req.query.limit) {
    params.push(Number(req.query.limit));
    sql += ` limit $${params.length}`;
  }
  const { rows } = await query(sql, params);
  res.json(rows.map((r) => rowToJson(r)));
});

// GET /api/entities/:entity/:id
router.get('/:entity/:id', async (req, res) => {
  const config = req.entityConfig;
  const { where, params } = buildWhere(config, {}, req.user.id);
  const idClause = params.length ? `and id = $${params.length + 1}` : `id = $1`;
  params.push(req.params.id);
  const { rows } = await query(
    `select ${SELECT_COLUMNS(config)} from ${config.table} ${where} ${idClause}`,
    params
  );
  if (!rows.length) return res.status(404).json({ error: 'Not found' });
  res.json(rowToJson(rows[0]));
});

const buildInsert = (config, data, userId) => {
  const cols = [];
  const placeholders = [];
  const params = [];
  if (config.owned || config.table === 'problem_bank') {
    cols.push('created_by_id');
    params.push(userId);
    placeholders.push(`$${params.length}`);
  }
  for (const col of config.columns) {
    if (!(col in data)) continue;
    cols.push(col);
    const value = config.jsonColumns.includes(col) ? JSON.stringify(data[col]) : data[col];
    params.push(value);
    placeholders.push(`$${params.length}`);
  }
  return { cols, placeholders, params };
};

// POST /api/entities/:entity  (create, or bulk-create when body is an array)
router.post('/:entity', async (req, res) => {
  const config = req.entityConfig;
  const items = Array.isArray(req.body) ? req.body : [req.body];
  const created = [];
  for (const item of items) {
    const { cols, placeholders, params } = buildInsert(config, item || {}, req.user.id);
    const { rows } = await query(
      `insert into ${config.table} (${cols.join(', ')}) values (${placeholders.join(', ')}) returning ${SELECT_COLUMNS(config)}`,
      params
    );
    created.push(rowToJson(rows[0]));
  }
  res.status(201).json(Array.isArray(req.body) ? created : created[0]);
});

// PATCH /api/entities/:entity/:id
router.patch('/:entity/:id', async (req, res) => {
  const config = req.entityConfig;
  const data = req.body || {};
  const sets = ['updated_date = now()'];
  const params = [];
  for (const col of config.columns) {
    if (!(col in data)) continue;
    const value = config.jsonColumns.includes(col) ? JSON.stringify(data[col]) : data[col];
    params.push(value);
    sets.push(`${col} = $${params.length}`);
  }
  const { where, params: whereParams } = buildWhere(config, {}, req.user.id, params.length);
  const allParams = [...params, ...whereParams, req.params.id];
  const idIndex = allParams.length;
  const sql = `update ${config.table} set ${sets.join(', ')} ${where ? where + ` and id = $${idIndex}` : `where id = $${idIndex}`} returning ${SELECT_COLUMNS(config)}`;
  const { rows } = await query(sql, allParams);
  if (!rows.length) return res.status(404).json({ error: 'Not found' });
  res.json(rowToJson(rows[0]));
});

// DELETE /api/entities/:entity/:id
router.delete('/:entity/:id', async (req, res) => {
  const config = req.entityConfig;
  const { where, params } = buildWhere(config, {}, req.user.id);
  const allParams = [...params, req.params.id];
  const idIndex = allParams.length;
  const sql = `delete from ${config.table} ${where ? where + ` and id = $${idIndex}` : `where id = $${idIndex}`} returning id`;
  const { rows } = await query(sql, allParams);
  if (!rows.length) return res.status(404).json({ error: 'Not found' });
  res.json({ ok: true });
});

export default router;
