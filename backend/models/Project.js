const db = require("../config/db")

class Project{
    static async create(data){
        try{

            let {name, description, rera_id, sales, pre_sales, possession, project_type, address, street, city, state, country, zip, locality, longitude, latitude} = data
    
            const [result] =  await db.query(`INSERT INTO project(name, description, rera_id, sales, pre_sales, possession, project_type, address, street, city, state, country, zip, locality, longitude, latitude) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, 
                [name, description, rera_id, sales, pre_sales, possession, project_type, address, street, city, state, country, zip, locality, longitude, latitude]);
            return {id:result.insertId, ...data}
        }
        catch (err){
            console.log(err);
            return null
        }
    }

    static async findAll(){
        const [result] = await db.query("SELECT * FROM project");
        return result;
    }
    
    static async findById(id){
        const [result] = await db.query(`SELECT * FROM project WHERE id = ?`, [id]);
        return result[0];
    }

    static async update(id, data){
        try{
            let {name, description, rera_id, sales, pre_sales, possession, project_type, address, street, city, state, country, zip, locality, longitude, latitude} = data

            await db.query("UPDATE project SET name = ?, description = ?, rera_id = ?, sales = ?, pre_sales = ?, possession = ?, project_type = ?, address = ?, street = ?, city = ?, state = ?, country = ?, zip = ?, locality = ?, longitude = ?, latitude = ? where id = ?", [name, description, rera_id, sales, pre_sales, possession, project_type, address, street, city, state, country, zip, locality, longitude, latitude, id]);

            return {id:id, ...data}
        }catch(err){
            console.log(err);
            return err
            
        }
    }
}

module.exports = Project