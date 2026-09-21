import { getPool } from "../config/db.js";

const pool = getPool();

const Medicine = {
  async createTable() {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS medicines (
        id                SERIAL PRIMARY KEY,
        name              VARCHAR(255) NOT NULL,
        generic_name      VARCHAR(255),
        brand             VARCHAR(255),
        category          VARCHAR(100),
        form              VARCHAR(50),
        strength          VARCHAR(100),
        manufacturer      VARCHAR(255),
        unit_price        NUMERIC(10,2) DEFAULT 0,
        stock_qty         INT DEFAULT 0,
        reorder_level     INT DEFAULT 10,
        requires_rx       BOOLEAN DEFAULT TRUE,
        description       TEXT,
        side_effects      TEXT,
        contraindications TEXT,
        is_active         BOOLEAN DEFAULT TRUE,
        created_at        TIMESTAMPTZ DEFAULT NOW(),
        updated_at        TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_medicines_name ON medicines USING GIN (to_tsvector('english', name));
      CREATE INDEX IF NOT EXISTS idx_medicines_category ON medicines (category);
      CREATE INDEX IF NOT EXISTS idx_medicines_is_active ON medicines (is_active);
    `);
  },

  async findAll({ search = "", category = "", form = "", page = 1, limit = 20 } = {}) {
    const offset = (page - 1) * limit;
    const params = [];
    const conditions = ["is_active = TRUE"];
    if (search) { params.push(`%${search}%`); conditions.push(`(name ILIKE $${params.length} OR generic_name ILIKE $${params.length} OR brand ILIKE $${params.length})`); }
    if (category) { params.push(category); conditions.push(`category = $${params.length}`); }
    if (form) { params.push(form); conditions.push(`form = $${params.length}`); }
    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    params.push(limit, offset);
    const [rows, count] = await Promise.all([
      pool.query(`SELECT * FROM medicines ${where} ORDER BY name ASC LIMIT $${params.length - 1} OFFSET $${params.length}`, params),
      pool.query(`SELECT COUNT(*) FROM medicines ${where}`, params.slice(0, params.length - 2)),
    ]);
    return { medicines: rows.rows, total: parseInt(count.rows[0].count), page, limit };
  },

  async findById(id) {
    const { rows } = await pool.query("SELECT * FROM medicines WHERE id = $1", [id]);
    return rows[0] || null;
  },

  async create(data) {
    const { name, generic_name, brand, category, form, strength, manufacturer, unit_price, stock_qty, reorder_level, requires_rx, description, side_effects, contraindications } = data;
    const { rows } = await pool.query(
      `INSERT INTO medicines (name, generic_name, brand, category, form, strength, manufacturer, unit_price, stock_qty, reorder_level, requires_rx, description, side_effects, contraindications) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING *`,
      [name, generic_name, brand, category, form, strength, manufacturer, unit_price, stock_qty, reorder_level, requires_rx ?? true, description, side_effects, contraindications]
    );
    return rows[0];
  },

  async update(id, data) {
    const fields = []; const vals = [];
    const allowed = ["name","generic_name","brand","category","form","strength","manufacturer","unit_price","stock_qty","reorder_level","requires_rx","description","side_effects","contraindications","is_active"];
    allowed.forEach((key) => { if (data[key] !== undefined) { vals.push(data[key]); fields.push(`${key} = $${vals.length}`); } });
    if (!fields.length) return null;
    vals.push(id);
    const { rows } = await pool.query(`UPDATE medicines SET ${fields.join(", ")}, updated_at = NOW() WHERE id = $${vals.length} RETURNING *`, vals);
    return rows[0] || null;
  },

  async delete(id) { await pool.query("UPDATE medicines SET is_active = FALSE WHERE id = $1", [id]); },

  async getCategories() {
    const { rows } = await pool.query("SELECT DISTINCT category FROM medicines WHERE category IS NOT NULL AND is_active = TRUE ORDER BY category");
    return rows.map((r) => r.category);
  },

  async getLowStock() {
    const { rows } = await pool.query("SELECT * FROM medicines WHERE stock_qty <= reorder_level AND is_active = TRUE ORDER BY stock_qty ASC");
    return rows;
  },
};

export default Medicine;
