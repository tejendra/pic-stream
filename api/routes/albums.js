var express = require('express');
const formidable = require('formidable');
var router = express.Router();
const fileparser = require('../fileparser');

router.get('/bad', function(req, res, next) {
  res.status(500).send('Internal Server Error');
});

router.post('/:name', async function(req, res, next) {
  const form = formidable({});

  form.parse(req, (err, fields, files) => {
    if (err) {
      next(err);
      return;
    }
    res.json({ fields, files });
  });
  // try {
  //   console.log(req.body);
  //   const data = await fileparser(req);
  //   res.status(200).json({
  //     message: "Success",
  //     data
  //   });
  // } catch (error) {
  //   res.status(400).json({
  //     message: "An error occurred.",
  //     error
  //   });
  // }
})

router.get('/:name', function(req, res, next) {
  res.json({ 
    title: `Hello, ${req.params.name}`, 
    media: [
      {
        filename: 'grapes.jpg',
        thumbnailUrl: 'https://via.placeholder.com/250',
        downloadUrl: 'https://via.placeholder.com/500',
        contentType: 'image/jpeg'
      },
      {
        filename: 'apple.jpg',
        thumbnailUrl: 'https://via.placeholder.com/250',
        downloadUrl: 'https://via.placeholder.com/500',
        contentType: 'image/jpeg'
      },
      {
        filename: 'orange.jpg',
        thumbnailUrl: 'https://via.placeholder.com/250',
        downloadUrl: 'https://via.placeholder.com/500',
        contentType: 'image/jpeg'
      },
      {
        filename: 'strawberry.jpg',
        thumbnailUrl: 'https://via.placeholder.com/250',
        downloadUrl: 'https://via.placeholder.com/500',
        contentType: 'image/jpeg'
      }
    ] });
});

module.exports = router;
