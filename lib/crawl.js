var request = require('request');
var parseString = require('xml2js').parseString;
var util = require('util');
var async = require('async');

var q = async.queue(function (task, next) {

    if(task.type == 'sitemap'){
      validateSitemap(task, function () {
          // after this one is done, start next one.
          next();
      });
    }
    else{
      validateUrl(task, function () {
          // after this one is done, start next one.
          next();
      });
    }

}, 4);

exports.crawlSitemap = function(settings, callback){
  request.get(settings.url, function(error, response, body){
    if(error) {
      throw error;
    }

    // we've got the base sitemap file
    // This can either be a list of URLs or
    // a list of other sitemaps.

    parseString(body, function(err, result){
      if(err){
        console.log('Bad sitemap data: ' + settings.url);
        callback();
        return;
      }

      if(result.hasOwnProperty('sitemapindex'))
      {
        for(var prop in result['sitemapindex']['sitemap'])
        {
          var sitemapUrl = result['sitemapindex']['sitemap'][prop].loc[0];
          q.push({url: sitemapUrl, type: 'sitemap', settings: settings});
        }
      }

      if(result.hasOwnProperty('urlset'))
      {
          for(var prop in result['urlset']['url'])
          {
            var testurl = result['urlset']['url'][prop].loc[0];
            q.push({url: testurl, type: 'url', settings: settings});
          }
      }

      callback();
      return;

    });

  });
}

function validateSitemap(task, callback){
  request.get({url: task.url, followRedirect: false, timeout: 30000}, function(error, resp, body){
    if(error) {
      console.log('Bad URL: ' + task.url);
      callback();
      return;
    }

    if(resp.statusCode != task.code) {
      console.log('Bad URL: ' + task.url);
      callback();
      return;
    }

    parseString(body, function(err, result){
      if(err){
        console.log('Bad sitemap data: ' + task.url);
        callback();
        return;
      }

      if(result.hasOwnProperty('sitemapindex'))
      {
        for(var prop in result['sitemapindex']['sitemap'])
        {
          var sitemapUrl = result['sitemapindex']['sitemap'][prop].loc[0];
          q.push({url: sitemapUrl, type: 'sitemap'});
        }
      }

      if(result.hasOwnProperty('urlset'))
      {
          for(var prop in result['urlset']['url'])
          {
            var testurl = result['urlset']['url'][prop].loc[0];
            q.push({url: testurl, type: 'url'});
          }
      }

      callback();
      return;
    });
  });

}

function validateUrl(task, callback){

  request.get({url: task.url, followRedirect: true, timeout: 30000}, function(error, resp, body){
    if(error) {
      console.log('Bad URL: ' + task.url);
      callback();
      return;
    }

    var document = {
      url: task.url,
      body: body  
    };
    
    request({
        url: task.settings.server + '/' + task.settings.index + '/pages',
        method: "POST",
        json: document
        }, function(error, resp, body){
        if(error){
            console.log('error logging ' + task.url);
            callback();
            return;
        }
        
        callback();
        return; 
    });
  });
}
