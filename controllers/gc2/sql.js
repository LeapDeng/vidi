var express = require('express');
var router = express.Router();
var config = require('../../config/config.js').gc2;
var request = require('request');
var fs = require('fs');

router.all('/api/sql/:db', function (req, response) {
    var db = req.params.db,
        q = req.body.q || req.query.q,
        srs = req.body.srs || req.query.srs,
        lifetime = req.body.lifetime || req.query.lifetime,
        client_encoding = req.body.client_encoding || req.query.client_encoding,
        base64 = req.body.base64 || req.query.base64,
        format = req.body.format || req.query.format,
        store = req.body.store || req.query.store,
        userName,
        fileName,
        writeStream,
        rem,
        headers,
        key = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });

    var postData = "q=" + encodeURIComponent(q) + "&base64=" + (base64 === "true" ? "true" : "false") + "&srs=" + srs + "&lifetime=" + lifetime + "&client_encoding=" + client_encoding + "&format=" + (format ? format : "geojson") + "&key=" + (typeof req.session.gc2ApiKey !=="undefined" ? req.session.gc2ApiKey : "xxxxx" /*Dummy key is sent to prevent start of session*/);
        options;

    // Check if user is a sub user
    if (req.session.gc2UserName && req.session.subUser) {
        userName = req.session.subUser + "@" + db;
    } else {
        userName = db;
    }

    if (req.body.key && !req.session.gc2ApiKey) {
        postData = postData + "&key=" + req.body.key;
    }

    options = {
        method: 'POST',
        uri: config.host + "/api/v1/sql/" + userName,
        form: postData
    };

    if (format === "excel") {
        fileName = key + ".xlsx";
        headers = {
            'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition': 'attachment; filename=data.xlsx',
            'Expires': '0',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'X-Powered-By': 'MapCentia Vidi'
        }
    } else {
        fileName = key + ".json";
        headers = {
            'Content-Type': 'application/json',
            'Expires': '0',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'X-Powered-By': 'MapCentia Vidi'
        }
    }

    if (!store) {
        response.writeHead(200, headers);
    }

    rem = request(options);

    if (store) {
        writeStream = fs.createWriteStream(__dirname + "/../../public/tmp/stored_results/" + fileName);
    }

    rem.on('data', function (chunk) {
        if (store) {
            writeStream.write(chunk, 'binary');
        } else {
            response.write(chunk);
        }
    });
    rem.on('end', function () {
        if (store) {
            console.log("Result saved");
            response.send({"success": true, "file": fileName});
        } else {
            response.end();
        }
    });

});
module.exports = router;
