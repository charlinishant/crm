const db = require('../config/db');

class Lead {
  static async create(data) {
    let { name, mobile, email, project_id, lead_status, next_call, assign_to, closing_executive, source, city, locality, configration, budget, possession_required, comment } = data;
    try{

    if (next_call == ""){
      next_call = null;
    }
    const [result] = await db.query(
  `INSERT INTO leads 
  (name, mobile, email, project_id, lead_status, next_call, assign_to, closing_executive, \`source\`, city, locality, configration, budget, possession_required, comment) 
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  [
    name,
    mobile,
    email,
    project_id,
    lead_status,
    next_call,
    assign_to,
    closing_executive,
    source,
    city,
    locality,
    configration,
    budget,
    possession_required,
    comment
  ]
);

    return { id: result.insertId, ...data };
  }
  catch (err){
    console.log(err);
    
  }
  }

  static async findAll() {
    const [rows] = await db.query('SELECT * FROM leads');
    return rows;
  }

  static async findById(id) {
    const [rows] = await db.query(
      'SELECT * FROM leads WHERE id = ?',
      [id]
    );
    return rows[0];
  }

  static async update(id, data) {
    const { name, mobile, email, project_id, lead_status, next_call, assign_to, closing_executive, source, city, locality, configration, budget, possession_required, comment } = data;

    await db.query(
      'UPDATE leads SET name = ?, mobile = ?, email = ?, project_id = ?, lead_status = ?, next_call = ?, assign_to = ?, closing_executive = ?, source = ?, city = ?, locality = ?, configration = ?, budget = ?, possession_required = ?, comment = ? WHERE id = ?',
      [name, mobile, email, project_id, lead_status, next_call, assign_to, closing_executive, source, city, locality, configration, budget, possession_required, comment,  id]
    );

    return { id, ...data };
  }

  static async delete(id) {
    await db.query(
      'DELETE FROM leads WHERE id = ?',
      [id]
    );
    return true;
  }
}

module.exports = Lead;