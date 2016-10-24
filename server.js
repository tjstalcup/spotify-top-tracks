var unirest = require('unirest');
var express = require('express');
var events = require('events');

var getFromApi = function(endpoint, args) {
    var emitter = new events.EventEmitter();
    unirest.get('https://api.spotify.com/v1/' + endpoint)
        .qs(args)
        .end(function(response) {
            if (response.ok) {
                emitter.emit('end', response.body);
            } else {
                emitter.emit('error', response.code);
            }
        });
    return emitter;
};

var app = express();
app.use(express.static('public'));

app.get('/search/:name', function(req, res) {
    var searchReq = getFromApi('search', {
        q: req.params.name,
        limit: 1,
        type: 'artist'
    });

    var completed = 0;
    var relatedArtist = 0;
    searchReq.on('end', function(item) {
        var artist = item.artists.items[0];
        var searchRelate = getFromApi('artists/' + artist.id + '/related-artists', {});
        searchRelate.on('end', function(item) {
            relatedArtist = item.artists.length;
            artist.related = item.artists;
            for (var i = 0; i < artist.related.length; i++) {
                getRelated(artist.related[i],i);
            }

            function getRelated(relatedArtist,i){
                relReq = getFromApi('artists/'+relatedArtist.id+'/top-tracks',{'country': 'US'});
                relReq.on('end',function(item){
                    artist.related[i].tracks = item.tracks;
                    completed++;
                    checkComplete();
                });
            }

            var checkComplete = function() {
                if (completed === relatedArtist) {
                    res.json(artist);
                }
            };

        });

    });

    searchReq.on('error', function(code) {
        res.sendStatus(code);
    });
});

app.listen(process.env.PORT || 8080)
