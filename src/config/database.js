import pkg from 'pg';
const { Pool } = pkg;

export const testDbConnection = async () => {
    // Create a new PostgreSQL pool
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL, // Get connection string from .env
        ssl: { rejectUnauthorized: false }, // Enable SSL for Neon
    });
    
    try {
        const client = await pool.connect();
        const result = await client.query('SELECT NOW()');
        console.log('Database connected:', result.rows[0]);
        client.release();
    } catch (err) {
        console.error('Database connection error:', err);
    }
};




// // Define a route
// // app.get('/', async (req, res) => {
// //     try {
// //         const result = await pool.query('SELECT * FROM your_table LIMIT 10;'); // Replace 'your_table' with your table name
// //         res.json(result.rows);
// //     } catch (err) {
// //         console.error(err);
// //         res.status(500).send('Error querying the database');
// //     }
// // });


