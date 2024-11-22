import mysql from 'mysql2';
import fs from 'node:fs';

const mysqlRootPassword = fs.readFileSync(
  '/run/secrets/mysql_root_password',
  'utf8',
);

const mysqlConnectionInit = {
  host: process.env.MYSQL_HOST,
  user: 'root',
  password: mysqlRootPassword,
  database: process.env.MYSQL_DATABASE,
  port: 3306,
};

const mysqlConnection = mysql.createPool(mysqlConnectionInit);

export { mysqlConnection };
