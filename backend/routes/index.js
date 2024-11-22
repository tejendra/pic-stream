import express from 'express';
import fs from 'node:fs';
import { mysqlConnection } from '../db/mysql.js';

var router = express.Router();

router.get('/', function (req, res, next) {
  res.json({ title: 'Express' });
});

router.get('/health', function (req, res, next) {
  res.status(200).json({
    alive: true,
    version: process.env.APP_VERSION ?? '0.1.0',
    baseUrl: process.env.BASE_URL,
  });
});

router.get('/secrets', function (req, res, next) {
  try {
    const mysql_root_password = fs.readFileSync(
      '/run/secrets/mysql_root_password',
      'utf8',
    );

    res.status(200).json({
      mysql_root_password,
    });
  } catch (err) {
    res.status(500).json({
      mysql_root_password: 'invalid',
    });
  }
});

router.post('/volumes', function (req, res, next) {
  try {
    mysqlConnection.query(
      'INSERT INTO albums (id, name) VALUES (?, ?)',
      ['', 'album name'],
      (err, data) => {
        if (err) {
          console.log(err);
          res.status(500).json({ error: 'couldnt insert' });
        }

        res.status(200).json({ content: 'ok' });
      },
    );
  } catch (err) {
    console.log(err);
  }

  // try {
  //   if (!fs.existsSync(filename)) {
  //     fs.mkdir(filename, {recursive: true}, err => {console.error(err)});
  //   }
  // } catch (err) {
  //   console.error(err);
  //   res.status(500).json({error: "Couldn't create directory"});
  // }

  // try {
  //   fs.writeFileSync(`${filename}/test.txt`, 'some items', {encoding: 'utf8'});

  //   res.status(200).json({success: true});
  // } catch (err) {
  //   console.error(err);
  //   res.status(500).json({error: "Couldn't write file"});
  // }
});

export default router;
