var path = require('path');
var express = require('express');
var Bing = require('node-bing-api')({ accKey: '5dfe0402d54643b7afa12c8ec56f17b6' });
var MongoClient = require('mongodb').MongoClient; //this server run at urlshort server
var app = express();
app.listen(8080);
app.get('/', function(req, res) {
  var fileName = path.join(__dirname +  '/index.html');
  res.sendFile(fileName, function (err) {
    if (err) {
      res.status(err.status).end();
    }
  });
});
var entries=10;
var db_url = 'mongodb://localhost:27017/imgsearch';
var query_fun = function (query_type,info,call_back) {
  MongoClient.connect(db_url, 
    function (err, db) {
      if (err) {
        throw new Error("Unable to connect mongoDB server")
      } else {
        console.log('Connection established: ', db_url);
          var collection=db.collection('url_table');
          
          if(query_type=='find'){
            var options = {"term":1,"when":1,"_id":0,"limit": entries, "sort": [['when','desc']]};
            collection.find( {}, {term:1,when:1,_id:0}  , options).toArray( function(err, doc) {
                      if(err){throw new Error("Unable to query the mongoDB server");}
                      db.close();
                      call_back(doc);
                  }
              );
          }else if(query_type=='insert'){
            collection.insert( info  , function(error, data) {
                if (error) throw error;
            }); 
            db.close();
          }
      }
    }
  );
}
app.get('/api/imagesearch/:QUERY', function (req, res) {
  var query=req.params.QUERY;
  console.log('Search: '+query);
  var offset=1;
  if(typeof req.query.offset!='undefined'){
    var page_value=parseInt(req.query.offset,10);
    if( !isNaN(page_value) )offset=page_value;
  }
  
  Bing.images( query , {
    top: entries*offset,
    adult: 'Off'
  }, function(error, response, body){
    if(error) throw error;
    var results = new Array();
    body.value=body.value.slice(entries*(offset-1),entries*offset);
    for (var image in body.value) {
      var link=body.value[image];
      var obj={
        url:link.contentUrl,
        snippet:link.name,
        thumbnail:link.thumbnailUrl,
        context:link.hostPageDisplayUrl
      }
      results.push(obj);
    }
    res.send(results);
  });
  var info={
    'term':query,
    'when':new Date()
  }
  query_fun('insert',info,null);
});

app.get('/api/latest/imagesearch/', function (req, res) {
  var info = { 'term':1, 'when':1 };
  query_fun('find',info,function (doc) {
    res.send(doc);
  });
});
